import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { utils, writeFile } from 'xlsx';
import {
  applyOcrTemplate,
  archiveOcrTemplate,
  checkOcrPageQuality,
  createOcrTemplate,
  deleteOcrDocument,
  detectOcrPage,
  duplicateOcrTemplate,
  exportOcrDocument,
  extractOcrPage,
  fetchOcrDocumentFile,
  fetchOcrDocuments,
  fetchOcrDocumentPages,
  fetchOcrTemplates,
  restoreOcrTemplate,
  updateOcrTemplate,
  updateOcrResult,
  uploadOcrDocument,
  type BackendOcrCandidate,
  type BackendOcrDocument,
  type BackendOcrPage,
  type BackendOcrQuality,
  type BackendOcrResult,
  type BackendOcrTemplate,
  type BackendOcrTemplateField,
  type NormalizedBbox,
  type OcrFieldType,
} from './api';
import type { AuthLocale } from './content';

GlobalWorkerOptions.workerSrc = pdfWorker;

type OcrWorkbenchProps = {
  locale: AuthLocale;
  sessionToken: string;
};

type InteractionState =
  | { mode: 'draw'; fieldId: string; startX: number; startY: number }
  | { mode: 'move'; fieldId: string; offsetX: number; offsetY: number }
  | { mode: 'pan'; startClientX: number; startClientY: number; scrollLeft: number; scrollTop: number }
  | { mode: 'resize'; fieldId: string; anchorX: number; anchorY: number }
  | null;

type InteractionMode = 'select' | 'draw' | 'pan';

type QualityModalState = {
  open: boolean;
  fileName: string;
  pageNumber: number;
  quality: BackendOcrQuality | null;
};

type PaneResizeState =
  | {
      side: 'left' | 'right';
      startClientX: number;
      startWidth: number;
    }
  | null;

type ResultViewMode = 'single' | 'batch' | 'processed';

type ResultsResizeState =
  | {
      startClientY: number;
      startHeight: number;
    }
  | null;

type ParsedValidationRule = {
  minChars?: number;
  maxChars?: number;
  exactChars?: number;
  requiredKeywords: string[];
};

type ProcessingColumnMode = 'shared' | 'detail';

type ProcessingTemplateColumn = {
  id: string;
  outputColumn: string;
  mode: ProcessingColumnMode;
  sourcePattern: string;
};

type ProcessingTemplateConfig = {
  columns: ProcessingTemplateColumn[];
};

type ProcessingRule = {
  id: string;
  name: string;
  columns: ProcessingTemplateColumn[];
  updatedAt: string;
};

const fieldTypes: OcrFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'PHONE', 'CODE', 'CONTAINER_NO'];
const minSelectionSize = 0.01;
const fieldPalette = ['#2563eb', '#dc2626', '#059669', '#d97706', '#7c3aed', '#0891b2', '#be123c', '#4f46e5'];
const minLeftPaneWidth = 188;
const maxLeftPaneWidth = 360;
const minRightPaneWidth = 280;
const maxRightPaneWidth = 460;
const minResultsPaneHeight = 220;
const maxResultsPaneHeight = 520;
const resultPageSize = 20;
const batchMetadataColumnCount = 4;
const templateAspectWarningThreshold = 0.08;
const moveAllRegionsStep = 0.01;
let localFieldSeed = 0;

function t<T>(locale: AuthLocale, zh: T, en: T) {
  return locale === 'zh' ? zh : en;
}

function createLocalFieldId() {
  localFieldSeed += 1;
  return `local-field-${localFieldSeed}`;
}

function sanitizeOutputColumn(label: string, fallbackIndex: number) {
  const sanitized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || `field_${fallbackIndex + 1}`;
}

function createEmptyField(index: number, bboxNormalized?: NormalizedBbox): BackendOcrTemplateField {
  return {
    id: createLocalFieldId(),
    fieldName: `选区${index + 1}`,
    outputColumn: `field_${index + 1}`,
    fieldType: 'TEXT',
    required: false,
    bboxNormalized:
      bboxNormalized ??
      ({
        x: 0.2,
        y: 0.18 + index * 0.06,
        width: 0.28,
        height: 0.08,
      } satisfies NormalizedBbox),
    sortOrder: index,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizePositiveIntegerInput(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeNumberInput(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBbox(bbox: NormalizedBbox): NormalizedBbox {
  const width = clamp(bbox.width, minSelectionSize, 1);
  const height = clamp(bbox.height, minSelectionSize, 1);

  return {
    x: clamp(bbox.x, 0, 1 - width),
    y: clamp(bbox.y, 0, 1 - height),
    width,
    height,
  };
}

function normalizePercentCoordinate(value: unknown) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return numericValue > 1 ? numericValue / 100 : numericValue;
}

function normalizeLegacyBbox(field: BackendOcrTemplateField) {
  const rawField = field as BackendOcrTemplateField & Record<string, unknown>;
  const rawBbox = (rawField.bboxNormalized ?? {}) as NormalizedBbox & Record<string, unknown>;
  const sourceWidth = Number(rawField.originalWidth ?? rawField.imageWidth ?? rawBbox.originalWidth ?? rawBbox.imageWidth ?? rawBbox.pageWidth);
  const sourceHeight = Number(rawField.originalHeight ?? rawField.imageHeight ?? rawBbox.originalHeight ?? rawBbox.imageHeight ?? rawBbox.pageHeight);

  if (
    rawField.xPercent !== undefined ||
    rawField.yPercent !== undefined ||
    rawField.widthPercent !== undefined ||
    rawField.heightPercent !== undefined ||
    rawBbox.xPercent !== undefined ||
    rawBbox.yPercent !== undefined ||
    rawBbox.widthPercent !== undefined ||
    rawBbox.heightPercent !== undefined
  ) {
    return normalizeBbox({
      x: normalizePercentCoordinate(rawField.xPercent ?? rawBbox.xPercent),
      y: normalizePercentCoordinate(rawField.yPercent ?? rawBbox.yPercent),
      width: normalizePercentCoordinate(rawField.widthPercent ?? rawBbox.widthPercent),
      height: normalizePercentCoordinate(rawField.heightPercent ?? rawBbox.heightPercent),
    });
  }

  if (
    Number.isFinite(sourceWidth) &&
    Number.isFinite(sourceHeight) &&
    sourceWidth > 0 &&
    sourceHeight > 0 &&
    (rawBbox.x > 1 || rawBbox.y > 1 || rawBbox.width > 1 || rawBbox.height > 1)
  ) {
    return normalizeBbox({
      x: rawBbox.x / sourceWidth,
      y: rawBbox.y / sourceHeight,
      width: rawBbox.width / sourceWidth,
      height: rawBbox.height / sourceHeight,
    });
  }

  return normalizeBbox({
    x: normalizeNumberInput(String(rawBbox.x), 0),
    y: normalizeNumberInput(String(rawBbox.y), 0),
    width: normalizeNumberInput(String(rawBbox.width), minSelectionSize),
    height: normalizeNumberInput(String(rawBbox.height), minSelectionSize),
  });
}

function buildTemplateAnchorConfig(preview: { width: number; height: number }) {
  const aspectRatio = preview.width > 0 && preview.height > 0 ? preview.width / preview.height : undefined;

  return {
    mode: 'none',
    anchors: [],
    sourceImage:
      aspectRatio !== undefined
        ? {
            width: preview.width,
            height: preview.height,
            aspectRatio,
          }
        : undefined,
  };
}

function templateSourceAspectRatio(anchorConfig?: Record<string, unknown> | null) {
  const sourceImage = anchorConfig?.sourceImage;
  if (!sourceImage || typeof sourceImage !== 'object' || Array.isArray(sourceImage)) {
    return undefined;
  }

  const aspectRatio = Number((sourceImage as { aspectRatio?: unknown }).aspectRatio);
  if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
    return aspectRatio;
  }

  const width = Number((sourceImage as { width?: unknown }).width);
  const height = Number((sourceImage as { height?: unknown }).height);
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0 ? width / height : undefined;
}

function aspectRatioWarningMessage(locale: AuthLocale, templateAspectRatio: number | undefined, preview: { width: number; height: number }) {
  if (!templateAspectRatio || preview.width <= 0 || preview.height <= 0) {
    return '';
  }

  const currentAspectRatio = preview.width / preview.height;
  const differenceRatio = Math.abs(currentAspectRatio - templateAspectRatio) / templateAspectRatio;
  if (differenceRatio <= templateAspectWarningThreshold) {
    return '';
  }

  return t(
    locale,
    '当前图片比例与预设来源差异较大，选区可能需要整体移动或调整。',
    'The current image aspect ratio differs from the preset source. Regions may need to be moved or adjusted together.',
  );
}

function normalizeRect(startX: number, startY: number, currentX: number, currentY: number): NormalizedBbox {
  return normalizeBbox({
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  });
}

function hydrateField(field: BackendOcrTemplateField, index: number): BackendOcrTemplateField {
  return {
    ...field,
    id: field.id ?? createLocalFieldId(),
    fieldName: field.fieldName || `选区${index + 1}`,
    outputColumn: field.outputColumn || sanitizeOutputColumn(field.fieldName, index),
    bboxNormalized: normalizeLegacyBbox(field),
    sortOrder: field.sortOrder ?? index,
  };
}

function toFieldId(field: BackendOcrTemplateField, index: number) {
  return field.id ?? `field-${index}`;
}

function fieldColor(index: number) {
  return fieldPalette[index % fieldPalette.length];
}

function getFieldHeader(field: BackendOcrTemplateField, index: number) {
  return field.outputColumn || sanitizeOutputColumn(field.fieldName, index);
}

function buildFieldHeaders(sourceFields: BackendOcrTemplateField[]) {
  return sourceFields.map((field, index) => getFieldHeader(field, index));
}

function orderResultsByFields(sourceResults: BackendOcrResult[], sourceFields: BackendOcrTemplateField[]) {
  if (sourceResults.length === 0) {
    return sourceResults;
  }

  const resultsByColumn = new Map<string, BackendOcrResult[]>();
  for (const result of sourceResults) {
    const bucket = resultsByColumn.get(result.outputColumn) ?? [];
    bucket.push(result);
    resultsByColumn.set(result.outputColumn, bucket);
  }

  const orderedResults: BackendOcrResult[] = [];
  const usedResultIds = new Set<string>();

  for (const field of sourceFields) {
    const bucket = resultsByColumn.get(field.outputColumn) ?? [];
    const nextResult = bucket.find((result) => !usedResultIds.has(result.id));
    if (nextResult) {
      orderedResults.push(nextResult);
      usedResultIds.add(nextResult.id);
    }
  }

  for (const result of sourceResults) {
    if (!usedResultIds.has(result.id)) {
      orderedResults.push(result);
    }
  }

  return orderedResults;
}

function fieldTypeLabel(fieldType: OcrFieldType, locale: AuthLocale) {
  const zh: Record<OcrFieldType, string> = {
    TEXT: '文本',
    NUMBER: '数字',
    DATE: '日期',
    PHONE: '电话',
    CODE: '编码',
    CONTAINER_NO: '箱号',
  };

  return locale === 'zh' ? zh[fieldType] : fieldType.replace(/_/g, ' ');
}

function parseValidationRule(rule?: string): ParsedValidationRule {
  if (!rule?.trim()) {
    return { requiredKeywords: [] };
  }

  try {
    const parsed = JSON.parse(rule) as Record<string, unknown>;
    return {
      minChars: typeof parsed.minChars === 'number' && parsed.minChars > 0 ? parsed.minChars : undefined,
      maxChars: typeof parsed.maxChars === 'number' && parsed.maxChars > 0 ? parsed.maxChars : undefined,
      exactChars: typeof parsed.exactChars === 'number' && parsed.exactChars > 0 ? parsed.exactChars : undefined,
      requiredKeywords: Array.isArray(parsed.requiredKeywords)
        ? parsed.requiredKeywords.map((item) => String(item).trim()).filter(Boolean)
        : [],
    };
  } catch {
    return { requiredKeywords: [] };
  }
}

function serializeValidationRule(rule: ParsedValidationRule) {
  const payload: Record<string, unknown> = {};

  if (rule.exactChars) {
    payload.exactChars = rule.exactChars;
  }

  if (rule.minChars) {
    payload.minChars = rule.minChars;
  }

  if (rule.maxChars) {
    payload.maxChars = rule.maxChars;
  }

  if (rule.requiredKeywords.length > 0) {
    payload.requiredKeywords = rule.requiredKeywords;
  }

  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : undefined;
}

function sortCandidatesByLayout(candidates: BackendOcrCandidate[]) {
  return [...candidates].sort((left, right) => {
    const rowGap = Math.abs(left.bboxNormalized.y - right.bboxNormalized.y);
    return rowGap > 0.02 ? left.bboxNormalized.y - right.bboxNormalized.y : left.bboxNormalized.x - right.bboxNormalized.x;
  });
}

function sortFieldsByLayout(sourceFields: BackendOcrTemplateField[]) {
  return [...sourceFields].sort((left, right) => {
    const rowGap = Math.abs(left.bboxNormalized.y - right.bboxNormalized.y);
    return rowGap > 0.02 ? left.bboxNormalized.y - right.bboxNormalized.y : left.bboxNormalized.x - right.bboxNormalized.x;
  });
}

function buildFieldFromCandidate(candidate: BackendOcrCandidate, index: number): BackendOcrTemplateField {
  const preview = candidate.textPreview?.trim();
  const fieldName = preview && preview.length <= 24 ? preview : `选区${index + 1}`;

  return {
    id: createLocalFieldId(),
    fieldName,
    outputColumn: sanitizeOutputColumn(fieldName, index),
    fieldType: 'TEXT',
    required: false,
    bboxNormalized: normalizeBbox(candidate.bboxNormalized),
    sortOrder: index,
  };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatQualityStatus(status: string, locale: AuthLocale) {
  const normalized = status.trim().toUpperCase();
  if (locale === 'zh') {
    if (normalized === 'PASS' || normalized === 'GOOD') return '清晰可识别';
    if (normalized === 'REVIEW' || normalized === 'WARN') return '建议复核';
    if (normalized === 'FAIL' || normalized === 'POOR') return '清晰度不足';
  }

  return status || t(locale, '待检测', 'Pending');
}

function riskTone(riskLevel: BackendOcrResult['riskLevel']) {
  switch (riskLevel) {
    case 'HIGH_RISK':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'REVIEW':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}

function validationTone(status: BackendOcrResult['validationStatus']) {
  if (status === 'FAILED') return 'text-red-700';
  if (status === 'PASSED') return 'text-emerald-700';
  return 'text-slate-500';
}

function getResizeAnchor(box: NormalizedBbox, corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right') {
  switch (corner) {
    case 'top-left':
      return { anchorX: box.x + box.width, anchorY: box.y + box.height };
    case 'top-right':
      return { anchorX: box.x, anchorY: box.y + box.height };
    case 'bottom-left':
      return { anchorX: box.x + box.width, anchorY: box.y };
    default:
      return { anchorX: box.x, anchorY: box.y };
  }
}

function downloadWorkbook(fileName: string, headers: string[], rows: Array<Record<string, string | number>>, sheetName: string) {
  const normalizedRows = rows.map((row) =>
    headers.reduce<Record<string, string | number>>((accumulator, header) => {
      const value = row[header];
      accumulator[header] = typeof value === 'number' ? value : value ?? '';
      return accumulator;
    }, {}),
  );
  const worksheet = utils.json_to_sheet(normalizedRows, { header: headers });
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, sheetName);
  writeFile(workbook, fileName);
}

function resultText(result: Pick<BackendOcrResult, 'finalText' | 'ocrRawText'>) {
  return result.finalText ?? result.ocrRawText ?? '';
}

function buildRawOcrRow(
  results: BackendOcrResult[],
  metadata: Record<string, string | number>,
  pageFields: BackendOcrTemplateField[],
) {
  const headers = buildFieldHeaders(pageFields);
  const row: Record<string, string | number> = { ...metadata };

  for (const header of headers) {
    row[header] = '';
  }

  for (const result of orderResultsByFields(results, pageFields)) {
    row[result.outputColumn] = resultText(result);
  }

  return { headers, row };
}

function createProcessingColumn(outputColumn: string, mode: ProcessingColumnMode, sourcePattern = outputColumn): ProcessingTemplateColumn {
  return {
    id: createLocalFieldId(),
    outputColumn,
    mode,
    sourcePattern,
  };
}

function cloneProcessingColumns(columns: ProcessingTemplateColumn[]) {
  return columns.map((column) => ({ ...column, id: createLocalFieldId() }));
}

function normalizeProcessingTemplate(rawTemplate: unknown): ProcessingTemplateConfig {
  if (!rawTemplate || typeof rawTemplate !== 'object' || Array.isArray(rawTemplate)) {
    return { columns: [] };
  }

  const rawColumns = (rawTemplate as { columns?: unknown }).columns;
  if (!Array.isArray(rawColumns)) {
    return { columns: [] };
  }

  return {
    columns: rawColumns
      .map((rawColumn, index) => {
        if (!rawColumn || typeof rawColumn !== 'object' || Array.isArray(rawColumn)) {
          return null;
        }

        const column = rawColumn as Record<string, unknown>;
        const outputColumn = String(column.outputColumn ?? '').trim();
        const sourcePattern = String(column.sourcePattern ?? '').trim();
        if (!outputColumn || !sourcePattern) {
          return null;
        }

        return {
          id: String(column.id ?? `processing-column-${index}`),
          outputColumn,
          mode: column.mode === 'detail' ? 'detail' : 'shared',
          sourcePattern,
        } satisfies ProcessingTemplateColumn;
      })
      .filter((column): column is ProcessingTemplateColumn => Boolean(column)),
  };
}

function processingTemplateFromAnchor(anchorConfig?: Record<string, unknown> | null): ProcessingTemplateConfig {
  return normalizeProcessingTemplate(anchorConfig?.processingTemplate);
}

function processingRuleLibraryFromAnchor(anchorConfig?: Record<string, unknown> | null): ProcessingRule[] {
  const rawLibrary = anchorConfig?.processingRuleLibrary;
  const rawRules =
    rawLibrary && typeof rawLibrary === 'object' && !Array.isArray(rawLibrary) ? (rawLibrary as { rules?: unknown }).rules : undefined;

  const rules = Array.isArray(rawRules)
    ? rawRules
        .map((rawRule, index) => {
          if (!rawRule || typeof rawRule !== 'object' || Array.isArray(rawRule)) {
            return null;
          }

          const rule = rawRule as Record<string, unknown>;
          const template = normalizeProcessingTemplate({ columns: rule.columns });
          const name = String(rule.name ?? '').trim() || `规则 ${index + 1}`;
          if (template.columns.length === 0) {
            return null;
          }

          return {
            id: String(rule.id ?? `processing-rule-${index}`),
            name,
            columns: template.columns,
            updatedAt: String(rule.updatedAt ?? ''),
          } satisfies ProcessingRule;
        })
        .filter((rule): rule is ProcessingRule => Boolean(rule))
    : [];

  if (rules.length > 0) {
    return rules;
  }

  const legacyTemplate = processingTemplateFromAnchor(anchorConfig);
  if (legacyTemplate.columns.length === 0) {
    return [];
  }

  return [
    {
      id: 'legacy-default-processing-rule',
      name: '默认规则',
      columns: legacyTemplate.columns,
      updatedAt: '',
    },
  ];
}

function normalizeHeaderKey(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitNumberedHeader(header: string) {
  const match = header.trim().match(/^(.+?)(?:[_\s-]?)(\d+)$/);
  if (!match) {
    return null;
  }

  const prefix = match[1].replace(/[_\s-]+$/g, '');
  return prefix ? { prefix, index: match[2] } : null;
}

function outputColumnFromPrefix(prefix: string) {
  return sanitizeExportFileName(prefix)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function suggestProcessingTemplate(headers: string[]): ProcessingTemplateConfig {
  const metadataKeys = new Set(['filename', 'file', 'pagenumber', 'page', 'status', 'message']);
  const columns: ProcessingTemplateColumn[] = [];
  const usedOutputs = new Set<string>();
  const repeatedPrefixes = new Map<string, number>();

  for (const header of headers) {
    const split = splitNumberedHeader(header);
    if (split) {
      repeatedPrefixes.set(split.prefix, (repeatedPrefixes.get(split.prefix) ?? 0) + 1);
    }
  }

  for (const header of headers) {
    const normalized = normalizeHeaderKey(header);
    if (metadataKeys.has(normalized)) {
      continue;
    }

    const isSharedSuggestion =
      normalized.includes('blpl') ||
      normalized.includes('blnumber') ||
      normalized.includes('dnnumber') ||
      normalized.includes('dnno') ||
      normalized.includes('truckno') ||
      normalized.includes('truckphone') ||
      normalized.includes('container');

    if (isSharedSuggestion && !usedOutputs.has(header)) {
      columns.push(createProcessingColumn(header, 'shared', header));
      usedOutputs.add(header);
    }
  }

  for (const [prefix, count] of repeatedPrefixes) {
    if (count < 2) {
      continue;
    }

    const normalized = normalizeHeaderKey(prefix);
    const shouldSuggestDetail = normalized.includes('product') || normalized.includes('description') || normalized.includes('material');
    if (!shouldSuggestDetail) {
      continue;
    }

    const outputColumn = outputColumnFromPrefix(prefix);
    if (outputColumn && !usedOutputs.has(outputColumn)) {
      columns.push(createProcessingColumn(outputColumn, 'detail', `${prefix}_*`));
      usedOutputs.add(outputColumn);
    }
  }

  return { columns };
}

function mergeProcessingTemplateColumns(currentTemplate: ProcessingTemplateConfig, suggestion: ProcessingTemplateConfig): ProcessingTemplateConfig {
  const mergedColumns = [...currentTemplate.columns];
  const existingKeys = new Set(
    mergedColumns.map((column) => `${normalizeHeaderKey(column.outputColumn)}:${column.mode}:${normalizeHeaderKey(column.sourcePattern)}`),
  );

  for (const column of suggestion.columns) {
    const key = `${normalizeHeaderKey(column.outputColumn)}:${column.mode}:${normalizeHeaderKey(column.sourcePattern)}`;
    if (!existingKeys.has(key)) {
      mergedColumns.push(column);
      existingKeys.add(key);
    }
  }

  return { columns: mergedColumns };
}

function detailHeaderForPattern(pattern: string, index: string) {
  return pattern.includes('*') ? pattern.replace(/\*/g, index) : pattern;
}

function collectDetailIndexes(row: Record<string, string | number>, columns: ProcessingTemplateColumn[]) {
  const indexes = new Set<string>();

  for (const column of columns) {
    if (column.mode !== 'detail' || !column.sourcePattern.includes('*')) {
      continue;
    }

    const exactPattern = column.sourcePattern
      .split('*')
      .map((part) => escapeRegExp(part))
      .join('(\\d+)');
    const exactMatcher = new RegExp(`^${exactPattern}$`, 'i');

    const normalizedPattern = column.sourcePattern
      .split('*')
      .map((part) => escapeRegExp(normalizeHeaderKey(part)))
      .join('(\\d+)');
    const normalizedMatcher = new RegExp(`^${normalizedPattern}$`, 'i');

    Object.keys(row).forEach((header) => {
      const match = header.match(exactMatcher) ?? normalizeHeaderKey(header).match(normalizedMatcher);
      if (match?.[1]) {
        indexes.add(match[1]);
      }
    });
  }

  return Array.from(indexes).sort((left, right) => Number(left) - Number(right));
}

function valueFromRawRow(row: Record<string, string | number>, sourceHeader: string) {
  if (sourceHeader in row) {
    return row[sourceHeader] ?? '';
  }

  const normalizedSource = normalizeHeaderKey(sourceHeader);
  const matchedHeader = Object.keys(row).find((header) => normalizeHeaderKey(header) === normalizedSource);
  return matchedHeader ? row[matchedHeader] ?? '' : '';
}

function buildProcessedRows(rawRows: Array<Record<string, string | number>>, template: ProcessingTemplateConfig) {
  const outputHeaders = template.columns.map((column) => column.outputColumn).filter(Boolean);
  const detailColumns = template.columns.filter((column) => column.mode === 'detail');
  const processedRows: Array<Record<string, string | number>> = [];

  for (const rawRow of rawRows) {
    const detailIndexes = collectDetailIndexes(rawRow, detailColumns);
    const indexes = detailColumns.length === 0 ? [''] : detailIndexes.length > 0 ? detailIndexes : [''];

    for (const detailIndex of indexes) {
      const processedRow: Record<string, string | number> = {};
      let hasDetailValue = detailColumns.length === 0;

      for (const column of template.columns) {
        const sourceHeader = column.mode === 'detail' ? detailHeaderForPattern(column.sourcePattern, detailIndex) : column.sourcePattern;
        const value = valueFromRawRow(rawRow, sourceHeader);
        processedRow[column.outputColumn] = value;

        if (column.mode === 'detail' && String(value).trim()) {
          hasDetailValue = true;
        }
      }

      if (hasDetailValue) {
        processedRows.push(processedRow);
      }
    }
  }

  return {
    headers: outputHeaders,
    rows: processedRows,
  };
}

function formatExportDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sanitizeExportFileName(input: string) {
  const sanitized = input
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');

  return sanitized || 'ocr_export';
}

function ensureXlsxExtension(fileName: string) {
  return /\.xlsx$/i.test(fileName) ? fileName : `${fileName.replace(/\.[^.]+$/, '')}.xlsx`;
}

function stripXlsxExtension(fileName: string) {
  return fileName.replace(/\.xlsx$/i, '');
}

function buildDefaultExportFileName(documentType: string) {
  return `ocr_${sanitizeExportFileName(documentType).toLowerCase()}_${formatExportDate()}_v1.xlsx`;
}

function resolveExportFileName(inputName: string, defaultFileName: string, exportedFileNames: string[]) {
  const requestedName = inputName.trim() ? inputName : defaultFileName;
  const sanitizedName = ensureXlsxExtension(sanitizeExportFileName(requestedName));
  const usedNames = new Set(exportedFileNames.map((fileName) => fileName.toLowerCase()));

  if (!usedNames.has(sanitizedName.toLowerCase())) {
    return sanitizedName;
  }

  const baseName = stripXlsxExtension(sanitizedName).replace(/_v\d+$/i, '');
  let version = 2;
  let nextName = `${baseName}_v${version}.xlsx`;

  while (usedNames.has(nextName.toLowerCase())) {
    version += 1;
    nextName = `${baseName}_v${version}.xlsx`;
  }

  return nextName;
}

function cloneFieldsForPage(sourceFields: BackendOcrTemplateField[]) {
  return sourceFields.map((field, index) =>
    hydrateField(
      {
        ...field,
        id: createLocalFieldId(),
      },
      index,
    ),
  );
}

export default function OcrWorkbench({ locale, sessionToken }: OcrWorkbenchProps) {
  const [documents, setDocuments] = useState<BackendOcrDocument[]>([]);
  const [templates, setTemplates] = useState<BackendOcrTemplate[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<BackendOcrDocument | null>(null);
  const [selectedBatchDocumentIds, setSelectedBatchDocumentIds] = useState<string[]>([]);
  const [pages, setPages] = useState<BackendOcrPage[]>([]);
  const [activePageId, setActivePageId] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [fields, setFields] = useState<BackendOcrTemplateField[]>([]);
  const [pageFieldsByPageId, setPageFieldsByPageId] = useState<Record<string, BackendOcrTemplateField[]>>({});
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [candidates, setCandidates] = useState<BackendOcrCandidate[]>([]);
  const [results, setResults] = useState<BackendOcrResult[]>([]);
  const [qualityStatus, setQualityStatus] = useState('');
  const [qualitySuggestions, setQualitySuggestions] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [interactionState, setInteractionState] = useState<InteractionState>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('select');
  const [previewZoom, setPreviewZoom] = useState(1);
  const [cursorPoint, setCursorPoint] = useState<{ x: number; y: number } | null>(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [fieldNameError, setFieldNameError] = useState('');
  const [leftPaneWidth, setLeftPaneWidth] = useState(220);
  const [rightPaneWidth, setRightPaneWidth] = useState(330);
  const [paneResizeState, setPaneResizeState] = useState<PaneResizeState>(null);
  const [resultsPaneHeight, setResultsPaneHeight] = useState(360);
  const [resultsResizeState, setResultsResizeState] = useState<ResultsResizeState>(null);
  const [batchRows, setBatchRows] = useState<Array<Record<string, string | number>>>([]);
  const [batchHeaders, setBatchHeaders] = useState<string[]>([]);
  const [processingTemplate, setProcessingTemplate] = useState<ProcessingTemplateConfig>({ columns: [] });
  const [showProcessingTemplatePanel, setShowProcessingTemplatePanel] = useState(false);
  const [processingRuleLibrary, setProcessingRuleLibrary] = useState<ProcessingRule[]>([]);
  const [selectedProcessingRuleId, setSelectedProcessingRuleId] = useState('');
  const [processedHeaders, setProcessedHeaders] = useState<string[]>([]);
  const [processedRows, setProcessedRows] = useState<Array<Record<string, string | number>>>([]);
  const [resultViewMode, setResultViewMode] = useState<ResultViewMode>('single');
  const [resultPage, setResultPage] = useState(1);
  const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [showRegionLabels, setShowRegionLabels] = useState(true);
  const [draggedFieldId, setDraggedFieldId] = useState('');
  const [dragOverFieldId, setDragOverFieldId] = useState('');
  const [exportedFileNames, setExportedFileNames] = useState<string[]>([]);
  const [showArchivedTemplates, setShowArchivedTemplates] = useState(false);
  const [qualityModal, setQualityModal] = useState<QualityModalState>({
    open: false,
    fileName: '',
    pageNumber: 1,
    quality: null,
  });

  const previewHostRef = useRef<HTMLDivElement | null>(null);
  const previewStageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activePage = pages.find((page) => page.id === activePageId) ?? null;
  const selectedFieldIndex = fields.findIndex((field, index) => toFieldId(field, index) === selectedFieldId);
  const selectedField = selectedFieldIndex >= 0 ? fields[selectedFieldIndex] : null;
  const selectedFieldRule = selectedField ? parseValidationRule(selectedField.validationRule) : { requiredKeywords: [] };
  const busy = Boolean(busyAction);
  const visibleResultCount = resultViewMode === 'processed' ? processedRows.length : resultViewMode === 'batch' ? batchRows.length : results.length;
  const resultPageCount = Math.max(1, Math.ceil(visibleResultCount / resultPageSize));
  const currentResultPage = clamp(resultPage, 1, resultPageCount);
  const resultStartIndex = visibleResultCount === 0 ? 0 : (currentResultPage - 1) * resultPageSize + 1;
  const resultEndIndex = Math.min(visibleResultCount, currentResultPage * resultPageSize);
  const visibleBatchRows = batchRows.slice(resultStartIndex > 0 ? resultStartIndex - 1 : 0, resultEndIndex);
  const visibleProcessedRows = processedRows.slice(resultStartIndex > 0 ? resultStartIndex - 1 : 0, resultEndIndex);
  const visibleResults = results.slice(resultStartIndex > 0 ? resultStartIndex - 1 : 0, resultEndIndex);
  const selectedBatchDocuments = documents.filter((documentItem) => selectedBatchDocumentIds.includes(documentItem.id));
  const batchTargetDocuments = selectedBatchDocuments.length > 0 ? selectedBatchDocuments : selectedDocument ? [selectedDocument] : [];
  const activeTemplates = templates.filter((template) => !template.archivedAt);
  const archivedTemplates = templates.filter((template) => template.archivedAt);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;
  const selectedProcessingRule = processingRuleLibrary.find((rule) => rule.id === selectedProcessingRuleId) ?? null;
  const modeHint =
    interactionMode === 'draw'
      ? t(locale, '拖拽创建新选区，松手后可在右侧填写预输入和规则。', 'Drag on the canvas to create a region, then fill pre-input and rules on the right.')
      : interactionMode === 'pan'
        ? t(locale, '按住画面拖动平移，适合放大后查看局部。', 'Drag the canvas to pan around after zooming in.')
        : t(locale, '点击已有选区可移动或缩放，也可以点候选框快速转成选区。', 'Click a region to move or resize it, or click a candidate box to convert it into a region.');

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        const [documentsResult, templatesResult] = await Promise.all([
          fetchOcrDocuments(sessionToken),
          fetchOcrTemplates(sessionToken, { includeArchived: true }),
        ]);

        if (!cancelled) {
          setDocuments(documentsResult.documents);
          setTemplates(templatesResult.templates);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to load OCR workspace data');
        }
      }
    }

    void loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    setFieldNameDraft(selectedField?.fieldName ?? '');
    setFieldNameError('');
  }, [selectedField?.fieldName, selectedFieldId]);

  useEffect(() => {
    setShowAdvancedParams(false);
  }, [selectedFieldId]);

  useEffect(() => {
    setResultPage(1);
  }, [resultViewMode, activePageId]);

  useEffect(() => {
    setResultPage((currentPage) => Math.min(currentPage, resultPageCount));
  }, [resultPageCount]);

  useEffect(() => {
    setSelectedBatchDocumentIds((currentIds) => currentIds.filter((documentId) => documents.some((documentItem) => documentItem.id === documentId)));
  }, [documents]);

  useEffect(() => {
    const nextLibrary = processingRuleLibraryFromAnchor(selectedTemplate?.anchorConfig);
    const nextTemplate = processingTemplateFromAnchor(selectedTemplate?.anchorConfig);
    const defaultRule = nextLibrary[0] ?? null;

    setProcessingRuleLibrary(nextLibrary);
    setSelectedProcessingRuleId(defaultRule?.id ?? '');
    setProcessingTemplate(nextTemplate.columns.length > 0 ? nextTemplate : defaultRule ? { columns: cloneProcessingColumns(defaultRule.columns) } : { columns: [] });
    setProcessedHeaders([]);
    setProcessedRows([]);
    if (resultViewMode === 'processed') {
      setResultViewMode('batch');
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (!paneResizeState) {
      return;
    }

    const resizeState = paneResizeState;

    function handleWindowMouseMove(event: MouseEvent) {
      const offset = event.clientX - resizeState.startClientX;

      if (resizeState.side === 'left') {
        setLeftPaneWidth(clamp(resizeState.startWidth + offset, minLeftPaneWidth, maxLeftPaneWidth));
        return;
      }

      setRightPaneWidth(clamp(resizeState.startWidth - offset, minRightPaneWidth, maxRightPaneWidth));
    }

    function handleWindowMouseUp() {
      setPaneResizeState(null);
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [paneResizeState]);

  useEffect(() => {
    if (!resultsResizeState) {
      return;
    }

    const resizeState = resultsResizeState;

    function handleWindowMouseMove(event: MouseEvent) {
      const offset = resizeState.startClientY - event.clientY;
      setResultsPaneHeight(clamp(resizeState.startHeight + offset, minResultsPaneHeight, maxResultsPaneHeight));
    }

    function handleWindowMouseUp() {
      setResultsResizeState(null);
    }

    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [resultsResizeState]);

  useEffect(() => {
    if (!selectedDocument || !previewUrl || selectedDocument.kind !== 'PDF' || !activePage) {
      return;
    }

    const pageNumber = activePage.pageNumber;
    let cancelled = false;

    async function renderPdfPage() {
      try {
        const canvas = canvasRef.current;
        const host = previewHostRef.current;
        if (!canvas || !host) {
          return;
        }

        const task = getDocument(previewUrl);
        const pdf = await task.promise;
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(host.clientWidth - 56, 720);
        const scale = clamp(availableWidth / baseViewport.width, 0.85, 1.8);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');

        if (!context || cancelled) {
          return;
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport, canvas }).promise;

        if (!cancelled) {
          setPreviewSize({ width: viewport.width, height: viewport.height });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Failed to render PDF preview');
        }
      }
    }

    void renderPdfPage();

    return () => {
      cancelled = true;
    };
  }, [activePage, previewUrl, selectedDocument]);

  async function refreshDocumentsAndTemplates() {
    const [documentsResult, templatesResult] = await Promise.all([
      fetchOcrDocuments(sessionToken),
      fetchOcrTemplates(sessionToken, { includeArchived: true }),
    ]);

    setDocuments(documentsResult.documents);
    setTemplates(templatesResult.templates);
  }

  function getFieldsForPage(pageId: string) {
    return pageFieldsByPageId[pageId] ?? [];
  }

  function persistFieldsForPage(pageId: string, nextFields: BackendOcrTemplateField[]) {
    const normalizedFields = nextFields.map((field, index) =>
      hydrateField(
        {
          ...field,
          sortOrder: index,
        },
        index,
      ),
    );

    if (pageId) {
      setPageFieldsByPageId((currentMap) => {
        if (normalizedFields.length === 0) {
          const nextMap = { ...currentMap };
          delete nextMap[pageId];
          return nextMap;
        }

        return {
          ...currentMap,
          [pageId]: normalizedFields,
        };
      });
    }

    setFields(normalizedFields);
    return normalizedFields;
  }

  function replaceActivePageFields(nextFields: BackendOcrTemplateField[]) {
    return persistFieldsForPage(activePageId, nextFields);
  }

  function updateFieldsForPage(pageId: string, nextFields: BackendOcrTemplateField[]) {
    return persistFieldsForPage(pageId, nextFields);
  }

  function syncOrderedResultViews(nextFields: BackendOcrTemplateField[]) {
    setResults((currentResults) => orderResultsByFields(currentResults, nextFields));
    setBatchHeaders((currentHeaders) => {
      if (currentHeaders.length === 0) {
        return currentHeaders;
      }

      return [...currentHeaders.slice(0, batchMetadataColumnCount), ...buildFieldHeaders(nextFields)];
    });
  }

  function handleSuggestProcessingTemplate() {
    if (batchHeaders.length === 0) {
      return;
    }

    const suggestion = suggestProcessingTemplate(batchHeaders);
    setProcessingTemplate((currentTemplate) => mergeProcessingTemplateColumns(currentTemplate, suggestion));
    setProcessedHeaders([]);
    setProcessedRows([]);
    setShowProcessingTemplatePanel(true);
    setNotice(t(locale, '已根据当前批量结果补全建议规则，可继续新增或调整。', 'Suggested processing rules were added from the current batch results.'));
  }

  function updateProcessingColumn(columnId: string, patch: Partial<Omit<ProcessingTemplateColumn, 'id'>>) {
    setProcessingTemplate((currentTemplate) => ({
      columns: currentTemplate.columns.map((column) => (column.id === columnId ? { ...column, ...patch } : column)),
    }));
    setProcessedHeaders([]);
    setProcessedRows([]);
  }

  function addProcessingColumn() {
    const defaultName = `column_${processingTemplate.columns.length + 1}`;
    setProcessingTemplate((currentTemplate) => ({
      columns: [...currentTemplate.columns, createProcessingColumn(defaultName, 'detail', '')],
    }));
    setShowProcessingTemplatePanel(true);
    setProcessedHeaders([]);
    setProcessedRows([]);
  }

  function removeProcessingColumn(columnId: string) {
    setProcessingTemplate((currentTemplate) => ({
      columns: currentTemplate.columns.filter((column) => column.id !== columnId),
    }));
    setProcessedHeaders([]);
    setProcessedRows([]);
  }

  function sourceOptionsForProcessing() {
    const repeatedPrefixes = new Set<string>();
    for (const header of batchHeaders) {
      const split = splitNumberedHeader(header);
      if (split) {
        repeatedPrefixes.add(`${split.prefix}_*`);
      }
    }

    return [...batchHeaders, ...Array.from(repeatedPrefixes).filter((pattern) => !batchHeaders.includes(pattern))];
  }

  function validProcessingTemplateFromEditor(): ProcessingTemplateConfig {
    return {
      columns: processingTemplate.columns.filter((column) => column.outputColumn.trim() && column.sourcePattern.trim()),
    };
  }

  function buildProcessingAnchorConfig(nextRules: ProcessingRule[], nextTemplate = validProcessingTemplateFromEditor()) {
    return {
      ...(selectedTemplate?.anchorConfig ?? buildTemplateAnchorConfig(previewSize)),
      processingTemplate: nextTemplate,
      processingRuleLibrary: {
        rules: nextRules,
      },
    };
  }

  async function persistProcessingRuleLibrary(nextRules: ProcessingRule[], nextTemplate = validProcessingTemplateFromEditor()) {
    if (!selectedTemplate) {
      setErrorMessage(t(locale, '请先选择或保存一个 OCR 预设，再保存规则库。', 'Select or save an OCR preset before saving the rule library.'));
      return null;
    }

    setBusyAction('save-processing-rule');
    setErrorMessage('');

    try {
      const payload = await updateOcrTemplate(selectedTemplate.id, sessionToken, {
        anchorConfig: buildProcessingAnchorConfig(nextRules, nextTemplate),
      });
      replaceTemplateInList(payload.template);
      setProcessingRuleLibrary(nextRules);
      setProcessingTemplate(nextTemplate);
      return payload.template;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save processing rules');
      return null;
    } finally {
      setBusyAction('');
    }
  }

  function handleUseProcessingRule(rule: ProcessingRule) {
    setSelectedProcessingRuleId(rule.id);
    setProcessingTemplate({ columns: cloneProcessingColumns(rule.columns) });
    setProcessedHeaders([]);
    setProcessedRows([]);
    setShowProcessingTemplatePanel(true);
    setNotice(t(locale, `已导入规则：${rule.name}`, `Rule imported: ${rule.name}`));
  }

  function handleGenerateProcessedRows() {
    const validTemplate = validProcessingTemplateFromEditor();

    if (batchRows.length === 0 || validTemplate.columns.length === 0) {
      setErrorMessage(t(locale, '请先生成批量结果，并至少配置一个处理列。', 'Generate batch results and configure at least one processing column first.'));
      return;
    }

    const processed = buildProcessedRows(batchRows, validTemplate);
    setProcessingTemplate(validTemplate);
    setProcessedHeaders(processed.headers);
    setProcessedRows(processed.rows);
    setResultViewMode('processed');
    setResultPage(1);
    setShowProcessingTemplatePanel(false);
    setNotice(t(locale, `已生成 ${processed.rows.length} 条处理结果。`, `Generated ${processed.rows.length} processed rows.`));
  }

  async function handleSaveProcessingRuleAs() {
    const validTemplate = validProcessingTemplateFromEditor();
    if (validTemplate.columns.length === 0) {
      setErrorMessage(t(locale, '请至少配置一个有效输出列后再保存规则。', 'Configure at least one valid output column before saving a rule.'));
      return;
    }

    const defaultName = selectedProcessingRule?.name ? `${selectedProcessingRule.name} Copy` : t(locale, '新处理规则', 'New processing rule');
    const name = window.prompt(t(locale, '请输入规则名称', 'Enter a rule name'), defaultName);
    if (!name?.trim()) {
      return;
    }

    const nextRule: ProcessingRule = {
      id: createLocalFieldId(),
      name: name.trim(),
      columns: cloneProcessingColumns(validTemplate.columns),
      updatedAt: new Date().toISOString(),
    };
    const nextRules = [nextRule, ...processingRuleLibrary];
    const savedTemplate = await persistProcessingRuleLibrary(nextRules, validTemplate);
    if (savedTemplate) {
      setSelectedProcessingRuleId(nextRule.id);
      setNotice(t(locale, `规则已保存：${nextRule.name}`, `Rule saved: ${nextRule.name}`));
    }
  }

  async function handleOverwriteProcessingRule() {
    const validTemplate = validProcessingTemplateFromEditor();
    if (!selectedProcessingRule) {
      await handleSaveProcessingRuleAs();
      return;
    }

    if (validTemplate.columns.length === 0) {
      setErrorMessage(t(locale, '请至少配置一个有效输出列后再覆盖规则。', 'Configure at least one valid output column before overwriting a rule.'));
      return;
    }

    const nextRules = processingRuleLibrary.map((rule) =>
      rule.id === selectedProcessingRule.id
        ? {
            ...rule,
            columns: cloneProcessingColumns(validTemplate.columns),
            updatedAt: new Date().toISOString(),
          }
        : rule,
    );
    const savedTemplate = await persistProcessingRuleLibrary(nextRules, validTemplate);
    if (savedTemplate) {
      setNotice(t(locale, `规则已覆盖保存：${selectedProcessingRule.name}`, `Rule overwritten: ${selectedProcessingRule.name}`));
    }
  }

  async function handleRenameProcessingRule(rule: ProcessingRule) {
    const name = window.prompt(t(locale, '请输入新的规则名称', 'Enter a new rule name'), rule.name);
    if (!name?.trim() || name.trim() === rule.name) {
      return;
    }

    const nextRules = processingRuleLibrary.map((item) =>
      item.id === rule.id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item,
    );
    const savedTemplate = await persistProcessingRuleLibrary(nextRules);
    if (savedTemplate) {
      setNotice(t(locale, '规则已重命名。', 'Rule renamed.'));
    }
  }

  async function handleDuplicateProcessingRule(rule: ProcessingRule) {
    const name = window.prompt(t(locale, '请输入复制后的规则名称', 'Enter a name for the duplicated rule'), `${rule.name} Copy`);
    if (name === null) {
      return;
    }

    const nextRule: ProcessingRule = {
      id: createLocalFieldId(),
      name: name.trim() || `${rule.name} Copy`,
      columns: cloneProcessingColumns(rule.columns),
      updatedAt: new Date().toISOString(),
    };
    const nextRules = [nextRule, ...processingRuleLibrary];
    const savedTemplate = await persistProcessingRuleLibrary(nextRules);
    if (savedTemplate) {
      setSelectedProcessingRuleId(nextRule.id);
      setNotice(t(locale, '规则已复制。', 'Rule duplicated.'));
    }
  }

  async function handleDeleteProcessingRule(rule: ProcessingRule) {
    const confirmed = window.confirm(t(locale, `确定删除规则“${rule.name}”吗？`, `Delete rule "${rule.name}"?`));
    if (!confirmed) {
      return;
    }

    const nextRules = processingRuleLibrary.filter((item) => item.id !== rule.id);
    const savedTemplate = await persistProcessingRuleLibrary(nextRules);
    if (savedTemplate) {
      if (selectedProcessingRuleId === rule.id) {
        setSelectedProcessingRuleId('');
      }
      setNotice(t(locale, '规则已删除。当前编辑区内容不会被清空。', 'Rule deleted. The current editor content was kept.'));
    }
  }

  function reorderActivePageFields(nextFields: BackendOcrTemplateField[]) {
    const normalizedFields = replaceActivePageFields(nextFields);
    syncOrderedResultViews(normalizedFields);
    return normalizedFields;
  }

  function moveField(sourceFieldId: string, targetFieldId: string) {
    if (!sourceFieldId || !targetFieldId || sourceFieldId === targetFieldId) {
      return;
    }

    const sourceIndex = fields.findIndex((field, index) => toFieldId(field, index) === sourceFieldId);
    const targetIndex = fields.findIndex((field, index) => toFieldId(field, index) === targetFieldId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextFields = [...fields];
    const [movedField] = nextFields.splice(sourceIndex, 1);
    nextFields.splice(targetIndex, 0, movedField);
    reorderActivePageFields(nextFields);
  }

  function handleFieldDragStart(event: ReactDragEvent<HTMLButtonElement>, fieldId: string) {
    setDraggedFieldId(fieldId);
    setDragOverFieldId('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', fieldId);
  }

  function handleFieldDragOver(event: ReactDragEvent<HTMLButtonElement>, fieldId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (fieldId !== dragOverFieldId) {
      setDragOverFieldId(fieldId);
    }
  }

  function handleFieldDrop(event: ReactDragEvent<HTMLButtonElement>, targetFieldId: string) {
    event.preventDefault();
    const sourceFieldId = event.dataTransfer.getData('text/plain') || draggedFieldId;
    moveField(sourceFieldId, targetFieldId);
    setDraggedFieldId('');
    setDragOverFieldId('');
  }

  function handleFieldDragEnd() {
    setDraggedFieldId('');
    setDragOverFieldId('');
  }

  function handleResetFieldOrder() {
    if (fields.length < 2) {
      return;
    }

    const normalizedFields = reorderActivePageFields(sortFieldsByLayout(fields));
    setSelectedFieldId((currentFieldId) => {
      if (normalizedFields.some((field, index) => toFieldId(field, index) === currentFieldId)) {
        return currentFieldId;
      }

      return normalizedFields[0] ? toFieldId(normalizedFields[0], 0) : '';
    });
    setNotice(t(locale, '字段顺序已按页面位置重置。', 'Field order reset by page position.'));
  }

  function handleMoveAllRegions(deltaX: number, deltaY: number) {
    if (fields.length === 0) {
      return;
    }

    replaceActivePageFields(
      fields.map((field) => ({
        ...field,
        bboxNormalized: normalizeBbox({
          ...field.bboxNormalized,
          x: field.bboxNormalized.x + deltaX,
          y: field.bboxNormalized.y + deltaY,
        }),
      })),
    );
    setNotice(t(locale, '当前页选区已整体移动。', 'All regions on the current page moved together.'));
  }

  function promptExportFileName(documentType: string) {
    const defaultFileName = buildDefaultExportFileName(documentType);
    const inputName = window.prompt(
      t(
        locale,
        `请输入导出文件名。留空将使用默认名称：${defaultFileName}`,
        `Enter an export filename. Leave blank to use the default name: ${defaultFileName}`,
      ),
      defaultFileName,
    );

    if (inputName === null) {
      return '';
    }

    return resolveExportFileName(inputName, defaultFileName, exportedFileNames);
  }

  async function handleSelectDocument(documentItem: BackendOcrDocument, localFile?: File) {
    setErrorMessage('');
    setNotice('');
    setSelectedDocument(documentItem);
    setCandidates([]);
    setResults([]);
    setSelectedTemplateId('');
    setFields([]);
    setSelectedFieldId('');
    setInteractionState(null);
    setInteractionMode('select');
    setPreviewZoom(1);
    setCursorPoint(null);

    const pagesResult = await fetchOcrDocumentPages(documentItem.id, sessionToken);
    const nextActivePageId = pagesResult.pages[0]?.id ?? '';
    const firstPageFields = nextActivePageId ? getFieldsForPage(nextActivePageId) : [];
    setPages(pagesResult.pages);
    setActivePageId(nextActivePageId);
    setFields(firstPageFields);
    setSelectedFieldId(firstPageFields[0] ? toFieldId(firstPageFields[0], 0) : '');
    setQualityStatus(pagesResult.pages[0]?.qualityStatus ?? '');
    setQualitySuggestions([]);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const blob = localFile ?? (await fetchOcrDocumentFile(documentItem.id, sessionToken));
    setPreviewUrl(URL.createObjectURL(blob));

    return {
      firstPageId: nextActivePageId,
      firstPageNumber: pagesResult.pages[0]?.pageNumber ?? 1,
    };
  }

  function updateFieldById(fieldId: string, updater: (field: BackendOcrTemplateField, index: number) => BackendOcrTemplateField) {
    const nextFields = fields.map((field, index) =>
      toFieldId(field, index) === fieldId
        ? hydrateField(
            {
              ...updater(field, index),
              sortOrder: index,
            },
            index,
          )
        : field,
    );
    replaceActivePageFields(nextFields);
  }

  function updateSelectedField(updater: (field: BackendOcrTemplateField, index: number) => BackendOcrTemplateField) {
    if (selectedFieldId) {
      updateFieldById(selectedFieldId, updater);
    }
  }

  function updateSelectedFieldValidationRule(updater: (rule: ParsedValidationRule) => ParsedValidationRule) {
    updateSelectedField((field) => ({
      ...field,
      validationRule: serializeValidationRule(updater(parseValidationRule(field.validationRule))),
    }));
  }

  function commitSelectedFieldName() {
    if (!selectedField) {
      return;
    }

    const trimmedName = fieldNameDraft.trim();
    if (!trimmedName) {
      setFieldNameDraft(selectedField.fieldName);
      setFieldNameError(t(locale, '选区名称不能为空', 'Name cannot be empty'));
      return;
    }

    setFieldNameError('');
    if (trimmedName === selectedField.fieldName) {
      setFieldNameDraft(trimmedName);
      return;
    }

    updateSelectedField((field, index) => ({
      ...field,
      fieldName: trimmedName,
      outputColumn:
        /^field_\d+$/i.test(field.outputColumn) || field.outputColumn === sanitizeOutputColumn(field.fieldName, index)
          ? sanitizeOutputColumn(trimmedName, index)
          : field.outputColumn,
    }));
    setFieldNameDraft(trimmedName);
  }

  function getPointerPosition(clientX: number, clientY: number) {
    const stage = previewStageRef.current;
    if (!stage) {
      return null;
    }

    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: clamp((clientX - rect.left) / rect.width, 0, 1),
      y: clamp((clientY - rect.top) / rect.height, 0, 1),
    };
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setBusyAction('upload');
      setErrorMessage('');
      setNotice('');
      const payload = await uploadOcrDocument(file, sessionToken);
      const uploadedDocument = payload.document as BackendOcrDocument;
      await refreshDocumentsAndTemplates();
      const selection = await handleSelectDocument(uploadedDocument, file);

      if (selection.firstPageId) {
        const qualityResult = await checkOcrPageQuality(selection.firstPageId, sessionToken);
        setCandidates([]);
        setQualityStatus(qualityResult.quality.status);
        setQualitySuggestions(qualityResult.quality.suggestions);
        setQualityModal({
          open: true,
          fileName: uploadedDocument.fileName,
          pageNumber: selection.firstPageNumber,
          quality: qualityResult.quality,
        });
      }

      setNotice(t(locale, '文件已上传，仅完成首张页面清晰度检查。候选框和识别需要你手动触发。', 'Document uploaded. Only the first-page readability check ran automatically; candidates and OCR stay manual.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to upload document');
    } finally {
      setBusyAction('');
      event.target.value = '';
    }
  }

  async function handleDetect() {
    if (!activePageId) {
      return;
    }

    try {
      setBusyAction('detect');
      setErrorMessage('');
      const result = await detectOcrPage(activePageId, sessionToken);
      setCandidates(result.candidates);
      setQualityStatus(result.quality.status);
      setQualitySuggestions(result.quality.suggestions);
      setNotice(t(locale, '候选框和页面质量已更新。', 'Candidate boxes and page quality have been refreshed.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to detect candidate boxes');
    } finally {
      setBusyAction('');
    }
  }

  async function handleCheckQuality() {
    if (!activePageId) {
      return;
    }

    try {
      setBusyAction('quality-check');
      setErrorMessage('');
      const result = await checkOcrPageQuality(activePageId, sessionToken);
      setQualityStatus(result.quality.status);
      setQualitySuggestions(result.quality.suggestions);
      setQualityModal({
        open: true,
        fileName: selectedDocument?.fileName ?? '',
        pageNumber: activePage?.pageNumber ?? 1,
        quality: result.quality,
      });
      setNotice(t(locale, '页面清晰度检查已更新。', 'Page readability check refreshed.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to check OCR quality');
    } finally {
      setBusyAction('');
    }
  }

  async function handleExtract() {
    if (!activePageId || fields.length === 0) {
      return;
    }

    try {
      setBusyAction('extract');
      setErrorMessage('');
      const result = await extractOcrPage(activePageId, sessionToken, {
        templateId: selectedTemplateId || undefined,
        fields,
      });
      setResults(result.results);
      setResultViewMode('single');
      setNotice(t(locale, '识别完成。', 'OCR extraction completed.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract OCR fields');
    } finally {
      setBusyAction('');
    }
  }

  async function handleBatchExtract() {
    if (batchTargetDocuments.length === 0 || fields.length === 0) {
      return;
    }

    const fileNameHeader = t(locale, '文件名', 'File name');
    const pageHeader = t(locale, '页码', 'Page');
    const statusHeader = t(locale, '状态', 'Status');
    const messageHeader = t(locale, '说明', 'Message');
    const metadataHeaders = [fileNameHeader, pageHeader, statusHeader, messageHeader];
    const nextHeaderSet = new Set<string>(metadataHeaders);
    const totalPages = batchTargetDocuments.reduce((sum, documentItem) => sum + Math.max(documentItem.pageCount, 1), 0);
    const nextRows: Array<Record<string, string | number>> = [];
    let completedPages = 0;

    try {
      setBusyAction('batch-extract');
      setErrorMessage('');
      setNotice('');
      setBatchProgress({ completed: 0, total: totalPages });

      for (const documentItem of batchTargetDocuments) {
        const pagesResult = await fetchOcrDocumentPages(documentItem.id, sessionToken);

        for (const page of pagesResult.pages) {
          const pageFields = pageFieldsByPageId[page.id] ?? fields;

          try {
            if (pageFields.length === 0) {
              throw new Error(t(locale, '该页还没有设置选区', 'No regions defined for this page'));
            }

            const extracted = await extractOcrPage(page.id, sessionToken, {
              templateId: selectedTemplateId || undefined,
              fields: pageFields,
            });

            const metadata: Record<string, string | number> = {
              [fileNameHeader]: documentItem.fileName,
              [pageHeader]: page.pageNumber,
              [statusHeader]: t(locale, '完成', 'Done'),
              [messageHeader]: '',
            };
            const rawResult = buildRawOcrRow(extracted.results, metadata, pageFields);
            rawResult.headers.forEach((header) => nextHeaderSet.add(header));
            nextRows.push(rawResult.row);
          } catch (error) {
            const pageFieldHeaders = buildFieldHeaders(pageFields);
            const row: Record<string, string | number> = {
              [fileNameHeader]: documentItem.fileName,
              [pageHeader]: page.pageNumber,
              [statusHeader]: t(locale, '失败', 'Failed'),
              [messageHeader]: error instanceof Error ? error.message : 'Batch OCR failed',
            };

            pageFieldHeaders.forEach((header) => nextHeaderSet.add(header));
            for (const header of pageFieldHeaders) {
              row[header] = '';
            }

            nextRows.push(row);
          } finally {
            completedPages += 1;
            setBatchProgress({ completed: completedPages, total: totalPages });
          }
        }
      }

      setBatchHeaders(Array.from(nextHeaderSet));
      setBatchRows(nextRows);
      setProcessedHeaders([]);
      setProcessedRows([]);
      setResultViewMode('batch');
      setNotice(
        t(
          locale,
          selectedBatchDocuments.length > 0
            ? `已选文件批量处理完成，共处理 ${batchTargetDocuments.length} 个文件、${completedPages} 页。`
            : `当前文件批量处理完成，共处理 ${completedPages} 页。`,
          selectedBatchDocuments.length > 0
            ? `Batch processing completed for ${batchTargetDocuments.length} selected file${batchTargetDocuments.length === 1 ? '' : 's'} across ${completedPages} page${completedPages === 1 ? '' : 's'}.`
            : `Batch processing completed for the current file across ${completedPages} page${completedPages === 1 ? '' : 's'}.`,
        ),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to batch extract OCR fields');
    } finally {
      setBusyAction('');
      setBatchProgress(null);
    }
  }

  async function handleSaveTemplate() {
    if (fields.length === 0) {
      return;
    }

    const name = window.prompt(t(locale, '请输入预设名称', 'Enter a preset name'));
    if (!name?.trim()) {
      return;
    }

    try {
      setBusyAction('save-template');
      setErrorMessage('');
      const payload = await createOcrTemplate(sessionToken, {
        name: name.trim(),
        anchorConfig: {
          ...buildTemplateAnchorConfig(previewSize),
          processingTemplate,
          processingRuleLibrary: {
            rules: processingRuleLibrary,
          },
        },
        fields: fields.map((field, index) => ({ ...field, sortOrder: index })),
      });
      setTemplates((currentTemplates) => [payload.template, ...currentTemplates]);
      setSelectedTemplateId(payload.template.id);
      setNotice(t(locale, '预设已保存。', 'Preset saved.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setBusyAction('');
    }
  }

  function replaceTemplateInList(template: BackendOcrTemplate) {
    setTemplates((currentTemplates) => {
      if (currentTemplates.some((currentTemplate) => currentTemplate.id === template.id)) {
        return currentTemplates.map((currentTemplate) => (currentTemplate.id === template.id ? template : currentTemplate));
      }

      return [template, ...currentTemplates];
    });
  }

  async function handleRenameTemplate() {
    if (!selectedTemplate) {
      return;
    }

    const nextName = window.prompt(t(locale, '请输入新的预设名称', 'Enter a new preset name'), selectedTemplate.name);
    if (!nextName?.trim() || nextName.trim() === selectedTemplate.name) {
      return;
    }

    try {
      setBusyAction('rename-template');
      setErrorMessage('');
      const payload = await updateOcrTemplate(selectedTemplate.id, sessionToken, { name: nextName.trim() });
      replaceTemplateInList(payload.template);
      setNotice(t(locale, '预设已重命名。', 'Preset renamed.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to rename template');
    } finally {
      setBusyAction('');
    }
  }

  async function handleDuplicateTemplate() {
    if (!selectedTemplate) {
      return;
    }

    const defaultName = `${selectedTemplate.name} Copy`;
    const nextName = window.prompt(t(locale, '请输入复制后的预设名称', 'Enter a name for the duplicated preset'), defaultName);
    if (nextName === null) {
      return;
    }

    try {
      setBusyAction('duplicate-template');
      setErrorMessage('');
      const payload = await duplicateOcrTemplate(selectedTemplate.id, sessionToken, { name: nextName.trim() || defaultName });
      setTemplates((currentTemplates) => [payload.template, ...currentTemplates]);
      setSelectedTemplateId(payload.template.id);
      setNotice(t(locale, '预设已复制。', 'Preset duplicated.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to duplicate template');
    } finally {
      setBusyAction('');
    }
  }

  async function handleArchiveTemplate() {
    if (!selectedTemplate) {
      return;
    }

    const confirmed = window.confirm(
      t(
        locale,
        `确认归档预设「${selectedTemplate.name}」？归档后会从默认列表隐藏，但可以恢复。`,
        `Archive preset "${selectedTemplate.name}"? It will be hidden from the default list but can be restored.`,
      ),
    );
    if (!confirmed) {
      return;
    }

    try {
      setBusyAction('archive-template');
      setErrorMessage('');
      const payload = await archiveOcrTemplate(selectedTemplate.id, sessionToken);
      replaceTemplateInList(payload.template);
      setSelectedTemplateId('');
      setNotice(t(locale, '预设已归档。', 'Preset archived.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to archive template');
    } finally {
      setBusyAction('');
    }
  }

  async function handleRestoreTemplate(template: BackendOcrTemplate) {
    try {
      setBusyAction('restore-template');
      setErrorMessage('');
      const payload = await restoreOcrTemplate(template.id, sessionToken);
      replaceTemplateInList(payload.template);
      setNotice(t(locale, '预设已恢复。', 'Preset restored.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to restore template');
    } finally {
      setBusyAction('');
    }
  }

  async function handleApplyTemplate(templateId: string) {
    if (!templateId || !activePageId) {
      return;
    }

    try {
      setBusyAction('apply-template');
      setErrorMessage('');
      const payload = await applyOcrTemplate(templateId, activePageId, sessionToken);
      const nextFields = payload.fields.map((field, index) => hydrateField(field, index));
      const aspectWarning = aspectRatioWarningMessage(locale, templateSourceAspectRatio(payload.template.anchorConfig), previewSize);
      replaceActivePageFields(nextFields);
      setSelectedFieldId(nextFields[0] ? toFieldId(nextFields[0], 0) : '');
      setSelectedTemplateId(templateId);
      setInteractionMode('select');
      setNotice([aspectWarning, payload.warnings.length > 0 ? payload.warnings.join(' ') : t(locale, '预设已应用。', 'Preset applied.')].filter(Boolean).join(' '));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to apply template');
    } finally {
      setBusyAction('');
    }
  }

  async function handleExport() {
    if (resultViewMode === 'processed' && processedRows.length > 0) {
      const exportFileName = promptExportFileName('processed');
      if (!exportFileName) {
        return;
      }

      try {
        setBusyAction('export');
        setErrorMessage('');
        downloadWorkbook(exportFileName, processedHeaders, processedRows, 'Processed Results');
        setExportedFileNames((currentNames) => [...currentNames, exportFileName]);
        setNotice(t(locale, `处理结果已导出为 ${exportFileName}。`, `Processed results exported as ${exportFileName}.`));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to export processed results');
      } finally {
        setBusyAction('');
      }
      return;
    }

    if (resultViewMode === 'batch' && batchRows.length > 0) {
      const exportFileName = promptExportFileName('batch');
      if (!exportFileName) {
        return;
      }

      try {
        setBusyAction('export');
        setErrorMessage('');
        downloadWorkbook(exportFileName, batchHeaders, batchRows, 'OCR Results');
        setExportedFileNames((currentNames) => [...currentNames, exportFileName]);
        setNotice(t(locale, `批量结果已导出为 ${exportFileName}。`, `Batch results exported as ${exportFileName}.`));
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to export batch OCR results');
      } finally {
        setBusyAction('');
      }
      return;
    }

    if (!selectedDocument) {
      return;
    }

    try {
      const exportFileName = promptExportFileName(selectedDocument.kind.toLowerCase());
      if (!exportFileName) {
        return;
      }

      setBusyAction('export');
      setErrorMessage('');
      const payload = await exportOcrDocument(selectedDocument.id, sessionToken);
      downloadWorkbook(exportFileName, payload.header, payload.rows, 'OCR Results');
      setExportedFileNames((currentNames) => [...currentNames, exportFileName]);
      setNotice(t(locale, `结果已导出为 ${exportFileName}。`, `Results exported as ${exportFileName}.`));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to export OCR results');
    } finally {
      setBusyAction('');
    }
  }

  function handleGenerateFromCandidates() {
    if (candidates.length === 0) {
      return;
    }

    if (
      fields.length > 0 &&
      !window.confirm(t(locale, '用候选框批量生成会替换当前选区，是否继续？', 'Generating fields from candidates will replace the current regions. Continue?'))
    ) {
      return;
    }

    const nextFields = sortCandidatesByLayout(candidates).map((candidate, index) => buildFieldFromCandidate(candidate, index));
    replaceActivePageFields(nextFields);
    setSelectedFieldId(nextFields[0] ? toFieldId(nextFields[0], 0) : '');
    setResults([]);
    setSelectedTemplateId('');
    setInteractionMode('select');
    setNotice(t(locale, `已生成 ${nextFields.length} 个选区。`, `Generated ${nextFields.length} regions.`));
  }

  function handleCreateFieldFromCandidate(candidate: BackendOcrCandidate) {
    const nextField = buildFieldFromCandidate(candidate, fields.length);
    const nextFieldId = toFieldId(nextField, fields.length);
    replaceActivePageFields([...fields, nextField]);
    setSelectedFieldId(nextFieldId);
    setInteractionMode('select');
    setResults([]);
    setNotice(t(locale, '候选框已转成选区，现在可以填写预输入内容。', 'Candidate converted into a region. You can now define its pre-input content.'));
  }

  function handlePageChange(nextPageId: string) {
    const nextPage = pages.find((page) => page.id === nextPageId) ?? null;
    const storedFields = getFieldsForPage(nextPageId);
    const nextFields =
      storedFields.length > 0
        ? storedFields
        : fields.length > 0
          ? cloneFieldsForPage(fields)
          : [];

    setActivePageId(nextPageId);
    if (storedFields.length === 0 && nextFields.length > 0) {
      updateFieldsForPage(nextPageId, nextFields);
    } else {
      setFields(nextFields);
    }
    setSelectedFieldId(nextFields[0] ? toFieldId(nextFields[0], 0) : '');
    setCandidates([]);
    setResults([]);
    setQualityStatus(nextPage?.qualityStatus ?? '');
    setQualitySuggestions([]);
    setInteractionState(null);
    setInteractionMode('select');
    setCursorPoint(null);
    if (storedFields.length === 0 && nextFields.length > 0) {
      setNotice(t(locale, '已为当前页复制上一页选区，后续调整只影响本页。', 'Regions copied into this page. Further edits now affect only this page.'));
    }
  }

  function handleResultDraftChange(resultId: string, nextValue: string) {
    setResults((currentResults) =>
      currentResults.map((result) => (result.id === resultId ? { ...result, finalText: nextValue, manuallyEdited: true } : result)),
    );
  }

  async function handleResultPersist(resultId: string, nextValue: string) {
    try {
      await updateOcrResult(resultId, nextValue, sessionToken);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save OCR edit');
    }
  }

  function handleOverlayMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (interactionMode === 'pan') {
      event.preventDefault();
      setInteractionState({
        mode: 'pan',
        startClientX: event.clientX,
        startClientY: event.clientY,
        scrollLeft: previewHostRef.current?.scrollLeft ?? 0,
        scrollTop: previewHostRef.current?.scrollTop ?? 0,
      });
      return;
    }

    if (interactionMode !== 'draw') {
      return;
    }

    const pointer = getPointerPosition(event.clientX, event.clientY);
    if (!pointer) {
      return;
    }

    event.preventDefault();
    const nextField = createEmptyField(fields.length, {
      x: pointer.x,
      y: pointer.y,
      width: minSelectionSize,
      height: minSelectionSize,
    });
    const nextFieldId = toFieldId(nextField, fields.length);
    replaceActivePageFields([...fields, nextField]);
    setSelectedFieldId(nextFieldId);
    setInteractionState({ mode: 'draw', fieldId: nextFieldId, startX: pointer.x, startY: pointer.y });
  }

  function handleOverlayMouseMove(event: ReactMouseEvent<HTMLDivElement>) {
    const pointer = getPointerPosition(event.clientX, event.clientY);
    setCursorPoint(interactionMode === 'pan' ? null : pointer);

    if (!interactionState) {
      return;
    }

    if (interactionState.mode === 'pan') {
      const host = previewHostRef.current;
      if (!host) {
        return;
      }

      host.scrollLeft = interactionState.scrollLeft - (event.clientX - interactionState.startClientX);
      host.scrollTop = interactionState.scrollTop - (event.clientY - interactionState.startClientY);
      return;
    }

    if (!pointer) {
      return;
    }

    if (interactionState.mode === 'draw') {
      updateFieldById(interactionState.fieldId, (field) => ({
        ...field,
        bboxNormalized: normalizeRect(interactionState.startX, interactionState.startY, pointer.x, pointer.y),
      }));
      return;
    }

    if (interactionState.mode === 'move') {
      updateFieldById(interactionState.fieldId, (field) => ({
        ...field,
        bboxNormalized: normalizeBbox({
          ...field.bboxNormalized,
          x: pointer.x - interactionState.offsetX,
          y: pointer.y - interactionState.offsetY,
        }),
      }));
      return;
    }

    updateFieldById(interactionState.fieldId, (field) => ({
      ...field,
      bboxNormalized: normalizeRect(interactionState.anchorX, interactionState.anchorY, pointer.x, pointer.y),
    }));
  }

  function handleOverlayMouseUp() {
    if (interactionState?.mode === 'draw') {
      setInteractionMode('select');
      setNotice(t(locale, '选区已创建，可以在右侧编辑名称和限制条件。', 'Region created. Edit its name and rules in the inspector.'));
    }

    setInteractionState(null);
  }

  async function handleDeleteDocument(documentItem: BackendOcrDocument) {
    if (!window.confirm(t(locale, `确认删除 ${documentItem.fileName}？`, `Delete ${documentItem.fileName}?`))) {
      return;
    }

    try {
      setBusyAction('delete-document');
      setErrorMessage('');
      await deleteOcrDocument(documentItem.id, sessionToken);
      const remainingDocuments = documents.filter((item) => item.id !== documentItem.id);
      setDocuments(remainingDocuments);
      setSelectedBatchDocumentIds((currentIds) => currentIds.filter((documentId) => documentId !== documentItem.id));
      setPageFieldsByPageId((currentMap) => {
        const nextMap = { ...currentMap };
        for (const page of documentItem.pages ?? []) {
          delete nextMap[page.id];
        }
        return nextMap;
      });

      if (selectedDocument?.id === documentItem.id) {
        const nextDocument = remainingDocuments[0] ?? null;
        setSelectedDocument(null);
        setPages([]);
        setActivePageId('');
        setPreviewSize({ width: 0, height: 0 });
        setCandidates([]);
        setResults([]);
        setFields([]);
        setSelectedFieldId('');
        setSelectedTemplateId('');
        setQualityStatus('');
        setQualitySuggestions([]);
        setInteractionState(null);
        setInteractionMode('select');
        setCursorPoint(null);
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl('');
        }

        if (nextDocument) {
          await handleSelectDocument(nextDocument);
        }
      }

      setNotice(t(locale, '文件已删除。', 'Document deleted.'));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete OCR document');
    } finally {
      setBusyAction('');
    }
  }

  function handleNudgePreview(leftDelta: number, topDelta: number) {
    previewHostRef.current?.scrollBy({
      left: leftDelta,
      top: topDelta,
      behavior: 'smooth',
    });
  }

  function handlePaneResizeStart(side: 'left' | 'right', clientX: number) {
    setPaneResizeState({
      side,
      startClientX: clientX,
      startWidth: side === 'left' ? leftPaneWidth : rightPaneWidth,
    });
  }

  function handleResultsResizeStart(clientY: number) {
    setResultsResizeState({
      startClientY: clientY,
      startHeight: resultsPaneHeight,
    });
  }

  function renderQualitySummary() {
    if (!qualityModal.open || !qualityModal.quality) {
      return null;
    }

    const entries = Object.entries(qualityModal.quality.checks ?? {});

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-4">
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.28)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">{t(locale, '上传质检', 'Upload quality')}</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">{t(locale, '页面可识别性检查', 'OCR readability check')}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {qualityModal.fileName} · {t(locale, `第 ${qualityModal.pageNumber} 页`, `Page ${qualityModal.pageNumber}`)}
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
              {formatQualityStatus(qualityModal.quality.status, locale)}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {entries.map(([key, value]) => (
              <div key={key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[11px] uppercase text-slate-400">{key}</p>
                <p className="mt-1 text-sm font-medium text-slate-700">{String(value)}</p>
              </div>
            ))}
          </div>

          {qualityModal.quality.suggestions.length > 0 ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {qualityModal.quality.suggestions.join(' ')}
            </div>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setQualityModal((current) => ({ ...current, open: false }))}
            >
              {t(locale, '继续', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] overflow-hidden rounded-lg border border-slate-200 bg-[#f6f7fb] text-slate-900 shadow-sm">
      {renderQualitySummary()}

      <div className="flex min-h-[calc(100vh-56px)] flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">OCR</div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{selectedDocument?.fileName || t(locale, '选区精准提取', 'Region extraction')}</p>
              <p className="text-xs text-slate-500">
                {activePage ? t(locale, `第 ${activePage.pageNumber} 页`, `Page ${activePage.pageNumber}`) : t(locale, '等待文件', 'Waiting for file')} ·{' '}
                {qualityStatus ? formatQualityStatus(qualityStatus, locale) : t(locale, '待检测', 'Pending')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={activePageId}
              onChange={(event) => handlePageChange(event.target.value)}
              disabled={pages.length === 0}
            >
              {pages.length === 0 ? <option value="">{t(locale, '暂无页面', 'No pages')}</option> : null}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {t(locale, `第 ${page.pageNumber} 页`, `Page ${page.pageNumber}`)}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
              onClick={() => void handleCheckQuality()}
              disabled={!activePageId || busy}
            >
              {busyAction === 'quality-check' ? t(locale, '质检中', 'Checking') : t(locale, '清晰度检查', 'Quality')}
            </button>

            <button
              type="button"
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
              onClick={() => void handleDetect()}
              disabled={!activePageId || busy}
            >
              {busyAction === 'detect' ? t(locale, '检测中', 'Detecting') : t(locale, '检测框', 'Detect')}
            </button>

            <button
              type="button"
              className="h-9 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              onClick={() => void handleExtract()}
              disabled={!activePageId || fields.length === 0 || busy}
            >
              {busyAction === 'extract' ? t(locale, '识别中', 'Extracting') : t(locale, '开始识别', 'Start OCR')}
            </button>

            <button
              type="button"
              className="h-9 rounded-md border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              onClick={() => void handleBatchExtract()}
              disabled={batchTargetDocuments.length === 0 || fields.length === 0 || busy}
            >
              {busyAction === 'batch-extract' && batchProgress
                ? t(locale, `批量中 ${batchProgress.completed}/${batchProgress.total}`, `Batch ${batchProgress.completed}/${batchProgress.total}`)
                : selectedBatchDocuments.length > 0
                  ? t(locale, `批量处理已选文件 (${selectedBatchDocuments.length})`, `Batch selected (${selectedBatchDocuments.length})`)
                  : t(locale, '批量处理当前文件', 'Batch current file')}
            </button>
          </div>
        </header>

        {notice || errorMessage ? (
          <div className="border-b border-slate-200 bg-white px-4 py-2 text-sm">
            {notice ? <span className="text-emerald-700">{notice}</span> : null}
            {errorMessage ? <span className="text-red-700">{errorMessage}</span> : null}
          </div>
        ) : null}

        <main
          className="grid min-h-0 flex-1"
          style={{
            gridTemplateColumns: `${leftPaneWidth}px 10px minmax(520px,1fr) 10px ${rightPaneWidth}px`,
            gridTemplateRows: `minmax(0,1fr) 10px ${resultsPaneHeight}px`,
          }}
        >
          <aside className="row-span-3 flex min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t(locale, '文件列表', 'Files')}</h3>
                <label className="cursor-pointer rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                  <input className="hidden" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} disabled={busyAction === 'upload'} />
                  {busyAction === 'upload' ? t(locale, '导入中', 'Importing') : t(locale, '导入', 'Import')}
                </label>
              </div>
              <div className="mt-2 flex min-h-6 items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {selectedBatchDocumentIds.length > 0
                    ? t(locale, `已选 ${selectedBatchDocumentIds.length} 个`, `${selectedBatchDocumentIds.length} selected`)
                    : t(locale, '未勾选时批量处理当前文件', 'No selection runs the current file')}
                </span>
                {selectedBatchDocumentIds.length > 0 ? (
                  <button
                    type="button"
                    className="font-semibold text-blue-600 hover:text-blue-700 disabled:text-slate-300"
                    onClick={() => setSelectedBatchDocumentIds([])}
                    disabled={busy}
                  >
                    {t(locale, '清空', 'Clear')}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {documents.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-6 text-sm text-slate-500">{t(locale, '暂无文件', 'No files')}</div>
              ) : null}

              {documents.map((documentItem) => (
                <div
                  key={documentItem.id}
                  className={`mb-1 rounded-md border ${
                    selectedDocument?.id === documentItem.id ? 'border-blue-200 bg-blue-50' : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2 p-2">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300"
                      checked={selectedBatchDocumentIds.includes(documentItem.id)}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setSelectedBatchDocumentIds((currentIds) =>
                          checked
                            ? currentIds.includes(documentItem.id)
                              ? currentIds
                              : [...currentIds, documentItem.id]
                            : currentIds.filter((documentId) => documentId !== documentItem.id),
                        );
                      }}
                      onClick={(event) => event.stopPropagation()}
                      disabled={busy}
                      aria-label={t(locale, `勾选 ${documentItem.fileName} 用于批量处理`, `Select ${documentItem.fileName} for batch processing`)}
                    />
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-sm"
                      title={documentItem.fileName}
                      onClick={() => void handleSelectDocument(documentItem)}
                    >
                      <span className={`block truncate font-medium ${selectedDocument?.id === documentItem.id ? 'text-blue-700' : 'text-slate-800'}`}>
                        {documentItem.fileName}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {documentItem.kind} · {t(locale, `${documentItem.pageCount} 页`, `${documentItem.pageCount} pages`)}
                      </span>
                    </button>

                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600 disabled:text-slate-300"
                      onClick={() => void handleDeleteDocument(documentItem)}
                      disabled={busy}
                      aria-label={t(locale, '删除文件', 'Delete file')}
                    >
                      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                        <path d="M4 5h12" />
                        <path d="M7 5V3.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V5" />
                        <path d="M6.2 7.2l.6 8.2c.03.35.32.62.67.62h5.02c.35 0 .64-.27.67-.62l.6-8.2" />
                        <path d="M8.5 8.5v5.5" />
                        <path d="M11.5 8.5v5.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-200 p-3 text-xs text-slate-500">
              <div className="flex items-center justify-between">
                <span>{t(locale, '候选框', 'Candidates')}</span>
                <strong className="text-slate-800">{candidates.length}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>{t(locale, '选区', 'Regions')}</span>
                <strong className="text-slate-800">{fields.length}</strong>
              </div>
              {qualitySuggestions.length > 0 ? (
                <p className="mt-2 line-clamp-3 text-amber-700">{qualitySuggestions.join(' ')}</p>
              ) : null}
            </div>
          </aside>

          <div
            className="relative row-span-3 flex cursor-col-resize items-center justify-center bg-slate-100/75 transition-colors hover:bg-slate-200/90"
            onMouseDown={(event) => handlePaneResizeStart('left', event.clientX)}
            role="separator"
            aria-orientation="vertical"
            aria-label={t(locale, '调整左侧栏宽度', 'Resize left sidebar')}
          >
            <div className="h-full w-px bg-slate-300" />
          </div>

          <section className="col-start-3 row-start-1 flex min-h-0 flex-col bg-[#eef1f6]">
            <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
                    interactionMode === 'select' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                  onClick={() => {
                    setInteractionMode('select');
                    setInteractionState(null);
                  }}
                  disabled={!previewUrl || busy}
                  aria-label={t(locale, '选择模式', 'Select mode')}
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                    <path d="M5 4.5h5v5H5z" />
                    <path d="M10 10l5.5 5.5" />
                  </svg>
                </button>

                <button
                  type="button"
                  className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
                    interactionMode === 'draw' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                  onClick={() => {
                    setInteractionMode('draw');
                    setInteractionState(null);
                  }}
                  disabled={!previewUrl || busy}
                  aria-label={t(locale, '框选模式', 'Draw mode')}
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                    <path d="M4.5 4.5h11v11h-11z" strokeDasharray="2.5 1.5" />
                  </svg>
                </button>

                <button
                  type="button"
                  className={`grid h-8 w-8 place-items-center rounded-md text-sm font-semibold ${
                    interactionMode === 'pan' ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                  onClick={() => {
                    setInteractionMode('pan');
                    setInteractionState(null);
                  }}
                  disabled={!previewUrl || busy}
                  aria-label={t(locale, '平移模式', 'Pan mode')}
                >
                  <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 3v14" />
                    <path d="M3 10h14" />
                    <path d="M10 3l-2 2" />
                    <path d="M10 3l2 2" />
                    <path d="M10 17l-2-2" />
                    <path d="M10 17l2-2" />
                    <path d="M3 10l2-2" />
                    <path d="M3 10l2 2" />
                    <path d="M17 10l-2-2" />
                    <path d="M17 10l-2 2" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="h-8 shrink-0 whitespace-nowrap rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                  onClick={handleGenerateFromCandidates}
                  disabled={candidates.length === 0 || busy}
                >
                  {t(locale, '候选转选区', 'Use candidates')}
                </button>

                <button
                  type="button"
                  className={`h-8 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold ${
                    showRegionLabels ? 'border border-blue-200 bg-blue-50 text-blue-700' : 'border border-slate-200 bg-white text-slate-700'
                  }`}
                  onClick={() => setShowRegionLabels((current) => !current)}
                  disabled={!previewUrl}
                >
                  {showRegionLabels ? t(locale, '隐藏标签', 'Hide Labels') : t(locale, '显示标签', 'Show Labels')}
                </button>

                <p className="hidden truncate text-xs text-slate-500 lg:block">{modeHint}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white text-sm font-semibold"
                  onClick={() => setPreviewZoom((current) => clamp(Number((current - 0.1).toFixed(2)), 0.5, 2.5))}
                >
                  -
                </button>
                <input
                  className="h-8 w-28"
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={previewZoom}
                  onChange={(event) => setPreviewZoom(Number(event.target.value))}
                />
                <button
                  type="button"
                  className="h-8 w-8 rounded-md border border-slate-200 bg-white text-sm font-semibold"
                  onClick={() => setPreviewZoom((current) => clamp(Number((current + 0.1).toFixed(2)), 0.5, 2.5))}
                >
                  +
                </button>
                <button type="button" className="h-8 rounded-md border border-slate-200 bg-white px-3 text-sm" onClick={() => setPreviewZoom(1)}>
                  {Math.round(previewZoom * 100)}%
                </button>
                <div className="ml-1 flex items-center gap-1">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
                    onClick={() => handleNudgePreview(0, -140)}
                    aria-label={t(locale, '向上平移', 'Pan up')}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                      <path d="M5 12l5-5 5 5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
                    onClick={() => handleNudgePreview(-140, 0)}
                    aria-label={t(locale, '向左平移', 'Pan left')}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                      <path d="M12 5l-5 5 5 5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
                    onClick={() => handleNudgePreview(140, 0)}
                    aria-label={t(locale, '向右平移', 'Pan right')}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                      <path d="M8 5l5 5-5 5" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-md border border-slate-200 bg-white text-slate-700"
                    onClick={() => handleNudgePreview(0, 140)}
                    aria-label={t(locale, '向下平移', 'Pan down')}
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
                      <path d="M5 8l5 5 5-5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div ref={previewHostRef} className="min-h-0 flex-1 overflow-auto p-6">
              {!previewUrl ? (
                <div className="grid h-full min-h-[520px] place-items-center rounded-md border border-dashed border-slate-300 bg-white text-sm text-slate-500">
                  {t(locale, '导入文件后显示预览', 'Import a file to preview it here')}
                </div>
              ) : (
                <div
                  className="relative mx-auto"
                  style={{
                    width: previewSize.width ? previewSize.width * previewZoom : undefined,
                    height: previewSize.height ? previewSize.height * previewZoom : undefined,
                  }}
                >
                  <div
                    ref={previewStageRef}
                    className="relative inline-block select-none bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top left' }}
                  >
                    {selectedDocument?.kind === 'IMAGE' ? (
                      <img
                        src={previewUrl}
                        alt={selectedDocument.fileName}
                        className="block max-w-[980px]"
                        onDragStart={(event) => event.preventDefault()}
                        onLoad={(event) => {
                          setPreviewSize({
                            width: event.currentTarget.clientWidth,
                            height: event.currentTarget.clientHeight,
                          });
                        }}
                      />
                    ) : (
                      <canvas ref={canvasRef} className="block bg-white" />
                    )}

                    {previewSize.width > 0 && previewSize.height > 0 ? (
                      <div
                        className={`absolute inset-0 ${
                          interactionMode === 'draw'
                            ? 'cursor-crosshair'
                            : interactionMode === 'pan'
                              ? interactionState?.mode === 'pan'
                                ? 'cursor-grabbing'
                                : 'cursor-grab'
                              : 'cursor-default'
                        }`}
                        onMouseDown={handleOverlayMouseDown}
                        onMouseMove={handleOverlayMouseMove}
                        onMouseUp={handleOverlayMouseUp}
                        onMouseLeave={() => {
                          handleOverlayMouseUp();
                          setCursorPoint(null);
                        }}
                      >
                        {cursorPoint ? (
                          <>
                            <div className="pointer-events-none absolute inset-y-0 border-l border-slate-400/50" style={{ left: `${cursorPoint.x * 100}%` }} />
                            <div className="pointer-events-none absolute inset-x-0 border-t border-slate-400/50" style={{ top: `${cursorPoint.y * 100}%` }} />
                            <div
                              className="pointer-events-none absolute rounded bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white"
                              style={{
                                left: `${Math.min(cursorPoint.x * 100 + 1, 88)}%`,
                                top: `${Math.min(cursorPoint.y * 100 + 1, 92)}%`,
                              }}
                            >
                              {Math.round(cursorPoint.x * previewSize.width)}, {Math.round(cursorPoint.y * previewSize.height)}
                            </div>
                          </>
                        ) : null}

                        {candidates.map((candidate) => (
                          <button
                            key={candidate.id}
                            type="button"
                            className="absolute border border-dashed border-cyan-500 bg-cyan-400/5"
                            style={{
                              left: `${candidate.bboxNormalized.x * 100}%`,
                              top: `${candidate.bboxNormalized.y * 100}%`,
                              width: `${candidate.bboxNormalized.width * 100}%`,
                              height: `${candidate.bboxNormalized.height * 100}%`,
                            }}
                            onMouseDown={(event) => {
                              event.stopPropagation();
                              event.preventDefault();
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCreateFieldFromCandidate(candidate);
                            }}
                            title={candidate.textPreview || t(locale, '点击转为选区', 'Convert to region')}
                          >
                            {showRegionLabels && candidate.textPreview ? (
                              <span className="pointer-events-none absolute -top-6 left-0 max-w-full truncate rounded bg-cyan-500 px-2 py-1 text-[11px] font-semibold text-white">
                                {candidate.textPreview}
                              </span>
                            ) : null}
                          </button>
                        ))}

                        {fields.map((field, index) => {
                          const fieldId = toFieldId(field, index);
                          const isActive = fieldId === selectedFieldId;
                          const color = fieldColor(index);
                          const shortRegionId = `R${index + 1}`;

                          return (
                            <div
                              key={fieldId}
                              className="absolute"
                              style={{
                                left: `${field.bboxNormalized.x * 100}%`,
                                top: `${field.bboxNormalized.y * 100}%`,
                                width: `${field.bboxNormalized.width * 100}%`,
                                height: `${field.bboxNormalized.height * 100}%`,
                              }}
                            >
                              <button
                                type="button"
                                className="absolute inset-0 h-full w-full bg-transparent"
                                style={{ border: `2px solid ${color}`, boxShadow: isActive ? `0 0 0 2px ${color}33` : undefined }}
                                title={`${shortRegionId}: ${field.fieldName}`}
                                onMouseDown={(event) => {
                                  if (interactionMode !== 'select') {
                                    return;
                                  }
                                  event.stopPropagation();
                                  event.preventDefault();
                                  const pointer = getPointerPosition(event.clientX, event.clientY);
                                  if (!pointer) return;

                                  setSelectedFieldId(fieldId);
                                  setInteractionMode('select');
                                  setInteractionState({
                                    mode: 'move',
                                    fieldId,
                                    offsetX: pointer.x - field.bboxNormalized.x,
                                    offsetY: pointer.y - field.bboxNormalized.y,
                                  });
                                }}
                              />

                              {showRegionLabels ? (
                                <div
                                  className="pointer-events-none absolute -top-6 left-0 rounded px-2 py-1 text-[11px] font-semibold text-white"
                                  style={{ background: color }}
                                  title={field.fieldName}
                                >
                                  {shortRegionId}
                                </div>
                              ) : null}

                              {isActive
                                ? (
                                    [
                                      { key: 'top-left', className: '-left-1.5 -top-1.5 cursor-nwse-resize' },
                                      { key: 'top-right', className: '-right-1.5 -top-1.5 cursor-nesw-resize' },
                                      { key: 'bottom-left', className: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                                      { key: 'bottom-right', className: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                                    ] as const
                                  ).map((handle) => (
                                    <button
                                      key={handle.key}
                                      type="button"
                                      className={`absolute h-3 w-3 border-2 border-white ${handle.className}`}
                                      style={{ background: color }}
                                      onMouseDown={(event) => {
                                        if (interactionMode !== 'select') {
                                          return;
                                        }
                                        event.stopPropagation();
                                        event.preventDefault();
                                        const anchor = getResizeAnchor(field.bboxNormalized, handle.key);
                                        setInteractionState({ mode: 'resize', fieldId, anchorX: anchor.anchorX, anchorY: anchor.anchorY });
                                      }}
                                    />
                                  ))
                                : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </section>

          <div
            className="relative col-start-3 row-start-2 flex cursor-row-resize items-center justify-center bg-slate-100/75 transition-colors hover:bg-slate-200/90"
            onMouseDown={(event) => handleResultsResizeStart(event.clientY)}
            role="separator"
            aria-orientation="horizontal"
            aria-label={t(locale, '调整识别结果高度', 'Resize results panel')}
          >
            <div className="h-px w-full bg-slate-300" />
          </div>

          <div
            className="relative col-start-4 row-span-3 flex cursor-col-resize items-center justify-center bg-slate-100/75 transition-colors hover:bg-slate-200/90"
            onMouseDown={(event) => handlePaneResizeStart('right', event.clientX)}
            role="separator"
            aria-orientation="vertical"
            aria-label={t(locale, '调整右侧栏宽度', 'Resize right sidebar')}
          >
            <div className="h-full w-px bg-slate-300" />
          </div>

          <aside className="col-start-5 row-span-3 flex min-h-0 flex-col border-l border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t(locale, '选区预设库', 'Region presets')}</h3>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                  onClick={() => void handleSaveTemplate()}
                  disabled={fields.length === 0 || busy}
                >
                  {t(locale, '保存', 'Save')}
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <select
                  className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedTemplateId}
                  onChange={(event) => {
                    const nextTemplateId = event.target.value;
                    setSelectedTemplateId(nextTemplateId);
                    if (nextTemplateId) void handleApplyTemplate(nextTemplateId);
                  }}
                >
                  <option value="">{t(locale, '选择预设', 'Select preset')}</option>
                  {activeTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                  onClick={() => void handleRenameTemplate()}
                  disabled={!selectedTemplate || Boolean(selectedTemplate.archivedAt) || busy}
                >
                  {t(locale, '重命名', 'Rename')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                  onClick={() => void handleDuplicateTemplate()}
                  disabled={!selectedTemplate || Boolean(selectedTemplate.archivedAt) || busy}
                >
                  {t(locale, '复制', 'Duplicate')}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 disabled:text-slate-400"
                  onClick={() => void handleArchiveTemplate()}
                  disabled={!selectedTemplate || Boolean(selectedTemplate.archivedAt) || busy}
                >
                  {t(locale, '归档', 'Archive')}
                </button>
              </div>
              <div className="mt-3 rounded-md border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-slate-700"
                  onClick={() => setShowArchivedTemplates((currentValue) => !currentValue)}
                >
                  <span>{t(locale, `归档预设 (${archivedTemplates.length})`, `Archived presets (${archivedTemplates.length})`)}</span>
                  <span>{showArchivedTemplates ? '−' : '+'}</span>
                </button>
                {showArchivedTemplates ? (
                  <div className="max-h-32 overflow-y-auto border-t border-slate-200">
                    {archivedTemplates.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-slate-500">{t(locale, '暂无归档预设', 'No archived presets')}</div>
                    ) : null}

                    {archivedTemplates.map((template) => (
                      <div key={template.id} className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                        <span className="min-w-0 truncate text-xs text-slate-600">{template.name}</span>
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                          onClick={() => void handleRestoreTemplate(template)}
                          disabled={busy}
                        >
                          {t(locale, '恢复', 'Restore')}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-b border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t(locale, '选区管理', 'Regions')}</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={handleResetFieldOrder}
                    disabled={fields.length < 2}
                  >
                    {t(locale, '重置顺序', 'Reset order')}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={() => {
                      setInteractionMode('draw');
                      setInteractionState(null);
                    }}
                    disabled={!previewUrl}
                  >
                    {t(locale, '新增', 'New')}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {t(locale, '每一页的选区单独保存，当前页调整不会影响其他页。', 'Regions are stored per page. Adjustments here affect only the current page.')}
              </p>
              <div className="mt-3 rounded-md border border-slate-200 p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">{t(locale, '整体移动', 'Move all')}</span>
                  <span className="text-xs text-slate-400">1%</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <span />
                  <button
                    type="button"
                    className="grid h-8 place-items-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={() => handleMoveAllRegions(0, -moveAllRegionsStep)}
                    disabled={fields.length === 0}
                    aria-label={t(locale, '整体上移选区', 'Move all regions up')}
                  >
                    ↑
                  </button>
                  <span />
                  <button
                    type="button"
                    className="grid h-8 place-items-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={() => handleMoveAllRegions(-moveAllRegionsStep, 0)}
                    disabled={fields.length === 0}
                    aria-label={t(locale, '整体左移选区', 'Move all regions left')}
                  >
                    ←
                  </button>
                  <span className="grid h-8 place-items-center rounded-md border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                    {t(locale, '对齐', 'Align')}
                  </span>
                  <button
                    type="button"
                    className="grid h-8 place-items-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={() => handleMoveAllRegions(moveAllRegionsStep, 0)}
                    disabled={fields.length === 0}
                    aria-label={t(locale, '整体右移选区', 'Move all regions right')}
                  >
                    →
                  </button>
                  <span />
                  <button
                    type="button"
                    className="grid h-8 place-items-center rounded-md border border-slate-200 text-sm font-semibold text-slate-700 disabled:text-slate-400"
                    onClick={() => handleMoveAllRegions(0, moveAllRegionsStep)}
                    disabled={fields.length === 0}
                    aria-label={t(locale, '整体下移选区', 'Move all regions down')}
                  >
                    ↓
                  </button>
                  <span />
                </div>
              </div>

              <div className="mt-3 max-h-56 overflow-y-auto">
                {fields.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 px-3 py-5 text-sm text-slate-500">{t(locale, '暂无选区', 'No regions')}</div>
                ) : null}

                {fields.map((field, index) => {
                  const fieldId = toFieldId(field, index);
                  const color = fieldColor(index);
                  const isActive = fieldId === selectedFieldId;

                  return (
                    <button
                      key={fieldId}
                      type="button"
                      draggable
                      className={`mb-1 grid w-full cursor-grab grid-cols-[20px_1fr_auto] items-center gap-2 rounded-md border px-2 py-2 text-left text-sm active:cursor-grabbing ${
                        isActive ? 'border-slate-300 bg-slate-100' : 'border-transparent hover:bg-slate-50'
                      } ${
                        dragOverFieldId === fieldId && draggedFieldId !== fieldId ? 'border-blue-300 bg-blue-50' : ''
                      } ${
                        draggedFieldId === fieldId ? 'opacity-60' : ''
                      }`}
                      onClick={() => setSelectedFieldId(fieldId)}
                      onDragStart={(event) => handleFieldDragStart(event, fieldId)}
                      onDragOver={(event) => handleFieldDragOver(event, fieldId)}
                      onDrop={(event) => handleFieldDrop(event, fieldId)}
                      onDragEnd={handleFieldDragEnd}
                      title={t(locale, '拖拽调整输出顺序', 'Drag to reorder output fields')}
                    >
                      <span className="h-3 w-3" style={{ background: color }} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-800">{field.fieldName}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {Math.round(field.bboxNormalized.x * previewSize.width)},{Math.round(field.bboxNormalized.y * previewSize.height)},{Math.round(field.bboxNormalized.width * previewSize.width)},{Math.round(field.bboxNormalized.height * previewSize.height)}
                        </span>
                        {field.riskRule ? <span className="block truncate text-xs text-slate-400">{field.riskRule}</span> : null}
                      </span>
                      <span className="text-xs text-slate-400">{index + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selectedField ? (
                <div className="space-y-3">
                  <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-500">{t(locale, '预输入预览', 'Pre-input preview')}</p>
                    <p className="mt-2 text-sm text-slate-700">
                      {selectedField.riskRule?.trim() || t(locale, '先框选区域，再在这里填写给操作员看的预输入提示，不会自动开始识别。', 'Define an operator-facing pre-input hint here. OCR will not start automatically.')}
                    </p>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">{t(locale, '选区名称', 'Region name')}</span>
                    <div className="flex gap-2">
                      <input
                        className={`min-w-0 flex-1 rounded-md border px-3 py-2 ${fieldNameError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                        value={fieldNameDraft}
                        onChange={(event) => {
                          setFieldNameDraft(event.target.value);
                          if (fieldNameError) {
                            setFieldNameError('');
                          }
                        }}
                        onBlur={commitSelectedFieldName}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitSelectedFieldName();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                        onClick={commitSelectedFieldName}
                      >
                        {t(locale, '保存', 'Save')}
                      </button>
                    </div>
                    {fieldNameError ? <span className="text-xs font-medium text-red-600">{fieldNameError}</span> : null}
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t(locale, '输出列', 'Output column')}</span>
                      <input
                        className="rounded-md border border-slate-200 px-3 py-2"
                        value={selectedField.outputColumn}
                        onChange={(event) =>
                          updateSelectedField((field) => ({
                            ...field,
                            outputColumn: sanitizeOutputColumn(event.target.value, selectedFieldIndex),
                          }))
                        }
                      />
                    </label>

                    <label className="grid gap-1 text-sm">
                      <span className="font-medium">{t(locale, '字段类型', 'Field type')}</span>
                      <select
                        className="rounded-md border border-slate-200 px-3 py-2"
                        value={selectedField.fieldType}
                        onChange={(event) => updateSelectedField((field) => ({ ...field, fieldType: event.target.value as OcrFieldType }))}
                      >
                        {fieldTypes.map((fieldType) => (
                          <option key={fieldType} value={fieldType}>
                            {fieldTypeLabel(fieldType, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label className="grid gap-1 text-sm">
                    <span className="font-medium">{t(locale, '预输入内容', 'Pre-input content')}</span>
                    <textarea
                      className="min-h-[72px] rounded-md border border-slate-200 px-3 py-2"
                      value={selectedField.riskRule ?? ''}
                      onChange={(event) => updateSelectedField((field) => ({ ...field, riskRule: event.target.value || undefined }))}
                    />
                  </label>

                  <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{t(locale, '框选坐标', 'Region coordinates')}</span>
                      <span className="text-xs text-slate-500">{t(locale, '单页独立', 'Per-page only')}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <label className="grid gap-1 text-xs" key={key}>
                        <span className="font-medium uppercase text-slate-500">{key}</span>
                        <input
                          type="number"
                          min="0"
                          max="1"
                          step="0.001"
                          className="rounded-md border border-slate-200 px-2 py-1.5"
                          value={selectedField.bboxNormalized[key]}
                          onChange={(event) =>
                            updateSelectedField((field) => ({
                              ...field,
                              bboxNormalized: normalizeBbox({
                                ...field.bboxNormalized,
                                [key]: normalizeNumberInput(event.target.value, field.bboxNormalized[key]),
                              }),
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedField.required ?? false}
                        onChange={(event) => updateSelectedField((field) => ({ ...field, required: event.target.checked }))}
                      />
                      {t(locale, '必填', 'Required')}
                    </label>
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-600"
                      onClick={() => setShowAdvancedParams((current) => !current)}
                    >
                      {showAdvancedParams ? t(locale, '收起高级参数', 'Hide advanced settings') : t(locale, '高级参数', 'Advanced settings')}
                    </button>
                  </div>

                  {showAdvancedParams ? (
                    <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
                      <div className="grid grid-cols-3 gap-2">
                        <label className="grid gap-1 text-xs">
                          <span className="font-medium text-slate-500">{t(locale, '最少', 'Min')}</span>
                          <input
                            type="number"
                            min="1"
                            className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                            value={selectedFieldRule.minChars ?? ''}
                            onChange={(event) =>
                              updateSelectedFieldValidationRule((rule) => ({
                                ...rule,
                                minChars: normalizePositiveIntegerInput(event.target.value),
                                exactChars: undefined,
                              }))
                            }
                          />
                        </label>

                        <label className="grid gap-1 text-xs">
                          <span className="font-medium text-slate-500">{t(locale, '最多', 'Max')}</span>
                          <input
                            type="number"
                            min="1"
                            className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                            value={selectedFieldRule.maxChars ?? ''}
                            onChange={(event) =>
                              updateSelectedFieldValidationRule((rule) => ({
                                ...rule,
                                maxChars: normalizePositiveIntegerInput(event.target.value),
                                exactChars: undefined,
                              }))
                            }
                          />
                        </label>

                        <label className="grid gap-1 text-xs">
                          <span className="font-medium text-slate-500">{t(locale, '定长', 'Exact')}</span>
                          <input
                            type="number"
                            min="1"
                            className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                            value={selectedFieldRule.exactChars ?? ''}
                            onChange={(event) =>
                              updateSelectedFieldValidationRule((rule) => ({
                                ...rule,
                                minChars: undefined,
                                maxChars: undefined,
                                exactChars: normalizePositiveIntegerInput(event.target.value),
                              }))
                            }
                          />
                        </label>
                      </div>

                      <label className="grid gap-1 text-sm">
                        <span className="font-medium">{t(locale, '关键词', 'Keywords')}</span>
                        <textarea
                          className="min-h-[64px] rounded-md border border-slate-200 bg-white px-3 py-2"
                          value={selectedFieldRule.requiredKeywords.join(', ')}
                          onChange={(event) =>
                            updateSelectedFieldValidationRule((rule) => ({
                              ...rule,
                              requiredKeywords: event.target.value
                                .split(/[\n,，]/)
                                .map((item) => item.trim())
                                .filter(Boolean),
                            }))
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                    onClick={() => {
                      const nextFields = fields.filter((field, index) => toFieldId(field, index) !== selectedFieldId);
                      const normalizedNextFields = replaceActivePageFields(nextFields.map((field, index) => ({ ...field, sortOrder: index })));
                      setSelectedFieldId(normalizedNextFields[0] ? toFieldId(normalizedNextFields[0], 0) : '');
                    }}
                  >
                    {t(locale, '删除选区', 'Delete region')}
                  </button>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
                  {t(locale, '选择一个选区后可编辑', 'Select a region to edit it')}
                </div>
              )}
            </div>
          </aside>

          <section className="col-start-3 row-start-3 flex min-h-0 flex-col border-t border-slate-200 bg-white">
            <div className="flex min-h-11 items-center justify-between gap-3 border-b border-slate-200 px-3 py-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{t(locale, '识别结果', 'Results')}</h3>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    resultViewMode === 'single' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                  onClick={() => setResultViewMode('single')}
                >
                  {t(locale, '当前页', 'Current page')}
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    resultViewMode === 'batch' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                  onClick={() => setResultViewMode('batch')}
                  disabled={batchRows.length === 0}
                >
                  {t(locale, `批量结果 ${batchRows.length}`, `Batch ${batchRows.length}`)}
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    resultViewMode === 'processed' ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                  onClick={() => setResultViewMode('processed')}
                  disabled={processedRows.length === 0}
                >
                  {t(locale, `处理结果 ${processedRows.length}`, `Processed ${processedRows.length}`)}
                </button>
                <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                  {visibleResultCount > 0
                    ? t(
                        locale,
                        `显示 ${resultStartIndex}-${resultEndIndex} / 共 ${visibleResultCount} 条`,
                        `Showing ${resultStartIndex}-${resultEndIndex} of ${visibleResultCount} results`,
                      )
                    : t(locale, '暂无结果', 'No results')}
                </span>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:text-slate-400"
                onClick={() => void handleExport()}
                disabled={(resultViewMode === 'processed' ? processedRows.length === 0 : resultViewMode === 'batch' ? batchRows.length === 0 : !selectedDocument) || busy}
              >
                {t(locale, '导出 XLSX', 'Export XLSX')}
              </button>
            </div>

            {batchRows.length > 0 ? (
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(locale, '数据处理规则库', 'Processing rule library')}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {t(
                        locale,
                        `规则 ${processingRuleLibrary.length} 条，当前 ${processingTemplate.columns.length} 列，处理结果 ${processedRows.length} 条。`,
                        `${processingRuleLibrary.length} rules, ${processingTemplate.columns.length} current columns, ${processedRows.length} processed rows.`,
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      onClick={() => setShowProcessingTemplatePanel((current) => !current)}
                    >
                      {showProcessingTemplatePanel ? t(locale, '收起规则库', 'Hide library') : t(locale, '规则库', 'Rule library')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      onClick={handleSuggestProcessingTemplate}
                    >
                      {t(locale, '补全建议规则', 'Suggest rules')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      onClick={addProcessingColumn}
                    >
                      {t(locale, '新增输出列', 'Add column')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
                      onClick={handleGenerateProcessedRows}
                      disabled={processingTemplate.columns.length === 0}
                    >
                      {t(locale, '生成处理结果', 'Generate processed')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:text-slate-300"
                      onClick={() => void handleOverwriteProcessingRule()}
                      disabled={!selectedTemplate || busy}
                      title={!selectedTemplate ? t(locale, '请先选择或保存一个预设', 'Select or save a preset first') : undefined}
                    >
                      {selectedProcessingRule ? t(locale, '覆盖当前规则', 'Overwrite rule') : t(locale, '另存为规则', 'Save as rule')}
                    </button>
                  </div>
                </div>

                {showProcessingTemplatePanel ? (
                  <>
                    <p className="mt-2 text-xs text-slate-500">
                      {t(
                        locale,
                        '规则库绑定当前 OCR 预设。先从左侧选择并导入规则，再在右侧编辑输出列和来源字段。',
                        'The rule library is bound to the current OCR preset. Import a rule on the left, then edit output columns and sources on the right.',
                      )}
                    </p>

                    <div className="mt-2 grid max-h-64 gap-3 overflow-auto lg:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-md border border-slate-200 bg-white">
                        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                          <span className="text-xs font-semibold text-slate-600">{t(locale, '当前预设规则', 'Preset rules')}</span>
                          <button
                            type="button"
                            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-300"
                            onClick={() => void handleSaveProcessingRuleAs()}
                            disabled={!selectedTemplate || processingTemplate.columns.length === 0 || busy}
                          >
                            {t(locale, '另存', 'Save as')}
                          </button>
                        </div>

                        {processingRuleLibrary.length > 0 ? (
                          <div className="max-h-52 overflow-auto">
                            {processingRuleLibrary.map((rule) => (
                              <div key={rule.id} className={`border-b border-slate-100 px-3 py-2 ${rule.id === selectedProcessingRuleId ? 'bg-blue-50' : ''}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <button
                                    type="button"
                                    className="min-w-0 text-left text-xs font-semibold text-slate-800"
                                    onClick={() => handleUseProcessingRule(rule)}
                                  >
                                    <span className="block truncate">{rule.name}</span>
                                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                                      {t(locale, `${rule.columns.length} 列`, `${rule.columns.length} columns`)}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white"
                                    onClick={() => handleUseProcessingRule(rule)}
                                  >
                                    {t(locale, '使用', 'Use')}
                                  </button>
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                    onClick={() => void handleRenameProcessingRule(rule)}
                                    disabled={!selectedTemplate || busy}
                                  >
                                    {t(locale, '重命名', 'Rename')}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600"
                                    onClick={() => void handleDuplicateProcessingRule(rule)}
                                    disabled={!selectedTemplate || busy}
                                  >
                                    {t(locale, '复制', 'Copy')}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600"
                                    onClick={() => void handleDeleteProcessingRule(rule)}
                                    disabled={!selectedTemplate || busy}
                                  >
                                    {t(locale, '删除', 'Delete')}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="px-3 py-4 text-xs text-slate-500">
                            {selectedTemplate
                              ? t(locale, '还没有保存的规则。先编辑右侧规则，再另存为新规则。', 'No saved rules yet. Edit the rule on the right, then save it as a new rule.')
                              : t(locale, '未选择 OCR 预设时只能临时编辑规则，不能保存规则库。', 'Without an OCR preset, rules can be edited temporarily but cannot be saved.')}
                          </p>
                        )}
                      </div>

                      <div className="rounded-md border border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
                          <span className="text-xs font-semibold text-slate-600">
                            {selectedProcessingRule
                              ? t(locale, `编辑中：${selectedProcessingRule.name}`, `Editing: ${selectedProcessingRule.name}`)
                              : t(locale, '当前编辑规则', 'Current editor rule')}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                              onClick={handleSuggestProcessingTemplate}
                            >
                              {t(locale, '补全建议', 'Suggest')}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700"
                              onClick={addProcessingColumn}
                            >
                              {t(locale, '新增列', 'Add column')}
                            </button>
                            <button
                              type="button"
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-300"
                              onClick={() => void handleOverwriteProcessingRule()}
                              disabled={!selectedTemplate || processingTemplate.columns.length === 0 || busy}
                            >
                              {selectedProcessingRule ? t(locale, '覆盖保存', 'Overwrite') : t(locale, '另存规则', 'Save as')}
                            </button>
                          </div>
                        </div>

                        {processingTemplate.columns.length > 0 ? (
                          <div className="max-h-52 overflow-auto">
                            <table className="w-full min-w-[760px] border-collapse text-xs">
                              <thead className="sticky top-0 bg-slate-50 text-left uppercase text-slate-500">
                                <tr>
                                  <th className="px-2 py-1">{t(locale, '输出列', 'Output column')}</th>
                                  <th className="px-2 py-1">{t(locale, '类型', 'Type')}</th>
                                  <th className="px-2 py-1">{t(locale, '来源字段 / 通配来源', 'Source / pattern')}</th>
                                  <th className="px-2 py-1">{t(locale, '操作', 'Action')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {processingTemplate.columns.map((column) => (
                                  <tr key={column.id} className="border-t border-slate-200">
                                    <td className="px-2 py-1">
                                      <input
                                        className="w-full min-w-[150px] rounded-md border border-slate-200 bg-white px-2 py-1"
                                        value={column.outputColumn}
                                        onChange={(event) => updateProcessingColumn(column.id, { outputColumn: event.target.value })}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <select
                                        className="w-full min-w-[120px] rounded-md border border-slate-200 bg-white px-2 py-1"
                                        value={column.mode}
                                        onChange={(event) => updateProcessingColumn(column.id, { mode: event.target.value === 'detail' ? 'detail' : 'shared' })}
                                      >
                                        <option value="shared">{t(locale, '公共字段', 'Shared')}</option>
                                        <option value="detail">{t(locale, '明细字段', 'Detail')}</option>
                                      </select>
                                    </td>
                                    <td className="px-2 py-1">
                                      <input
                                        className="w-full min-w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1"
                                        list="ocr-processing-source-options"
                                        value={column.sourcePattern}
                                        placeholder={column.mode === 'detail' ? 'product_*' : 'bl_pl_number'}
                                        onChange={(event) => updateProcessingColumn(column.id, { sourcePattern: event.target.value })}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <button
                                        type="button"
                                        className="rounded-md border border-red-200 px-2 py-1 font-semibold text-red-600"
                                        onClick={() => removeProcessingColumn(column.id)}
                                      >
                                        {t(locale, '删除', 'Delete')}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <datalist id="ocr-processing-source-options">
                              {sourceOptionsForProcessing().map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                          </div>
                        ) : (
                          <p className="px-3 py-4 text-xs text-slate-500">
                            {t(locale, '当前编辑器还没有处理规则。可以补全建议，或手动新增输出列。', 'The editor has no processing rules yet. Suggest rules or add output columns manually.')}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
              {resultViewMode === 'processed' ? (
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      {processedHeaders.map((header) => (
                        <th key={header} className="border-b border-slate-200 px-3 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processedRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={Math.max(processedHeaders.length, 1)}>
                          {t(locale, '暂无处理结果', 'No processed results yet')}
                        </td>
                      </tr>
                    ) : null}

                    {visibleProcessedRows.map((row, rowIndex) => (
                      <tr key={`${String(row[processedHeaders[0]] ?? 'processed')}-${resultStartIndex + rowIndex}`} className="border-b border-slate-100">
                        {processedHeaders.map((header) => (
                          <td key={header} className="max-w-[240px] truncate px-3 py-2 text-slate-700">
                            {String(row[header] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : resultViewMode === 'batch' ? (
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      {batchHeaders.map((header) => (
                        <th key={header} className="border-b border-slate-200 px-3 py-2 text-left">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {batchRows.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={Math.max(batchHeaders.length, 1)}>
                          {t(locale, '暂无批量结果', 'No batch results yet')}
                        </td>
                      </tr>
                    ) : null}

                    {visibleBatchRows.map((row, rowIndex) => (
                      <tr key={`${String(row[batchHeaders[0]] ?? 'batch')}-${resultStartIndex + rowIndex}`} className="border-b border-slate-100">
                        {batchHeaders.map((header) => (
                          <td key={header} className="max-w-[240px] truncate px-3 py-2 text-slate-700">
                            {String(row[header] ?? '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '字段', 'Field')}</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '结果', 'Value')}</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '原值', 'Raw')}</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '置信度', 'Confidence')}</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '校验', 'Validation')}</th>
                      <th className="border-b border-slate-200 px-3 py-2 text-left">{t(locale, '状态', 'Risk')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-slate-500" colSpan={6}>
                          {t(locale, '暂无识别结果', 'No OCR results yet')}
                        </td>
                      </tr>
                    ) : null}

                    {visibleResults.map((result) => (
                      <tr key={result.id} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium text-slate-800">{result.fieldName}</td>
                        <td className="px-3 py-2">
                          <input
                            className="w-full min-w-[180px] rounded-md border border-slate-200 px-2 py-1.5"
                            value={result.finalText ?? ''}
                            onChange={(event) => handleResultDraftChange(result.id, event.target.value)}
                            onBlur={(event) => void handleResultPersist(result.id, event.target.value)}
                          />
                        </td>
                        <td className="max-w-[220px] truncate px-3 py-2 text-slate-500">{result.ocrRawText || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{typeof result.confidence === 'number' ? formatPercent(result.confidence) : '-'}</td>
                        <td className={`px-3 py-2 ${validationTone(result.validationStatus)}`}>
                          {result.validationMessage || result.validationStatus}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${riskTone(result.riskLevel)}`}>{result.riskLevel}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex min-h-10 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="text-xs text-slate-500">
                {t(locale, `每页最多 ${resultPageSize} 条，超出后可翻页查看和编辑。`, `Up to ${resultPageSize} per page; use paging to view and edit the rest.`)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-300"
                  onClick={() => setResultPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={currentResultPage <= 1}
                >
                  {t(locale, '上一页', 'Previous')}
                </button>
                <span className="min-w-16 text-center text-xs font-medium text-slate-500">
                  {currentResultPage} / {resultPageCount}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:text-slate-300"
                  onClick={() => setResultPage((currentPage) => Math.min(resultPageCount, currentPage + 1))}
                  disabled={currentResultPage >= resultPageCount}
                >
                  {t(locale, '下一页', 'Next')}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
