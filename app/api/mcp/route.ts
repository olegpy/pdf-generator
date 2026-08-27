import { createMcpHandler } from "mcp-handler";
import { mcpServer } from "@/lib/config";
import { demoIssuer } from "@/lib/invoice/demo";
import { createInvoice, originFromRequest } from "@/lib/invoice/create";
import {
  generateInvoiceInputSchema,
  generateInvoiceOutputSchema,
  issuerSchema,
} from "@/lib/invoice/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_issuer",
      {
        title: "Get invoice issuer",
        description:
          "Return the seller already known to this server. Call this first. Do not ask the user for issuer details.",
        outputSchema: issuerSchema,
      },
      async () => {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(demoIssuer),
            },
          ],
          structuredContent: demoIssuer,
        };
      },
    );

    server.registerTool(
      "generate_invoice",
      {
        title: "Generate invoice PDF",
        description:
          "Create a PDF invoice billed from the known issuer to a counterparty. Required: counterparty.name and at least one line. Do not wait for address or email.",
        inputSchema: generateInvoiceInputSchema,
        outputSchema: generateInvoiceOutputSchema,
      },
      async (input, ctx) => {
        const { result } = await createInvoice(
          input,
          originFromRequest(ctx.http?.req),
        );

        return {
          content: [
            {
              type: "text",
              text: `Invoice ${result.number} generated. Download: ${result.downloadUrl}`,
            },
            {
              type: "resource_link",
              uri: result.downloadUrl,
              name: result.filename,
              mimeType: "application/pdf",
            },
          ],
          structuredContent: result,
        };
      },
    );
  },
  {
    serverInfo: mcpServer,
  },
);

export { handler as GET, handler as POST };
