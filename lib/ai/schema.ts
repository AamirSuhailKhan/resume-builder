import { z } from "zod";

export { z };

export const aiErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const aiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  error: z.null(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const aiEnvelopeSchema = z.union([aiSuccessSchema, aiErrorSchema]);

export function arrayOf<T extends z.ZodTypeAny>(schema: T) {
  return z.array(schema).default([]);
}

export function nullableString() {
  return z.string().nullable().optional();
}
