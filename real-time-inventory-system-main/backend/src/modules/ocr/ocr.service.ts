import { Prisma, type OcrDocumentKind, type OcrFieldType } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import path from "path";
import prisma from "../../lib/prisma";
import { AppError } from "../../shared/errors/app-error";
import { deleteStoredDocument, persistUploadedDocument, readStoredDocument } from "./ocr.storage";
import type {
  CreateTemplateInput,
  DuplicateTemplateInput,
  ExtractPageInput,
  NormalizedBboxInput,
  UpdateTemplateInput,
  UpdateResultInput,
} from "./ocr.schemas";
import { resolveRiskLevel, validateOcrFieldValue } from "./ocr.validation";

type ServiceActor = {
  userId: string;
  email?: string;
};

type UploadedFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

type OcrServiceQualityResponse = {
  status: string;
  checks: Record<string, string | number | boolean>;
  suggestions: string[];
};

type OcrServiceDetectResponse = {
  candidates: Array<{
    id: string;
    bboxNormalized: NormalizedBboxInput;
    confidence: number;
    textPreview?: string;
  }>;
};

type OcrServiceRecognizeResponse = {
  fields: Array<{
    fieldName: string;
    outputColumn: string;
    fieldType: OcrFieldType;
    text: string;
    confidence: number;
    bboxNormalized: NormalizedBboxInput;
  }>;
};

const FILE_RETENTION_DAYS = 7;

function toJsonValue(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function determineDocumentKind(file: UploadedFile): OcrDocumentKind {
  const extension = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === "application/pdf" || extension === ".pdf") {
    return "PDF";
  }

  if (["image/jpeg", "image/png", "image/jpg"].includes(file.mimetype) || [".jpg", ".jpeg", ".png"].includes(extension)) {
    return "IMAGE";
  }

  throw new AppError("Only PDF, JPG, and PNG files are supported", 400);
}

async function countPdfPages(file: UploadedFile) {
  const parser = new PDFParse({ data: file.buffer });
  const result = await parser.getInfo();
  await parser.destroy();
  return result.total || 1;
}

function getOcrServiceUrl() {
  return process.env.OCR_SERVICE_URL || "http://127.0.0.1:8001";
}

async function callOcrService<TResponse>(
  endpoint: string,
  file: { buffer: Buffer; fileName: string; mimeType: string },
  extraFields: Record<string, string> = {},
) {
  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), file.fileName);

  for (const [key, value] of Object.entries(extraFields)) {
    formData.append(key, value);
  }

  const response = await fetch(`${getOcrServiceUrl()}${endpoint}`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AppError(
      (payload as { detail?: string } | null)?.detail || `OCR service request failed for ${endpoint}`,
      502,
    );
  }

  return payload as TResponse;
}

async function getDocumentPageOrThrow(pageId: string) {
  const page = await prisma.ocrDocumentPage.findUnique({
    where: { id: pageId },
    include: {
      document: true,
    },
  });

  if (!page) {
    throw new AppError("Document page not found", 404);
  }

  return page;
}

async function readDocumentBufferOrThrow(document: { storagePath: string; fileName: string }) {
  try {
    return await readStoredDocument(document.storagePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      throw new AppError(
        `原始文件已丢失，请重新上传后重试。Original file is missing for "${document.fileName}". Please re-upload and try again.`,
        409,
      );
    }

    throw error;
  }
}

function mapTemplate(template: Awaited<ReturnType<typeof prisma.ocrTemplate.findUnique>>) {
  if (!template) {
    return null;
  }

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    anchorConfig: template.anchorConfig,
    archivedAt: template.archivedAt,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

const productTypeHeader = "Product Type";
const sharedHeaderNames = ["DN/PL No.", "ETD", "ETA", "Truck No.", "Truck Phone", "Zone", "Manufacturer"];
const shipmentFieldHeaders = ["Material Name", "Description", "Qty", "Weight"] as const;
const productSheetNames = ["Tube", "Purlin", "Saddle", "H Beam or Post", "待确认"] as const;

type ShipmentFieldName = (typeof shipmentFieldHeaders)[number];
type ProductSheetName = (typeof productSheetNames)[number];
type ClassificationResultInput = {
  fieldName: string;
  outputColumn: string;
  finalText?: string | null;
  ocrRawText?: string | null;
  sourceBbox?: Prisma.JsonValue | null;
};

function normalizeClassificationLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function resultText(result: ClassificationResultInput) {
  return result.finalText ?? result.ocrRawText ?? "";
}

function resultLabels(result: ClassificationResultInput) {
  return [result.fieldName, result.outputColumn].filter(Boolean);
}

function detectSharedHeader(result: ClassificationResultInput) {
  const normalizedLabels = resultLabels(result).map(normalizeClassificationLabel);
  if (normalizedLabels.some((label) => label.includes("dnpl") || label.includes("dnno") || label.includes("plno"))) return "DN/PL No.";
  if (normalizedLabels.some((label) => label.includes("etd"))) return "ETD";
  if (normalizedLabels.some((label) => label.includes("eta"))) return "ETA";
  if (normalizedLabels.some((label) => label.includes("truckno") || label.includes("trucknumber"))) return "Truck No.";
  if (normalizedLabels.some((label) => label.includes("truckphone") || label.includes("trucktel") || label.includes("driverphone"))) return "Truck Phone";
  if (normalizedLabels.some((label) => label.includes("zone"))) return "Zone";
  if (normalizedLabels.some((label) => label.includes("manufacturer") || label.includes("maker") || label.includes("factory"))) return "Manufacturer";
  return "";
}

function detectShipmentField(result: ClassificationResultInput): ShipmentFieldName | "" {
  const normalizedLabels = resultLabels(result).map(normalizeClassificationLabel);
  if (normalizedLabels.some((label) => label.includes("materialname") || label === "material")) return "Material Name";
  if (normalizedLabels.some((label) => label.includes("description") || label === "desc")) return "Description";
  if (normalizedLabels.some((label) => label.includes("quantity") || label.includes("qty"))) return "Qty";
  if (normalizedLabels.some((label) => label.includes("weight") || label.includes("wt"))) return "Weight";
  return "";
}

function detectBlockSuffix(result: ClassificationResultInput) {
  for (const label of resultLabels(result)) {
    const match = label.trim().match(/(?:^|[\s_-])(\d+)$/);
    if (match) {
      return match[1];
    }
  }

  return "";
}

function detectProductType(materialName: string, description: string): ProductSheetName {
  const text = `${materialName} ${description}`.toLowerCase();
  if (/\btube\b/.test(text)) return "Tube";
  if (/\bpurlin\b/.test(text)) return "Purlin";
  if (/\bsaddle\b/.test(text)) return "Saddle";
  if (/\bh[\s-]*beam\b|\bi[\s-]*beam\b|\bbeam\s*post\b|\bpost\b/.test(text)) return "H Beam or Post";
  return "待确认";
}

function sourceBboxY(sourceBbox: Prisma.JsonValue | null | undefined) {
  if (!sourceBbox || typeof sourceBbox !== "object" || Array.isArray(sourceBbox)) {
    return null;
  }

  const y = (sourceBbox as { y?: unknown }).y;
  return typeof y === "number" ? y : null;
}

function shipmentBlockKey(result: ClassificationResultInput) {
  const suffix = detectBlockSuffix(result);
  if (suffix) {
    return `suffix:${suffix}`;
  }

  const y = sourceBboxY(result.sourceBbox);
  return typeof y === "number" ? `row:${Math.round(y * 20)}` : "row:unknown";
}

function classifyOcrResults(
  results: ClassificationResultInput[],
  metadata: Record<string, string | number>,
  metadataHeaders: string[],
) {
  const sharedHeaders: Record<string, string | number> = {};
  const shipmentBlocks = new Map<string, Partial<Record<ShipmentFieldName, string | number>>>();

  for (const result of results) {
    const sharedHeader = detectSharedHeader(result);
    if (sharedHeader) {
      sharedHeaders[sharedHeader] = resultText(result);
      continue;
    }

    const shipmentField = detectShipmentField(result);
    if (!shipmentField) {
      continue;
    }

    const blockKey = shipmentBlockKey(result);
    const block = shipmentBlocks.get(blockKey) ?? {};
    block[shipmentField] = resultText(result);
    shipmentBlocks.set(blockKey, block);
  }

  const headers = [...metadataHeaders, productTypeHeader, ...sharedHeaderNames, ...shipmentFieldHeaders];
  const rows = Array.from(shipmentBlocks.values())
    .filter((block) => shipmentFieldHeaders.some((header) => String(block[header] ?? "").trim()))
    .map((block) => {
      const row: Record<string, string | number> = {
        ...metadata,
        [productTypeHeader]: detectProductType(String(block["Material Name"] ?? ""), String(block.Description ?? "")),
      };

      for (const header of sharedHeaderNames) {
        row[header] = sharedHeaders[header] ?? "";
      }

      for (const header of shipmentFieldHeaders) {
        row[header] = block[header] ?? "";
      }

      return row;
    });

  if (rows.length === 0) {
    const fallbackRow: Record<string, string | number> = {
      ...metadata,
      [productTypeHeader]: "待确认",
    };

    for (const header of sharedHeaderNames) {
      fallbackRow[header] = sharedHeaders[header] ?? "";
    }

    for (const header of shipmentFieldHeaders) {
      fallbackRow[header] = "";
    }

    return {
      headers,
      rows: [fallbackRow],
    };
  }

  return { headers, rows };
}

export class OcrService {
  static async createDocument(file: UploadedFile, actor: ServiceActor) {
    const kind = determineDocumentKind(file);
    const storagePath = await persistUploadedDocument(file.originalname, file.buffer);
    const pageCount = kind === "PDF" ? await countPdfPages(file) : 1;
    const retentionExpiresAt = new Date(Date.now() + FILE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const document = await prisma.ocrDocument.create({
      data: {
        fileName: file.originalname,
        originalMimeType: file.mimetype,
        kind,
        storagePath,
        pageCount,
        status: "READY",
        retentionExpiresAt,
        uploadedById: actor.userId,
        pages: {
          create: Array.from({ length: pageCount }, (_, index) => ({
            pageNumber: index + 1,
          })),
        },
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: "asc",
          },
        },
      },
    });

    return document;
  }

  static async listDocuments() {
    return prisma.ocrDocument.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        pages: {
          orderBy: {
            pageNumber: "asc",
          },
        },
      },
      take: 20,
    });
  }

  static async getDocument(documentId: string) {
    const document = await prisma.ocrDocument.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: {
            pageNumber: "asc",
          },
        },
      },
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    return document;
  }

  static async readDocumentFile(documentId: string) {
    const document = await prisma.ocrDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    const buffer = await readDocumentBufferOrThrow(document);
    return {
      fileName: document.fileName,
      mimeType: document.originalMimeType,
      buffer,
    };
  }

  static async deleteDocument(documentId: string) {
    const document = await prisma.ocrDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new AppError("Document not found", 404);
    }

    await prisma.ocrDocument.delete({
      where: { id: documentId },
    });

    await deleteStoredDocument(document.storagePath);

    return {
      id: document.id,
      fileName: document.fileName,
    };
  }

  static async checkPageQuality(pageId: string, actor: ServiceActor) {
    const page = await getDocumentPageOrThrow(pageId);
    const buffer = await readDocumentBufferOrThrow(page.document);

    const job = await prisma.ocrExtractionJob.create({
      data: {
        documentId: page.documentId,
        documentPageId: page.id,
        jobType: "DETECT",
        status: "RUNNING",
        requestedById: actor.userId,
        startedAt: new Date(),
      },
    });

    try {
      const quality = await callOcrService<OcrServiceQualityResponse>(
        "/quality-check",
        {
          buffer,
          fileName: page.document.fileName,
          mimeType: page.document.originalMimeType,
        },
        { pageNumber: String(page.pageNumber) },
      );

      const finishedAt = new Date();
      await prisma.$transaction([
        prisma.ocrDocumentPage.update({
          where: { id: page.id },
          data: {
            qualityStatus: quality.status,
            qualityDetails: toJsonValue(quality),
          },
        }),
        prisma.ocrExtractionJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            finishedAt,
            durationMs: finishedAt.getTime() - job.createdAt.getTime(),
            resultSummary: toJsonValue({
              qualityStatus: quality.status,
            }),
          },
        }),
      ]);

      return {
        jobId: job.id,
        quality,
      };
    } catch (error) {
      await prisma.ocrExtractionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "OCR quality check failed",
        },
      });

      throw error;
    }
  }

  static async detectPage(pageId: string, actor: ServiceActor) {
    const page = await getDocumentPageOrThrow(pageId);
    const buffer = await readDocumentBufferOrThrow(page.document);

    const job = await prisma.ocrExtractionJob.create({
      data: {
        documentId: page.documentId,
        documentPageId: page.id,
        jobType: "DETECT",
        status: "RUNNING",
        requestedById: actor.userId,
        startedAt: new Date(),
      },
    });

    try {
      const [quality, detection] = await Promise.all([
        callOcrService<OcrServiceQualityResponse>("/quality-check", {
          buffer,
          fileName: page.document.fileName,
          mimeType: page.document.originalMimeType,
        }, { pageNumber: String(page.pageNumber) }),
        callOcrService<OcrServiceDetectResponse>("/detect", {
          buffer,
          fileName: page.document.fileName,
          mimeType: page.document.originalMimeType,
        }, { pageNumber: String(page.pageNumber) }),
      ]);

      const finishedAt = new Date();
      await prisma.$transaction([
        prisma.ocrDocumentPage.update({
          where: { id: page.id },
          data: {
            qualityStatus: quality.status,
            qualityDetails: toJsonValue(quality),
          },
        }),
        prisma.ocrExtractionJob.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            finishedAt,
            durationMs: finishedAt.getTime() - job.createdAt.getTime(),
            resultSummary: toJsonValue({
              candidatesCount: detection.candidates.length,
            }),
          },
        }),
      ]);

      return {
        jobId: job.id,
        quality,
        candidates: detection.candidates,
      };
    } catch (error) {
      await prisma.ocrExtractionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "OCR detection failed",
        },
      });

      throw error;
    }
  }

  static async extractPage(pageId: string, actor: ServiceActor, input: ExtractPageInput) {
    const page = await getDocumentPageOrThrow(pageId);
    const buffer = await readDocumentBufferOrThrow(page.document);

    const job = await prisma.ocrExtractionJob.create({
      data: {
        documentId: page.documentId,
        documentPageId: page.id,
        templateId: input.templateId,
        jobType: "EXTRACT",
        status: "RUNNING",
        requestedById: actor.userId,
        startedAt: new Date(),
      },
    });

    try {
      const recognition = await callOcrService<OcrServiceRecognizeResponse>(
        "/recognize",
        {
          buffer,
          fileName: page.document.fileName,
          mimeType: page.document.originalMimeType,
        },
        {
          pageNumber: String(page.pageNumber),
          fields: JSON.stringify(input.fields),
        },
      );

      const createdResults = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const [index, field] of input.fields.entries()) {
          const recognizedField = recognition.fields[index];
          const rawText = recognizedField?.text || "";
          const confidence = Number.isFinite(recognizedField?.confidence) ? recognizedField.confidence : null;
          const validation = validateOcrFieldValue(field.fieldType, rawText, field.required, field.validationRule);
          const result = await tx.ocrExtractionResult.create({
            data: {
              jobId: job.id,
              documentPageId: page.id,
              fieldName: field.fieldName,
              outputColumn: field.outputColumn,
              fieldType: field.fieldType,
              ocrRawText: rawText,
              finalText: validation.normalizedValue || rawText,
              confidence: confidence ?? undefined,
              riskLevel: resolveRiskLevel(confidence, validation.riskLevel),
              validationStatus: validation.validationStatus,
              validationMessage: validation.validationMessage,
              sourceBbox: toJsonValue(recognizedField?.bboxNormalized || field.bboxNormalized),
            },
          });

          results.push(result);
        }

        return results;
      });

      const finishedAt = new Date();
      await prisma.ocrExtractionJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          finishedAt,
          durationMs: finishedAt.getTime() - job.createdAt.getTime(),
          resultSummary: toJsonValue({
            fieldsCount: createdResults.length,
          }),
        },
      });

      return {
        jobId: job.id,
        results: createdResults,
      };
    } catch (error) {
      await prisma.ocrExtractionJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "OCR extraction failed",
        },
      });

      throw error;
    }
  }

  static async getJob(jobId: string) {
    const job = await prisma.ocrExtractionJob.findUnique({
      where: { id: jobId },
      include: {
        results: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!job) {
      throw new AppError("OCR job not found", 404);
    }

    return job;
  }

  static async createTemplate(input: CreateTemplateInput, actor: ServiceActor) {
    const template = await prisma.ocrTemplate.create({
      data: {
        name: input.name,
        description: input.description,
        anchorConfig: input.anchorConfig ? toJsonValue(input.anchorConfig) : undefined,
        createdById: actor.userId,
        fields: {
          create: input.fields.map((field) => ({
            fieldName: field.fieldName,
            outputColumn: field.outputColumn,
            fieldType: field.fieldType,
            required: field.required,
            validationRule: field.validationRule,
            riskRule: field.riskRule,
            bboxNormalized: toJsonValue(field.bboxNormalized),
            regionType: field.regionType,
            sortOrder: field.sortOrder,
          })),
        },
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    return template;
  }

  static async listTemplates(options: { includeArchived?: boolean } = {}) {
    return prisma.ocrTemplate.findMany({
      where: options.includeArchived ? undefined : { archivedAt: null },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  }

  static async getTemplate(templateId: string) {
    const template = await prisma.ocrTemplate.findUnique({
      where: { id: templateId },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });

    if (!template) {
      throw new AppError("Template not found", 404);
    }

    return template;
  }

  static async updateTemplate(templateId: string, input: UpdateTemplateInput) {
    await this.getTemplate(templateId);

    return prisma.ocrTemplate.update({
      where: { id: templateId },
      data: {
        name: input.name,
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  }

  static async duplicateTemplate(templateId: string, input: DuplicateTemplateInput, actor: ServiceActor) {
    const sourceTemplate = await this.getTemplate(templateId);
    const duplicateName = input.name?.trim() || `${sourceTemplate.name} Copy`;

    return prisma.ocrTemplate.create({
      data: {
        name: duplicateName,
        description: sourceTemplate.description,
        anchorConfig: sourceTemplate.anchorConfig ? toJsonValue(sourceTemplate.anchorConfig) : undefined,
        createdById: actor.userId,
        fields: {
          create: sourceTemplate.fields.map((field) => ({
            fieldName: field.fieldName,
            outputColumn: field.outputColumn,
            fieldType: field.fieldType,
            required: field.required,
            validationRule: field.validationRule,
            riskRule: field.riskRule,
            bboxNormalized: toJsonValue(field.bboxNormalized),
            regionType: field.regionType,
            sortOrder: field.sortOrder,
          })),
        },
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  }

  static async archiveTemplate(templateId: string) {
    await this.getTemplate(templateId);

    return prisma.ocrTemplate.update({
      where: { id: templateId },
      data: {
        archivedAt: new Date(),
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  }

  static async restoreTemplate(templateId: string) {
    await this.getTemplate(templateId);

    return prisma.ocrTemplate.update({
      where: { id: templateId },
      data: {
        archivedAt: null,
      },
      include: {
        fields: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
    });
  }

  static async applyTemplate(templateId: string, pageId: string) {
    await getDocumentPageOrThrow(pageId);
    const template = await this.getTemplate(templateId);
    if (template.archivedAt) {
      throw new AppError("Archived templates cannot be applied", 409);
    }

    return {
      template: mapTemplate(template),
      fields: template.fields.map((field) => ({
        id: field.id,
        fieldName: field.fieldName,
        outputColumn: field.outputColumn,
        fieldType: field.fieldType,
        required: field.required,
        validationRule: field.validationRule,
        riskRule: field.riskRule,
        bboxNormalized: field.bboxNormalized,
        regionType: field.regionType,
        sortOrder: field.sortOrder,
      })),
      matchStatus: "direct",
      warnings: template.anchorConfig ? [] : ["Template has no anchor configuration; only direct normalized coordinates were applied."],
    };
  }

  static async exportDocument(documentId: string) {
    const document = await this.getDocument(documentId);

    const pagesWithLatestExtractJob = await prisma.ocrDocumentPage.findMany({
      where: {
        documentId,
      },
      orderBy: {
        pageNumber: "asc",
      },
      include: {
        jobs: {
          where: {
            jobType: "EXTRACT",
            status: "COMPLETED",
          },
          orderBy: {
            finishedAt: "desc",
          },
          take: 1,
          include: {
            results: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    const metadataHeaders = ["pageNumber"];
    const headerSet = new Set<string>([...metadataHeaders, productTypeHeader, ...shipmentFieldHeaders]);
    const rows: Array<Record<string, string | number>> = [];

    for (const page of pagesWithLatestExtractJob) {
      const classified = classifyOcrResults(page.jobs[0]?.results ?? [], { pageNumber: page.pageNumber }, metadataHeaders);
      classified.headers.forEach((column) => headerSet.add(column));
      rows.push(...classified.rows);
    }

    const header = Array.from(headerSet);
    const csvLines = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((column) => {
            const rawValue = row[column] ?? "";
            const value = String(rawValue).replace(/"/g, "\"\"");
            return `"${value}"`;
          })
          .join(","),
      ),
    ];

    return {
      document: {
        id: document.id,
        fileName: document.fileName,
      },
      header,
      rows,
      csvContent: csvLines.join("\n"),
    };
  }

  static async updateResult(resultId: string, input: UpdateResultInput) {
    const existingResult = await prisma.ocrExtractionResult.findUnique({
      where: { id: resultId },
    });

    if (!existingResult) {
      throw new AppError("OCR result not found", 404);
    }

    return prisma.ocrExtractionResult.update({
      where: { id: resultId },
      data: {
        finalText: input.finalText,
        manuallyEdited: true,
        confirmedByUser: input.confirmedByUser,
      },
    });
  }
}
