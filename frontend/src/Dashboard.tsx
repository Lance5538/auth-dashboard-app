import { useEffect, useState } from 'react';
import { brandContent, dashboardContent, type Route } from './content';

type DashboardProps = {
  onNavigate: (route: Route) => void;
};

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
        <div className="dashboard-sidebar__top">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              {brandContent.mark}
            </div>
            <div className="brand-copy">
              <p className="brand-name">{brandContent.name}</p>
              <p className="brand-caption">{brandContent.caption}</p>
            </div>
          </div>

          <p className="utility-label utility-label--sidebar">{dashboardContent.sidebarLabel}</p>
        </div>

        <nav className="dashboard-nav" aria-label="Workspace navigation">
          {dashboardContent.navItems.map((item) => {
            const isActive = item.route === 'dashboard';

            return (
              <button
                key={`${item.label}-${item.route}`}
                aria-current={isActive ? 'page' : undefined}
                className={`dashboard-nav__item ${isActive ? 'is-active' : ''}`}
                type="button"
                onClick={() => onNavigate(item.route)}
              >
                <span className="dashboard-nav__title">{item.label}</span>
                <span className="dashboard-nav__detail">{item.detail}</span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-sidebar__status">
          <p className="section-kicker">{dashboardContent.statusBlock.label}</p>
          <strong>{dashboardContent.statusBlock.value}</strong>
          <p>{dashboardContent.statusBlock.description}</p>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-intro">
            <p className="section-kicker">{dashboardContent.overview.eyebrow}</p>
            <h1 className="dashboard-title">{dashboardContent.overview.title}</h1>
            <p className="dashboard-copy">{dashboardContent.overview.description}</p>
          </div>

          <div className="dashboard-stamp">
            <span className="dashboard-stamp__label">Last sync</span>
            <strong>{formatDate(now)}</strong>
            <span>{formatTime(now)}</span>
          </div>
        </header>

        <section aria-labelledby="selected-kpis" className="dashboard-metric-section">
          <div className="section-heading section-heading--stack">
            <div>
              <p className="section-kicker">{dashboardContent.metricsSection.eyebrow}</p>
              <h2 id="selected-kpis">{dashboardContent.metricsSection.title}</h2>
            </div>
            <p className="section-copy">{dashboardContent.metricsSection.description}</p>
          </div>

          <div className="dashboard-metrics">
            {dashboardContent.metrics.map((metric) => (
              <div className="metric-block" key={metric.label}>
                <span className="metric-block__label">{metric.label}</span>
                <strong className="metric-block__value">{metric.value}</strong>
                <p className="metric-block__detail">{metric.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-layout">
          <section className="dashboard-panel dashboard-panel--primary">
            <div className="section-heading">
              <div>
                <p className="section-kicker">{dashboardContent.queue.eyebrow}</p>
                <h2>{dashboardContent.queue.title}</h2>
              </div>
              <button className="secondary-button" type="button" onClick={() => onNavigate('login')}>
                {dashboardContent.queue.actionLabel}
              </button>
            </div>

            <p className="section-copy">{dashboardContent.queue.description}</p>

            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    {dashboardContent.queue.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dashboardContent.orders.map((order) => (
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
          </section>

          <aside className="dashboard-panel dashboard-panel--rail">
            {dashboardContent.railSections.map((section) => (
              <section className="dashboard-rail-section" key={section.title}>
                <div className="section-heading section-heading--stack">
                  <div>
                    <p className="section-kicker">{section.eyebrow}</p>
                    <h2>{section.title}</h2>
                  </div>
                  <p className="section-copy">{section.description}</p>
                </div>

                <ul className="activity-list">
                  {section.items.map((item) => (
                    <li key={item.title}>
                      <div className="activity-row">
                        <h3>{item.title}</h3>
                        <span className="activity-meta">{item.meta}</span>
                      </div>
                      <p>{item.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <section className="dashboard-rail-section">
              <div className="section-heading section-heading--stack">
                <div>
                  <p className="section-kicker">{dashboardContent.actions.eyebrow}</p>
                  <h2>{dashboardContent.actions.title}</h2>
                </div>
                <p className="section-copy">{dashboardContent.actions.description}</p>
              </div>

              <div className="button-row dashboard-actions">
                {dashboardContent.actions.items.map((action) => (
                  <button
                    key={action.label}
                    className={action.tone === 'primary' ? 'primary-button' : 'secondary-button'}
                    type="button"
                    onClick={() => onNavigate(action.route)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
