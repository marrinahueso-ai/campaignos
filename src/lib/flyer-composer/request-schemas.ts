import { z } from "zod";

/** Shared flyer-composer POST body fields used by save / approval routes. */
export const flyerImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      value.startsWith("https://") ||
      value.startsWith("http://") ||
      value.startsWith("data:image/"),
    { message: "Flyer image must be a hosted URL or image data URL." },
  );

export const flyerSaveBodySchema = z.object({
  eventId: z.string().trim().uuid(),
  imageUrl: flyerImageUrlSchema,
  headline: z.string().trim().max(500).optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  versionId: z.string().trim().max(120).optional().nullable(),
});

export const flyerSendForApprovalBodySchema = z
  .object({
    eventId: z.string().trim().uuid().optional().nullable(),
    flyerId: z.string().trim().uuid().optional().nullable(),
    submissionKey: z.string().trim().max(200).optional().nullable(),
    imageUrl: flyerImageUrlSchema,
    versionId: z.string().trim().max(120).optional().nullable(),
    headline: z.string().trim().max(500).optional().nullable(),
    orgName: z.string().trim().max(200).optional().nullable(),
    templateName: z.string().trim().max(200).optional().nullable(),
    captionText: z.string().trim().max(5000).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    const hasFlyerId = Boolean(value.flyerId?.trim());
    const hasSubmissionKey = Boolean(value.submissionKey?.trim());
    if (!hasFlyerId && !hasSubmissionKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "submissionKey or flyerId is required.",
        path: ["submissionKey"],
      });
    }
  });

export function parseJsonBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      error: first?.message || "Invalid request body.",
    };
  }
  return { ok: true, data: parsed.data };
}
