import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import { authContent, brandContent, routeOrder, type AuthVariant, type Route } from './content';

const validRoutes = new Set<Route>(routeOrder);
const routeIndex = Object.fromEntries(routeOrder.map((route, index) => [route, index])) as Record<Route, number>;
const transitionDurationMs = 220;

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

function App() {
  const initialRoute = readRouteFromHash();
  const [displayRoute, setDisplayRoute] = useState<Route>(initialRoute);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const prefersReducedMotion = usePrefersReducedMotion();
  const displayRouteRef = useRef<Route>(initialRoute);
  const transitionTimers = useRef<number[]>([]);

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

  const transitionToRoute = useCallback((nextRoute: Route) => {
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
  }, [prefersReducedMotion]);

  useEffect(() => {
    const syncRoute = () => {
      transitionToRoute(readRouteFromHash());
    };

    if (!window.location.hash) {
      writeRouteToHash('login');
    }

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, [transitionToRoute]);

  const navigate = (nextRoute: Route) => {
    if (nextRoute === displayRouteRef.current && window.location.hash === `#/${nextRoute}`) {
      return;
    }

    if (window.location.hash === `#/${nextRoute}`) {
      transitionToRoute(nextRoute);
      return;
    }

    writeRouteToHash(nextRoute);
  };

  return (
    <div className={`app-shell app-shell--${displayRoute}`}>
      <div className={`screen-frame screen-frame--${transitionState} screen-frame--${transitionDirection}`}>
        {displayRoute === 'dashboard' ? (
          <Dashboard onNavigate={navigate} />
        ) : (
          <AuthPage variant={displayRoute} onNavigate={navigate} />
        )}
      </div>
    </div>
  );
}

type AuthPageProps = {
  variant: AuthVariant;
  onNavigate: (route: Route) => void;
};

function AuthPage({ variant, onNavigate }: AuthPageProps) {
  const content = authContent[variant];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onNavigate('dashboard');
  };

  return (
    <main className={`auth-screen auth-screen--${variant}`}>
      <section className="auth-hero" aria-label={`${brandContent.name} overview`}>
        <div className="auth-hero__surface">
          <header className="auth-hero__header">
            <div className="brand-lockup">
              <div className="brand-mark" aria-hidden="true">
                {brandContent.mark}
              </div>
              <div className="brand-copy">
                <p className="brand-name">{brandContent.name}</p>
                <p className="brand-caption">{brandContent.caption}</p>
              </div>
            </div>

            <p className="utility-label">{brandContent.workspaceLabel}</p>
          </header>

          <div className="auth-hero__body">
            <p className="section-kicker">{content.eyebrow}</p>
            <h1 className="page-title">{content.title}</h1>
            <p className="page-description">{content.description}</p>
          </div>

          <div className="auth-hero__footer">
            <div className="auth-support">
              {content.supportItems.map((item) => (
                <div className="support-item" key={item.title}>
                  <p className="support-item__title">{item.title}</p>
                  <p className="support-item__copy">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="auth-signal-strip" aria-label={content.signalLabel}>
              {content.signalStrip.map((signal) => (
                <div className="auth-signal" key={signal.label}>
                  <span className="auth-signal__label">{signal.label}</span>
                  <strong className="auth-signal__value">{signal.value}</strong>
                  <p className="auth-signal__detail">{signal.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <nav className="panel-nav" aria-label="Authentication views">
            <button
              className={`panel-nav__link ${variant === 'login' ? 'is-active' : ''}`}
              type="button"
              aria-current={variant === 'login' ? 'page' : undefined}
              onClick={() => onNavigate('login')}
            >
              Sign in
            </button>
            <button
              className={`panel-nav__link ${variant === 'register' ? 'is-active' : ''}`}
              type="button"
              aria-current={variant === 'register' ? 'page' : undefined}
              onClick={() => onNavigate('register')}
            >
              Register
            </button>
            <button className="panel-nav__link panel-nav__link--muted" type="button" onClick={() => onNavigate('dashboard')}>
              Dashboard
            </button>
          </nav>

          <div className="panel-heading">
            <p className="section-kicker">{content.panelEyebrow}</p>
            <h2>{content.panelTitle}</h2>
            <p>{content.panelDescription}</p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            {content.fields.map((field) => (
              <label className="field" key={field.label}>
                <span>{field.label}</span>
                <input
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  required
                  type={field.type}
                />
              </label>
            ))}

            <div className="button-row">
              <button className="primary-button" type="submit">
                {content.primaryAction}
              </button>
              <button className="secondary-button" type="button" onClick={() => onNavigate(content.secondaryRoute)}>
                {content.secondaryAction}
              </button>
            </div>
          </form>

          <div className="panel-footer">
            <p>{content.footerLabel}</p>
            <button className="ghost-link" type="button" onClick={() => onNavigate(content.footerRoute)}>
              {content.footerAction}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
