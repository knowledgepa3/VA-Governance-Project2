# GIA MCP Server

Enterprise-grade Model Context Protocol server exposing GIA governance capabilities.

## Installation

```bash
cd gia-mcp-server
npm install
npm run build
```

## Configure Claude Code

Add to your Claude Code MCP settings (`~/.claude/settings.json` or project `.claude/settings.local.json`):

```json
{
  "mcpServers": {
    "gia": {
      "command": "node",
      "args": ["/opt/gia-mcp-server/dist/index.js"]
    }
  }
}
```

For local development:

```json
{
  "mcpServers": {
    "gia": {
      "command": "node",
      "args": ["C:/Users/knowl/Downloads/ACE-VA-Agents-main/ACE-VA-Agents-main/gia-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `classify_decision` | MAI Framework classification (Mandatory/Advisory/Informational) |
| `score_governance` | Integrity/Accuracy/Compliance weighted scoring |
| `evaluate_threshold` | Storey Threshold health metric (10-18% band) |
| `assess_risk_tier` | EU AI Act risk categorization |
| `map_compliance` | 4 frameworks: NIST AI RMF, EU AI Act, ISO 42001, NIST 800-53 |
| `audit_pipeline` | Hash-chained forensic ledger query |
| `approve_gate` | MANDATORY gate HITL approval mechanism |
| `monitor_agents` | 9-agent health monitoring |
| `generate_report` | Comprehensive governance status report |
| `system_status` | Full system health and uptime |
