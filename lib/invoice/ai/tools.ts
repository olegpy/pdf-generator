import { tool, type ModelMessage } from "ai";
import { z } from "zod";
import { createInvoice } from "../create";
import { demoIssuer } from "../demo";
import {
  counterpartySchema,
  generateInvoiceOutputSchema,
  invoiceLineInputSchema,
  issuerSchema,
  type InvoiceLineInput,
} from "../schema";

function messageText(messages: ModelMessage[]) {
  const chunks: string[] = [];
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (typeof message.content === "string") {
      chunks.push(message.content);
      continue;
    }
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (part && typeof part === "object" && "type" in part && part.type === "text") {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join("\n");
}

function linesFromUserText(text: string): InvoiceLineInput[] {
  const priced: InvoiceLineInput[] = [];
  const withQty =
    /(\d+(?:[.,]\d+)?)\s+([^$\n]+?)\s+(?:at|for|по|за|x|×)\s*\$?\s*(\d+(?:[.,]\d+)?)/gi;
  for (const match of text.matchAll(withQty)) {
    priced.push({
      description: match[2].trim().replace(/[.,]$/, ""),
      quantity: Number(match[1].replace(",", ".")),
      unitPrice: Number(match[3].replace(",", ".")),
    });
  }
  if (priced.length > 0) return priced;

  for (const match of text.matchAll(/([^,\n]+?)\s+\$(\d+(?:[.,]\d+)?)/g)) {
    const description = match[1].replace(/^.*?:/, "").trim();
    if (!description) continue;
    priced.push({
      description,
      quantity: 1,
      unitPrice: Number(match[2].replace(",", ".")),
    });
  }
  return priced;
}

function lastUserText(messages: ModelMessage[]) {
  const texts = messageText(messages).split("\n").filter(Boolean);
  return texts.at(-1)?.trim() ?? "";
}

export function invoiceAiTools(origin: string) {
  return {
    get_issuer: tool({
      description:
        "Return the seller already known to this server. Call this first. Do not ask the user for issuer details.",
      inputSchema: z.object({}),
      outputSchema: issuerSchema,
      execute: async () => demoIssuer,
    }),
    generate_invoice: tool({
      description:
        "Create a PDF invoice. Required: counterparty.name and line items. Do not wait for address or email.",
      inputSchema: z.object({
        counterparty: counterpartySchema,
        lines: z.array(invoiceLineInputSchema).optional().default([]),
        notes: z.string().optional(),
        currency: z.string().optional(),
      }),
      outputSchema: generateInvoiceOutputSchema,
      execute: async (input, { messages }) => {
        const history = messages ?? [];
        const name = input.counterparty.name.trim() || lastUserText(history);
        const lines =
          input.lines && input.lines.length > 0
            ? input.lines
            : linesFromUserText(messageText(history));
        if (!name) {
          throw new Error("Counterparty name is required.");
        }
        if (lines.length === 0) {
          throw new Error("At least one invoice line is required.");
        }
        const { result } = await createInvoice(
          {
            ...input,
            counterparty: { ...input.counterparty, name },
            lines,
          },
          origin,
        );
        return result;
      },
    }),
  };
}
