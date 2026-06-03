import { createWorker } from "tesseract.js";

/**
 * Extract raw JPEG and PNG images from an image-only / scanned PDF buffer using a pure JS marker search
 */
export function extractImagesFromPdf(pdfBuffer: Buffer): Buffer[] {
  const images: Buffer[] = [];
  let pos = 0;
  while (pos < pdfBuffer.length - 10) {
    // 1. Search for JPEG Start of Image (SOI) marker: FF D8 FF
    if (pdfBuffer[pos] === 0xFF && pdfBuffer[pos + 1] === 0xD8 && pdfBuffer[pos + 2] === 0xFF) {
      let endPos = pos + 3;
      // Search for JPEG End of Image (EOI) marker: FF D9
      while (endPos < pdfBuffer.length - 1) {
        if (pdfBuffer[endPos] === 0xFF && pdfBuffer[endPos + 1] === 0xD9) {
          const jpegBuffer = pdfBuffer.subarray(pos, endPos + 2);
          if (jpegBuffer.length > 5000) { // Skip tiny icons/thumbnails
            images.push(jpegBuffer);
          }
          pos = endPos + 1;
          break;
        }
        endPos++;
      }
      if (endPos >= pdfBuffer.length - 1) {
        break;
      }
    }
    // 2. Search for PNG signature: 89 50 4E 47 0D 0A 1A 0A
    else if (
      pdfBuffer[pos] === 0x89 &&
      pdfBuffer[pos + 1] === 0x50 &&
      pdfBuffer[pos + 2] === 0x4E &&
      pdfBuffer[pos + 3] === 0x47 &&
      pdfBuffer[pos + 4] === 0x0D &&
      pdfBuffer[pos + 5] === 0x0A &&
      pdfBuffer[pos + 6] === 0x1A &&
      pdfBuffer[pos + 7] === 0x0A
    ) {
      let endPos = pos + 8;
      // Search for PNG end chunk IEND: 49 45 4E 44 followed by 4 bytes of CRC
      while (endPos < pdfBuffer.length - 8) {
        if (
          pdfBuffer[endPos] === 0x49 &&
          pdfBuffer[endPos + 1] === 0x45 &&
          pdfBuffer[endPos + 2] === 0x4E &&
          pdfBuffer[endPos + 3] === 0x44
        ) {
          const pngBuffer = pdfBuffer.subarray(pos, endPos + 8);
          if (pngBuffer.length > 5000) {
            images.push(pngBuffer);
          }
          pos = endPos + 7;
          break;
        }
        endPos++;
      }
      if (endPos >= pdfBuffer.length - 8) {
        break;
      }
    }
    pos++;
  }
  return images;
}

/**
 * Perform local Tesseract.js OCR on an image buffer
 */
export async function extractTextFromImage(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text || "";
  } finally {
    await worker.terminate();
  }
}

/**
 * Perform OCR on a PDF by extracting its image streams and running Tesseract OCR page by page
 */
export async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
  const images = extractImagesFromPdf(pdfBuffer);
  console.log(`[OCR] Extracted ${images.length} image streams (JPEG/PNG) from the PDF.`);
  
  if (images.length === 0) {
    return "";
  }

  const results: string[] = [];
  // Process up to 5 pages to manage memory and performance safely
  const pagesToProcess = images.slice(0, 5);
  for (let i = 0; i < pagesToProcess.length; i++) {
    console.log(`[OCR] Processing page ${i + 1}/${pagesToProcess.length}...`);
    try {
      const page = pagesToProcess[i];
      if (page) {
        const pageText = await extractTextFromImage(page);
        if (pageText.trim()) {
          results.push(`--- Page ${i + 1} ---\n${pageText}`);
        }
      }
    } catch (err) {
      console.error(`[OCR] Error rendering page ${i + 1}:`, err);
    }
  }

  return results.join("\n\n");
}

/**
 * Unified high-fidelity OCR with Cloud Gemini fallback
 */
export async function extractTextWithFallback(pdfBuffer: Buffer): Promise<string> {
  // 1. Try Gemini Cloud OCR first for absolute maximum accuracy (if key is configured)
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== "xxx" && apiKey !== "mock" && !apiKey.startsWith("mock")) {
    try {
      console.log("[OCR] Attempting native Gemini multi-modal OCR...");
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            inlineData: {
              data: pdfBuffer.toString("base64"),
              mimeType: "application/pdf"
            }
          },
          "Extract all readable text from this PDF document. Do not summarize; return the exact transcribed text as is."
        ]
      });
      const text = response.text?.trim() || "";
      if (text.length >= 100) {
        console.log("[OCR] Gemini OCR succeeded. Text length:", text.length);
        return text;
      }
    } catch (e) {
      console.warn("[OCR] Gemini Cloud OCR failed, falling back to local Tesseract OCR:", e);
    }
  }

  // 2. Fall back to local Tesseract OCR (extracting JPEGs/PNGs page by page)
  console.log("[OCR] Executing local Tesseract OCR fallback...");
  const localText = await extractTextFromPdf(pdfBuffer);
  return localText;
}
