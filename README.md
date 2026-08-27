# Invoice agent

Demo: ask for an invoice in chat, or fill the form. Both generate a PDF.

## Run

```bash
pnpm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` (chat only). Then `pnpm dev` and open http://localhost:3000.

## Try

- Chat: send the example prompt, then a client name. Download the PDF.
- Form: fill lines and Bill to, Generate PDF. No API key.

## MCP

`http://localhost:3000/api/mcp`

Tools:

- `get_issuer` — demo seller (From)
- `generate_invoice` — create the PDF

