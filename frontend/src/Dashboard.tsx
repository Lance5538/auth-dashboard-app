import { useEffect, useState } from 'react';

type Route = 'login' | 'register' | 'dashboard';

type DashboardProps = {
  onNavigate: (route: Route) => void;
};

const metrics = [
  { label: 'Orders today', value: '24' },
  { label: 'Categories', value: '8' },
  { label: 'Products tracked', value: '136' },
  { label: 'Pending review', value: '5' },
];

const orders = [
  { user: 'User_01', orderNo: 'ORD-1024', product: 'Bolt Set A', spec: 'M10 x 50', status: 'Packed' },
  { user: 'User_01', orderNo: 'ORD-1023', product: 'Nut Pack B', spec: 'M12', status: 'Picking' },
  { user: 'User_02', orderNo: 'ORD-1022', product: 'Washer C', spec: '16 mm', status: 'Awaiting QC' },
  { user: 'User_03', orderNo: 'ORD-1021', product: 'Clamp D', spec: '22 mm', status: 'Shipped' },
];

const activityItems = [
  {
    title: 'Morning sync completed',
    description: 'Warehouse intake and dispatch figures were refreshed a few minutes ago.',
  },
  {
    title: 'Low-stock attention',
    description: 'Twelve items are below threshold and need a replenishment decision.',
  },
  {
    title: 'Operator handoff',
    description: 'The current shift left notes for two orders that require manual confirmation.',
  },
];

function formatDate(now: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(now);
}

function formatTime(now: Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(now);
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">N</div>
          <div>
            <p className="brand-name">Northline</p>
            <p className="brand-caption">Operations console</p>
          </div>
        </div>

        <nav className="dashboard-nav" aria-label="Dashboard navigation">
          <button className="dashboard-nav__item" type="button" onClick={() => onNavigate('login')}>
            Back to Login
          </button>
          <button className="dashboard-nav__item is-active" type="button" onClick={() => onNavigate('dashboard')}>
            Orders
          </button>
          <button className="dashboard-nav__item" type="button" onClick={() => onNavigate('register')}>
            Register View
          </button>
          <button className="dashboard-nav__item" type="button" onClick={() => onNavigate('login')}>
            Log Out
          </button>
        </nav>

        <div className="dashboard-quick">
          <p className="dashboard-kicker">Quick status</p>
          <strong>12 items low in stock</strong>
          <span>Login and register now both land directly on this dashboard preview.</span>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-intro">
            <p className="eyebrow">Dashboard view</p>
            <h1>Inventory and order flow in one place.</h1>
            <p>
              The React project now owns the main preview experience, so login and registration both arrive here
              directly instead of stopping on a separate home page.
            </p>
          </div>

          <div className="dashboard-stamp">
            <span className="dashboard-stamp__label">Last refresh</span>
            <strong>{formatDate(now)}</strong>
            <span>{formatTime(now)}</span>
          </div>
        </header>

        <section className="dashboard-metrics" aria-label="Key metrics">
          {metrics.map((metric) => (
            <div className="metric-block" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </section>

        <section className="dashboard-layout">
          <div className="dashboard-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recent orders</p>
                <h2>Live order queue</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => onNavigate('login')}>
                Return to login
              </button>
            </div>

            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Order No.</th>
                    <th>Product</th>
                    <th>Spec</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.orderNo}>
                      <td>{order.user}</td>
                      <td>{order.orderNo}</td>
                      <td>{order.product}</td>
                      <td>{order.spec}</td>
                      <td>
                        <span className="status-pill">{order.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="dashboard-side-stack">
            <section className="dashboard-section">
              <p className="eyebrow">Team notes</p>
              <h2>What needs attention</h2>
              <ul className="activity-list">
                {activityItems.map((item) => (
                  <li key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-section">
              <p className="eyebrow">Next action</p>
              <h2>Keep the flow connected</h2>
              <p className="dashboard-note">
                Because the app now uses direct login-to-dashboard routing, you can preview the important screens from
                one React bundle without maintaining a separate home step.
              </p>
              <div className="button-row dashboard-actions">
                <button className="primary-button" type="button" onClick={() => onNavigate('register')}>
                  View Register
                </button>
                <button className="secondary-button" type="button" onClick={() => onNavigate('login')}>
                  Back to Login
                </button>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}
