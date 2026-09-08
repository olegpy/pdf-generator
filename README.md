# Invoice agent

AI-powered invoice generator built with Next.js, OpenAI, MCP, and PDF-lib.
Ask for an invoice in chat or complete the form manually, then download the
generated PDF.

## Live demo

https://pdf-generator-one-roan.vercel.app

## Features

- Generate invoices through an AI chat.
- Create invoices manually without an API key.
- Download generated invoices as PDFs.
- Expose invoice tools through MCP.
- Validate invoice data with Zod.

## Local setup

```bash
pnpm install
cp .env.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` to enable the chat. The manual form does
not require an API key.

```bash
pnpm dev
```

Open http://localhost:3000.

## Try

- Chat: send the example prompt, then a client name. Download the PDF.
- Form: fill the invoice lines and Bill to, then select Generate PDF.

## MCP

Local endpoint: `http://localhost:3000/api/mcp`

Tools:

- `get_issuer` — demo seller (From)
- `generate_invoice` — create the PDF

## Tests

```bash
pnpm test
pnpm test:e2e:install
pnpm test:e2e
```

`pnpm test` runs Vitest on schema, form mapping, and PDF create. `pnpm test:e2e:install` downloads Chromium once. Playwright starts the app, checks the homepage, fills the example invoice, and downloads the PDF. Chromium only.

## CI/CD

GitHub Actions runs linting, unit tests, a production build, and Playwright
end-to-end tests. Successful pushes to `main` deploy to Vercel.

## Tech stack

Next.js 16 · React 19 · TypeScript · OpenAI · AI SDK · MCP · Zod · PDF-lib ·
Tailwind CSS · Vitest · Playwright · Vercel

