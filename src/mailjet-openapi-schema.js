import { z } from "zod/v3";

// Only for use w/ zod v4
// z.config(z.locales.en());

const methodParams = z.object({
  name: z.string(),
  in: z.string(),
  required: z.boolean().optional(),
  schema: z.object({ type: z.string() }),
  $ref: z.string().optional(),
});
const reqBodyContent = z.record(z.string(), z.object({
  schema: z.object({}).catchall(z.any()).optional(),
  examples: z.object({}).catchall(z.any()).optional(),
}))
const requestMethod = z
  .object({
    description: z.string(),
    parameters: z.array(methodParams).optional(),
    operationId: z.string().optional(),
    requestBody: z.object({ content: reqBodyContent }).optional(),
    responses: z.object({}).catchall(z.any()),
    summary: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .catchall(z.any())
  .optional();

export const MailjetApiSchema = z.object({
  openapi: z.string(),
  info: z.object({
    title: z.string(),
    description: z.string(),
    version: z.string(),
    contact: z.object({}).optional(),
  }),
  servers: z.array(
    z.object({
      url: z.string(),
    }),
  ),
  paths: z.record(
    // Accurate types are more trouble than they're worth right now
    // z.templateLiteral([z.enum(["/v3/REST", "/v4/sms", "/v3/send", "/v3.1/send"]), z.string()]),
    z.string(),
    z.object({
      get: requestMethod,
      post: requestMethod,
      put: requestMethod,
      delete: requestMethod,
      parameters: z.array(methodParams).optional(),
    }),
  ),
  tags: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
    }),
  ),
});
