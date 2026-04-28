import homeBg from './assets/home-bg.jpg';
import loginBg from './assets/login-bg.jpg';
import registerBg from './assets/register-bg.jpg';

export type AuthRoute = 'login' | 'register';

export type WorkspaceRoute =
  | 'dashboard'
  | 'ocr-workbench'
  | 'inventory-list'
  | 'inventory-detail'
  | 'inbound-list'
  | 'inbound-detail'
  | 'inbound-create'
  | 'inbound-edit'
  | 'outbound-list'
  | 'outbound-detail'
  | 'outbound-create'
  | 'outbound-edit'
  | 'approval-list'
  | 'user-management-list'
  | 'stocktaking-list'
  | 'stocktaking-detail'
  | 'logistics-documents-list'
  | 'logistics-documents-detail'
  | 'product-list'
  | 'product-detail'
  | 'product-create'
  | 'product-edit'
  | 'category-list'
  | 'category-detail'
  | 'category-create'
  | 'category-edit';

export type Route = AuthRoute | WorkspaceRoute;
export type AuthVariant = AuthRoute;
export type AuthLocale = 'en' | 'zh';
export type NavKey = 'dashboard' | 'ocr' | 'inventory' | 'inbound' | 'outbound' | 'approval' | 'users';

export type SummaryItem = {
  label: string;
  value: string;
  detail: string;
};

export type TableColumn = {
  key: string;
  label: string;
};

export type TableRow = Record<string, string>;

export type DetailField = {
  label: string;
  value: string;
};

export type DetailGroup = {
  title: string;
  fields: DetailField[];
};

export type FieldBlueprintGroup = {
  title: string;
  fields: string[];
};

export type PageAction = {
  label: string;
  route: Route;
  tone: 'primary' | 'secondary';
};

export type NavigationItem = {
  key: NavKey;
  label: string;
  route: WorkspaceRoute;
  detail: string;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

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

type AuthStat = {
  label: string;
  value: string;
  detail: string;
};

type AuthScreenContent = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imagePosition: string;
  panelEyebrow: string;
  panelTitle: string;
  panelDescription: string;
  supportItems: AuthSupportItem[];
  stats: AuthStat[];
  primaryAction: string;
  secondaryAction: string;
  secondaryRoute: Route;
  footerLabel: string;
  footerAction: string;
  footerRoute: AuthVariant;
  fields: AuthField[];
};

export type DashboardPage = {
  kind: 'dashboard';
  navKey: 'dashboard';
  section: string;
  title: string;
  description: string;
  actions: PageAction[];
};

export type ModulePage = {
  kind: 'list' | 'detail' | 'form';
  navKey: Exclude<NavKey, 'dashboard'>;
  section: string;
  title: string;
  description: string;
  actions: PageAction[];
  formMode?: 'create' | 'edit';
};

export type WorkspacePage = DashboardPage | ModulePage;

export const routeOrder: Route[] = [
  'login',
  'register',
  'dashboard',
  'ocr-workbench',
  'inventory-list',
  'inventory-detail',
  'inbound-list',
  'inbound-detail',
  'inbound-create',
  'inbound-edit',
  'outbound-list',
  'outbound-detail',
  'outbound-create',
  'outbound-edit',
  'approval-list',
  'user-management-list',
  'stocktaking-list',
  'stocktaking-detail',
  'logistics-documents-list',
  'logistics-documents-detail',
  'product-list',
  'product-detail',
  'product-create',
  'product-edit',
  'category-list',
  'category-detail',
  'category-create',
  'category-edit',
];

type WorkspaceBrandContent = {
  mark: string;
  name: string;
  caption: string;
  workspaceLabel: string;
  workspaceImage: string;
};

const baseBrandContent = {
  mark: 'N',
  name: 'Northline',
  workspaceImage: homeBg,
};

export const brandContent = baseBrandContent;

const brandContentByLocale: Record<AuthLocale, WorkspaceBrandContent> = {
  en: {
    ...baseBrandContent,
    caption: 'Warehouse Operations Admin',
    workspaceLabel: 'Frontend-only warehouse workspace',
  },
  zh: {
    ...baseBrandContent,
    caption: '仓储运营后台',
    workspaceLabel: '前端演示工作区',
  },
};

const workspaceNavigationByLocale: Record<AuthLocale, NavigationGroup[]> = {
  en: [
    {
      label: 'Operations',
      items: [
        {
          key: 'dashboard',
          label: 'Data Overview',
          route: 'dashboard',
          detail: 'KPIs, trend, alerts',
        },
        {
          key: 'ocr',
          label: 'OCR Workbench',
          route: 'ocr-workbench',
          detail: 'Upload, detect, extract, and template forms',
        },
        {
          key: 'inventory',
          label: 'Inventory',
          route: 'inventory-list',
          detail: 'Stock ledger and thresholds',
        },
        {
          key: 'inbound',
          label: 'Inbound',
          route: 'inbound-list',
          detail: 'Receipt orders and import',
        },
        {
          key: 'outbound',
          label: 'Outbound',
          route: 'outbound-list',
          detail: 'Shipment orders and export',
        },
        {
          key: 'approval',
          label: 'Approval Center',
          route: 'approval-list',
          detail: 'Approve or reject orders',
        },
      ],
    },
    {
      label: 'Administration',
      items: [
        {
          key: 'users',
          label: 'User Management',
          route: 'user-management-list',
          detail: 'Roles and access control',
        },
      ],
    },
  ],
  zh: [
    {
      label: '运营',
      items: [
        {
          key: 'dashboard',
          label: '数据概览',
          route: 'dashboard',
          detail: '指标、趋势、预警',
        },
        {
          key: 'ocr',
          label: 'OCR 工作台',
          route: 'ocr-workbench',
          detail: '上传、识别、提取与模板复用',
        },
        {
          key: 'inventory',
          label: '库存管理',
          route: 'inventory-list',
          detail: '库存台账与阈值',
        },
        {
          key: 'inbound',
          label: '入库管理',
          route: 'inbound-list',
          detail: '收货单与导入',
        },
        {
          key: 'outbound',
          label: '出库管理',
          route: 'outbound-list',
          detail: '发货单与导出',
        },
        {
          key: 'approval',
          label: '审批中心',
          route: 'approval-list',
          detail: '审批或驳回订单',
        },
      ],
    },
    {
      label: '系统管理',
      items: [
        {
          key: 'users',
          label: '用户管理',
          route: 'user-management-list',
          detail: '角色与权限控制',
        },
      ],
    },
  ],
};

const workspaceFooterLinksByLocale: Record<AuthLocale, PageAction[]> = {
  en: [{ label: 'Sign out', route: 'login', tone: 'secondary' }],
  zh: [{ label: '退出登录', route: 'login', tone: 'secondary' }],
};

export const workspaceNavigation = workspaceNavigationByLocale.en;
export const workspaceFooterLinks = workspaceFooterLinksByLocale.en;

export function getBrandContent(locale: AuthLocale): WorkspaceBrandContent {
  return brandContentByLocale[locale];
}

export function getWorkspaceNavigation(locale: AuthLocale): NavigationGroup[] {
  return workspaceNavigationByLocale[locale];
}

export function getWorkspaceFooterLinks(locale: AuthLocale): PageAction[] {
  return workspaceFooterLinksByLocale[locale];
}

export function getLocaleTag(locale: AuthLocale) {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

const authContentEn: Record<AuthVariant, AuthScreenContent> = {
  login: {
    eyebrow: 'Login',
    title: 'Sign in to Northline.',
    description: 'Access the warehouse operations workspace.',
    image: loginBg,
    imagePosition: 'center center',
    panelEyebrow: 'Workspace access',
    panelTitle: 'Login',
    panelDescription: 'Continue to the operational dashboard.',
    supportItems: [
      {
        title: 'Lightweight admin shell',
        description: 'Dashboard, inventory, inbound, outbound, and approval center now share one simple table-first workspace.',
      },
      {
        title: 'Approval-ready flow',
        description: 'Inbound and outbound records can be approved or rejected before they affect stock.',
      },
      {
        title: 'Import and export ready',
        description: 'CSV and Excel templates are available from the operational toolbars.',
      },
    ],
    stats: [
      {
        label: 'Core modules',
        value: '05',
        detail: 'Dashboard, inventory, inbound, outbound, and approval center.',
      },
      {
        label: 'Import formats',
        value: '02',
        detail: 'Excel and CSV are supported for bulk upload.',
      },
      {
        label: 'Approval gate',
        value: 'On',
        detail: 'Inventory changes post only after approval.',
      },
    ],
    primaryAction: 'Enter Workspace',
    secondaryAction: 'Need an account?',
    secondaryRoute: 'register',
    footerLabel: 'New here?',
    footerAction: 'Register',
    footerRoute: 'register',
    fields: [
      { label: 'Email', type: 'email', placeholder: 'warehouse@northline.com', autoComplete: 'email' },
      { label: 'Password', type: 'password', placeholder: 'Enter your password', autoComplete: 'current-password' },
    ],
  },
  register: {
    eyebrow: 'Register',
    title: 'Create a workspace account.',
    description: 'Set up access for operations, inventory, and approval teams.',
    image: registerBg,
    imagePosition: 'center center',
    panelEyebrow: 'Workspace setup',
    panelTitle: 'Register',
    panelDescription: 'Create a lightweight warehouse admin account.',
    supportItems: [
      {
        title: 'Operations-first structure',
        description: 'The workspace keeps key warehouse actions close to the tables where teams actually work.',
      },
      {
        title: 'Approval and audit ready',
        description: 'Orders keep approval status and rejection reason fields for later backend integration.',
      },
      {
        title: 'Frontend-only for now',
        description: 'All current actions stay in mock state so API wiring can be added later.',
      },
    ],
    stats: [
      {
        label: 'Approval states',
        value: '03',
        detail: 'Pending Approval, Approved, and Rejected.',
      },
      {
        label: 'Toolbar actions',
        value: '05',
        detail: 'Search, filter, import, export, and create are aligned across the workspace.',
      },
      {
        label: 'Inventory policy',
        value: 'Gated',
        detail: 'Stock changes wait for approval in the current prototype.',
      },
    ],
    primaryAction: 'Create Account',
    secondaryAction: 'Back to login',
    secondaryRoute: 'login',
    footerLabel: 'Already have access?',
    footerAction: 'Login',
    footerRoute: 'login',
    fields: [
      { label: 'Work Email', type: 'email', placeholder: 'you@northline.com', autoComplete: 'email' },
      { label: 'Full Name', type: 'text', placeholder: 'Your name', autoComplete: 'name' },
      { label: 'Password', type: 'password', placeholder: 'Create a password', autoComplete: 'new-password' },
    ],
  },
};

const authContentZh: Record<AuthVariant, AuthScreenContent> = {
  login: {
    eyebrow: '登录',
    title: '登录 Northline。',
    description: '进入仓储运营后台工作区。',
    image: loginBg,
    imagePosition: 'center center',
    panelEyebrow: '工作区访问',
    panelTitle: '登录',
    panelDescription: '继续进入仓储运营总览与作业系统。',
    supportItems: [
      {
        title: '轻量后台界面',
        description: '数据概览、库存、入库、出库和审批中心已经统一成简洁表格化工作区。',
      },
      {
        title: '审批前置',
        description: '入库单和出库单需要审批通过后才会真正影响库存。',
      },
      {
        title: '导入导出可用',
        description: '当前工具栏已支持 Excel / CSV 导入、模板下载与列表导出。',
      },
    ],
    stats: [
      {
        label: '核心模块',
        value: '05',
        detail: '数据概览、库存、入库、出库、审批中心。',
      },
      {
        label: '导入格式',
        value: '02',
        detail: '支持 Excel 和 CSV。',
      },
      {
        label: '库存策略',
        value: '启用',
        detail: '审批通过后才会更新库存。',
      },
    ],
    primaryAction: '进入系统',
    secondaryAction: '没有账号？',
    secondaryRoute: 'register',
    footerLabel: '首次使用？',
    footerAction: '注册',
    footerRoute: 'register',
    fields: [
      { label: '邮箱', type: 'email', placeholder: 'warehouse@northline.com', autoComplete: 'email' },
      { label: '密码', type: 'password', placeholder: '请输入密码', autoComplete: 'current-password' },
    ],
  },
  register: {
    eyebrow: '注册',
    title: '创建工作区账号。',
    description: '为仓储、库存与审批团队创建访问入口。',
    image: registerBg,
    imagePosition: 'center center',
    panelEyebrow: '工作区开通',
    panelTitle: '注册',
    panelDescription: '创建一个轻量化仓储后台账号。',
    supportItems: [
      {
        title: '面向作业流程',
        description: '系统入口围绕真实仓储操作设计，重点保持路径短、信息清晰。',
      },
      {
        title: '审批与审计预留',
        description: '当前订单已具备审批状态和驳回原因字段，方便后续后端联调。',
      },
      {
        title: '目前仍为前端 mock',
        description: '当前操作全部保留在前端 mock 数据中，后续可平滑替换成接口。',
      },
    ],
    stats: [
      {
        label: '审批状态',
        value: '03',
        detail: '待审批、已通过、已驳回。',
      },
      {
        label: '工具栏动作',
        value: '05',
        detail: '搜索、筛选、导入、导出、新建。',
      },
      {
        label: '库存更新',
        value: '受控',
        detail: '当前原型中库存变动受审批结果控制。',
      },
    ],
    primaryAction: '创建账号',
    secondaryAction: '返回登录',
    secondaryRoute: 'login',
    footerLabel: '已有账号？',
    footerAction: '登录',
    footerRoute: 'login',
    fields: [
      { label: '工作邮箱', type: 'email', placeholder: 'you@northline.com', autoComplete: 'email' },
      { label: '姓名', type: 'text', placeholder: '请输入姓名', autoComplete: 'name' },
      { label: '密码', type: 'password', placeholder: '创建密码', autoComplete: 'new-password' },
    ],
  },
};

export const authContentByLocale: Record<AuthLocale, Record<AuthVariant, AuthScreenContent>> = {
  en: authContentEn,
  zh: authContentZh,
};

export const authContent = authContentEn;

function createModulePage(
  locale: AuthLocale,
  navKey: Exclude<NavKey, 'dashboard'>,
  kind: ModulePage['kind'],
  title: string,
  description: string,
  actions: PageAction[],
  formMode?: ModulePage['formMode'],
): ModulePage {
  return {
    kind,
    navKey,
    section:
      navKey === 'approval'
        ? locale === 'zh'
          ? '审批中心'
          : 'Approval'
        : navKey === 'users'
          ? locale === 'zh'
            ? '系统管理'
            : 'Administration'
          : locale === 'zh'
            ? '仓储运营'
            : 'Warehouse Operations',
    title,
    description,
    actions,
    formMode,
  };
}

export function isAuthRoute(route: Route): route is AuthRoute {
  return route === 'login' || route === 'register';
}

function createDashboardPage(locale: AuthLocale): DashboardPage {
  if (locale === 'zh') {
    return {
      kind: 'dashboard',
      navKey: 'dashboard',
      section: '仓储运营',
      title: '数据概览',
      description: '在一个轻量化运营工作台中查看库存、流转与审批状态。',
      actions: [
        { label: '打开库存', route: 'inventory-list', tone: 'primary' },
        { label: '打开审批中心', route: 'approval-list', tone: 'secondary' },
      ],
    };
  }

  return {
    kind: 'dashboard',
    navKey: 'dashboard',
    section: 'Warehouse Operations',
    title: 'Data Overview',
    description: 'Track stock, movements, and approvals from one lightweight operational surface.',
    actions: [
      { label: 'Open Inventory', route: 'inventory-list', tone: 'primary' },
      { label: 'Open Approval Center', route: 'approval-list', tone: 'secondary' },
    ],
  };
}

export function getWorkspacePage(route: WorkspaceRoute, locale: AuthLocale = 'en'): WorkspacePage {
  const dashboardPage = createDashboardPage(locale);

  switch (route) {
    case 'dashboard':
      return dashboardPage;
    case 'ocr-workbench':
      return createModulePage(
        locale,
        'ocr',
        'list',
        locale === 'zh' ? 'OCR 工作台' : 'OCR Workbench',
        locale === 'zh'
          ? '上传 PDF 或图片表单，生成候选框，调整字段框，执行 OCR，并保存团队共享模板。'
          : 'Upload PDF or image forms, generate candidate boxes, adjust extraction fields, run OCR, and save shared templates.',
        [],
      );
    case 'inventory-list':
      return createModulePage(
        locale,
        'inventory',
        'list',
        locale === 'zh' ? '库存管理' : 'Inventory Management',
        locale === 'zh'
          ? '搜索库存、查看阈值状态，并导入或导出当前库存台账。'
          : 'Search inventory, review stock thresholds, and import or export the current ledger.',
        [{ label: locale === 'zh' ? '查看记录' : 'View Record', route: 'inventory-detail', tone: 'secondary' }],
      );
    case 'inventory-detail':
      return createModulePage(
        locale,
        'inventory',
        'detail',
        locale === 'zh' ? '库存详情' : 'Inventory Detail',
        locale === 'zh'
          ? '查看所选库存位置、流转影响和预警状态。'
          : 'Review the selected stock position, movement impact, and warning status.',
        [{ label: locale === 'zh' ? '返回库存列表' : 'Back to Inventory', route: 'inventory-list', tone: 'secondary' }],
      );
    case 'inbound-list':
      return createModulePage(
        locale,
        'inbound',
        'list',
        locale === 'zh' ? '入库管理' : 'Inbound Management',
        locale === 'zh'
          ? '管理收货单，支持搜索、筛选、导入、导出和审批状态查看。'
          : 'Manage receipt orders with search, filter, import, export, and approval visibility.',
        [{ label: locale === 'zh' ? '新建入库单' : 'New Inbound', route: 'inbound-create', tone: 'primary' }],
      );
    case 'inbound-detail':
      return createModulePage(
        locale,
        'inbound',
        'detail',
        locale === 'zh' ? '入库详情' : 'Inbound Detail',
        locale === 'zh'
          ? '查看订单明细，并在聚焦记录视图中完成审批决策。'
          : 'Review order lines and complete the approval decision from a focused record view.',
        [
          { label: locale === 'zh' ? '返回入库列表' : 'Back to Inbound', route: 'inbound-list', tone: 'secondary' },
          { label: locale === 'zh' ? '编辑订单' : 'Edit Order', route: 'inbound-edit', tone: 'secondary' },
        ],
      );
    case 'inbound-create':
      return createModulePage(
        locale,
        'inbound',
        'form',
        locale === 'zh' ? '新建入库单' : 'New Inbound Order',
        locale === 'zh'
          ? '创建收货单并提交到审批流。'
          : 'Create a receipt order and submit it into the approval flow.',
        [{ label: locale === 'zh' ? '返回入库列表' : 'Back to Inbound', route: 'inbound-list', tone: 'secondary' }],
        'create',
      );
    case 'inbound-edit':
      return createModulePage(
        locale,
        'inbound',
        'form',
        locale === 'zh' ? '编辑入库单' : 'Edit Inbound Order',
        locale === 'zh'
          ? '在审批通过前调整待审批或已驳回的收货单。'
          : 'Adjust a pending or rejected receipt before it is approved.',
        [{ label: locale === 'zh' ? '返回入库列表' : 'Back to Inbound', route: 'inbound-list', tone: 'secondary' }],
        'edit',
      );
    case 'outbound-list':
      return createModulePage(
        locale,
        'outbound',
        'list',
        locale === 'zh' ? '出库管理' : 'Outbound Management',
        locale === 'zh'
          ? '管理发货单，查看清晰队列、审批状态，并支持批量导入导出。'
          : 'Manage shipment orders with a clean queue, approval status, and bulk import/export.',
        [{ label: locale === 'zh' ? '新建出库单' : 'New Outbound', route: 'outbound-create', tone: 'primary' }],
      );
    case 'outbound-detail':
      return createModulePage(
        locale,
        'outbound',
        'detail',
        locale === 'zh' ? '出库详情' : 'Outbound Detail',
        locale === 'zh'
          ? '在发运前查看发货明细、审批状态和驳回原因。'
          : 'Review shipment lines, approval status, and rejection reasons before dispatch.',
        [
          { label: locale === 'zh' ? '返回出库列表' : 'Back to Outbound', route: 'outbound-list', tone: 'secondary' },
          { label: locale === 'zh' ? '编辑订单' : 'Edit Order', route: 'outbound-edit', tone: 'secondary' },
        ],
      );
    case 'outbound-create':
      return createModulePage(
        locale,
        'outbound',
        'form',
        locale === 'zh' ? '新建出库单' : 'New Outbound Order',
        locale === 'zh'
          ? '创建发货申请，并在扣减库存前进入审批流程。'
          : 'Create a shipment request and route it into approval before stock deduction.',
        [{ label: locale === 'zh' ? '返回出库列表' : 'Back to Outbound', route: 'outbound-list', tone: 'secondary' }],
        'create',
      );
    case 'outbound-edit':
      return createModulePage(
        locale,
        'outbound',
        'form',
        locale === 'zh' ? '编辑出库单' : 'Edit Outbound Order',
        locale === 'zh'
          ? '在重新提交前更新待审批或已驳回的发货申请。'
          : 'Update a pending or rejected shipment request before resubmission.',
        [{ label: locale === 'zh' ? '返回出库列表' : 'Back to Outbound', route: 'outbound-list', tone: 'secondary' }],
        'edit',
      );
    case 'approval-list':
      return createModulePage(
        locale,
        'approval',
        'list',
        locale === 'zh' ? '审批中心' : 'Approval Center',
        locale === 'zh'
          ? '查看入库与出库申请，完成审批或驳回，并导出审批队列。'
          : 'Review inbound and outbound requests, approve or reject them, and export the queue.',
        [{ label: locale === 'zh' ? '打开入库队列' : 'Open Inbound Queue', route: 'inbound-list', tone: 'secondary' }],
      );
    case 'user-management-list':
      return createModulePage(
        locale,
        'users',
        'list',
        locale === 'zh' ? '用户管理' : 'User Management',
        locale === 'zh'
          ? '查看账户、分配角色，并管理审批与后台访问权限。'
          : 'Review accounts, assign roles, and manage approval and workspace access.',
        [{ label: locale === 'zh' ? '返回概览' : 'Back to Overview', route: 'dashboard', tone: 'secondary' }],
      );
    default:
      return dashboardPage;
  }
}
