import { z } from 'zod';

import { HttpError } from '../../errors/http-error';

const id = z.uuid();
const caption = z.string().trim().min(1).max(500);
const commentBody = z.string().trim().min(1).max(500);

const imageUrl = z.string().trim().max(1100000)
  .refine(
    (value) => value.startsWith('data:image/') || /^https?:\/\//.test(value),
    { message: 'imageUrl must be an http(s) URL or a data image URL.' },
  );

const shareWorkoutSchema = z.object({
  caption: caption.optional(),
  imageUrl: imageUrl.optional(),
}).strict();
const createCommentSchema = z.object({
  body: commentBody,
}).strict();
const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  page: z.coerce.number().int().min(1).default(1),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request validation failed.');
  }

  return result.data;
}

export function validateShareWorkout(value: unknown): z.infer<typeof shareWorkoutSchema> {
  return parse(shareWorkoutSchema, value);
}

export function validateFeedQuery(value: unknown): z.infer<typeof feedQuerySchema> {
  return parse(feedQuerySchema, value);
}

export function validatePostId(value: unknown): string {
  return parse(id, value);
}

export function validateCreateComment(value: unknown): z.infer<typeof createCommentSchema> {
  return parse(createCommentSchema, value);
}

export function validateCommentQuery(value: unknown): z.infer<typeof feedQuerySchema> {
  return parse(feedQuerySchema, value);
}