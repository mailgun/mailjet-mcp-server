import { z } from "zod/v4";

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
    z.templateLiteral([z.enum(["/v3/REST", "/v4/sms", "/v3/send", "/v3.1/send"]), z.string()]),
    z.record(
      z.enum(["get", "post", "put", "delete"]),
      z.object({}).catchall(z.any()),
    ).and(
      z.record(z.literal("parameters"), z.array(z.any())),
    )
  )
});
