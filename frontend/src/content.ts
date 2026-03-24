export type Route = 'login' | 'register' | 'dashboard';

export type AuthVariant = Exclude<Route, 'dashboard'>;

type AuthField = {
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  autoComplete: string;
};

type AuthSupportItem = {
  title: string;
  description: string;
};

type AuthSignal = {
  label: string;
  value: string;
  detail: string;
};

type AuthScreenContent = {
  eyebrow: string;
  title: string;
  description: string;
  signalLabel: string;
  supportItems: AuthSupportItem[];
  signalStrip: AuthSignal[];
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
  primaryAction: string;
  secondaryAction: string;
  secondaryRoute: Route;
  footerLabel: string;
  footerAction: string;
  footerRoute: AuthVariant;
  fields: AuthField[];
};

type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

type DashboardOrder = {
  user: string;
  orderNo: string;
  product: string;
  spec: string;
  status: string;
};

type DashboardRailItem = {
  title: string;
  meta: string;
  description: string;
};

type DashboardRailSection = {
  eyebrow: string;
  title: string;
  description: string;
  items: DashboardRailItem[];
};

type DashboardAction = {
  label: string;
  route: Route;
  tone: 'primary' | 'secondary';
};

export const routeOrder: Route[] = ['login', 'register', 'dashboard'];

export const brandContent = {
  mark: 'N',
  name: 'Northline',
  caption: 'Warehouse operations system',
  workspaceLabel: 'Shift-ready access for inbound, outbound, and stock control.',
};

export const authContent: Record<AuthVariant, AuthScreenContent> = {
  login: {
    eyebrow: 'Warehouse access',
    title: 'Sign in to the control room.',
    description:
      'Open live order flow, low-stock attention, and shift notes from one connected workspace without a separate handoff screen.',
    signalLabel: 'Current shift context',
    supportItems: [
      {
        title: 'Role scope',
        description: 'Admin, operator, and viewer access share one entry path.',
      },
      {
        title: 'Direct routing',
        description: 'Successful sign-in lands directly in the working surface.',
      },
      {
        title: 'Shift context',
        description: 'Queue status and stock attention stay visible after entry.',
      },
    ],
    signalStrip: [
      {
        label: 'Today',
        value: '24 order updates',
        detail: 'Inbound and outbound activity is already queued for review.',
      },
      {
        label: 'Attention',
        value: '12 SKUs low',
        detail: 'Replenishment checks remain visible after sign-in.',
      },
      {
        label: 'Sync',
        value: '08:40 local',
        detail: 'The workspace opens with the latest refresh timestamp.',
      },
    ],
    panelEyebrow: 'Secure sign-in',
    panelTitle: 'Sign in to Northline',
    panelDescription: 'Enter your credentials and continue directly into the live workspace.',
    primaryAction: 'Log In',
    secondaryAction: 'Open Dashboard',
    secondaryRoute: 'dashboard',
    footerLabel: "Don't have access yet?",
    footerAction: 'Create an account',
    footerRoute: 'register',
    fields: [
      {
        label: 'Username',
        type: 'text',
        placeholder: 'Enter your username',
        autoComplete: 'username',
      },
      {
        label: 'Password',
        type: 'password',
        placeholder: 'Enter your password',
        autoComplete: 'current-password',
      },
    ],
  },
  register: {
    eyebrow: 'Operator setup',
    title: 'Create access for the next shift.',
    description:
      'Register a new user, keep the workspace in the same bundle, and move straight into the live queue without adding a marketing-style stop.',
    signalLabel: 'New workspace context',
    supportItems: [
      {
        title: 'Fast setup',
        description: 'Create access for the next operator without leaving the flow.',
      },
      {
        title: 'Shared surface',
        description: 'Register, review, and route back to the dashboard in one place.',
      },
      {
        title: 'English UI',
        description: 'All labels stay production-facing and ready for the main app shell.',
      },
    ],
    signalStrip: [
      {
        label: 'Roles',
        value: '3 active profiles',
        detail: 'Admin, operator, and viewer are the starting model for MVP.',
      },
      {
        label: 'Modules',
        value: '8 core areas',
        detail: 'Inbound, outbound, inventory, stocktaking, logistics, and products.',
      },
      {
        label: 'Output',
        value: 'Dashboard ready',
        detail: 'The next step after registration remains the live workspace.',
      },
    ],
    panelEyebrow: 'New account',
    panelTitle: 'Register a Northline user',
    panelDescription: 'Set up the account details below and continue into the dashboard preview.',
    primaryAction: 'Create Account',
    secondaryAction: 'Open Dashboard',
    secondaryRoute: 'dashboard',
    footerLabel: 'Already have credentials?',
    footerAction: 'Back to login',
    footerRoute: 'login',
    fields: [
      {
        label: 'Username',
        type: 'text',
        placeholder: 'Choose a username',
        autoComplete: 'username',
      },
      {
        label: 'Email',
        type: 'email',
        placeholder: 'Enter your email',
        autoComplete: 'email',
      },
      {
        label: 'Password',
        type: 'password',
        placeholder: 'Create a password',
        autoComplete: 'new-password',
      },
    ],
  },
};

export const dashboardContent = {
  sidebarLabel: 'Warehouse control room',
  navItems: [
    {
      label: 'Dashboard',
      detail: 'Selected KPIs and queue health',
      route: 'dashboard' as Route,
    },
    {
      label: 'Register view',
      detail: 'Create the next operator account',
      route: 'register' as Route,
    },
    {
      label: 'Back to login',
      detail: 'Return to secure sign-in',
      route: 'login' as Route,
    },
    {
      label: 'Log out',
      detail: 'End the current preview session',
      route: 'login' as Route,
    },
  ],
  statusBlock: {
    label: 'Low stock',
    value: '12 SKUs below target',
    description: 'Replenishment review is needed before the evening dispatch cut-off.',
  },
  overview: {
    eyebrow: 'Operations workspace',
    title: 'Warehouse control room',
    description:
      'Track queue health, stock attention, and shift notes from one calm working surface built for operators rather than a marketing homepage.',
  },
  metricsSection: {
    eyebrow: 'Selected KPIs',
    title: 'Current shift snapshot',
    description: 'The first scan covers volume, stock posture, and pending exceptions.',
  },
  metrics: [
    {
      label: 'Orders today',
      value: '24',
      detail: '8 awaiting pick confirmation',
    },
    {
      label: 'Inbound queued',
      value: '07',
      detail: '2 require document checks',
    },
    {
      label: 'Products tracked',
      value: '136',
      detail: 'Across 8 active categories',
    },
    {
      label: 'Pending review',
      value: '05',
      detail: 'Manual confirmation still needed',
    },
  ] satisfies DashboardMetric[],
  queue: {
    eyebrow: 'Live order queue',
    title: 'Active orders by operator',
    description: 'The main table stays central so current work is readable in one scan.',
    actionLabel: 'Back to login',
    columns: ['Operator', 'Order No.', 'Product', 'Spec', 'Status'],
  },
  orders: [
    {
      user: 'User_01',
      orderNo: 'ORD-1024',
      product: 'Bolt Set A',
      spec: 'M10 x 50',
      status: 'Packed',
    },
    {
      user: 'User_01',
      orderNo: 'ORD-1023',
      product: 'Nut Pack B',
      spec: 'M12',
      status: 'Picking',
    },
    {
      user: 'User_02',
      orderNo: 'ORD-1022',
      product: 'Washer C',
      spec: '16 mm',
      status: 'Awaiting QC',
    },
    {
      user: 'User_03',
      orderNo: 'ORD-1021',
      product: 'Clamp D',
      spec: '22 mm',
      status: 'Shipped',
    },
  ] satisfies DashboardOrder[],
  railSections: [
    {
      eyebrow: 'Low stock',
      title: 'Items below threshold',
      description: 'These lines need replenishment or a manual availability decision this shift.',
      items: [
        {
          title: 'Bolt Set A',
          meta: 'SH-02 / 12 packs',
          description: 'Below minimum stock. Review the inbound schedule before 17:00.',
        },
        {
          title: 'Clamp D',
          meta: 'WH-B / 6 units',
          description: 'A customer order is already queued against the remaining inventory.',
        },
      ],
    },
    {
      eyebrow: 'Shift notes',
      title: 'Current handoff',
      description: 'Operational notes from the previous shift stay visible in the side rail.',
      items: [
        {
          title: 'Morning sync completed',
          meta: '08:40 local',
          description: 'Inbound receipts and outbound dispatch counts were refreshed a few minutes ago.',
        },
        {
          title: 'Manual confirmation',
          meta: '2 orders',
          description: 'Two shipments still need a supervisor check before they can be closed.',
        },
      ],
    },
  ] satisfies DashboardRailSection[],
  actions: {
    eyebrow: 'Workspace actions',
    title: 'Continue the flow',
    description: 'Move between auth and the workspace without leaving the current React preview.',
    items: [
      {
        label: 'View Register',
        route: 'register',
        tone: 'primary',
      },
      {
        label: 'Back to Login',
        route: 'login',
        tone: 'secondary',
      },
    ] satisfies DashboardAction[],
  },
};
