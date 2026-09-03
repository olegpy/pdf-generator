import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ModelMessage,
  type UIMessage,
} from "ai";
import { invoiceAiTools } from "@/lib/invoice/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const instructions = `You are an invoice assistant. Always reply in English.

Tools talk to the invoice MCP backend.
Call get_issuer first. Never ask for issuer details.
Ask only for the counterparty name if it is missing. Never ask for address or email.
Reuse line items from the first user message.

As soon as you have a counterparty name and lines, call generate_invoice.
After the PDF is ready, give the download URL and totals.`;

function toolNamesFromMessages(messages: ModelMessage[]) {
  const names = new Set<string>();
  for (const message of messages) {
    if (!Array.isArray(message.content)) continue;
    for (const part of message.content) {
      if (
        part &&
        typeof part === "object" &&
        "toolName" in part &&
        typeof part.toolName === "string"
      ) {
        names.add(part.toolName);
      }
    }
  }
  return names;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const origin = new URL(req.url).origin;
  const tools = invoiceAiTools(origin);

  const result = streamText({
    model: openai.chat("gpt-4o"),
    instructions,
    messages: await convertToModelMessages(messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    tools,
    stopWhen: isStepCount(8),
    abortSignal: req.signal,
    prepareStep: ({ messages: stepMessages, steps }) => {
      const called = toolNamesFromMessages(stepMessages);
      for (const step of steps) {
        for (const toolCall of step.toolCalls) {
          called.add(toolCall.toolName);
        }
      }

      const userTurns = stepMessages.filter(
        (message) => message.role === "user",
      ).length;

      if (!called.has("get_issuer")) {
        return { toolChoice: { type: "tool" as const, toolName: "get_issuer" } };
      }

      if (!called.has("generate_invoice") && userTurns >= 2) {
        return {
          toolChoice: { type: "tool" as const, toolName: "generate_invoice" },
        };
      }
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) =>
        error instanceof Error ? error.message : String(error),
    }),
  });
}
