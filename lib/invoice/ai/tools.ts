import { tool, type ModelMessage } from "ai";
import { z } from "zod";
import { createInvoice } from "../create";
import { demoIssuer } from "../demo";
import {
  counterpartySchema,
  generateInvoiceOutputSchema,
  invoiceLineInputSchema,
  issuerSchema,
  type InvoiceDraft,
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

function amount(value: string) {
  return Number(value.replace(",", "."));
}

const lineFormats = [
  {
    // "Development, qty 10, $150"
    pattern:
      /([^;:\n]+?),\s*qty\s+(\d+(?:[.,]\d+)?),\s*\$?\s*(\d+(?:[.,]\d+)?)/gi,
    read: (match: RegExpMatchArray) => ({
      description: match[1].trim(),
      quantity: amount(match[2]),
      unitPrice: amount(match[3]),
    }),
  },
  {
    // "10 licenses at $150"
    pattern:
      /(\d+(?:[.,]\d+)?)\s+([^$\n]+?)\s+(?:at|for|по|за|x|×)\s*\$?\s*(\d+(?:[.,]\d+)?)/gi,
    read: (match: RegExpMatchArray) => ({
      description: match[2].trim().replace(/[.,]$/, ""),
      quantity: amount(match[1]),
      unitPrice: amount(match[3]),
    }),
  },
  {
    // "Design $500"
    pattern: /([^,\n]+?)\s+\$(\d+(?:[.,]\d+)?)/g,
    read: (match: RegExpMatchArray) => ({
      description: match[1].replace(/^.*?:/, "").trim(),
      quantity: 1,
      unitPrice: amount(match[2]),
    }),
  },
];

export function linesFromUserText(text: string): InvoiceLineInput[] {
  for (const { pattern, read } of lineFormats) {
    const lines = [...text.matchAll(pattern)]
      .map(read)
      .filter((line) => line.description !== "");
    if (lines.length > 0) return lines;
  }
  return [];
}

export function lastUserText(messages: ModelMessage[]) {
  const texts = messageText(messages).split("\n").filter(Boolean);
  return texts.at(-1)?.trim() ?? "";
}

export const generateInvoiceToolInput = z.object({
  counterparty: counterpartySchema.optional(),
  lines: z.array(invoiceLineInputSchema).optional().default([]),
  notes: z.string().optional(),
  currency: z.string().optional(),
});

/** The model may call the tool with no arguments, so recover them from the chat. */
export function draftFromToolInput(
  input: z.infer<typeof generateInvoiceToolInput>,
  messages: ModelMessage[],
): InvoiceDraft {
  const name = input.counterparty?.name?.trim() || lastUserText(messages);
  const lines =
    input.lines.length > 0
      ? input.lines
      : linesFromUserText(messageText(messages));

  if (!name) {
    throw new Error("Counterparty name is required.");
  }
  if (lines.length === 0) {
    throw new Error("At least one invoice line is required.");
  }

  return { ...input, counterparty: { ...input.counterparty, name }, lines };
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
      inputSchema: generateInvoiceToolInput,
      outputSchema: generateInvoiceOutputSchema,
      execute: async (input, { messages }) => {
        const { result } = await createInvoice(
          draftFromToolInput(input, messages ?? []),
          origin,
        );
        return result;
      },
    }),
  };
}
