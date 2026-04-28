const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '');

export type BackendRole = 'ADMIN' | 'STAFF';

export type BackendAuthUser = {
  id: string;
  name?: string | null;
  email: string;
  role: BackendRole;
  status?: 'ACTIVE' | 'INVITED';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type BackendProduct = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  unit?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendWarehouse = {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendInventoryItem = {
  id: string;
  productId: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  createdAt: string;
  updatedAt: string;
  available: number;
  product: {
    id: string;
    name: string;
    sku: string;
    unit?: string | null;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    location?: string | null;
  };
};

export type BackendOrderLineItem = {
  id: string;
  productId: string;
  quantity: string;
  notes: string;
  product: {
    id: string;
    name: string;
    sku: string;
    unit?: string | null;
  };
};

export type BackendInboundOrder = {
  id: string;
  inboundNo: string;
  warehouseId: string;
  supplierName: string;
  referenceNo: string;
  plannedDate: string;
  status: 'Draft' | 'Pending Receipt' | 'Received';
  createdBy: string;
  createdById: string;
  createdAt: string;
  confirmedAt: string;
  notes: string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  approvalReason: string;
  approvalUpdatedAt: string;
  approvedBy: string;
  approvedById: string;
  appliedAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    location?: string | null;
  };
  lineItems: BackendOrderLineItem[];
};

export type BackendOutboundOrder = {
  id: string;
  outboundNo: string;
  warehouseId: string;
  destination: string;
  carrier: string;
  shipmentDate: string;
  status: 'Draft' | 'Pending Shipment' | 'Shipped';
  createdBy: string;
  createdById: string;
  createdAt: string;
  confirmedAt: string;
  notes: string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  approvalReason: string;
  approvalUpdatedAt: string;
  approvedBy: string;
  approvedById: string;
  appliedAt: string;
  warehouse: {
    id: string;
    name: string;
    code: string;
    location?: string | null;
  };
  lineItems: BackendOrderLineItem[];
};

export type BackendApprovalItem = {
  key: string;
  id: string;
  module: 'Inbound' | 'Outbound';
  orderNo: string;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  partner: string;
  orderStatus: string;
  approvalStatus: 'Pending Approval' | 'Approved' | 'Rejected';
  approvalReason: string;
  units: number;
  createdBy: string;
  createdAt: string;
  approvalUpdatedAt: string;
  approvedBy: string;
};

export type BackendWorkspaceUser = {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
  status: 'Active' | 'Invited';
  canDelete?: boolean;
  appointedBy: string;
  appointedAt: string;
  permissionsUpdatedAt: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceUserInput = {
  name?: string;
  email: string;
  role?: BackendRole;
};

export type UpdateWorkspaceUserProfileInput = {
  name?: string;
  email: string;
  password?: string;
};

export type BackendOrderLineItemInput = {
  productId: string;
  quantity: number;
  notes?: string;
};

export type CreateInboundOrderInput = {
  inboundNo?: string;
  warehouseId: string;
  supplierName: string;
  referenceNo?: string;
  plannedDate: string;
  notes?: string;
  submitForApproval?: boolean;
  lineItems: BackendOrderLineItemInput[];
};

export type CreateOutboundOrderInput = {
  outboundNo?: string;
  warehouseId: string;
  destination: string;
  carrier?: string;
  shipmentDate: string;
  notes?: string;
  submitForApproval?: boolean;
  lineItems: BackendOrderLineItemInput[];
};

export type OcrFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'PHONE' | 'CODE' | 'CONTAINER_NO';
export type OcrRiskLevel = 'NORMAL' | 'REVIEW' | 'HIGH_RISK';

export type NormalizedBbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BackendOcrPage = {
  id: string;
  documentId: string;
  pageNumber: number;
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  qualityStatus?: string | null;
  qualityDetails?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendOcrDocument = {
  id: string;
  fileName: string;
  originalMimeType: string;
  kind: 'IMAGE' | 'PDF';
  storagePath: string;
  pageCount: number;
  status: 'UPLOADED' | 'READY' | 'FAILED' | 'ARCHIVED';
  retentionExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  pages: BackendOcrPage[];
};

export type BackendOcrTemplateField = {
  id?: string;
  fieldName: string;
  outputColumn: string;
  fieldType: OcrFieldType;
  required?: boolean;
  validationRule?: string;
  riskRule?: string;
  bboxNormalized: NormalizedBbox;
  regionType?: string;
  sortOrder?: number;
};

export type BackendOcrTemplate = {
  id: string;
  name: string;
  description?: string | null;
  anchorConfig?: Record<string, unknown> | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  fields: BackendOcrTemplateField[];
};

export type BackendOcrCandidate = {
  id: string;
  bboxNormalized: NormalizedBbox;
  confidence: number;
  textPreview?: string;
};

export type BackendOcrQuality = {
  status: string;
  checks: Record<string, string | number | boolean>;
  suggestions: string[];
};

export type BackendOcrResult = {
  id: string;
  jobId: string;
  documentPageId: string;
  fieldName: string;
  outputColumn: string;
  fieldType: OcrFieldType;
  ocrRawText?: string | null;
  finalText?: string | null;
  confidence?: number | null;
  riskLevel: OcrRiskLevel;
  validationStatus: 'NOT_RUN' | 'PASSED' | 'FAILED';
  validationMessage?: string | null;
  manuallyEdited: boolean;
  confirmedByUser: boolean;
  sourceBbox?: NormalizedBbox | null;
  createdAt: string;
  updatedAt: string;
};

export type BackendOcrJob = {
  id: string;
  documentId: string;
  documentPageId: string;
  jobType: 'DETECT' | 'EXTRACT';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  resultSummary?: Record<string, unknown> | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
  updatedAt: string;
  results: BackendOcrResult[];
};

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
};

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

export function registerAuthUser(input: { email: string; password: string; name?: string; role?: BackendRole }) {
  return apiRequest<{ message: string; user: BackendAuthUser }>('/auth/register', {
    method: 'POST',
    body: input,
  });
}

export function loginAuthUser(input: { email: string; password: string }) {
  return apiRequest<{ message: string; token: string; user: BackendAuthUser }>('/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function fetchCurrentAuthUser(token: string) {
  return apiRequest<BackendAuthUser>('/auth/me', {
    token,
  });
}

export function fetchProducts(token: string) {
  return apiRequest<{ products: BackendProduct[] }>('/products', {
    token,
  });
}

export function fetchWarehouses(token: string) {
  return apiRequest<{ warehouses: BackendWarehouse[] }>('/warehouses', {
    token,
  });
}

export async function uploadOcrDocument(file: File, token: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiBaseUrl}/ocr/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as { message?: string; document?: BackendOcrDocument } | null;

  if (!response.ok || !payload?.document) {
    throw new Error(payload?.message ?? `Upload failed with status ${response.status}`);
  }

  return payload;
}

export function fetchOcrDocuments(token: string) {
  return apiRequest<{ documents: BackendOcrDocument[] }>('/ocr/documents', { token });
}

export function fetchOcrDocumentPages(documentId: string, token: string) {
  return apiRequest<{
    document: Pick<BackendOcrDocument, 'id' | 'fileName' | 'kind' | 'pageCount' | 'status'>;
    pages: BackendOcrPage[];
  }>(`/ocr/documents/${documentId}/pages`, { token });
}

export function deleteOcrDocument(documentId: string, token: string) {
  return apiRequest<{ message: string; document: Pick<BackendOcrDocument, 'id' | 'fileName'> }>(`/ocr/documents/${documentId}`, {
    method: 'DELETE',
    token,
  });
}

export async function fetchOcrDocumentFile(documentId: string, token: string) {
  const response = await fetch(`${apiBaseUrl}/ocr/documents/${documentId}/file`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load document preview with status ${response.status}`);
  }

  return response.blob();
}

export function detectOcrPage(pageId: string, token: string) {
  return apiRequest<{ jobId: string; quality: BackendOcrQuality; candidates: BackendOcrCandidate[] }>(
    `/ocr/pages/${pageId}/detect`,
    {
      method: 'POST',
      token,
    },
  );
}

export function checkOcrPageQuality(pageId: string, token: string) {
  return apiRequest<{ jobId: string; quality: BackendOcrQuality }>(`/ocr/pages/${pageId}/quality-check`, {
    method: 'POST',
    token,
  });
}

export function extractOcrPage(
  pageId: string,
  token: string,
  input: { templateId?: string; fields: BackendOcrTemplateField[] },
) {
  return apiRequest<{ jobId: string; results: BackendOcrResult[] }>(`/ocr/pages/${pageId}/extract`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function fetchOcrJob(jobId: string, token: string) {
  return apiRequest<{ job: BackendOcrJob }>(`/ocr/jobs/${jobId}`, { token });
}

export function fetchOcrTemplates(token: string, options: { includeArchived?: boolean } = {}) {
  const query = options.includeArchived ? '?includeArchived=true' : '';
  return apiRequest<{ templates: BackendOcrTemplate[] }>(`/ocr/templates${query}`, { token });
}

export function createOcrTemplate(
  token: string,
  input: {
    name: string;
    description?: string;
    anchorConfig?: Record<string, unknown>;
    fields: BackendOcrTemplateField[];
  },
) {
  return apiRequest<{ message: string; template: BackendOcrTemplate }>('/ocr/templates', {
    method: 'POST',
    token,
    body: input,
  });
}

export function updateOcrTemplate(templateId: string, token: string, input: { name: string }) {
  return apiRequest<{ message: string; template: BackendOcrTemplate }>(`/ocr/templates/${templateId}`, {
    method: 'PATCH',
    token,
    body: input,
  });
}

export function duplicateOcrTemplate(templateId: string, token: string, input: { name?: string } = {}) {
  return apiRequest<{ message: string; template: BackendOcrTemplate }>(`/ocr/templates/${templateId}/duplicate`, {
    method: 'POST',
    token,
    body: input,
  });
}

export function archiveOcrTemplate(templateId: string, token: string) {
  return apiRequest<{ message: string; template: BackendOcrTemplate }>(`/ocr/templates/${templateId}/archive`, {
    method: 'POST',
    token,
  });
}

export function restoreOcrTemplate(templateId: string, token: string) {
  return apiRequest<{ message: string; template: BackendOcrTemplate }>(`/ocr/templates/${templateId}/restore`, {
    method: 'POST',
    token,
  });
}

export function applyOcrTemplate(templateId: string, pageId: string, token: string) {
  return apiRequest<{
    template: Omit<BackendOcrTemplate, 'fields'>;
    fields: BackendOcrTemplateField[];
    matchStatus: string;
    warnings: string[];
  }>(`/ocr/templates/${templateId}/apply`, {
    method: 'POST',
    token,
    body: {
      pageId,
    },
  });
}

export function exportOcrDocument(documentId: string, token: string) {
  return apiRequest<{
    document: {
      id: string;
      fileName: string;
    };
    header: string[];
    rows: Array<Record<string, string | number>>;
    csvContent: string;
  }>('/ocr/export', {
    method: 'POST',
    token,
    body: {
      documentId,
    },
  });
}

export function updateOcrResult(resultId: string, finalText: string, token: string) {
  return apiRequest<{ message: string; result: BackendOcrResult }>(`/ocr/results/${resultId}`, {
    method: 'PATCH',
    token,
    body: {
      finalText,
      confirmedByUser: true,
    },
  });
}

export function fetchInventory(token: string) {
  return apiRequest<{ inventory: BackendInventoryItem[] }>('/inventory', {
    token,
  });
}

export function fetchInbounds(token: string) {
  return apiRequest<{ orders: BackendInboundOrder[] }>('/inbounds', {
    token,
  });
}

export function createInboundOrder(token: string, input: CreateInboundOrderInput) {
  return apiRequest<{ message: string; order: BackendInboundOrder }>('/inbounds', {
    method: 'POST',
    body: input,
    token,
  });
}

export function updateInboundOrder(token: string, id: string, input: CreateInboundOrderInput) {
  return apiRequest<{ message: string; order: BackendInboundOrder }>(`/inbounds/${id}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function fetchOutbounds(token: string) {
  return apiRequest<{ orders: BackendOutboundOrder[] }>('/outbounds', {
    token,
  });
}

export function createOutboundOrder(token: string, input: CreateOutboundOrderInput) {
  return apiRequest<{ message: string; order: BackendOutboundOrder }>('/outbounds', {
    method: 'POST',
    body: input,
    token,
  });
}

export function updateOutboundOrder(token: string, id: string, input: CreateOutboundOrderInput) {
  return apiRequest<{ message: string; order: BackendOutboundOrder }>(`/outbounds/${id}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function fetchApprovals(token: string) {
  return apiRequest<{ items: BackendApprovalItem[] }>('/approvals', {
    token,
  });
}

export function approveOrder(token: string, module: 'inbound' | 'outbound', id: string) {
  return apiRequest<{ message: string; order: BackendInboundOrder | BackendOutboundOrder }>(`/approvals/${module}/${id}/approve`, {
    method: 'POST',
    token,
  });
}

export function rejectOrder(token: string, module: 'inbound' | 'outbound', id: string, reason: string) {
  return apiRequest<{ message: string; order: BackendInboundOrder | BackendOutboundOrder }>(`/approvals/${module}/${id}/reject`, {
    method: 'POST',
    body: { reason },
    token,
  });
}

export function fetchUsers(token: string) {
  return apiRequest<{ users: BackendWorkspaceUser[] }>('/users', {
    token,
  });
}

export function createWorkspaceUser(token: string, input: CreateWorkspaceUserInput) {
  return apiRequest<{ message: string; user: BackendWorkspaceUser; temporaryPassword: string }>('/users', {
    method: 'POST',
    body: input,
    token,
  });
}

export function deleteWorkspaceUser(token: string, id: string) {
  return apiRequest<{ message: string; user: BackendWorkspaceUser }>(`/users/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function updateWorkspaceUserProfile(token: string, id: string, input: UpdateWorkspaceUserProfileInput) {
  return apiRequest<{ message: string; user: BackendWorkspaceUser }>(`/users/${id}`, {
    method: 'PATCH',
    body: input,
    token,
  });
}

export function updateWorkspaceUserRole(token: string, id: string, role: BackendRole) {
  return apiRequest<{ message: string; user: BackendWorkspaceUser }>(`/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
    token,
  });
}
