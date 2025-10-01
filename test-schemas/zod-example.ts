import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().int().min(0).max(120).optional(),
  posts: z.array(z.string()).optional()
});

const postSchema = z.object({
  title: z.string(),
  content: z.string().optional(),
  authorId: z.string(),
  published: z.boolean().default(false),
  createdAt: z.date().default(() => new Date())
});

export { userSchema, postSchema };
