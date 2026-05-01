import { z } from "zod";

export const normalizedBboxSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
});

export const fieldTypeSchema = z.enum([
  "TEXT",
  "NUMBER",
  "DATE",
  "PHONE",
  "CODE",
  "CONTAINER_NO",
]);

export const templateFieldInputSchema = z.object({
  fieldName: z.string().min(1, "Field name is required"),
  outputColumn: z.string().min(1, "Output column is required"),
  fieldType: fieldTypeSchema.default("TEXT"),
  required: z.boolean().optional().default(false),
  validationRule: z.string().nullish(),
  riskRule: z.string().nullish(),
  bboxNormalized: normalizedBboxSchema,
  regionType: z.string().nullish(),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  anchorConfig: z
    .object({
      mode: z.enum(["none", "text"]).default("none"),
      sourceImage: z
        .object({
          width: z.number().positive(),
          height: z.number().positive(),
          aspectRatio: z.number().positive(),
        })
        .optional(),
      anchors: z
        .array(
          z.object({
            key: z.string().min(1),
            label: z.string().min(1),
            expectedText: z.string().optional(),
            bboxNormalized: normalizedBboxSchema.optional(),
          }),
        )
        .optional()
        .default([]),
    })
    .passthrough()
    .optional(),
  fields: z.array(templateFieldInputSchema).min(1, "At least one field is required"),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
  anchorConfig: createTemplateSchema.shape.anchorConfig,
});

export const duplicateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").optional(),
});

export const applyTemplateSchema = z.object({
  pageId: z.string().min(1, "Page id is required"),
});

export const extractPageSchema = z.object({
  templateId: z.string().optional(),
  fields: z.array(templateFieldInputSchema).min(1, "At least one field is required"),
});

export const exportDocumentSchema = z.object({
  documentId: z.string().min(1, "Document id is required"),
});

export const updateResultSchema = z.object({
  finalText: z.string().default(""),
  confirmedByUser: z.boolean().optional().default(true),
});

export type NormalizedBboxInput = z.infer<typeof normalizedBboxSchema>;
export type TemplateFieldInput = z.infer<typeof templateFieldInputSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type DuplicateTemplateInput = z.infer<typeof duplicateTemplateSchema>;
export type ApplyTemplateInput = z.infer<typeof applyTemplateSchema>;
export type ExtractPageInput = z.infer<typeof extractPageSchema>;
export type ExportDocumentInput = z.infer<typeof exportDocumentSchema>;
export type UpdateResultInput = z.infer<typeof updateResultSchema>;
