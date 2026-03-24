import { useEffect, useState } from 'react';
import {
  brandContent,
  getWorkspacePage,
  workspaceFooterLinks,
  workspaceNavigation,
  type DashboardPage,
  type ModulePage,
  type Route,
  type WorkspaceRoute,
} from './content';

type DashboardProps = {
  route: WorkspaceRoute;
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

export default function Dashboard({ route, onNavigate }: DashboardProps) {
  const [now, setNow] = useState(() => new Date());
  const page = getWorkspacePage(route);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="workspace-sidebar__top">
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
        </div>

        <div className="workspace-nav-groups">
          {workspaceNavigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-group__title">{group.label}</p>
              <div className="nav-group__items">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className={`nav-item ${page.navKey === item.key ? 'is-active' : ''}`}
                    aria-current={page.navKey === item.key ? 'page' : undefined}
                    onClick={() => onNavigate(item.route)}
                  >
                    <span className="nav-item__label">{item.label}</span>
                    <span className="nav-item__detail">{item.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="workspace-sidebar__footer">
          {workspaceFooterLinks.map((action) => (
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
      </aside>

      <main className="workspace-main">
        <header
          className="workspace-hero"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(4, 9, 14, 0.22), rgba(4, 9, 14, 0.76)), url(${page.heroImage})`,
          }}
        >
          <div className="workspace-hero__copy">
            <p className="section-kicker">{page.section}</p>
            <h1 className="dashboard-title">{page.title}</h1>
            <p className="dashboard-copy">{page.description}</p>

            {'tabs' in page ? (
              <div className="page-tabs" aria-label="Page mode">
                {page.tabs.map((tab) => (
                  <button
                    key={tab.route}
                    type="button"
                    className={`page-tab ${route === tab.route ? 'is-active' : ''}`}
                    aria-current={route === tab.route ? 'page' : undefined}
                    onClick={() => onNavigate(tab.route)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="workspace-hero__meta">
            <div className="hero-meta-block">
              <span className="hero-meta-block__label">Last sync</span>
              <strong>{formatDate(now)}</strong>
              <span>{formatTime(now)}</span>
            </div>
            <div className="hero-meta-block">
              <span className="hero-meta-block__label">Image source</span>
              <strong>Existing repo asset</strong>
              <span>{route === 'dashboard' ? 'home-bg.jpg' : 'home-bg.jpg + module pages'}</span>
            </div>
          </div>
        </header>

        {page.kind === 'dashboard' ? (
          <DashboardPageView page={page} onNavigate={onNavigate} />
        ) : (
          <ModulePageView page={page} onNavigate={onNavigate} />
        )}
      </main>
    </div>
  );
}

function DashboardPageView({ page, onNavigate }: { page: DashboardPage; onNavigate: (route: Route) => void }) {
  return (
    <>
      <section className="summary-strip" aria-label="Dashboard metrics">
        {page.metrics.map((item) => (
          <div className="summary-item" key={item.label}>
            <span className="summary-item__label">{item.label}</span>
            <strong className="summary-item__value">{item.value}</strong>
            <p className="summary-item__detail">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="workspace-layout workspace-layout--dashboard">
        <section className="page-panel page-panel--main">
          <div className="section-heading section-heading--stack">
            <div>
              <p className="section-kicker">Module map</p>
              <h2>Left navigation modules</h2>
            </div>
            <p className="section-copy">
              The workspace sidebar now follows the documented Dashboard, Warehouse Management, and Product Management structure.
            </p>
          </div>

          <div className="module-groups">
            {page.moduleHighlights.map((group) => (
              <section className="module-group-panel" key={group.label}>
                <div className="module-group-panel__header">
                  <p className="section-kicker">{group.label}</p>
                  <h3>{group.label}</h3>
                </div>

                <div className="module-group-panel__items">
                  {group.items.map((item) => (
                    <button
                      key={`${group.label}-${item.label}`}
                      type="button"
                      className="module-link"
                      onClick={() => onNavigate(item.route)}
                    >
                      <span className="module-link__label">{item.label}</span>
                      <span className="module-link__detail">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <aside className="page-panel page-panel--rail">
          {page.coverage.map((block) => (
            <section className="rail-block" key={block.title}>
              <div className="section-heading section-heading--stack">
                <div>
                  <p className="section-kicker">{block.title}</p>
                  <h2>{block.title}</h2>
                </div>
              </div>

              <ul className="mono-list">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}

          <section className="rail-block">
            <div className="section-heading section-heading--stack">
              <div>
                <p className="section-kicker">Quick actions</p>
                <h2>Jump into modules</h2>
              </div>
            </div>

            <div className="button-stack">
              {page.actions.map((action) => (
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

      <section className="page-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Page coverage</p>
            <h2>{page.spotlight.title}</h2>
          </div>
          <p className="section-copy">{page.spotlight.description}</p>
        </div>

        <div className="table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                {page.spotlight.columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {page.spotlight.rows.map((row) => (
                <tr key={`${row.module}-${row.entity}`}>
                  {page.spotlight.columns.map((column) => (
                    <td key={column.key}>{row[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ModulePageView({ page, onNavigate }: { page: ModulePage; onNavigate: (route: Route) => void }) {
  return (
    <>
      <section className="summary-strip" aria-label={`${page.title} summary`}>
        {page.summary.map((item) => (
          <div className="summary-item" key={item.label}>
            <span className="summary-item__label">{item.label}</span>
            <strong className="summary-item__value">{item.value}</strong>
            <p className="summary-item__detail">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="workspace-layout">
        <section className="page-panel page-panel--main">
          {page.kind === 'list' ? (
            <>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">List page</p>
                  <h2>{page.title}</h2>
                </div>
                <p className="section-copy">Rows and columns below are aligned to the documented entity fields for this module.</p>
              </div>

              <div className="table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      {page.columns?.map((column) => (
                        <th key={column.key}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows?.map((row, index) => (
                      <tr key={`${page.title}-${index}`}>
                        {page.columns?.map((column) => (
                          <td key={column.key}>{row[column.key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Detail page</p>
                  <h2>{page.title}</h2>
                </div>
                <p className="section-copy">The field groups below are built from the basic field list and the module relationships from the execution docs.</p>
              </div>

              <div className="detail-groups">
                {page.detailGroups?.map((group) => (
                  <section className="detail-group" key={group.title}>
                    <div className="detail-group__header">
                      <p className="section-kicker">{group.title}</p>
                      <h3>{group.title}</h3>
                    </div>

                    <dl className="detail-list">
                      {group.fields.map((field) => (
                        <div className="detail-list__row" key={field.label}>
                          <dt>{field.label}</dt>
                          <dd>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            </>
          )}
        </section>

        <aside className="page-panel page-panel--rail">
          <section className="rail-block">
            <div className="section-heading section-heading--stack">
              <div>
                <p className="section-kicker">Entity source</p>
                <h2>{page.entityLabel}</h2>
              </div>
              <p className="section-copy">Exact field names below come from `basic-field-list.md`.</p>
            </div>

            <div className="blueprint-groups">
              {page.fieldBlueprint.map((group) => (
                <div className="blueprint-group" key={group.title}>
                  <p className="blueprint-group__title">{group.title}</p>
                  <ul className="mono-list">
                    {group.fields.map((field) => (
                      <li key={field}>{field}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-block">
            <div className="section-heading section-heading--stack">
              <div>
                <p className="section-kicker">Actions</p>
                <h2>Route controls</h2>
              </div>
            </div>

            <div className="button-stack">
              {page.actions.map((action) => (
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
    </>
  );
}
