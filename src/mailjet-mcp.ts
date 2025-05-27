import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import yaml from "js-yaml";
import https from "node:https";
import { resolve } from "node:path";
import process from "node:process";
import { z } from "zod";

const __dirname = import.meta.dirname

export const server = new McpServer({
  name: "mailjet",
  version: "1.0.0",
});

// Setup environment variables for Mailjet API access
const API_KEY = process.env.MAILJET_API_KEY;
const API_HOSTNAME = "api.mailjet.com";
const OPENAPI_SPEC = resolve(__dirname, '..', 'mailjet-openapi.yaml');

// Supported Mailjet API endpoints
const endpoints = [
  "GET /v3/REST/message",
  "GET /v3/REST/message/{message_ID}",
  "GET /v3/REST/messagehistory/{message_ID}",
  "GET /v3/REST/messageinformation",
  "GET /v3/REST/messageinformation/{message_ID}",
  "GET /v3/REST/contact",
  "GET /v3/REST/contact/{contact_ID}",
  "GET /v3/REST/contact/{contact_ID}/getcontactslists",
  "GET /v3/REST/contact/managemanycontacts/{Job_ID}",
  "GET /v3/REST/contactmetadata",
  "GET /v3/REST/contactdata",
  "GET /v3/REST/contactdata/{contact_ID}",
  "GET /v3/REST/contactslist",
  "GET /v3/REST/contactslist/{list_ID}",
  "GET /v3/REST/contactslist/{list_ID}/importlist/{job_ID}",
  "GET /v3/REST/contactslist/{list_ID}/managemanycontacts/{job_ID}",
  "GET /v3/REST/csvimport/{importjob_ID}",
  "GET /v3/REST/contactslistsignup",
  "GET /v3/REST/contactslistsignup/{signuprequest_ID}",
  "GET /v3/REST/listrecipient",
  "GET /v3/REST/listrecipient/{listrecipient_ID}",
  "GET /v3/REST/campaign",
  "GET /v3/REST/campaign/{campaign_ID}",
  "GET /v3/REST/campaigndraft",
  "GET /v3/REST/campaigndraft/{draft_ID}",
  "GET /v3/REST/campaigndraft/{draft_ID}/detailcontent",
  "GET /v3/REST/campaigndraft/{draft_ID}/schedule",
  "GET /v3/REST/campaigndraft/{draft_ID}status",
  "GET /v3/REST/campaignoverview",
  "GET /v3/REST/campaignoverview/{ID}",
  "GET /v3/REST/campaignoverview/{IDType}",
  "GET /v3/REST/contactfilter",
  "GET /v3/REST/contactfilter",
  "GET /v3/REST/contactfilter/{contactfilter_ID}",
  "GET /v3/REST/template",
  "GET /v3/REST/template/{template_ID}",
  "GET /v3/REST/template/{template_ID}/detailcontent",
  "GET /v3/REST/statcounters",
  "GET /v3/REST/contactstatistics",
  "GET /v3/REST/contactstatistics/{contact_ID}",
  "GET /v3/REST/listrecipientstatistics",
  "GET /v3/REST/listrecipientstatistics/{listrecipient_ID}",
  "GET /v3/REST/geostatistics",
  "GET /v3/REST/statistics/link-click",
  "GET /v3/REST/toplinkclicked",
  "GET /v3/REST/statistics/recipient-esp",
  "GET /v3/REST/useragentstatistics",
  "GET /v3/REST/bouncestatistics",
  "GET /v3/REST/bouncestatistics/{message_ID}",
  "GET /v3/REST/clickstatistics",
  "GET /v3/REST/openinformation",
  "GET /v3/REST/openinformation/{message_ID}",
  "GET /v3/REST/eventcallbackurl",
  "GET /v3/REST/eventcallbackurl/{url_ID}",
  "GET /v3/REST/parseroute",
]
