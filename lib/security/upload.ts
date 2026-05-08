import { logger } from "@/lib/logger";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export async function validateUploadedFile(
  file: File
): Promise<FileValidationResult> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
    };
  }

  // Check declared MIME type
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    logger.warn({ mimeType: file.type, fileName: file.name }, "[Upload] Rejected disallowed MIME type");
    return {
      ok: false,
      error: `File type "${file.type}" is not allowed.`,
    };
  }

  // Read first 4 bytes for magic number validation
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (!isMagicBytesValid(bytes, file.type)) {
    logger.warn({ fileName: file.name }, "[Upload] Magic bytes mismatch — possible spoofed extension");
    return {
      ok: false,
      error: "File content does not match declared type.",
    };
  }

  return { ok: true };
}

function isMagicBytesValid(bytes: Uint8Array, mimeType: string): boolean {
  // PDF: %PDF
  if (mimeType === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }
  // PNG
  if (mimeType === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  // For text/plain and docx we trust MIME for now
  return true;
}
