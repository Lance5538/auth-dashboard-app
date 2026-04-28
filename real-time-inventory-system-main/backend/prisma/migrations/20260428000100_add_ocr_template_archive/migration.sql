ALTER TABLE "OcrTemplate" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "OcrTemplate_archivedAt_idx" ON "OcrTemplate"("archivedAt");
