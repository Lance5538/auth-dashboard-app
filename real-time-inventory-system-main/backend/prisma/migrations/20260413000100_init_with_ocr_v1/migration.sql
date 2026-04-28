-- CreateEnum
CREATE TYPE "OcrDocumentKind" AS ENUM ('IMAGE', 'PDF');

-- CreateEnum
CREATE TYPE "OcrDocumentStatus" AS ENUM ('UPLOADED', 'READY', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OcrJobType" AS ENUM ('DETECT', 'EXTRACT');

-- CreateEnum
CREATE TYPE "OcrJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OcrFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'PHONE', 'CODE', 'CONTAINER_NO');

-- CreateEnum
CREATE TYPE "OcrRiskLevel" AS ENUM ('NORMAL', 'REVIEW', 'HIGH_RISK');

-- CreateEnum
CREATE TYPE "OcrValidationStatus" AS ENUM ('NOT_RUN', 'PASSED', 'FAILED');

-- CreateTable
CREATE TABLE "OcrDocument" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "kind" "OcrDocumentKind" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL DEFAULT 1,
    "status" "OcrDocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "retentionExpiresAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrDocumentPage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "sourceWidth" INTEGER,
    "sourceHeight" INTEGER,
    "qualityStatus" TEXT,
    "qualityDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrDocumentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "anchorConfig" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrTemplateField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "outputColumn" TEXT NOT NULL,
    "fieldType" "OcrFieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "validationRule" TEXT,
    "riskRule" TEXT,
    "bboxNormalized" JSONB NOT NULL,
    "regionType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrTemplateField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrExtractionJob" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentPageId" TEXT NOT NULL,
    "templateId" TEXT,
    "jobType" "OcrJobType" NOT NULL,
    "status" "OcrJobStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT,
    "resultSummary" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrExtractionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrExtractionResult" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "documentPageId" TEXT NOT NULL,
    "templateFieldId" TEXT,
    "fieldName" TEXT NOT NULL,
    "outputColumn" TEXT NOT NULL,
    "fieldType" "OcrFieldType" NOT NULL DEFAULT 'TEXT',
    "ocrRawText" TEXT,
    "finalText" TEXT,
    "confidence" DOUBLE PRECISION,
    "riskLevel" "OcrRiskLevel" NOT NULL DEFAULT 'REVIEW',
    "validationStatus" "OcrValidationStatus" NOT NULL DEFAULT 'NOT_RUN',
    "validationMessage" TEXT,
    "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "confirmedByUser" BOOLEAN NOT NULL DEFAULT false,
    "sourceBbox" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrExtractionResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OcrDocument_uploadedById_idx" ON "OcrDocument"("uploadedById");

-- CreateIndex
CREATE INDEX "OcrDocument_createdAt_idx" ON "OcrDocument"("createdAt");

-- CreateIndex
CREATE INDEX "OcrDocumentPage_documentId_idx" ON "OcrDocumentPage"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "OcrDocumentPage_documentId_pageNumber_key" ON "OcrDocumentPage"("documentId", "pageNumber");

-- CreateIndex
CREATE INDEX "OcrTemplate_createdById_idx" ON "OcrTemplate"("createdById");

-- CreateIndex
CREATE INDEX "OcrTemplate_createdAt_idx" ON "OcrTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "OcrTemplateField_templateId_sortOrder_idx" ON "OcrTemplateField"("templateId", "sortOrder");

-- CreateIndex
CREATE INDEX "OcrExtractionJob_documentId_idx" ON "OcrExtractionJob"("documentId");

-- CreateIndex
CREATE INDEX "OcrExtractionJob_documentPageId_idx" ON "OcrExtractionJob"("documentPageId");

-- CreateIndex
CREATE INDEX "OcrExtractionJob_requestedById_idx" ON "OcrExtractionJob"("requestedById");

-- CreateIndex
CREATE INDEX "OcrExtractionJob_status_idx" ON "OcrExtractionJob"("status");

-- CreateIndex
CREATE INDEX "OcrExtractionResult_jobId_idx" ON "OcrExtractionResult"("jobId");

-- CreateIndex
CREATE INDEX "OcrExtractionResult_documentPageId_idx" ON "OcrExtractionResult"("documentPageId");

-- CreateIndex
CREATE INDEX "OcrExtractionResult_templateFieldId_idx" ON "OcrExtractionResult"("templateFieldId");

-- AddForeignKey
ALTER TABLE "OcrDocument" ADD CONSTRAINT "OcrDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrDocumentPage" ADD CONSTRAINT "OcrDocumentPage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OcrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrTemplate" ADD CONSTRAINT "OcrTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrTemplateField" ADD CONSTRAINT "OcrTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OcrTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionJob" ADD CONSTRAINT "OcrExtractionJob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "OcrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionJob" ADD CONSTRAINT "OcrExtractionJob_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "OcrDocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionJob" ADD CONSTRAINT "OcrExtractionJob_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OcrTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionJob" ADD CONSTRAINT "OcrExtractionJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionResult" ADD CONSTRAINT "OcrExtractionResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "OcrExtractionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionResult" ADD CONSTRAINT "OcrExtractionResult_documentPageId_fkey" FOREIGN KEY ("documentPageId") REFERENCES "OcrDocumentPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OcrExtractionResult" ADD CONSTRAINT "OcrExtractionResult_templateFieldId_fkey" FOREIGN KEY ("templateFieldId") REFERENCES "OcrTemplateField"("id") ON DELETE SET NULL ON UPDATE CASCADE;
