import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import LanguageToggle from './LanguageToggle';
import OperationalModuleView from './OperationalViews';
import OcrWorkbench from './OcrWorkbench';
import WarehouseDashboardView from './WarehouseDashboardView';
import {
  getBrandContent,
  isAuthRoute,
  getLocaleTag,
  getWorkspaceFooterLinks,
  getWorkspaceNavigation,
  getWorkspacePage,
  type AuthLocale,
  type Route,
  type WorkspaceRoute,
} from './content';
import * as ops from './operations';

type DashboardProps = {
  route: WorkspaceRoute;
  locale: AuthLocale;
  onLocaleChange: (locale: AuthLocale) => void;
  onNavigate: (route: Route) => void;
  onSignOut: () => void;
  store: ops.WorkspaceStore;
  setStore: Dispatch<SetStateAction<ops.WorkspaceStore>>;
  selections: ops.OperationalSelections;
  setSelections: Dispatch<SetStateAction<ops.OperationalSelections>>;
  currentUser: ops.UserSession | null;
  sessionToken: string;
  onRefreshWorkspaceData: (options?: { selections?: Partial<ops.OperationalSelections> }) => Promise<void>;
};

function formatDateTime(value: string, locale: AuthLocale) {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatNow(now: Date, locale: AuthLocale) {
  return new Intl.DateTimeFormat(getLocaleTag(locale), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
}

function resolveWorkspaceRoute(route: WorkspaceRoute): WorkspaceRoute {
  if (
    route === 'stocktaking-list' ||
    route === 'stocktaking-detail' ||
    route === 'logistics-documents-list' ||
    route === 'logistics-documents-detail'
  ) {
    return 'inventory-list';
  }

  if (
    route === 'product-list' ||
    route === 'product-detail' ||
    route === 'product-create' ||
    route === 'product-edit' ||
    route === 'category-list' ||
    route === 'category-detail' ||
    route === 'category-create' ||
    route === 'category-edit'
  ) {
    return 'dashboard';
  }

  return route;
}

export default function Dashboard({
  route,
  locale,
  onLocaleChange,
  onNavigate,
  onSignOut,
  store,
  setStore,
  selections,
  setSelections,
  currentUser,
  sessionToken,
  onRefreshWorkspaceData,
}: DashboardProps) {
  const [now, setNow] = useState(() => new Date());
  const [isWorkspaceNavCollapsed, setIsWorkspaceNavCollapsed] = useState(true);
  const resolvedRoute = resolveWorkspaceRoute(route);
  const activeRoute = currentUser && ops.canAccessWorkspaceRoute(currentUser, resolvedRoute) ? resolvedRoute : ops.getDefaultWorkspaceRoute(currentUser);
  const page = getWorkspacePage(activeRoute, locale);
  const isRedirected = resolvedRoute !== route;
  const isOcrRoute = activeRoute === 'ocr-workbench';
  const brand = getBrandContent(locale);
  const navigation = useMemo(
    () =>
      getWorkspaceNavigation(locale)
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => ops.canAccessWorkspaceRoute(currentUser, item.route)),
        }))
        .filter((group) => group.items.length > 0),
    [currentUser, locale],
  );
  const footerLinks = getWorkspaceFooterLinks(locale);
  const visibleActions = page.actions.filter((action) => isAuthRoute(action.route) || ops.canAccessWorkspaceRoute(currentUser, action.route as WorkspaceRoute));
  const roleLabel = locale === 'zh' ? (currentUser?.role === 'Admin' ? '管理员' : '员工') : currentUser?.role ?? 'Staff';

  useEffect(() => {
    if (activeRoute !== route) {
      onNavigate(activeRoute);
    }
  }, [activeRoute, onNavigate, route]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (!currentUser) {
    return null;
  }

  return (
    <div className={`admin-shell ${isOcrRoute ? 'admin-shell--ocr' : ''} ${isOcrRoute && isWorkspaceNavCollapsed ? 'admin-shell--nav-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              {brand.mark}
            </div>
            <div className="brand-copy">
              <p className="brand-name">{brand.name}</p>
              <p className="brand-caption">{brand.caption}</p>
            </div>
          </div>

          <p className="admin-sidebar__label">{brand.workspaceLabel}</p>
        </div>

        <nav className="admin-nav" aria-label={locale === 'zh' ? '工作区导航' : 'Workspace navigation'}>
          {navigation.flatMap((group) => group.items).map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-nav__item ${page.navKey === item.key ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.route)}
            >
              <span className="admin-nav__label">{item.label}</span>
              <span className="admin-nav__detail">{item.detail}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          {footerLinks.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.tone === 'primary' ? 'primary-button' : 'secondary-button'}
              onClick={() => (action.route === 'login' ? onSignOut() : onNavigate(action.route))}
            >
              {action.label}
            </button>
          ))}
        </div>
      </aside>

      <main className="admin-main">
        {isOcrRoute ? (
          <button
            type="button"
            className="ocr-shell-toggle"
            onClick={() => setIsWorkspaceNavCollapsed((current) => !current)}
            aria-label={isWorkspaceNavCollapsed ? (locale === 'zh' ? '展开导航' : 'Show navigation') : locale === 'zh' ? '收起导航' : 'Hide navigation'}
          >
            <svg viewBox="0 0 24 24" className={`ocr-shell-toggle__icon ${isWorkspaceNavCollapsed ? '' : 'is-open'}`} fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14.5 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        <header className="admin-page-header">
          <div className="admin-page-header__copy">
            <p className="section-kicker">{page.section}</p>
            <h1 className="dashboard-title">{page.title}</h1>
            <p className="dashboard-copy">{page.description}</p>

            {isRedirected ? (
              <div className="admin-inline-note">
                {locale === 'zh'
                  ? '该路由在本轮前端改版中已收敛到简化后的后台工作区。'
                  : 'This route was consolidated into the simplified admin workspace for this frontend pass.'}
              </div>
            ) : null}
          </div>

          <div className="admin-page-header__meta">
            <div className="admin-meta-card">
              <span>{locale === 'zh' ? '当前用户' : 'Signed in as'}</span>
              <strong>{currentUser.name}</strong>
              <small>{roleLabel}</small>
            </div>

            <div className="admin-meta-card">
              <span>{locale === 'zh' ? '当前时间' : 'Workspace time'}</span>
              <strong>{formatNow(now, locale)}</strong>
            </div>

            <div className="admin-meta-card">
              <span>{locale === 'zh' ? '最近同步' : 'Last sync'}</span>
              <strong>{formatDateTime(store.lastSync, locale)}</strong>
            </div>

            <LanguageToggle locale={locale} onChange={onLocaleChange} compact className="auth-language-toggle" />
          </div>
        </header>

        <section className="admin-page-body">
          {page.kind === 'dashboard' ? (
            <WarehouseDashboardView
              page={{ ...page, actions: visibleActions }}
              store={store}
              locale={locale}
              onNavigate={onNavigate}
              canReviewApprovals={ops.hasPermission(currentUser, 'approve_orders')}
            />
          ) : activeRoute === 'ocr-workbench' ? (
            <OcrWorkbench locale={locale} sessionToken={sessionToken} />
          ) : (
            <OperationalModuleView
              route={activeRoute}
              page={{ ...page, actions: visibleActions }}
              locale={locale}
              store={store}
              setStore={setStore}
              selections={selections}
              setSelections={setSelections}
              onNavigate={onNavigate}
              currentUser={currentUser}
              sessionToken={sessionToken}
              onRefreshWorkspaceData={onRefreshWorkspaceData}
            />
          )}
        </section>
      </main>
    </div>
  );
}
