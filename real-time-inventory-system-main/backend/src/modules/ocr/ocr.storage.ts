import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const ocrStorageRoot = path.join(process.cwd(), "storage", "ocr");
const documentDirectory = path.join(ocrStorageRoot, "documents");

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

export async function ensureOcrStorage() {
  await mkdir(documentDirectory, { recursive: true });
}

export async function persistUploadedDocument(fileName: string, buffer: Buffer) {
  await ensureOcrStorage();
  const extension = path.extname(fileName) || "";
  const baseName = path.basename(fileName, extension);
  const safeName = sanitizeFileName(baseName || "document");
  const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${safeName}${extension}`;
  const storagePath = path.join(documentDirectory, uniqueName);
  await writeFile(storagePath, buffer);
  return storagePath;
}

export async function readStoredDocument(storagePath: string) {
  return readFile(storagePath);
}

export async function deleteStoredDocument(storagePath: string) {
  await rm(storagePath, { force: true });
}
