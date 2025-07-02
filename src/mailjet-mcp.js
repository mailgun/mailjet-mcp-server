import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import yaml from "js-yaml";
import https from "node:https";
import { createReadStream } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import { z } from "zod/v3";
import { MailjetApiSchema } from "./mailjet-openapi-schema.js";
import packageInfo from "../package.json" with { type: "json" };

const __dirname = import.meta.dirname;

export const server = new McpServer({
  name: "mailjet",
  version: packageInfo.version,
});

// Mailjet API authentication credentials in the documented BASIC Auth form "api_key:secret_key"
const API_KEY = process.env.MAILJET_API_KEY;
// Alternate non-US region of the API server
const API_REGION = process.env.MAILJET_API_REGION?.toLowerCase();
// API server hostname based on region
const API_HOSTNAME = `api.${API_REGION ? `${API_REGION}.` : ''}mailjet.com`;
// Path to openapi spec file
const OPENAPI_SPEC = resolve(__dirname, "openapi-mailjet.yaml");

/**
 * Extracts all endpoints from the OpenAPI specification and organizes them by HTTP method.
 *
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Parsed OpenAPI specification
 */
function extractEndpoints(openApiSpec) {
  try {
    // Initialize the endpoints dictionary
    const endpoints = {
      /** @type {string[]} DELETE - List of DELETE endpoints supported by the API */
      DELETE: [],
      /** @type {string[]} GET - List of GET endpoints supported by the API */
      GET: [],
      /** @type {string[]} PUT - List of PUT endpoints supported by the API */
      PUT: [],
      /** @type {string[]} POST - List of POST endpoints supported by the API */
      POST: [],
    };

    const paths = openApiSpec.paths;

    Object.keys(paths).forEach((path) => {
      const pathItem = paths[path];

      // Check for each HTTP method
      if (pathItem.get) {
        endpoints.GET.push(path);
      }
      if (pathItem.post) {
        endpoints.POST.push(path);
      }
      if (pathItem.put) {
        endpoints.PUT.push(path);
      }
      if (pathItem.delete) {
        endpoints.DELETE.push(path);
      }
    });

    return endpoints;
  } catch (error) {
    console.error("Error extracting endpoints:", error);
    throw error;
  }
}

/**
 * Loads and parses the OpenAPI specification from a YAML file
 * @param {string} filePath - Path to the OpenAPI YAML file
 * @returns {Promise<unknown>} - Parsed OpenAPI specification
 */
export async function loadOpenApiSpec(filePath) {
  try {
    const streamedFile = createReadStream(filePath, { encoding: "utf-8" });

    /** @type {string} file contents read into a string */
    const contents = await new Promise((resolve, reject) => {
      let data = "";
      streamedFile.on("data", (chunk) => {
        data += chunk;
      });
      streamedFile.on("end", () => {
        resolve(data);
      });
      streamedFile.on("error", (err) => {
        reject(err);
      });
    });

    return yaml.load(contents);
  } catch (/** @type {any} */ error) {
    console.error(`Error loading OpenAPI spec: ${error.message}`);
    // Don't exit in test mode
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
    throw error; // Throw so tests can catch it
  }
}

/**
 * Retrieves operation details from the OpenAPI spec for a given method and path
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Parsed OpenAPI specification
 * @param {keyof ReturnType<typeof extractEndpoints>} method - HTTP method (GET, POST, etc.)
 * @param { ReturnType<typeof extractEndpoints>[keyof ReturnType<typeof extractEndpoints>][number] } path - API endpoint path
 * @returns Operation details or null if not found
 */
export function getOperationDetails(openApiSpec, method, path) {
  const lowerMethod = method.toLowerCase();

  // @ts-ignore lowercased string loses type info
  if (!openApiSpec.paths?.[path]?.[lowerMethod]) {
    return null;
  }

  return {
    /** @type {NonNullable<z.infer<typeof MailjetApiSchema>["paths"][string]["delete" | "get" | "post" | "put"]>} */
    // @ts-ignore We know this exists because of the if condition above
    operation: openApiSpec.paths[path][lowerMethod],
    operationId: openApiSpec.paths[path]["get"]?.operationId ?? `${method}-${sanitizeToolId(path).replace(/-+/g, "-")}`,
  };
}

/**
 * Converts OpenAPI schema definitions to Zod validation schemas
 * @param {any} schema - OpenAPI schema object
 * @param {z.infer<typeof MailjetApiSchema>} fullSpec - Complete OpenAPI specification
 * @returns {z.ZodType} - Corresponding Zod schema
 */
export function openapiToZod(schema, fullSpec) {
  if (!schema) {
    return z.any();
  }

  // Handle schema references (e.g. #/components/schemas/...)
  if (schema.$ref) {
    // For #/components/schemas/ type references
    if (schema.$ref.startsWith("#/")) {
      const refPath = schema.$ref.substring(2).split("/");
      /** @type any */
      let referenced = fullSpec;
      for (const segment of refPath) {
        if (!referenced || !referenced[segment]) {
          console.error(`Failed to resolve reference: ${schema.$ref}, segment: ${segment}`);
          return z.any().describe(`Failed reference: ${schema.$ref}`);
        }
        referenced = referenced[segment];
      }

      return openapiToZod(referenced, fullSpec);
    }

    // Handle other reference formats if needed
    console.error(`Unsupported reference format: ${schema.$ref}`);
    return z.any().describe(`Unsupported reference: ${schema.$ref}`);
  }

  // Convert different schema types to Zod equivalents
  switch (schema.type) {
    case "string":
      let zodString = z.string();
      if (schema.enum) {
        return z.enum(schema.enum);
      }
      if (schema.format === "email") {
        zodString = zodString.email();
      }
      if (schema.format === "uri") {
        zodString = zodString.describe(`URI: ${schema.description || ""}`);
      }
      return zodString.describe(schema.description || "");

    case "number":
    case "integer":
      let zodNumber = z.number();
      if (schema.minimum !== undefined) {
        zodNumber = zodNumber.min(schema.minimum);
      }
      if (schema.maximum !== undefined) {
        zodNumber = zodNumber.max(schema.maximum);
      }
      return zodNumber.describe(schema.description || "");

    case "boolean":
      return z.boolean().describe(schema.description || "");

    case "array":
      return z.array(openapiToZod(schema.items, fullSpec)).describe(schema.description || "");

    case "object":
      if (!schema.properties) {
        return z.record(z.any(), z.any());
      }

      /** @type Record<string, z.ZodType> */
      const shape = {};
      for (const [key, prop] of Object.entries(schema.properties)) {
        shape[key] = schema.required?.includes(key)
          ? openapiToZod(prop, fullSpec)
          : openapiToZod(prop, fullSpec).optional();
      }
      return z.object(shape).describe(schema.description || "");

    default:
      // For schemas without a type but with properties
      if (schema.properties) {
        /** @type Record<string, z.ZodType> */
        const shape = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          shape[key] = schema.required?.includes(key)
            ? openapiToZod(prop, fullSpec)
            : openapiToZod(prop, fullSpec).optional();
        }
        return z.object(shape).describe(schema.description || "");
      }

      // For YAML that defines "oneOf", "anyOf", etc.
      if (schema.oneOf) {
        const unionTypes = schema.oneOf.map((/** @type unknown */ s) => openapiToZod(s, fullSpec));
        return z.union(unionTypes).describe(schema.description || "");
      }

      if (schema.anyOf) {
        const unionTypes = schema.anyOf.map((/** @type unknown */ s) => openapiToZod(s, fullSpec));
        return z.union(unionTypes).describe(schema.description || "");
      }

      return z.any().describe(schema.description || "");
  }
}

/**
 * Processes OpenAPI parameters into Zod schemas
 * @param {NonNullable<z.infer<typeof MailjetApiSchema>["paths"][string]["parameters"]>} parameters - OpenAPI parameter objects
 * @param {Record<string, z.ZodType>} paramsSchema - Target schema object to populate
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Complete OpenAPI specification
 */
export function processParameters(parameters, paramsSchema, openApiSpec) {
  for (const param of parameters) {
    const zodParam = openapiToZod(param.schema, openApiSpec);
    paramsSchema[param.name] = param.required ? zodParam : zodParam.optional();
  }
}

/**
 * Resolves a schema reference within an OpenAPI spec
 * @param {string} ref - Reference string (e.g. #/components/schemas/ModelName)
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Complete OpenAPI specification
 * @returns Resolved schema
 */
export function resolveReference(ref, openApiSpec) {
  const refPath = ref.replace("#/", "").split("/");
  // top-level reference key is missing in mailjet schema
  return refPath.reduce((obj, path) => obj[path], openApiSpec);
}

/**
 * Processes request body schema into Zod schemas
 * @param {NonNullable<z.infer<typeof MailjetApiSchema>["paths"][string]["delete" | "get" | "post" | "put"]>['requestBody']} requestBody - OpenAPI request body object
 * @param {Record<string, z.ZodType>} paramsSchema - Target schema object to populate
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Complete OpenAPI specification
 */
export function processRequestBody(requestBody, paramsSchema, openApiSpec) {
  if (!requestBody?.content) {
    return;
  }

  // All requests are currently JSON
  const contentType = "application/json";

  let bodySchema = requestBody.content[contentType].schema;

  // Handle schema references.
  if (bodySchema?.$ref) {
    bodySchema = resolveReference(bodySchema.$ref, openApiSpec);
  }

  // Process schema properties
  if (bodySchema?.properties) {
    for (const [prop, schema] of Object.entries(bodySchema.properties)) {
      let propSchema = schema;

      // Handle nested references
      if (propSchema.$ref) {
        propSchema = resolveReference(propSchema.$ref, openApiSpec);
      }

      const zodProp = openapiToZod(propSchema, openApiSpec);
      paramsSchema[prop] = bodySchema?.required?.includes(prop) ? zodProp : zodProp.optional();
    }
  }
}

/**
 * Builds a Zod parameter schema from an OpenAPI operation
 * @param {NonNullable<ReturnType<typeof getOperationDetails>>['operation']} operation - OpenAPI operation object
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Complete OpenAPI specification
 * @returns Zod parameter schema
 */
export function buildParamsSchema(operation, openApiSpec) {
  /** @type {Record<string, z.ZodType>} */
  const paramsSchema = {};

  // Process path parameters
  const pathParams = operation?.parameters?.filter((p) => p.in === "path") || [];
  processParameters(pathParams, paramsSchema, openApiSpec);

  // Process query parameters
  const queryParams = operation?.parameters?.filter((p) => p.in === "query") || [];
  processParameters(queryParams, paramsSchema, openApiSpec);

  // Process request body if it exists
  if (operation?.requestBody) {
    processRequestBody(operation.requestBody, paramsSchema, openApiSpec);
  }

  return paramsSchema;
}

/**
 * Sanitizes an operation ID to be used as a tool ID
 * @param {string} operationId - The operation ID to sanitize
 * @returns Sanitized tool ID
 */
export function sanitizeToolId(operationId) {
  return operationId.replace(/[^\w-]/g, "-").toLowerCase();
}

/**
 * Processes path parameters from the request parameters
 * @param {string} path - API endpoint path with placeholders
 * @param {NonNullable<ReturnType<typeof getOperationDetails>>['operation']} operation - OpenAPI operation object
 * @param {Record<string, string | number>} params - Request parameters
 * @returns Processed path and remaining parameters
 */
export function processPathParameters(path, operation, params) {
  let actualPath = path;
  const pathParams = operation.parameters?.filter((p) => p.in === "path") || [];
  const remainingParams = { ...params };

  for (const param of pathParams) {
    if (params[param.name]) {
      actualPath = actualPath.replace(`{${param.name}}`, encodeURIComponent(params[param.name]));
      delete remainingParams[param.name];
    } else {
      throw new Error(`Required path parameter '${param.name}' is missing`);
    }
  }

  return { actualPath, remainingParams };
}

/**
 * Separates parameters into query parameters and body parameters
 * @param {Record<string, string | number>} params - Request parameters
 * @param {NonNullable<ReturnType<typeof getOperationDetails>>['operation']} operation - OpenAPI operation object
 * @param {keyof ReturnType<typeof extractEndpoints>} method - HTTP method (GET, POST, etc.)
 * @returns Separated query and body parameters
 */
export function separateParameters(params, operation, method) {
  /** @type Record<string, string | number> */
  const queryParams = {};
  /** @type Record<string, string | number> */
  const bodyParams = {};

  // Get query parameters from operation definition
  const definedQueryParams =
    operation.parameters?.filter((p) => p.in === "query").map((p) => p.name) || [];

  // Sort parameters into body or query
  for (const [key, value] of Object.entries(params)) {
    if (definedQueryParams.includes(key)) {
      queryParams[key] = value;
    } else {
      bodyParams[key] = value;
    }
  }

  // For GET requests, move all params to query
  if (method.toUpperCase() === "GET") {
    Object.assign(queryParams, bodyParams);
    Object.keys(bodyParams).forEach((key) => delete bodyParams[key]);
  }

  return { queryParams, bodyParams };
}

/**
 * Appends query string parameters to a path
 * @param {string} path - API endpoint path
 * @param {Record<string, string | number>} queryParams - Query parameters
 * @returns Path with query string
 */
export function appendQueryString(path, queryParams) {
  if (Object.keys(queryParams).length === 0) {
    return path;
  }

  const queryString = new URLSearchParams();

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      queryString.append(key, value.toString());
    }
  }

  return `${path}?${queryString.toString()}`;
}

/**
 * Makes an authenticated request to the Mailjet API
 * @param {keyof ReturnType<typeof extractEndpoints>} method - HTTP method (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {Record<string, string | number> | null} data - Request payload data (for POST/PUT requests)
 * @returns {Promise<JSON>} - Response data as JSON
 */
export async function makeMailjetRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    // Normalize path format (handle paths with or without leading slash)
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;

    if (!API_KEY) {
      throw new Error(`Required MAILJET_API_KEY environment variable is missing`);
    }

    // Create basic auth credentials from API key
    const auth = Buffer.from(`${API_KEY}`).toString("base64");
    const options = {
      hostname: API_HOSTNAME,
      path: `/${cleanPath}`,
      method: method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": `Mailjet/MCP-SERVER-STDIO/${packageInfo.version}`
      },
    };

    // Create and send the HTTP request
    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject(new Error(`Mailjet API error: ${parsedData.message || responseData}`));
          }
        } catch (/** @type any */ e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    // For non-GET requests, serialize and send the form data
    if (data && method !== "GET") {
      // Convert object to URL encoded form data
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            formData.append(key, item);
          }
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      }

      req.write(formData.toString());
    }

    req.end();
  });
}

/**
 * Registers a tool with the MCP server
 * @param {string} toolId - Unique tool identifier
 * @param {string} toolDescription - Human-readable description
 * @param {Record<string, z.ZodType>} paramsSchema - Zod schema for parameters
 * @param {keyof ReturnType<typeof extractEndpoints>} method - Supported methods (GET, POST, etc.)
 * @param {string} path - API endpoint path
 * @param {NonNullable<ReturnType<typeof getOperationDetails>>['operation']} operation - OpenAPI operation object
 */
export function registerTool(toolId, toolDescription, paramsSchema, method, path, operation) {
  server.tool(toolId, toolDescription, paramsSchema, async (params) => {
    try {
      const { actualPath, remainingParams } = processPathParameters(path, operation, params);
      const { queryParams, bodyParams } = separateParameters(remainingParams, operation, method);
      const finalPath = appendQueryString(actualPath, queryParams);

      // Make the API request
      const result = await makeMailjetRequest(
        method,
        finalPath,
        method === "GET" ? null : bodyParams,
      );

      return {
        content: [
          {
            type: "text",
            text: `✅ ${method} ${finalPath} completed successfully:\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    } catch (/** @type any */ error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || String(error)}`,
          },
        ],
      };
    }
  });
}

/**
 * Generates MCP tools from the OpenAPI specification
 * @param {z.infer<typeof MailjetApiSchema>} openApiSpec - Parsed OpenAPI specification
 */
export function generateToolsFromOpenApi(openApiSpec) {
  const endpoints = extractEndpoints(openApiSpec);

  for (const path of endpoints.GET) {
    const method = "GET";
    try {
      const operationDetails = getOperationDetails(openApiSpec, method, path);

      if (!operationDetails) {
        console.warn(`Could not match endpoint: ${method} ${path} in OpenAPI spec`);
        continue;
      }

      const { operation, operationId } = operationDetails;
      const paramsSchema = buildParamsSchema(operation, openApiSpec);
      const toolId = sanitizeToolId(operationId);
      const toolDescription = operation?.summary || `${method.toUpperCase()} ${path}`;

      registerTool(toolId, toolDescription, paramsSchema, method, path, operation);
    } catch (/** @type {any} */ error) {
      console.error(`Failed to process endpoint ${method} ${path}: ${error.message}`);
    }
  }

  return;
}

/**
 * Main function to initialize and start the MCP server
 */
export async function main() {
  try {
    // Load and parse OpenAPI spec
    const openApiSpec = await loadOpenApiSpec(OPENAPI_SPEC);

    try {
      const parsedOpenApiSpec = MailjetApiSchema.parse(openApiSpec);

      // Generate tools from the spec
      generateToolsFromOpenApi(parsedOpenApiSpec);
    } catch (/** @type { any } */ error) {
      throw Error(error);
    }

    // Connect to the transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // This is an STDIO server and log msgs are sent to stdio by default
    // So send to console.error to avoid errors on server startup
    console.error(`Mailjet MCP Server ${packageInfo.version} running on stdio`);
  } catch (error) {
    console.error("Fatal error in main():", error);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  }
}

// Only auto-execute when not in test environment
if (process.env.NODE_ENV !== "test") {
  main();
}
