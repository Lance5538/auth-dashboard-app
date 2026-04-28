import type { NextFunction, Response } from "express";
import { ZodError } from "zod";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware";
import { getRequestParam } from "../../shared/utils/request-param";
import { AppError } from "../../shared/errors/app-error";
import { OcrService } from "./ocr.service";
import {
  applyTemplateSchema,
  createTemplateSchema,
  duplicateTemplateSchema,
  exportDocumentSchema,
  extractPageSchema,
  updateTemplateSchema,
  updateResultSchema,
} from "./ocr.schemas";

type OcrUploadRequest = AuthenticatedRequest & {
  file?: Express.Multer.File;
};

function requireActor(req: AuthenticatedRequest) {
  if (!req.user?.userId) {
    throw new AppError("Unauthorized", 401);
  }

  return {
    userId: req.user.userId,
    email: req.user.email,
  };
}

export class OcrController {
  static async uploadDocument(req: OcrUploadRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const document = await OcrService.createDocument(
        {
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          buffer: req.file.buffer,
        },
        actor,
      );

      return res.status(201).json({
        message: "Document uploaded successfully",
        document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listDocuments(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const documents = await OcrService.listDocuments();
      return res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  }

  static async deleteDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const document = await OcrService.deleteDocument(getRequestParam(req, "id"));
      return res.status(200).json({
        message: "Document deleted successfully",
        document,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const document = await OcrService.getDocument(getRequestParam(req, "id"));
      return res.status(200).json({ document });
    } catch (error) {
      next(error);
    }
  }

  static async getDocumentFile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const file = await OcrService.readDocumentFile(getRequestParam(req, "id"));
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.fileName)}"`);
      return res.status(200).send(file.buffer);
    } catch (error) {
      next(error);
    }
  }

  static async getDocumentPages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const document = await OcrService.getDocument(getRequestParam(req, "id"));
      return res.status(200).json({
        document: {
          id: document.id,
          fileName: document.fileName,
          kind: document.kind,
          pageCount: document.pageCount,
          status: document.status,
        },
        pages: document.pages,
      });
    } catch (error) {
      next(error);
    }
  }

  static async detectPage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const result = await OcrService.detectPage(getRequestParam(req, "pageId"), actor);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async checkPageQuality(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const result = await OcrService.checkPageQuality(getRequestParam(req, "pageId"), actor);
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async extractPage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const input = extractPageSchema.parse(req.body);
      const result = await OcrService.extractPage(getRequestParam(req, "pageId"), actor, input);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async getJob(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const job = await OcrService.getJob(getRequestParam(req, "id"));
      return res.status(200).json({ job });
    } catch (error) {
      next(error);
    }
  }

  static async createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const input = createTemplateSchema.parse(req.body);
      const template = await OcrService.createTemplate(input, actor);
      return res.status(201).json({
        message: "Template saved successfully",
        template,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async listTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const includeArchived = req.query.includeArchived === "true";
      const templates = await OcrService.listTemplates({ includeArchived });
      return res.status(200).json({ templates });
    } catch (error) {
      next(error);
    }
  }

  static async getTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const template = await OcrService.getTemplate(getRequestParam(req, "id"));
      return res.status(200).json({ template });
    } catch (error) {
      next(error);
    }
  }

  static async updateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = updateTemplateSchema.parse(req.body);
      const template = await OcrService.updateTemplate(getRequestParam(req, "id"), input);
      return res.status(200).json({
        message: "Template updated successfully",
        template,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async duplicateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const actor = requireActor(req);
      const input = duplicateTemplateSchema.parse(req.body);
      const template = await OcrService.duplicateTemplate(getRequestParam(req, "id"), input, actor);
      return res.status(201).json({
        message: "Template duplicated successfully",
        template,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async archiveTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const template = await OcrService.archiveTemplate(getRequestParam(req, "id"));
      return res.status(200).json({
        message: "Template archived successfully",
        template,
      });
    } catch (error) {
      next(error);
    }
  }

  static async restoreTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const template = await OcrService.restoreTemplate(getRequestParam(req, "id"));
      return res.status(200).json({
        message: "Template restored successfully",
        template,
      });
    } catch (error) {
      next(error);
    }
  }

  static async applyTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = applyTemplateSchema.parse(req.body);
      const result = await OcrService.applyTemplate(getRequestParam(req, "id"), input.pageId);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async exportDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = exportDocumentSchema.parse(req.body);
      const result = await OcrService.exportDocument(input.documentId);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }

  static async updateResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const input = updateResultSchema.parse(req.body);
      const result = await OcrService.updateResult(getRequestParam(req, "id"), input);
      return res.status(200).json({
        message: "OCR result updated successfully",
        result,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.flatten(),
        });
      }

      next(error);
    }
  }
}
