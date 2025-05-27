import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import yaml from "js-yaml";
import https from "node:https";
import { resolve } from "node:path";
import process from "node:process";
import { z } from "zod";

const __dirname = import.meta.dirname;

export const server = new McpServer({
  name: "mailjet",
  version: "1.0.0",
});

// Setup environment variables for Mailjet API access
const API_KEY = process.env.MAILJET_API_KEY;
const API_HOSTNAME = "api.mailjet.com";
const OPENAPI_SPEC = resolve(__dirname, "..", "mailjet-openapi.yaml");

/** Supported Mailjet API endpoints */
const endpoints = {
  /** @type {readonly string[]} DELETE - List of DELETE endpoints supported by the API */
  DELETE: [],
  /** @type {readonly string[]} GET - List of GET endpoints supported by the API */
  GET: [
    /// EMAIL APIS
    // MESSAGE API
    "/v3/REST/message",
    "/v3/REST/message/{message_ID}",
    "/v3/REST/messagehistory/{message_ID}",
    "/v3/REST/messageinformation",
    "/v3/REST/messageinformation/{message_ID}",
    // CONTACTS API
    "/v3/REST/contact",
    "/v3/REST/contact/{contact_ID}",
    "/v3/REST/contact/{contact_ID}/getcontactslists",
    "/v3/REST/contact/managemanycontacts/{Job_ID}",
    "/v3/REST/contactmetadata",
    "/v3/REST/contactdata",
    "/v3/REST/contactdata/{contact_ID}",
    "/v3/REST/contactslist",
    "/v3/REST/contactslist/{list_ID}",
    "/v3/REST/contactslist/{list_ID}/importlist/{job_ID}",
    "/v3/REST/contactslist/{list_ID}/managemanycontacts/{job_ID}",
    "/v3/REST/csvimport/{importjob_ID}",
    "/v3/REST/contactslistsignup",
    "/v3/REST/contactslistsignup/{signuprequest_ID}",
    "/v3/REST/listrecipient",
    "/v3/REST/listrecipient/{listrecipient_ID}",
    // CAMPAIGNS API
    "/v3/REST/campaign",
    "/v3/REST/campaign/{campaign_ID}",
    "/v3/REST/campaigndraft",
    "/v3/REST/campaigndraft/{draft_ID}",
    "/v3/REST/campaigndraft/{draft_ID}/detailcontent",
    "/v3/REST/campaigndraft/{draft_ID}/schedule",
    "/v3/REST/campaigndraft/{draft_ID}status",
    "/v3/REST/campaignoverview",
    "/v3/REST/campaignoverview/{ID}",
    "/v3/REST/campaignoverview/{IDType}",
    // SEGMENTATION API
    "/v3/REST/contactfilter",
    "/v3/REST/contactfilter",
    "/v3/REST/contactfilter/{contactfilter_ID}",
    // TEMPLATES API
    "/v3/REST/template",
    "/v3/REST/template/{template_ID}",
    "/v3/REST/template/{template_ID}/detailcontent",
    // STATISTICS API
    "/v3/REST/statcounters",
    "/v3/REST/contactstatistics",
    "/v3/REST/contactstatistics/{contact_ID}",
    "/v3/REST/listrecipientstatistics",
    "/v3/REST/listrecipientstatistics/{listrecipient_ID}",
    "/v3/REST/geostatistics",
    "/v3/REST/statistics/link-click",
    "/v3/REST/toplinkclicked",
    "/v3/REST/statistics/recipient-esp",
    "/v3/REST/useragentstatistics",
    // Message Events API
    "/v3/REST/bouncestatistics",
    "/v3/REST/bouncestatistics/{message_ID}",
    "/v3/REST/clickstatistics",
    "/v3/REST/openinformation",
    "/v3/REST/openinformation/{message_ID}",
    // Webhooks API
    "/v3/REST/eventcallbackurl",
    "/v3/REST/eventcallbackurl/{url_ID}",
    // Parse API
    "/v3/REST/parseroute",
    "/v3/REST/parseroute/{parseroute_ID}",
    // SENDER ADDRESS API
    "/v3/REST/sender",
    "/v3/REST/sender/{sender_ID}",
    "/v3/REST/metasender",
    "/v3/REST/metasender/{metasender_ID}",
    // DOMAINS API
    "/v3/REST/dns",
    "/v3/REST/dns/{dns_ID}",
    // ACCOUNT SETTINGS API
    "/v3/REST/apikey",
    "/v3/REST/apikey/{apikey_ID}",
    "/v3/REST/myprofile",
    "/v3/REST/user",
    // LEGACY NEWSLETTER API
    "/v3/REST/newsletter",
    "/v3/REST/newsletter/{newsletter_ID}",
    "/v3/REST/newsletter/{newsletter_ID}/detailcontent",
    "/v3/REST/newsletter/{newsletter_ID}/schedule",
    "/v3/REST/newsletter/{newsletter_ID}/status",
    // LEGACY STATISTICS API
    "/v3/REST/messagestatistics",
    "/v3/REST/messagesentstatistics",
    "/v3/REST/messagesentstatistics/{message_ID}",
    "/v3/REST/campaigngraphstatistics",
    "/v3/REST/campaignstatistics",
    "/v3/REST/apikeytotals",
    "/v3/REST/domainstatistics",
    "/v3/REST/graphstatistics",
    "/v3/REST/liststatistics",
    "/v3/REST/liststatistics/{List_ID}",
    "/v3/REST/openstatistics",
    "/v3/REST/senderstatistics",
    "/v3/REST/senderstatistics/{sender_ID}",
    /// SMS APIS
    "/v4/sms",
    "/v4/sms/{sms_ID}",
    "/v4/sms/count",
    "/v4/sms/export/{Job_ID}",
  ],
  /** @type {readonly string[]} PUT - List of PUT endpoints supported by the API */
  PUT: [],
  /** @type {readonly string[]} POST - List of POST endpoints supported by the API */
  POST: [
    "/v3/send",
    "/v3.1/send",
  ],
};
