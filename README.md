# Mailjet MCP Server
[![MCP](https://img.shields.io/badge/MCP-Server-blue.svg)](https://github.com/modelcontextprotocol)

## Overview

This project provides a Model Context Protocol (MCP) server for the [Mailjet API](https://www.mailjet.com), enabling compatible AI agents (e.g. Claude Desktop) to interact with Mailjet's contact, campaign, segmentation, statistics, workflow (and more) APIs through a standardized tool interface.

## Quick Start

### Manual Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/mailgun/mailjet-mcp-server.git
   cd mailjet-mcp-server
   ```

2. Install dependencies and build:
   ```bash
   pnpm install
   ```

3. Configure Claude Desktop:

   Create or modify the config file:
   - MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%/Claude/claude_desktop_config.json`


Then start the MCP server:

```sh
node src/mailjet-mcp.js
```

   Add the following configuration:
   ```json
   {
       "mcpServers": {
           "mailjet": {
               "command": "node",
               "args": ["CHANGE/THIS/PATH/TO/mailjet-mcp-server/src/mailjet-mcp.js"],
               "env": {
                   "MAILJET_API_KEY": "YOUR_api_key:YOUR_secret_key"
               }
           }
       }
   }
   ```

### Supported environment variables

The following environment variables are currently supported by the server:

```sh
MAILJET_API_KEY="your_api_key:your_secret_key" # REQUIRED, used for authenticating your account
MAILJET_API_REGION="eu" # OPTIONAL, used to change to the EU servers, if desired
```


## Testing

Run the local test suite with:

```bash
NODE_ENV=test pnpm test
```


### Sample Prompts with Claude

#### Find contacts information

```
Which of my contacts lists has the most subscribers?
```

#### Fetch and Visualize Sending Statistics

```
Would you be able to make a chart with email delivery statistics for the past week?
```

## Debugging

The MCP server communicates over stdio, please refer to [Debugging](https://modelcontextprotocol.io/docs/tools/debugging) section of the Model Context Protocol.

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.
