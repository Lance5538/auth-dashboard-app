import { startTransition, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';
import Dashboard from './Dashboard';

type Route = 'login' | 'register' | 'dashboard';

const validRoutes = new Set<Route>(['login', 'register', 'dashboard']);

const authContent = {
  login: {
    eyebrow: 'Workspace access',
    title: 'Sign in and open the dashboard.',
    description:
      'Keep account access, order flow, and inventory visibility in one calm place without switching between separate HTML pages.',
    primaryAction: 'Log In',
    secondaryLabel: "Don't have an account yet?",
    secondaryAction: 'Create One',
    secondaryRoute: 'register' as Route,
    fields: [
      { label: 'Username', type: 'text', placeholder: 'Enter your username' },
      { label: 'Password', type: 'password', placeholder: 'Enter your password' },
    ],
  },
  register: {
    eyebrow: 'New workspace',
    title: 'Create your account and continue.',
    description:
      'Set up a clean starting point for login and daily operations, then land directly on the dashboard instead of a separate home page.',
    primaryAction: 'Create Account',
    secondaryLabel: 'Already registered?',
    secondaryAction: 'Back to Login',
    secondaryRoute: 'login' as Route,
    fields: [
      { label: 'Username', type: 'text', placeholder: 'Choose a username' },
      { label: 'Email', type: 'email', placeholder: 'Enter your email' },
      { label: 'Password', type: 'password', placeholder: 'Create a password' },
    ],
  },
};

const authHighlights = [
  'Login and register both route directly into the dashboard preview',
  'Single React entry instead of separate HTML files that drift apart',
  'Shared visual language across authentication and dashboard screens',
];

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

function App() {
  const [route, setRoute] = useState<Route>(() => readRouteFromHash());

  useEffect(() => {
    const syncRoute = () => {
      const nextRoute = readRouteFromHash();
      startTransition(() => {
        setRoute(nextRoute);
      });
    };

    if (!window.location.hash) {
      writeRouteToHash('login');
    }

    syncRoute();
    window.addEventListener('hashchange', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const navigate = (nextRoute: Route) => {
    writeRouteToHash(nextRoute);
    startTransition(() => {
      setRoute(nextRoute);
    });
  };

  if (route === 'dashboard') {
    return (
      <div className="app-shell">
        <Dashboard onNavigate={navigate} />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AuthPage variant={route} onNavigate={navigate} />
    </div>
  );
}

type AuthPageProps = {
  variant: 'login' | 'register';
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
      <div className="auth-screen__grid">
        <section className="auth-screen__hero">
          <div className="brand-lockup">
            <div className="brand-mark">N</div>
            <div>
              <p className="brand-name">Northline</p>
              <p className="brand-caption">Unified login and dashboard flow</p>
            </div>
          </div>

          <div className="route-pills" aria-label="Primary navigation">
            <a className={`route-pill ${variant === 'login' ? 'is-active' : ''}`} href="#/login">
              Login
            </a>
            <a className={`route-pill ${variant === 'register' ? 'is-active' : ''}`} href="#/register">
              Register
            </a>
            <a className="route-pill" href="#/dashboard">
              Dashboard
            </a>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 className="page-title">{content.title}</h1>
            <p className="page-description">{content.description}</p>
          </div>

          <ul className="detail-list">
            {authHighlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </section>

        <section className="form-panel">
          <div className="panel-heading">
            <p className="eyebrow">React primary version</p>
            <h2>{variant === 'login' ? 'Welcome back' : 'Start your workspace'}</h2>
            <p>
              {variant === 'login'
                ? 'Use the form below to continue directly into the dashboard.'
                : 'Create your account and continue directly into the dashboard.'}
            </p>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>
            {content.fields.map((field) => (
              <label className="field" key={field.label}>
                <span>{field.label}</span>
                <input type={field.type} placeholder={field.placeholder} required />
              </label>
            ))}

            <div className="button-row">
              <button className="primary-button" type="submit">
                {content.primaryAction}
              </button>
              <button className="secondary-button" type="button" onClick={() => onNavigate('dashboard')}>
                Open Dashboard
              </button>
            </div>
          </form>

          <div className="panel-footer">
            <p>{content.secondaryLabel}</p>
            <button className="ghost-link" type="button" onClick={() => onNavigate(content.secondaryRoute)}>
              {content.secondaryAction}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
