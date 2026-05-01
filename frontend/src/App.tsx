import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import LanguageToggle from './LanguageToggle';
import {
  fetchInbounds,
  fetchCurrentAuthUser,
  fetchBackendVersion,
  fetchInventory,
  fetchOutbounds,
  fetchProducts,
  fetchUsers,
  fetchWarehouses,
  getApiBaseUrl,
  loginAuthUser,
  registerAuthUser,
  type BackendAuthUser,
  type BackendInboundOrder,
  type BackendInventoryItem,
  type BackendOrderLineItem,
  type BackendOutboundOrder,
  type BackendProduct,
  type BackendWorkspaceUser,
  type BackendWarehouse,
} from './api';
import { frontendBuildTime, frontendVersion } from './version';
import * as ops from './operations';
import {
  authContentByLocale,
  getBrandContent,
  isAuthRoute,
  routeOrder,
  type AuthLocale,
  type AuthVariant,
  type Route,
  type WorkspaceRoute,
} from './content';

const validRoutes = new Set<Route>(routeOrder);
const routeIndex = Object.fromEntries(routeOrder.map((route, index) => [route, index])) as Record<Route, number>;
const transitionDurationMs = 220;
const authLocaleStorageKey = 'northline-auth-locale';
const sessionTokenStorageKey = 'northline-session-token';
const registeredEmailStorageKey = 'northline-registered-email';
const backendCategoryId = 'CAT-BACKEND-01';
const initialWorkspaceStore = ops.createInitialWorkspaceStore();
const initialOperationalSelections = ops.createInitialSelections(initialWorkspaceStore);

type VersionInfo = {
  frontendVersion: string;
  frontendBuildTime: string;
  backendVersion?: string;
  backendBuildTime?: string;
};

function readRouteFromHash(): Route {
  if (typeof window === 'undefined') {
    return 'login';
  }

  const rawValue = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  return validRoutes.has(rawValue as Route) ? (rawValue as Route) : 'login';
}

function writeRouteToHash(route: Route) {
  if (typeof window !== 'undefined') {
    window.location.hash = `#/${route}`;
  }
}

function readStoredAuthLocale(): AuthLocale {
  if (typeof window === 'undefined') {
    return 'en';
  }

  return window.localStorage.getItem(authLocaleStorageKey) === 'zh' ? 'zh' : 'en';
}

function readStoredSessionToken() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(sessionTokenStorageKey) ?? '';
}

function readStoredRegisteredEmail() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.localStorage.getItem(registeredEmailStorageKey) ?? '';
}

function toWorkspaceRole(role: BackendAuthUser['role']): ops.UserRole {
  return role === 'ADMIN' ? 'Admin' : 'Staff';
}

function formatSessionUserName(email: string, explicitName?: string | null) {
  if (explicitName?.trim()) {
    return explicitName.trim();
  }

  const base = email.split('@')[0] ?? 'Warehouse User';

  return base
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function toSessionUser(user: BackendAuthUser): ops.UserSession {
  return {
    id: user.id,
    email: user.email,
    name: formatSessionUserName(user.email, user.name),
    role: toWorkspaceRole(user.role),
  };
}

function isSameSessionUser(left: ops.UserSession | null, right: ops.UserSession) {
  return !!left && left.id === right.id && left.email === right.email && left.name === right.name && left.role === right.role;
}

function syncSessionUserIntoStore(store: ops.WorkspaceStore, sessionUser: ops.UserSession) {
  const syncedAt = ops.nowIso();
  const existingUser = store.users.find((user) => user.id === sessionUser.id);

  if (existingUser) {
    return {
      ...store,
      users: store.users.map((user) =>
        user.id === sessionUser.id
          ? {
              ...user,
              name: sessionUser.name,
              email: sessionUser.email,
              role: sessionUser.role,
              status: 'Active' as const,
              lastLoginAt: syncedAt,
              permissionsUpdatedAt: syncedAt,
            }
          : user,
      ),
      lastSync: syncedAt,
    };
  }

  return {
    ...store,
    users: [
      {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        status: 'Active' as const,
        appointedBy: 'Backend auth',
        appointedAt: syncedAt,
        permissionsUpdatedAt: syncedAt,
        lastLoginAt: syncedAt,
      },
      ...store.users,
    ],
    lastSync: syncedAt,
  };
}

function toInventoryThreshold(onHand: number) {
  if (onHand <= 0) {
    return 10;
  }

  return Math.max(10, Math.ceil(onHand * 0.2));
}

function mapBackendOrderLineItems(lineItems: BackendOrderLineItem[]): ops.OrderLineItem[] {
  return lineItems.map((lineItem) => ({
    id: lineItem.id,
    productId: lineItem.productId,
    quantity: lineItem.quantity,
    notes: lineItem.notes,
  }));
}

function mapBackendInboundOrder(order: BackendInboundOrder): ops.InboundRecord {
  return {
    id: order.id,
    inboundNo: order.inboundNo,
    warehouseId: order.warehouseId,
    supplierName: order.supplierName,
    referenceNo: order.referenceNo,
    plannedDate: order.plannedDate,
    status: order.status,
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    notes: order.notes,
    lineItems: mapBackendOrderLineItems(order.lineItems),
    approvalStatus: order.approvalStatus,
    approvalReason: order.approvalReason,
    approvalUpdatedAt: order.approvalUpdatedAt,
    approvedBy: order.approvedBy,
    appliedAt: '',
  };
}

function mapBackendOutboundOrder(order: BackendOutboundOrder): ops.OutboundRecord {
  return {
    id: order.id,
    outboundNo: order.outboundNo,
    warehouseId: order.warehouseId,
    destination: order.destination,
    carrier: order.carrier,
    shipmentDate: order.shipmentDate,
    status: order.status,
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    confirmedAt: order.confirmedAt,
    notes: order.notes,
    lineItems: mapBackendOrderLineItems(order.lineItems),
    approvalStatus: order.approvalStatus,
    approvalReason: order.approvalReason,
    approvalUpdatedAt: order.approvalUpdatedAt,
    approvedBy: order.approvedBy,
    appliedAt: '',
  };
}

function mapBackendWorkspaceUser(user: BackendWorkspaceUser): ops.WorkspaceUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toWorkspaceRole(user.role),
    status: user.status,
    canDelete: user.canDelete ?? false,
    appointedBy: user.appointedBy,
    appointedAt: user.appointedAt,
    permissionsUpdatedAt: user.permissionsUpdatedAt,
    lastLoginAt: user.lastLoginAt || user.updatedAt || user.createdAt,
  };
}

type SyncedBackendData = {
  products: BackendProduct[];
  warehouses: BackendWarehouse[];
  inventory: BackendInventoryItem[];
  inbounds: BackendInboundOrder[];
  outbounds: BackendOutboundOrder[];
  users: BackendWorkspaceUser[];
};

function mapBackendDataToStore(
  store: ops.WorkspaceStore,
  sessionUser: ops.UserSession,
  backendData: SyncedBackendData,
) {
  const inventoryWarehouseTotals = new Map<string, number>();
  const productWarehouseMap = new Map<string, string>();

  backendData.inventory.forEach((item) => {
    inventoryWarehouseTotals.set(item.warehouseId, (inventoryWarehouseTotals.get(item.warehouseId) ?? 0) + item.onHand);

    if (!productWarehouseMap.has(item.productId)) {
      productWarehouseMap.set(item.productId, item.warehouseId);
    }
  });

  const fallbackWarehouseId = backendData.warehouses[0]?.id ?? store.warehouses[0]?.id ?? 'WH-BACKEND-DEFAULT';
  const sessionSyncedStore = syncSessionUserIntoStore(store, sessionUser);
  const lastSyncCandidates = [
    ...backendData.products.map((product) => product.updatedAt),
    ...backendData.warehouses.map((warehouse) => warehouse.updatedAt),
    ...backendData.inventory.map((inventoryItem) => inventoryItem.updatedAt),
    ...backendData.inbounds.flatMap((order) => [order.createdAt, order.confirmedAt, order.approvalUpdatedAt].filter(Boolean)),
    ...backendData.outbounds.flatMap((order) => [order.createdAt, order.confirmedAt, order.approvalUpdatedAt].filter(Boolean)),
    ...backendData.users.flatMap((user) => [user.permissionsUpdatedAt, user.lastLoginAt, user.updatedAt].filter(Boolean)),
  ].filter(Boolean);

  const backendMappedStore = {
    ...sessionSyncedStore,
    categories: [
      {
        id: backendCategoryId,
        categoryCode: backendCategoryId,
        categoryName: 'Backend Catalog',
        status: 'Active',
      },
    ],
    warehouses: backendData.warehouses.map((warehouse) => ({
      id: warehouse.id,
      warehouseCode: warehouse.code,
      warehouseName: warehouse.name,
      region: 'Backend',
      country: 'Backend',
      location: warehouse.location ?? 'Unspecified',
      capacity: Math.max(1000, Math.ceil((inventoryWarehouseTotals.get(warehouse.id) ?? 0) * 1.5)),
      status: 'Active',
    })),
    products: backendData.products.map((product) => ({
      id: product.id,
      productCode: product.sku,
      productName: product.name,
      categoryId: backendCategoryId,
      warehouseId: productWarehouseMap.get(product.id) ?? fallbackWarehouseId,
      unit: product.unit ?? 'Unit',
      status: 'Active',
    })),
    inventoryRecords: backendData.inventory.map((inventoryItem) => ({
      id: inventoryItem.id,
      productId: inventoryItem.productId,
      warehouseId: inventoryItem.warehouseId,
      location: inventoryItem.warehouse.location ?? 'MAIN',
      onHandBase: inventoryItem.onHand,
      threshold: toInventoryThreshold(inventoryItem.onHand),
      updatedAt: inventoryItem.updatedAt,
    })),
    inboundOrders: backendData.inbounds.map(mapBackendInboundOrder),
    outboundOrders: backendData.outbounds.map(mapBackendOutboundOrder),
    users: backendData.users.map(mapBackendWorkspaceUser),
    lastSync: lastSyncCandidates.sort().at(-1) ?? ops.nowIso(),
  } satisfies ops.WorkspaceStore;

  return syncSessionUserIntoStore(backendMappedStore, sessionUser);
}

type WorkspaceSelectionOverrides = Partial<ops.OperationalSelections>;

function resolveSelectionId(candidates: string[], preferred?: string, fallback?: string) {
  if (preferred && candidates.includes(preferred)) {
    return preferred;
  }

  if (fallback && candidates.includes(fallback)) {
    return fallback;
  }

  return candidates[0] ?? '';
}

function reconcileSelections(
  store: ops.WorkspaceStore,
  current: ops.OperationalSelections,
  overrides: WorkspaceSelectionOverrides = {},
): ops.OperationalSelections {
  const inventoryIds = ops.buildInventorySnapshots(store).map((item) => item.id);
  const inboundIds = store.inboundOrders.map((item) => item.id);
  const outboundIds = store.outboundOrders.map((item) => item.id);
  const approvalKeys = ops.buildApprovalQueue(store).map((item) => item.key);
  const userIds = store.users.map((item) => item.id);

  return {
    inventoryId: resolveSelectionId(inventoryIds, overrides.inventoryId, current.inventoryId),
    inboundId: resolveSelectionId(inboundIds, overrides.inboundId, current.inboundId),
    outboundId: resolveSelectionId(outboundIds, overrides.outboundId, current.outboundId),
    approvalKey: resolveSelectionId(approvalKeys, overrides.approvalKey, current.approvalKey),
    userId: resolveSelectionId(userIds, overrides.userId, current.userId),
  };
}

function resolveRouteForSession(route: Route, currentUser: ops.UserSession | null): Route {
  if (!currentUser) {
    return isAuthRoute(route) ? route : 'login';
  }

  if (isAuthRoute(route)) {
    return ops.getDefaultWorkspaceRoute(currentUser);
  }

  return ops.canAccessWorkspaceRoute(currentUser, route) ? route : ops.getDefaultWorkspaceRoute(currentUser);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);

    return () => {
      mediaQuery.removeEventListener('change', updatePreference);
    };
  }, []);

  return prefersReducedMotion;
}

function formatVersionTime(value?: string) {
  if (!value) {
    return 'unknown';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function VersionBadge({ info }: { info: VersionInfo }) {
  const backendLabel = info.backendVersion ? `BE ${info.backendVersion}` : 'BE ...';
  const title = [
    `Frontend: ${info.frontendVersion}`,
    `Frontend built: ${info.frontendBuildTime}`,
    info.backendVersion ? `Backend: ${info.backendVersion}` : 'Backend: loading',
    info.backendBuildTime ? `Backend built: ${info.backendBuildTime}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="app-version-badge" title={title} aria-label="Application version">
      <span>FE {info.frontendVersion}</span>
      <span>{backendLabel}</span>
      <span>{formatVersionTime(info.frontendBuildTime)}</span>
    </div>
  );
}

function App() {
  const initialRoute = readRouteFromHash();
  const [displayRoute, setDisplayRoute] = useState<Route>(initialRoute);
  const [authLocale, setAuthLocale] = useState<AuthLocale>(() => readStoredAuthLocale());
  const [workspaceStore, setWorkspaceStore] = useState<ops.WorkspaceStore>(() => initialWorkspaceStore);
  const [operationalSelections, setOperationalSelections] = useState<ops.OperationalSelections>(() => initialOperationalSelections);
  const [currentUser, setCurrentUser] = useState<ops.UserSession | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState(() => readStoredRegisteredEmail());
  const [authNotice, setAuthNotice] = useState('');
  const [authReady, setAuthReady] = useState(false);
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    frontendVersion,
    frontendBuildTime,
  });
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const prefersReducedMotion = usePrefersReducedMotion();
  const displayRouteRef = useRef<Route>(initialRoute);
  const transitionTimers = useRef<number[]>([]);

  const refreshWorkspaceData = useCallback(
    async (options: { selections?: WorkspaceSelectionOverrides } = {}) => {
      if (!sessionToken) {
        return;
      }

      const [authUser, productResult, warehouseResult, inventoryResult, inboundResult, outboundResult, userResult] = await Promise.all([
        fetchCurrentAuthUser(sessionToken),
        fetchProducts(sessionToken),
        fetchWarehouses(sessionToken),
        fetchInventory(sessionToken),
        fetchInbounds(sessionToken),
        fetchOutbounds(sessionToken),
        fetchUsers(sessionToken),
      ]);

      const sessionUser = toSessionUser(authUser);
      const mappedStore = mapBackendDataToStore(initialWorkspaceStore, sessionUser, {
        products: productResult.products,
        warehouses: warehouseResult.warehouses,
        inventory: inventoryResult.inventory,
        inbounds: inboundResult.orders,
        outbounds: outboundResult.orders,
        users: userResult.users,
      });

      setCurrentUser((current) => (isSameSessionUser(current, sessionUser) ? current : sessionUser));
      setWorkspaceStore(mappedStore);
      setOperationalSelections((current) => reconcileSelections(mappedStore, current, options.selections));
    },
    [sessionToken],
  );

  useEffect(() => {
    const clearTimers = () => {
      transitionTimers.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      transitionTimers.current = [];
    };

    return () => {
      clearTimers();
    };
  }, []);

  const transitionToRoute = useCallback(
    (nextRoute: Route) => {
      transitionTimers.current.forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      transitionTimers.current = [];

      const currentRoute = displayRouteRef.current;

      if (nextRoute === currentRoute) {
        setTransitionState('idle');
        return;
      }

      setTransitionDirection(routeIndex[nextRoute] >= routeIndex[currentRoute] ? 'forward' : 'backward');

      if (prefersReducedMotion) {
        displayRouteRef.current = nextRoute;
        startTransition(() => {
          setDisplayRoute(nextRoute);
          setTransitionState('idle');
        });
        return;
      }

      startTransition(() => {
        setTransitionState('exiting');
      });

      const exitTimer = window.setTimeout(() => {
        displayRouteRef.current = nextRoute;
        startTransition(() => {
          setDisplayRoute(nextRoute);
          setTransitionState('entering');
        });

        const enterTimer = window.setTimeout(() => {
          startTransition(() => {
            setTransitionState('idle');
          });
        }, 24);

        transitionTimers.current.push(enterTimer);
      }, transitionDurationMs);

      transitionTimers.current.push(exitTimer);
    },
    [prefersReducedMotion],
  );

  useEffect(() => {
    let cancelled = false;
    const storedToken = readStoredSessionToken();

    if (!storedToken) {
      setAuthReady(true);
      return;
    }

    setSessionToken(storedToken);
    fetchCurrentAuthUser(storedToken)
      .then((user) => {
        if (cancelled) {
          return;
        }

        const sessionUser = toSessionUser(user);
        setCurrentUser((current) => (isSameSessionUser(current, sessionUser) ? current : sessionUser));
        setWorkspaceStore((current) => syncSessionUserIntoStore(current, sessionUser));
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(sessionTokenStorageKey);
        }
        if (!cancelled) {
          setSessionToken('');
          setCurrentUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !sessionToken) {
      return;
    }

    refreshWorkspaceData().catch((error) => {
      console.error('Failed to sync backend workspace data:', error);
    });
  }, [currentUser?.id, refreshWorkspaceData, sessionToken]);

  useEffect(() => {
    if (!authReady) {
      return undefined;
    }

    const syncRoute = () => {
      const nextRoute = readRouteFromHash();
      const resolvedRoute = resolveRouteForSession(nextRoute, currentUser);

      if (resolvedRoute !== nextRoute) {
        writeRouteToHash(resolvedRoute);
        return;
      }

      transitionToRoute(resolvedRoute);
    };

    if (!window.location.hash) {
      writeRouteToHash(resolveRouteForSession('login', currentUser));
    }

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, [authReady, currentUser, transitionToRoute]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(authLocaleStorageKey, authLocale);
    }
  }, [authLocale]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!authReady && window.location.hash === '') {
      writeRouteToHash('login');
    }
  }, [authReady]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (registeredEmail) {
      window.localStorage.setItem(registeredEmailStorageKey, registeredEmail);
      return;
    }

    window.localStorage.removeItem(registeredEmailStorageKey);
  }, [registeredEmail]);

  useEffect(() => {
    let cancelled = false;

    fetchBackendVersion()
      .then((backendVersion) => {
        if (cancelled) {
          return;
        }

        setVersionInfo((current) => ({
          ...current,
          backendVersion: backendVersion.version,
          backendBuildTime: backendVersion.buildTime,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setVersionInfo((current) => ({
            ...current,
            backendVersion: 'offline',
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const navigate = (nextRoute: Route) => {
    const resolvedRoute = resolveRouteForSession(nextRoute, currentUser);

    if (resolvedRoute === displayRouteRef.current && window.location.hash === `#/${resolvedRoute}`) {
      return;
    }

    if (window.location.hash === `#/${resolvedRoute}`) {
      transitionToRoute(resolvedRoute);
      return;
    }

    writeRouteToHash(resolvedRoute);
  };

  function handleAuthenticate(sessionUser: ops.UserSession, token: string) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(sessionTokenStorageKey, token);
      window.localStorage.removeItem(registeredEmailStorageKey);
    }

    setSessionToken(token);
    setCurrentUser(sessionUser);
    setRegisteredEmail('');
    setAuthNotice('');
    setWorkspaceStore((current) => syncSessionUserIntoStore(current, sessionUser));
  }

  function handleRegistrationComplete(email: string) {
    setRegisteredEmail(email);
    setAuthNotice(
      authLocale === 'zh'
        ? `注册成功，请使用 ${email} 登录。`
        : `Registration successful. Sign in with ${email}.`,
    );
    writeRouteToHash('login');
  }

  function handleSignOut() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(sessionTokenStorageKey);
    }

    setSessionToken('');
    setCurrentUser(null);
    writeRouteToHash('login');
  }

  const authVariant: AuthVariant = isAuthRoute(displayRoute) ? displayRoute : 'login';

  if (!authReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-slate-400">Northline</p>
          <p className="mt-3 text-lg text-slate-700">Restoring workspace session...</p>
        </div>
      </main>
    );
  }

  return (
    <div className={`app-shell app-shell--${displayRoute}`}>
      <div className={`screen-frame screen-frame--${transitionState} screen-frame--${transitionDirection}`}>
        {!currentUser || isAuthRoute(displayRoute) ? (
          <AuthPage
            variant={authVariant}
            locale={authLocale}
            onLocaleChange={setAuthLocale}
            onNavigate={navigate}
            onAuthenticate={handleAuthenticate}
            onRegistrationComplete={handleRegistrationComplete}
            registeredEmail={registeredEmail}
            authNotice={authNotice}
            onClearAuthNotice={() => setAuthNotice('')}
          />
        ) : (
          <Dashboard
            route={displayRoute as WorkspaceRoute}
            locale={authLocale}
            onLocaleChange={setAuthLocale}
            onNavigate={navigate}
            onSignOut={handleSignOut}
            store={workspaceStore}
            setStore={setWorkspaceStore}
            selections={operationalSelections}
            setSelections={setOperationalSelections}
            currentUser={currentUser}
            sessionToken={sessionToken}
            onRefreshWorkspaceData={refreshWorkspaceData}
          />
        )}
      </div>
      <VersionBadge info={versionInfo} />
    </div>
  );
}

type AuthPageProps = {
  variant: AuthVariant;
  locale: AuthLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  onNavigate: (route: Route) => void;
  onAuthenticate: (sessionUser: ops.UserSession, token: string) => void;
  onRegistrationComplete: (email: string) => void;
  registeredEmail: string;
  authNotice: string;
  onClearAuthNotice: () => void;
};

function AuthPage({
  variant,
  locale,
  onLocaleChange,
  onNavigate,
  onAuthenticate,
  onRegistrationComplete,
  registeredEmail,
  authNotice,
  onClearAuthNotice,
}: AuthPageProps) {
  const content = authContentByLocale[locale][variant];
  const brand = getBrandContent(locale);
  const isLogin = variant === 'login';
  const panelTitle = locale === 'zh' ? content.panelTitle : content.panelTitle.toUpperCase();
  const primaryAction = locale === 'zh' ? (isLogin ? '登录' : '注册') : isLogin ? 'LOGIN' : 'REGISTER';
  const forgotPasswordLabel = locale === 'zh' ? '忘记密码？' : 'Forgot Password?';
  const footerLabel = `${content.footerLabel} `;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailValue, setEmailValue] = useState(() => (isLogin ? registeredEmail : ''));
  const [passwordValue, setPasswordValue] = useState('');

  useEffect(() => {
    if (isLogin) {
      setEmailValue(registeredEmail);
      setPasswordValue('');
      return;
    }

    onClearAuthNotice();
    setPasswordValue('');
  }, [isLogin, onClearAuthNotice, registeredEmail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    const formData = new FormData(event.currentTarget);
    const email = emailValue.trim();
    const password = passwordValue;

    if (!email || !password) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (isLogin) {
        const result = await loginAuthUser({ email, password });
        onAuthenticate(toSessionUser(result.user), result.token);
        return;
      }

      const nameValue = String(formData.get('name') ?? '').trim();
      await registerAuthUser({ email, password, ...(nameValue ? { name: nameValue } : {}) });
      onRegistrationComplete(email);
      setPasswordValue('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication request failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-6 md:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1280px] items-center justify-center">
        <div className="grid w-full max-w-[1120px] overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-[0_26px_80px_rgba(15,23,42,0.12)] md:grid-cols-[0.39fr_0.61fr]">
          <div className="relative hidden min-h-[680px] overflow-hidden bg-[linear-gradient(160deg,#4f8dfc_0%,#2563eb_48%,#1d4ed8_100%)] md:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.26),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_38%)]" />
            <div className="absolute -left-12 top-6 h-32 w-[142%] -rotate-45 rounded-[34px] bg-white/16" />
            <div className="absolute -left-10 top-[10.5rem] h-24 w-[140%] -rotate-45 rounded-[34px] bg-white/10" />
            <div className="absolute -left-16 bottom-[5.5rem] h-28 w-[150%] -rotate-45 rounded-[34px] bg-slate-950/10" />
            <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-[42px] bg-white/94" />
            <div className="absolute left-8 top-[18%] h-52 w-[84%] -rotate-45 rounded-[42px] border border-white/15 bg-white/10 backdrop-blur-[2px]" />
            <div className="absolute left-12 top-[48%] h-[6.5rem] w-[60%] -rotate-45 rounded-[34px] border border-white/16 bg-white/14" />
            <div className="absolute right-[-16%] bottom-[7%] h-72 w-72 rotate-45 rounded-[46px] bg-black/8" />
            <div className="absolute bottom-[-5%] left-[-10%] h-60 w-60 rounded-[40px] bg-white/12" />
            <div className="absolute inset-y-0 right-0 w-px bg-white/20" />
          </div>

          <div className="flex flex-col bg-white px-7 py-7 md:px-12 md:py-9">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-base font-bold text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)]">
                  {brand.mark}
                </div>
                <div>
                  <p className="m-0 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-900">{brand.name}</p>
                </div>
              </div>

              <LanguageToggle locale={locale} onChange={onLocaleChange} compact className="auth-language-toggle" />
            </div>

            <nav
              className="mt-7 inline-grid w-full max-w-[264px] grid-cols-2 rounded-[22px] border border-slate-200 bg-slate-50 p-1"
              aria-label={locale === 'zh' ? '认证视图' : 'Authentication views'}
            >
              <button
                className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${variant === 'login' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                type="button"
                aria-current={variant === 'login' ? 'page' : undefined}
                onClick={() => onNavigate('login')}
              >
                {locale === 'zh' ? '登录' : 'Login'}
              </button>
              <button
                className={`rounded-[18px] px-4 py-3 text-sm font-semibold transition ${variant === 'register' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                type="button"
                aria-current={variant === 'register' ? 'page' : undefined}
                onClick={() => onNavigate('register')}
              >
                {locale === 'zh' ? '注册' : 'Register'}
              </button>
            </nav>

            <div className="mt-10 grid justify-items-center gap-4 text-center">
              <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-[0_18px_40px_rgba(37,99,235,0.24)]" aria-hidden="true">
                <UserGlyph />
              </div>
              <h1 className="m-0 text-[2.05rem] font-bold tracking-[0.18em] text-slate-900">{panelTitle}</h1>
            </div>

            <form className="mt-12 flex flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="space-y-7">
                {content.fields.map((field) => (
                  <label className="group block" key={field.label}>
                    <span className="sr-only">{field.label}</span>
                    <div className="flex items-center gap-3 border-b border-slate-300 pb-3 text-slate-400 transition group-focus-within:border-blue-600 group-focus-within:text-blue-600">
                      {field.type === 'password' ? <LockGlyph /> : <MailGlyph />}
                      {field.autoComplete === 'name' ? (
                        <input
                          name="name"
                          className="w-full border-0 bg-transparent px-0 py-0 text-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                          autoComplete={field.autoComplete}
                          placeholder={field.placeholder}
                          required
                          disabled={isSubmitting}
                          type={field.type}
                        />
                      ) : (
                        <input
                          name={field.type === 'password' ? 'password' : 'email'}
                          className="w-full border-0 bg-transparent px-0 py-0 text-lg text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                          autoComplete={field.autoComplete}
                          placeholder={field.placeholder}
                          required
                          disabled={isSubmitting}
                          type={field.type}
                          value={field.type === 'password' ? passwordValue : emailValue}
                          onChange={(event) => {
                            if (field.type === 'password') {
                              setPasswordValue(event.target.value);
                              return;
                            }

                            if (errorMessage) {
                              setErrorMessage('');
                            }
                            if (authNotice && isLogin) {
                              onClearAuthNotice();
                            }

                            setEmailValue(event.target.value);
                          }}
                        />
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {authNotice && isLogin ? (
                <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {authNotice}
                </p>
              ) : null}

              {errorMessage ? (
                <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorMessage}
                </p>
              ) : null}

              <p className="mt-5 text-xs text-slate-400">
                {locale === 'zh'
                  ? `当前认证服务：${getApiBaseUrl()}`
                  : `Current auth service: ${getApiBaseUrl()}`}
              </p>

              <div className="mt-7 flex items-center justify-between gap-4">
                {isLogin ? (
                  <button className="text-sm font-medium text-slate-500 transition hover:text-blue-700" type="button">
                    {forgotPasswordLabel}
                  </button>
                ) : (
                  <span />
                )}

                <button
                  className="inline-flex min-w-[168px] items-center justify-center rounded-full bg-blue-600 px-7 py-3 text-sm font-semibold tracking-[0.24em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 hover:shadow-[0_18px_34px_rgba(37,99,235,0.28)]"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (locale === 'zh' ? '处理中...' : 'PROCESSING...') : primaryAction}
                </button>
              </div>

              <div className="mt-8 flex items-center justify-center gap-1 text-sm text-slate-500">
                <span>{footerLabel}</span>
                <button className="font-semibold text-blue-700 transition hover:text-blue-800" type="button" onClick={() => onNavigate(content.footerRoute)}>
                  {content.footerAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}

function UserGlyph() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 7a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7.5h16v9H4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m5 8 7 5 7-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.5 10V8a4.5 4.5 0 1 1 9 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default App;
