import assert from "node:assert";
import { describe, it } from "node:test";

import * as serverModule from "../src/mailjet-mcp.js";

// Mock OpenAPI spec for testing
const mockOpenApiSpec = {
  paths: {
    "/v3/REST/message": {
      get: {
        summary: "Get message",
        parameters: [
          { name: "message_ID", in: "query", schema: { type: "string" }, required: false },
          { name: "required_param", in: "path", schema: { type: "string" }, required: true },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  foo: { type: "string" },
                  bar: { type: "number" },
                },
                required: ["foo"],
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      TestSchema: {
        type: "object",
        properties: {
          a: { type: "string" },
        },
      },
    },
  },
};

describe("sanitizeToolId", () => {
  it("should replace non-word characters and lowercase", () => {
    assert.strictEqual(serverModule.sanitizeToolId("GET-/v3/REST/message"), "get--v3-rest-message");
    assert.strictEqual(serverModule.sanitizeToolId("Some$Weird*ID"), "some-weird-id");
  });
});

describe("appendQueryString", () => {
  it("should append query params correctly", () => {
    const path = "/foo/bar";
    const params = { a: 1, b: "test" };
    const result = serverModule.appendQueryString(path, params);
    assert(result.startsWith("/foo/bar?"));
    assert(result.includes("a=1"));
    assert(result.includes("b=test"));
  });
  it("should return path unchanged if no params", () => {
    assert.strictEqual(serverModule.appendQueryString("/foo", {}), "/foo");
  });
});

describe("processPathParameters", () => {
  const operation = {
    parameters: [
      { name: "id", in: "path", schema: { type: "string" }, required: true },
      { name: "q", in: "query", schema: { type: "string" }, required: false },
    ],
  };
  it("should substitute path params", () => {
    const params = { id: "123", q: "abc" };
    const { actualPath, remainingParams } = serverModule.processPathParameters(
      "/foo/{id}/bar",
      operation,
      params,
    );
    assert.strictEqual(actualPath, "/foo/123/bar");
    assert.deepStrictEqual(remainingParams, { q: "abc" });
  });
  it("should throw if required path param missing", () => {
    assert.throws(
      () => serverModule.processPathParameters("/foo/{id}/bar", operation, { q: "abc" }),
      /Required path parameter 'id' is missing/,
    );
  });
});

describe("separateParameters", () => {
  const operation = {
    parameters: [
      { name: "q", in: "query", schema: { type: "string" }, required: false },
      { name: "body", in: "body", schema: { type: "string" }, required: false },
    ],
  };
  it("should separate query and body params for POST", () => {
    const params = { q: "abc", body: "val", extra: 1 };
    const { queryParams, bodyParams } = serverModule.separateParameters(params, operation, "POST");
    assert.deepStrictEqual(queryParams, { q: "abc" });
    assert.deepStrictEqual(bodyParams, { body: "val", extra: 1 });
  });
  it("should move all params to query for GET", () => {
    const params = { q: "abc", body: "val", extra: 1 };
    const { queryParams, bodyParams } = serverModule.separateParameters(params, operation, "GET");
    assert.deepStrictEqual(queryParams, { q: "abc", body: "val", extra: 1 });
    assert.deepStrictEqual(bodyParams, {});
  });
});

describe("getOperationDetails", () => {
  it("should return operation details if found", () => {
    const result = serverModule.getOperationDetails(mockOpenApiSpec, "GET", "/v3/REST/message");
    assert(result);
    assert.strictEqual(result.operation.summary, "Get message");
  });
  it("should return null if not found", () => {
    const result = serverModule.getOperationDetails(mockOpenApiSpec, "POST", "/v3/REST/message");
    assert.strictEqual(result, null);
  });
});

describe("resolveReference", () => {
  it("should resolve a reference path in OpenAPI spec", () => {
    const ref = "#/components/schemas/TestSchema";
    const resolved = serverModule.resolveReference(ref, mockOpenApiSpec);
    assert.deepStrictEqual(resolved, { type: "object", properties: { a: { type: "string" } } });
  });
});

describe("processParameters", () => {
  it("should add required and optional params to schema", () => {
    const params = [
      { name: "foo", in: "query", schema: { type: "string" }, required: true },
      { name: "bar", in: "query", schema: { type: "number" }, required: false },
    ];
    const paramsSchema = {};
    serverModule.processParameters(params, paramsSchema, mockOpenApiSpec);
    assert(paramsSchema.foo);
    assert(paramsSchema.bar);
    assert(paramsSchema.foo.isOptional() === false);
    assert(paramsSchema.bar.isOptional() === true);
  });
});

describe("processRequestBody", () => {
  it("should add body properties to paramsSchema", () => {
    const requestBody = {
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              foo: { type: "string" },
              bar: { type: "number" },
            },
            required: ["foo"],
          },
        },
      },
    };
    const paramsSchema = {};
    serverModule.processRequestBody(requestBody, paramsSchema, mockOpenApiSpec);
    assert(paramsSchema.foo);
    assert(paramsSchema.bar);
    assert(paramsSchema.foo.isOptional() === false);
    assert(paramsSchema.bar.isOptional() === true);
  });
});

describe("buildParamsSchema", () => {
  it("should build a Zod schema for operation parameters", () => {
    const operation = {
      parameters: [
        { name: "foo", in: "query", schema: { type: "string" }, required: true },
        { name: "bar", in: "path", schema: { type: "number" }, required: false },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                baz: { type: "boolean" },
              },
              required: [],
            },
          },
        },
      },
    };
    const schema = serverModule.buildParamsSchema(operation, mockOpenApiSpec);
    assert(schema.foo);
    assert(schema.bar);
    assert(schema.baz);
  });
});

describe("openapiToZod", () => {
  it("should convert string schema", () => {
    const zod = serverModule.openapiToZod({ type: "string" }, mockOpenApiSpec);
    assert(zod);
    assert.strictEqual(zod.def.type, "string");
  });
  it("should convert enum schema", () => {
    const zod = serverModule.openapiToZod({ type: "string", enum: ["a", "b"] }, mockOpenApiSpec);
    assert(zod);
    assert.strictEqual(zod.def.type, "enum");
  });
  it("should convert number schema", () => {
    const zod = serverModule.openapiToZod({ type: "number" }, mockOpenApiSpec);
    assert(zod);
    assert.strictEqual(zod.def.type, "number");
  });
  it("should convert boolean schema", () => {
    const zod = serverModule.openapiToZod({ type: "boolean" }, mockOpenApiSpec);
    assert(zod);
    assert.strictEqual(zod.def.type, "boolean");
  });
  it("should convert array schema", () => {
    const zod = serverModule.openapiToZod(
      { type: "array", items: { type: "string" } },
      mockOpenApiSpec,
    );
    assert(zod);
    assert.strictEqual(zod.def.type, "array");
  });
  it("should convert object schema", () => {
    const zod = serverModule.openapiToZod(
      {
        type: "object",
        properties: { foo: { type: "string" } },
        required: ["foo"],
      },
      mockOpenApiSpec,
    );
    assert(zod);
    assert.strictEqual(zod.def.type, "object");
  });
  it("should resolve $ref", () => {
    const zod = serverModule.openapiToZod(
      { $ref: "#/components/schemas/TestSchema" },
      mockOpenApiSpec,
    );
    assert(zod);
    assert.strictEqual(zod.def.type, "object");
  });
});
