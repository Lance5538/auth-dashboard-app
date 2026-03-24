import homeBg from './assets/home-bg.jpg';
import loginBg from './assets/login-bg.jpg';
import registerBg from './assets/register-bg.jpg';

export type AuthRoute = 'login' | 'register';

export type WorkspaceRoute =
  | 'dashboard'
  | 'inbound-list'
  | 'inbound-detail'
  | 'outbound-list'
  | 'outbound-detail'
  | 'inventory-list'
  | 'inventory-detail'
  | 'stocktaking-list'
  | 'stocktaking-detail'
  | 'logistics-documents-list'
  | 'logistics-documents-detail'
  | 'product-list'
  | 'product-detail'
  | 'category-list'
  | 'category-detail';

export type Route = AuthRoute | WorkspaceRoute;
export type AuthVariant = AuthRoute;
export type NavKey =
  | 'dashboard'
  | 'inbound'
  | 'outbound'
  | 'inventory'
  | 'stocktaking'
  | 'logistics-documents'
  | 'product'
  | 'category';

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

export type PageTab = {
  label: string;
  route: WorkspaceRoute;
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

type ModuleDefinition = {
  key: Exclude<NavKey, 'dashboard'>;
  group: 'Warehouse Management' | 'Product Management';
  label: string;
  listRoute: Exclude<WorkspaceRoute, 'dashboard'>;
  detailRoute: Exclude<WorkspaceRoute, 'dashboard'>;
  listTitle: string;
  detailTitle: string;
  entityLabel: string;
  listDescription: string;
  detailDescription: string;
  listSummary: SummaryItem[];
  detailSummary: SummaryItem[];
  columns: TableColumn[];
  rows: TableRow[];
  detailGroups: DetailGroup[];
  fieldBlueprint: FieldBlueprintGroup[];
};

export type DashboardPage = {
  kind: 'dashboard';
  navKey: 'dashboard';
  section: string;
  title: string;
  description: string;
  heroImage: string;
  metrics: SummaryItem[];
  moduleHighlights: NavigationGroup[];
  coverage: {
    title: string;
    items: string[];
  }[];
  spotlight: {
    title: string;
    description: string;
    columns: TableColumn[];
    rows: TableRow[];
  };
  actions: PageAction[];
};

export type ModulePage = {
  kind: 'list' | 'detail';
  navKey: Exclude<NavKey, 'dashboard'>;
  section: string;
  title: string;
  description: string;
  heroImage: string;
  entityLabel: string;
  tabs: PageTab[];
  summary: SummaryItem[];
  fieldBlueprint: FieldBlueprintGroup[];
  actions: PageAction[];
  columns?: TableColumn[];
  rows?: TableRow[];
  detailGroups?: DetailGroup[];
};

export type WorkspacePage = DashboardPage | ModulePage;

export const routeOrder: Route[] = [
  'login',
  'register',
  'dashboard',
  'inbound-list',
  'inbound-detail',
  'outbound-list',
  'outbound-detail',
  'inventory-list',
  'inventory-detail',
  'stocktaking-list',
  'stocktaking-detail',
  'logistics-documents-list',
  'logistics-documents-detail',
  'product-list',
  'product-detail',
  'category-list',
  'category-detail',
];

export const brandContent = {
  mark: 'N',
  name: 'Northline',
  caption: 'Warehouse management workspace',
  workspaceLabel: 'Dashboard · Warehouse Management · Product Management',
  workspaceImage: homeBg,
};

const finalEntities = [
  'User',
  'Product Category',
  'Product',
  'Warehouse',
  'Inventory Record',
  'Inbound Order',
  'Outbound Order',
  'Stocktaking Task',
  'Logistics Record',
  'Document',
];

const moduleDefinitions: ModuleDefinition[] = [
  {
    key: 'inbound',
    group: 'Warehouse Management',
    label: 'Inbound',
    listRoute: 'inbound-list',
    detailRoute: 'inbound-detail',
    listTitle: 'Inbound List',
    detailTitle: 'Inbound Detail',
    entityLabel: 'Inbound Order',
    listDescription:
      'Track inbound receipts, warehouse assignments, supplier context, and confirmation timing from the Warehouse Management module.',
    detailDescription:
      'Inspect one inbound order record with warehouse, supplier, operator, and confirmation fields aligned to the execution docs.',
    listSummary: [
      {
        label: 'Open receipts',
        value: '12',
        detail: 'Inbound orders still waiting for full warehouse confirmation.',
      },
      {
        label: 'Pending QC',
        value: '04',
        detail: 'Receipts requiring manual quantity or document review.',
      },
      {
        label: 'Warehouses',
        value: '03',
        detail: 'Shanghai, Ningbo, and Suzhou intake points are active today.',
      },
    ],
    detailSummary: [
      {
        label: 'Inbound no.',
        value: 'INB-1048',
        detail: 'Selected sample record for the documented detail view.',
      },
      {
        label: 'Status',
        value: 'Awaiting Receipt',
        detail: 'The order has been created but not fully confirmed.',
      },
      {
        label: 'Supplier',
        value: 'North Harbour Metals',
        detail: 'Supplier context is shown alongside warehouse ownership.',
      },
    ],
    columns: [
      { key: 'inboundNo', label: 'Inbound No.' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'supplier', label: 'Supplier' },
      { key: 'status', label: 'Status' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'createdAt', label: 'Created At' },
    ],
    rows: [
      {
        inboundNo: 'INB-1048',
        warehouse: 'WH-SH-01',
        supplier: 'North Harbour Metals',
        status: 'Awaiting Receipt',
        createdBy: 'Ava Chen',
        createdAt: 'Mar 24, 08:30',
      },
      {
        inboundNo: 'INB-1047',
        warehouse: 'WH-NB-02',
        supplier: 'Pacific Fastener Co.',
        status: 'Pending QC',
        createdBy: 'Leo Xu',
        createdAt: 'Mar 24, 07:55',
      },
      {
        inboundNo: 'INB-1046',
        warehouse: 'WH-SZ-03',
        supplier: 'Ridgeway Supply',
        status: 'Confirmed',
        createdBy: 'Mia Lin',
        createdAt: 'Mar 23, 18:12',
      },
    ],
    detailGroups: [
      {
        title: 'Inbound order',
        fields: [
          { label: 'Id', value: '48' },
          { label: 'Inbound No.', value: 'INB-1048' },
          { label: 'Warehouse Id', value: 'WH-SH-01' },
          { label: 'Status', value: 'Awaiting Receipt' },
          { label: 'Supplier Name', value: 'North Harbour Metals' },
          { label: 'Created By', value: 'Ava Chen' },
          { label: 'Created At', value: '2026-03-24 08:30' },
          { label: 'Confirmed At', value: 'Not confirmed' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Warehouse', value: 'Shanghai Primary Warehouse' },
          { label: 'Primary Product', value: 'Bolt Set A' },
          { label: 'Receiving Dock', value: 'Dock 04' },
          { label: 'Document Status', value: 'Packing list uploaded' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Inbound Order',
        fields: ['id', 'inbound_no', 'warehouse_id', 'status', 'supplier_name', 'created_by', 'created_at', 'confirmed_at'],
      },
    ],
  },
  {
    key: 'outbound',
    group: 'Warehouse Management',
    label: 'Outbound',
    listRoute: 'outbound-list',
    detailRoute: 'outbound-detail',
    listTitle: 'Outbound List',
    detailTitle: 'Outbound Detail',
    entityLabel: 'Outbound Order',
    listDescription:
      'Monitor outbound shipments, destination context, operator ownership, and current dispatch status from one queue.',
    detailDescription:
      'Review one outbound order record with destination, warehouse, shipping status, and confirmation timing aligned to the documented fields.',
    listSummary: [
      {
        label: 'Outbound today',
        value: '18',
        detail: 'Orders released to picking, packing, or shipment today.',
      },
      {
        label: 'Awaiting ship',
        value: '06',
        detail: 'Orders are packed but not yet marked as dispatched.',
      },
      {
        label: 'Destinations',
        value: '09',
        detail: 'Active destination cities across all outbound orders.',
      },
    ],
    detailSummary: [
      {
        label: 'Outbound no.',
        value: 'OUT-2027',
        detail: 'Selected sample record for the outbound detail view.',
      },
      {
        label: 'Destination',
        value: 'Hangzhou DC',
        detail: 'Destination is documented directly on the outbound order.',
      },
      {
        label: 'Status',
        value: 'Picking',
        detail: 'The order is active inside the outbound workflow.',
      },
    ],
    columns: [
      { key: 'outboundNo', label: 'Outbound No.' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'destination', label: 'Destination' },
      { key: 'status', label: 'Status' },
      { key: 'createdBy', label: 'Created By' },
      { key: 'createdAt', label: 'Created At' },
    ],
    rows: [
      {
        outboundNo: 'OUT-2027',
        warehouse: 'WH-SH-01',
        destination: 'Hangzhou DC',
        status: 'Picking',
        createdBy: 'Iris Wang',
        createdAt: 'Mar 24, 09:12',
      },
      {
        outboundNo: 'OUT-2026',
        warehouse: 'WH-NB-02',
        destination: 'Nanjing Crossdock',
        status: 'Packed',
        createdBy: 'Owen Li',
        createdAt: 'Mar 24, 08:10',
      },
      {
        outboundNo: 'OUT-2025',
        warehouse: 'WH-SH-01',
        destination: 'Wuxi Retail Hub',
        status: 'Shipped',
        createdBy: 'Iris Wang',
        createdAt: 'Mar 23, 17:46',
      },
    ],
    detailGroups: [
      {
        title: 'Outbound order',
        fields: [
          { label: 'Id', value: '27' },
          { label: 'Outbound No.', value: 'OUT-2027' },
          { label: 'Warehouse Id', value: 'WH-SH-01' },
          { label: 'Destination', value: 'Hangzhou DC' },
          { label: 'Status', value: 'Picking' },
          { label: 'Created By', value: 'Iris Wang' },
          { label: 'Created At', value: '2026-03-24 09:12' },
          { label: 'Confirmed At', value: 'Pending' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Primary Product', value: 'Nut Pack B' },
          { label: 'Reserved Inventory', value: '340 units' },
          { label: 'Carrier Window', value: '17:30 dispatch' },
          { label: 'Document State', value: 'Invoice draft created' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Outbound Order',
        fields: ['id', 'outbound_no', 'warehouse_id', 'destination', 'status', 'created_by', 'created_at', 'confirmed_at'],
      },
    ],
  },
  {
    key: 'inventory',
    group: 'Warehouse Management',
    label: 'Inventory',
    listRoute: 'inventory-list',
    detailRoute: 'inventory-detail',
    listTitle: 'Inventory List',
    detailTitle: 'Inventory Detail',
    entityLabel: 'Inventory Record',
    listDescription:
      'View current stock by product, warehouse, and location with on-hand, reserved, and low-stock thresholds visible in one list.',
    detailDescription:
      'Inspect one inventory record with warehouse, location, on-hand, reserved, and low-stock values aligned to the field document.',
    listSummary: [
      {
        label: 'Tracked SKUs',
        value: '136',
        detail: 'Products currently represented in the inventory module.',
      },
      {
        label: 'Low stock',
        value: '12',
        detail: 'Inventory records below their low_stock_threshold.',
      },
      {
        label: 'Locations',
        value: '28',
        detail: 'Storage locations currently active across warehouses.',
      },
    ],
    detailSummary: [
      {
        label: 'Inventory record',
        value: 'INV-00318',
        detail: 'Sample record connected to the inventory detail page.',
      },
      {
        label: 'Qty on hand',
        value: '128',
        detail: 'On-hand inventory available in the selected location.',
      },
      {
        label: 'Qty reserved',
        value: '44',
        detail: 'Reserved quantity already allocated to outbound orders.',
      },
    ],
    columns: [
      { key: 'productCode', label: 'Product Code' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'location', label: 'Location' },
      { key: 'qtyOnHand', label: 'Qty On Hand' },
      { key: 'qtyReserved', label: 'Qty Reserved' },
      { key: 'threshold', label: 'Low Stock Threshold' },
      { key: 'updatedAt', label: 'Updated At' },
    ],
    rows: [
      {
        productCode: 'P-BOLT-A',
        warehouse: 'WH-SH-01',
        location: 'A1-04',
        qtyOnHand: '128',
        qtyReserved: '44',
        threshold: '80',
        updatedAt: 'Mar 24, 08:41',
      },
      {
        productCode: 'P-NUT-B',
        warehouse: 'WH-NB-02',
        location: 'B2-12',
        qtyOnHand: '52',
        qtyReserved: '18',
        threshold: '60',
        updatedAt: 'Mar 24, 08:28',
      },
      {
        productCode: 'P-CLAMP-D',
        warehouse: 'WH-SH-01',
        location: 'C3-01',
        qtyOnHand: '16',
        qtyReserved: '10',
        threshold: '20',
        updatedAt: 'Mar 24, 07:58',
      },
    ],
    detailGroups: [
      {
        title: 'Inventory record',
        fields: [
          { label: 'Id', value: '318' },
          { label: 'Product Id', value: 'P-BOLT-A' },
          { label: 'Warehouse Id', value: 'WH-SH-01' },
          { label: 'Location', value: 'A1-04' },
          { label: 'Qty On Hand', value: '128' },
          { label: 'Qty Reserved', value: '44' },
          { label: 'Low Stock Threshold', value: '80' },
          { label: 'Updated At', value: '2026-03-24 08:41' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Product', value: 'Bolt Set A' },
          { label: 'Category', value: 'Fasteners' },
          { label: 'Warehouse', value: 'Shanghai Primary Warehouse' },
          { label: 'Low Stock Status', value: 'Healthy' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Inventory Record',
        fields: ['id', 'product_id', 'warehouse_id', 'location', 'qty_on_hand', 'qty_reserved', 'low_stock_threshold', 'updated_at'],
      },
    ],
  },
  {
    key: 'stocktaking',
    group: 'Warehouse Management',
    label: 'Stocktaking',
    listRoute: 'stocktaking-list',
    detailRoute: 'stocktaking-detail',
    listTitle: 'Stocktaking List',
    detailTitle: 'Stocktaking Detail',
    entityLabel: 'Stocktaking Task',
    listDescription:
      'Follow planned stocktaking work by warehouse, task status, ownership, and completion timing in one operational list.',
    detailDescription:
      'Inspect one stocktaking task record with planned date, completion timing, operator ownership, and difference review context.',
    listSummary: [
      {
        label: 'Open tasks',
        value: '09',
        detail: 'Stocktaking tasks still active across the warehouse network.',
      },
      {
        label: 'Due today',
        value: '03',
        detail: 'Tasks planned for completion in the current shift.',
      },
      {
        label: 'Variance alerts',
        value: '02',
        detail: 'Tasks with quantity differences still pending review.',
      },
    ],
    detailSummary: [
      {
        label: 'Task no.',
        value: 'STK-3105',
        detail: 'Selected sample record for the stocktaking detail page.',
      },
      {
        label: 'Planned date',
        value: '2026-03-24',
        detail: 'The scheduled date for the selected counting task.',
      },
      {
        label: 'Status',
        value: 'In Progress',
        detail: 'The count has started but is not yet completed.',
      },
    ],
    columns: [
      { key: 'taskNo', label: 'Task No.' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'status', label: 'Status' },
      { key: 'plannedDate', label: 'Planned Date' },
      { key: 'completedDate', label: 'Completed Date' },
      { key: 'createdBy', label: 'Created By' },
    ],
    rows: [
      {
        taskNo: 'STK-3105',
        warehouse: 'WH-SH-01',
        status: 'In Progress',
        plannedDate: '2026-03-24',
        completedDate: '--',
        createdBy: 'Noah Zhang',
      },
      {
        taskNo: 'STK-3104',
        warehouse: 'WH-NB-02',
        status: 'Pending',
        plannedDate: '2026-03-24',
        completedDate: '--',
        createdBy: 'Ella Zhou',
      },
      {
        taskNo: 'STK-3103',
        warehouse: 'WH-SZ-03',
        status: 'Completed',
        plannedDate: '2026-03-23',
        completedDate: '2026-03-23',
        createdBy: 'Noah Zhang',
      },
    ],
    detailGroups: [
      {
        title: 'Stocktaking task',
        fields: [
          { label: 'Id', value: '3105' },
          { label: 'Task No.', value: 'STK-3105' },
          { label: 'Warehouse Id', value: 'WH-SH-01' },
          { label: 'Status', value: 'In Progress' },
          { label: 'Planned Date', value: '2026-03-24' },
          { label: 'Completed Date', value: 'Not completed' },
          { label: 'Created By', value: 'Noah Zhang' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Counting Zone', value: 'Aisle A / Fasteners' },
          { label: 'Expected Difference', value: '2 SKU variances flagged' },
          { label: 'Warehouse Lead', value: 'Grace Wu' },
          { label: 'Review Window', value: 'Before 18:00 local' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Stocktaking Task',
        fields: ['id', 'task_no', 'warehouse_id', 'status', 'planned_date', 'completed_date', 'created_by'],
      },
    ],
  },
  {
    key: 'logistics-documents',
    group: 'Warehouse Management',
    label: 'Logistics / Documents',
    listRoute: 'logistics-documents-list',
    detailRoute: 'logistics-documents-detail',
    listTitle: 'Logistics / Documents List',
    detailTitle: 'Logistics / Documents Detail',
    entityLabel: 'Logistics Record / Document',
    listDescription:
      'Track shipment records and linked documents together, since the execution docs define a combined Logistics / Documents page pair.',
    detailDescription:
      'Inspect one shipment record alongside its linked document metadata, order references, carrier details, and issue state.',
    listSummary: [
      {
        label: 'Shipments',
        value: '14',
        detail: 'Logistics records currently active in the list view.',
      },
      {
        label: 'Documents due',
        value: '05',
        detail: 'Records still waiting for final document issue or upload.',
      },
      {
        label: 'Carriers',
        value: '04',
        detail: 'Carrier options linked to current logistics records.',
      },
    ],
    detailSummary: [
      {
        label: 'Logistics no.',
        value: 'LOG-8803',
        detail: 'Sample logistics record displayed in the detail page.',
      },
      {
        label: 'Document no.',
        value: 'DOC-4408',
        detail: 'Linked document reference connected to the selected shipment.',
      },
      {
        label: 'Status',
        value: 'In Transit / Issued',
        detail: 'Shipment and document states are shown together.',
      },
    ],
    columns: [
      { key: 'logisticsNo', label: 'Logistics No.' },
      { key: 'orderRef', label: 'Order Ref' },
      { key: 'destination', label: 'Destination' },
      { key: 'carrier', label: 'Carrier' },
      { key: 'documentNo', label: 'Document No.' },
      { key: 'status', label: 'Status' },
    ],
    rows: [
      {
        logisticsNo: 'LOG-8803',
        orderRef: 'OUT-2027',
        destination: 'Hangzhou DC',
        carrier: 'BlueLine Freight',
        documentNo: 'DOC-4408',
        status: 'In Transit / Issued',
      },
      {
        logisticsNo: 'LOG-8802',
        orderRef: 'INB-1047',
        destination: 'WH-NB-02',
        carrier: 'Harbour Cargo',
        documentNo: 'DOC-4407',
        status: 'Scheduled / Pending',
      },
      {
        logisticsNo: 'LOG-8801',
        orderRef: 'OUT-2025',
        destination: 'Wuxi Retail Hub',
        carrier: 'EastJet Logistics',
        documentNo: 'DOC-4406',
        status: 'Delivered / Issued',
      },
    ],
    detailGroups: [
      {
        title: 'Logistics record',
        fields: [
          { label: 'Id', value: '8803' },
          { label: 'Logistics No.', value: 'LOG-8803' },
          { label: 'Related Order Type', value: 'Outbound Order' },
          { label: 'Related Order Id', value: 'OUT-2027' },
          { label: 'Destination', value: 'Hangzhou DC' },
          { label: 'Carrier', value: 'BlueLine Freight' },
          { label: 'Status', value: 'In Transit' },
          { label: 'Shipped At', value: '2026-03-24 10:35' },
          { label: 'Delivered At', value: 'Pending' },
        ],
      },
      {
        title: 'Document',
        fields: [
          { label: 'Document No.', value: 'DOC-4408' },
          { label: 'Document Type', value: 'Bill of Lading' },
          { label: 'Related Order Type', value: 'Outbound Order' },
          { label: 'Related Order Id', value: 'OUT-2027' },
          { label: 'Status', value: 'Issued' },
          { label: 'Issue Date', value: '2026-03-24' },
          { label: 'Remarks', value: 'Signed copy pending upload' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Warehouse', value: 'Shanghai Primary Warehouse' },
          { label: 'Destination Window', value: 'Arrive before 20:00' },
          { label: 'Carrier Contact', value: 'BlueLine Dispatch Team' },
          { label: 'Exception Flag', value: 'None' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Logistics Record',
        fields: ['id', 'logistics_no', 'related_order_type', 'related_order_id', 'destination', 'carrier', 'status', 'shipped_at', 'delivered_at'],
      },
      {
        title: 'Document',
        fields: ['id', 'document_no', 'document_type', 'related_order_type', 'related_order_id', 'status', 'issue_date', 'remarks'],
      },
    ],
  },
  {
    key: 'product',
    group: 'Product Management',
    label: 'Product',
    listRoute: 'product-list',
    detailRoute: 'product-detail',
    listTitle: 'Product List',
    detailTitle: 'Product Detail',
    entityLabel: 'Product',
    listDescription:
      'Maintain product master records with category, warehouse, unit, status, and updated timing visible in one product list.',
    detailDescription:
      'Inspect one product master record with category, warehouse, unit, and status fields aligned to the basic field list.',
    listSummary: [
      {
        label: 'Products',
        value: '136',
        detail: 'Master product records currently tracked in the app.',
      },
      {
        label: 'Active',
        value: '128',
        detail: 'Products currently available for inbound and outbound workflows.',
      },
      {
        label: 'Categories',
        value: '08',
        detail: 'The product set is distributed across eight categories.',
      },
    ],
    detailSummary: [
      {
        label: 'Product code',
        value: 'P-BOLT-A',
        detail: 'Selected sample product record for the detail page.',
      },
      {
        label: 'Category',
        value: 'Fasteners',
        detail: 'Category mapping uses the Product Category entity.',
      },
      {
        label: 'Status',
        value: 'Active',
        detail: 'The product is currently active inside the master record set.',
      },
    ],
    columns: [
      { key: 'productCode', label: 'Product Code' },
      { key: 'productName', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'warehouse', label: 'Warehouse' },
      { key: 'unit', label: 'Unit' },
      { key: 'status', label: 'Status' },
      { key: 'updatedAt', label: 'Updated At' },
    ],
    rows: [
      {
        productCode: 'P-BOLT-A',
        productName: 'Bolt Set A',
        category: 'Fasteners',
        warehouse: 'WH-SH-01',
        unit: 'Pack',
        status: 'Active',
        updatedAt: 'Mar 24, 08:15',
      },
      {
        productCode: 'P-NUT-B',
        productName: 'Nut Pack B',
        category: 'Fasteners',
        warehouse: 'WH-NB-02',
        unit: 'Pack',
        status: 'Active',
        updatedAt: 'Mar 24, 08:02',
      },
      {
        productCode: 'P-CLAMP-D',
        productName: 'Clamp D',
        category: 'Hardware',
        warehouse: 'WH-SH-01',
        unit: 'Unit',
        status: 'Hold',
        updatedAt: 'Mar 23, 16:49',
      },
    ],
    detailGroups: [
      {
        title: 'Product',
        fields: [
          { label: 'Id', value: '201' },
          { label: 'Product Code', value: 'P-BOLT-A' },
          { label: 'Product Name', value: 'Bolt Set A' },
          { label: 'Category Id', value: 'CAT-FAST-01' },
          { label: 'Warehouse Id', value: 'WH-SH-01' },
          { label: 'Unit', value: 'Pack' },
          { label: 'Status', value: 'Active' },
          { label: 'Created At', value: '2026-03-10 11:05' },
          { label: 'Updated At', value: '2026-03-24 08:15' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Category', value: 'Fasteners' },
          { label: 'Warehouse', value: 'Shanghai Primary Warehouse' },
          { label: 'Inventory Record', value: 'INV-00318' },
          { label: 'Last Outbound', value: 'OUT-2027' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Product',
        fields: ['id', 'product_code', 'product_name', 'category_id', 'warehouse_id', 'unit', 'status', 'created_at', 'updated_at'],
      },
    ],
  },
  {
    key: 'category',
    group: 'Product Management',
    label: 'Category',
    listRoute: 'category-list',
    detailRoute: 'category-detail',
    listTitle: 'Category List',
    detailTitle: 'Category Detail',
    entityLabel: 'Product Category',
    listDescription:
      'Maintain product category records with category code, description, and status aligned to the Product Management module.',
    detailDescription:
      'Inspect one product category record with code, name, description, and status fields aligned to the execution docs.',
    listSummary: [
      {
        label: 'Categories',
        value: '08',
        detail: 'Final category records currently available in the app structure.',
      },
      {
        label: 'Active',
        value: '07',
        detail: 'Categories available for current product assignment.',
      },
      {
        label: 'Products linked',
        value: '136',
        detail: 'Product master records mapped back to category ownership.',
      },
    ],
    detailSummary: [
      {
        label: 'Category code',
        value: 'CAT-FAST-01',
        detail: 'Selected sample category for the detail page.',
      },
      {
        label: 'Category name',
        value: 'Fasteners',
        detail: 'Primary category covering bolts, nuts, and washers.',
      },
      {
        label: 'Status',
        value: 'Active',
        detail: 'The category is currently active for product mapping.',
      },
    ],
    columns: [
      { key: 'categoryCode', label: 'Category Code' },
      { key: 'categoryName', label: 'Category Name' },
      { key: 'description', label: 'Description' },
      { key: 'status', label: 'Status' },
    ],
    rows: [
      {
        categoryCode: 'CAT-FAST-01',
        categoryName: 'Fasteners',
        description: 'Bolts, nuts, and washers.',
        status: 'Active',
      },
      {
        categoryCode: 'CAT-HARD-02',
        categoryName: 'Hardware',
        description: 'Clamps, brackets, and fittings.',
        status: 'Active',
      },
      {
        categoryCode: 'CAT-LP-03',
        categoryName: 'Low Priority',
        description: 'Legacy accessories pending cleanup.',
        status: 'Hold',
      },
    ],
    detailGroups: [
      {
        title: 'Product category',
        fields: [
          { label: 'Id', value: 'CAT-FAST-01' },
          { label: 'Category Code', value: 'CAT-FAST-01' },
          { label: 'Category Name', value: 'Fasteners' },
          { label: 'Description', value: 'Bolts, nuts, and washers.' },
          { label: 'Status', value: 'Active' },
        ],
      },
      {
        title: 'Linked context',
        fields: [
          { label: 'Products Linked', value: '68' },
          { label: 'Primary Warehouse', value: 'WH-SH-01' },
          { label: 'Last Updated By', value: 'Mia Lin' },
          { label: 'Recent Product', value: 'P-BOLT-A' },
        ],
      },
    ],
    fieldBlueprint: [
      {
        title: 'Product Category',
        fields: ['id', 'category_code', 'category_name', 'description', 'status'],
      },
    ],
  },
];

export const workspaceNavigation: NavigationGroup[] = [
  {
    label: 'Dashboard',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        route: 'dashboard',
        detail: 'Overview and quick entry',
      },
    ],
  },
  ...(['Warehouse Management', 'Product Management'] as const).map((groupLabel) => ({
    label: groupLabel,
    items: moduleDefinitions
      .filter((module) => module.group === groupLabel)
      .map((module) => ({
        key: module.key,
        label: module.label,
        route: module.listRoute,
        detail: `${module.listTitle} / ${module.detailTitle}`,
      })),
  })),
];

export const workspaceFooterLinks: PageAction[] = [
  { label: 'Back to Login', route: 'login', tone: 'secondary' },
  { label: 'Open Register', route: 'register', tone: 'secondary' },
];

export const authContent: Record<AuthVariant, AuthScreenContent> = {
  login: {
    eyebrow: 'Login',
    title: 'Sign in to Northline.',
    description: 'Access the workspace.',
    image: loginBg,
    imagePosition: 'center center',
    panelEyebrow: 'Workspace access',
    panelTitle: 'Login',
    panelDescription: 'Continue to the dashboard.',
    supportItems: [
      {
        title: 'Execution docs aligned',
        description: 'The workspace now follows the left-side module tree from the execution docs.',
      },
      {
        title: 'Final page list',
        description: 'List and detail skeletons are available for inbound, outbound, inventory, stocktaking, logistics / documents, product, and category.',
      },
      {
        title: 'Existing imagery',
        description: 'The login, register, and workspace screens now use the images already in the repository.',
      },
    ],
    stats: [
      {
        label: 'Final pages',
        value: '17',
        detail: 'Login, register, dashboard, and the documented list/detail pages.',
      },
      {
        label: 'Entities',
        value: '10',
        detail: 'User, warehouse, product, inventory, order, logistics, and document entities.',
      },
      {
        label: 'Module groups',
        value: '2',
        detail: 'Warehouse Management and Product Management stay visible on the left.',
      },
    ],
    primaryAction: 'Log In',
    secondaryAction: 'Open Dashboard',
    secondaryRoute: 'dashboard',
    footerLabel: "Don't have an account?",
    footerAction: 'Create one',
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
    eyebrow: 'Register',
    title: 'Create your account.',
    description: 'Set up access and continue.',
    image: registerBg,
    imagePosition: 'center center',
    panelEyebrow: 'New workspace user',
    panelTitle: 'Register',
    panelDescription: 'Create an account to continue.',
    supportItems: [
      {
        title: 'Page skeleton ready',
        description: 'The app now includes the list/detail routes called out in final-page-list.md.',
      },
      {
        title: 'Field blueprint visible',
        description: 'Each module page shows the exact documented fields from basic-field-list.md.',
      },
      {
        title: 'Module navigation visible',
        description: 'Warehouse and product modules are accessible from the left navigation after entry.',
      },
    ],
    stats: [
      {
        label: 'Warehouse modules',
        value: '5',
        detail: 'Inbound, outbound, inventory, stocktaking, and logistics / documents.',
      },
      {
        label: 'Product modules',
        value: '2',
        detail: 'Product and category management pages are included.',
      },
      {
        label: 'Detail views',
        value: '7',
        detail: 'Each documented module now has a matching sample detail page.',
      },
    ],
    primaryAction: 'Create Account',
    secondaryAction: 'Open Dashboard',
    secondaryRoute: 'dashboard',
    footerLabel: 'Already have an account?',
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

export const authOutline = [
  {
    label: 'Global',
    items: ['Dashboard', 'Login', 'Register'],
  },
  {
    label: 'Warehouse Management',
    items: ['Inbound', 'Outbound', 'Inventory', 'Stocktaking', 'Logistics / Documents'],
  },
  {
    label: 'Product Management',
    items: ['Product', 'Category'],
  },
];

export function isAuthRoute(route: Route): route is AuthRoute {
  return route === 'login' || route === 'register';
}

function buildTabs(module: ModuleDefinition): PageTab[] {
  return [
    { label: 'List', route: module.listRoute },
    { label: 'Detail', route: module.detailRoute },
  ];
}

function buildActions(module: ModuleDefinition, kind: 'list' | 'detail'): PageAction[] {
  if (kind === 'list') {
    return [
      { label: `Open ${module.label} Detail`, route: module.detailRoute, tone: 'primary' },
      { label: 'Back to Dashboard', route: 'dashboard', tone: 'secondary' },
    ];
  }

  return [
    { label: `Back to ${module.label} List`, route: module.listRoute, tone: 'primary' },
    { label: 'Back to Dashboard', route: 'dashboard', tone: 'secondary' },
  ];
}

const spotlightRows = moduleDefinitions.map((module) => ({
  module: module.label,
  listPage: module.listTitle,
  detailPage: module.detailTitle,
  entity: module.entityLabel,
}));

export const dashboardPage: DashboardPage = {
  kind: 'dashboard',
  navKey: 'dashboard',
  section: 'Dashboard',
  title: 'Operations overview',
  description:
    'The workspace now follows the execution docs: a left-side module tree, documented list/detail pages, and field blueprints tied back to the final entity and field lists.',
  heroImage: homeBg,
  metrics: [
    {
      label: 'Final pages',
      value: '17',
      detail: 'Every page from final-page-list.md is represented in the route structure.',
    },
    {
      label: 'Final entities',
      value: '10',
      detail: 'Entity coverage follows final-entity-list.md and the documented module map.',
    },
    {
      label: 'Warehouse modules',
      value: '5',
      detail: 'Inbound, outbound, inventory, stocktaking, and logistics / documents.',
    },
    {
      label: 'Product modules',
      value: '2',
      detail: 'Product and category pages are included in Product Management.',
    },
  ],
  moduleHighlights: workspaceNavigation,
  coverage: [
    {
      title: 'Final entities',
      items: finalEntities,
    },
    {
      title: 'Documented page pairs',
      items: moduleDefinitions.map((module) => `${module.listTitle} / ${module.detailTitle}`),
    },
  ],
  spotlight: {
    title: 'Page coverage map',
    description: 'Each module is now connected to its documented list page, detail page, and source entity.',
    columns: [
      { key: 'module', label: 'Module' },
      { key: 'listPage', label: 'List Page' },
      { key: 'detailPage', label: 'Detail Page' },
      { key: 'entity', label: 'Source Entity' },
    ],
    rows: spotlightRows,
  },
  actions: [
    { label: 'Open Inbound List', route: 'inbound-list', tone: 'primary' },
    { label: 'Open Product List', route: 'product-list', tone: 'secondary' },
  ],
};

export function getWorkspacePage(route: WorkspaceRoute): WorkspacePage {
  if (route === 'dashboard') {
    return dashboardPage;
  }

  const module = moduleDefinitions.find((item) => item.listRoute === route || item.detailRoute === route);

  if (!module) {
    return dashboardPage;
  }

  const tabs = buildTabs(module);

  if (route === module.listRoute) {
    return {
      kind: 'list',
      navKey: module.key,
      section: module.group,
      title: module.listTitle,
      description: module.listDescription,
      heroImage: homeBg,
      entityLabel: module.entityLabel,
      tabs,
      summary: module.listSummary,
      fieldBlueprint: module.fieldBlueprint,
      actions: buildActions(module, 'list'),
      columns: module.columns,
      rows: module.rows,
    };
  }

  return {
    kind: 'detail',
    navKey: module.key,
    section: module.group,
    title: module.detailTitle,
    description: module.detailDescription,
    heroImage: homeBg,
    entityLabel: module.entityLabel,
    tabs,
    summary: module.detailSummary,
    fieldBlueprint: module.fieldBlueprint,
    actions: buildActions(module, 'detail'),
    detailGroups: module.detailGroups,
  };
}
