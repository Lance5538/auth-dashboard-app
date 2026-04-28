import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { OcrController } from "./ocr.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
});

const router = Router();

router.use(authMiddleware);

router.get("/documents", OcrController.listDocuments);
router.post("/documents", upload.single("file"), OcrController.uploadDocument);
router.delete("/documents/:id", OcrController.deleteDocument);
router.get("/documents/:id", OcrController.getDocument);
router.get("/documents/:id/pages", OcrController.getDocumentPages);
router.get("/documents/:id/file", OcrController.getDocumentFile);

router.post("/pages/:pageId/quality-check", OcrController.checkPageQuality);
router.post("/pages/:pageId/detect", OcrController.detectPage);
router.post("/pages/:pageId/extract", OcrController.extractPage);

router.get("/jobs/:id", OcrController.getJob);

router.get("/templates", OcrController.listTemplates);
router.post("/templates", OcrController.createTemplate);
router.get("/templates/:id", OcrController.getTemplate);
router.patch("/templates/:id", OcrController.updateTemplate);
router.post("/templates/:id/duplicate", OcrController.duplicateTemplate);
router.post("/templates/:id/archive", OcrController.archiveTemplate);
router.post("/templates/:id/restore", OcrController.restoreTemplate);
router.post("/templates/:id/apply", OcrController.applyTemplate);

router.post("/export", OcrController.exportDocument);
router.patch("/results/:id", OcrController.updateResult);

export default router;
