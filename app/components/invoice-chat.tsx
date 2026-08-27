"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart, type ToolUIPart } from "ai";
import { useActionState, useMemo, useRef } from "react";
import { useFormStatus } from "react-dom";
import { ExamplePrompt } from "./example-prompt";
import {
  invoiceFromToolOutput,
  issuerFromToolOutput,
} from "@/lib/invoice/ai/parse";
import { examplePrompt } from "@/lib/invoice/demo";

type ToolPartState = ToolUIPart["state"];

function toolStateLabel(state: ToolPartState) {
  if (state === "output-available") return "Done";
  if (state === "output-error") return "Failed";
  return "Running";
}

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function ToolChip({
  name,
  state,
  children,
}: {
  name: string;
  state: ToolPartState;
  children?: React.ReactNode;
}) {
  const pending = state === "input-streaming" || state === "input-available";
  const failed = state === "output-error";

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-3 py-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            failed
              ? "bg-red-500"
              : pending
                ? "animate-pulse bg-amber-500"
                : "bg-emerald-500"
          }`}
        />
        <span>MCP {name}</span>
        <span className="ml-auto tracking-wide">{toolStateLabel(state)}</span>
      </div>
      {children ? (
        <div className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SendButton({ busy }: { busy: boolean }) {
  const { pending } = useFormStatus();
  const waiting = busy || pending;

  return (
    <button
      type="submit"
      disabled={waiting}
      className="h-12 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950"
    >
      {waiting ? "Sending..." : "Send"}
    </button>
  );
}

export function InvoiceChat() {
  const formRef = useRef<HTMLFormElement>(null);
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  });
  const busy = status === "submitted" || status === "streaming";

  const hasInvoice = messages.some((message) =>
    message.parts.some((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return false;
      return invoiceFromToolOutput(part.output) !== null;
    }),
  );
  const hasIssuer = messages.some((message) =>
    message.parts.some((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available") return false;
      return (
        getToolName(part) === "get_issuer" ||
        issuerFromToolOutput(part.output) !== null
      );
    }),
  );
  const waitingForCounterparty = hasIssuer && !hasInvoice && !busy;

  const [, formAction] = useActionState(
    async (_prev: null, formData: FormData) => {
      const text = String(formData.get("message") ?? "").trim();
      if (!text || busy) return null;
      await sendMessage({ text });
      formRef.current?.reset();
      return null;
    },
    null,
  );

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        {messages.length === 0 ? (
          <div className="flex flex-col gap-4">
            <p className="max-w-xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              Write your own request, or copy this example. The seller is
              already known, so the agent only needs who to bill.
            </p>
            <ExamplePrompt
              actionLabel="Send example"
              onAction={() => submit(examplePrompt)}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-2xl bg-zinc-900 px-4 py-3 text-sm leading-6 text-white dark:bg-zinc-100 dark:text-zinc-950"
                    : "mr-8 text-sm leading-6 text-zinc-800 dark:text-zinc-100"
                }
              >
                {message.parts.map((part, index) => {
                  if (part.type === "text" && part.text.trim()) {
                    return (
                      <p
                        key={`${message.id}-${index}`}
                        className="whitespace-pre-wrap"
                      >
                        {part.text}
                      </p>
                    );
                  }

                  if (!isToolUIPart(part)) return null;

                  const name = getToolName(part);
                  const output =
                    part.state === "output-available" ? part.output : null;
                  const invoice = invoiceFromToolOutput(output);
                  const issuer = issuerFromToolOutput(output);

                  return (
                    <ToolChip
                      key={`${message.id}-${index}`}
                      name={name}
                      state={part.state}
                    >
                      {part.state === "output-error" && (
                        <p className="text-red-600 dark:text-red-400">
                          {part.errorText}
                        </p>
                      )}
                      {issuer && (
                        <p>
                          Issuer: {issuer.name} ({issuer.email})
                        </p>
                      )}
                      {invoice && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium">{invoice.number}</p>
                            <p className="text-zinc-500">
                              {money(
                                invoice.totals.subtotal,
                                invoice.totals.currency,
                              )}
                            </p>
                          </div>
                          <a
                            href={invoice.downloadUrl}
                            className="inline-flex h-9 items-center justify-center rounded-full bg-zinc-900 px-4 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-950"
                          >
                            Download PDF
                          </a>
                        </div>
                      )}
                    </ToolChip>
                  );
                })}
              </article>
            ))}
            {waitingForCounterparty ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-sm font-medium">Bill to</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Only the client name is required. Type it below.
                </p>
              </div>
            ) : null}
            {busy ? (
              <div className="flex items-center gap-3">
                <p className="text-xs uppercase tracking-wide text-zinc-400">
                  {status === "submitted" ? "Sending..." : "Working..."}
                </p>
                <button
                  type="button"
                  onClick={() => stop()}
                  className="text-xs text-zinc-500 underline"
                >
                  Stop
                </button>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {error.message}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <form ref={formRef} action={formAction} className="flex gap-2">
        <input
          name="message"
          required
          className="h-12 flex-1 rounded-full border border-zinc-200 bg-white px-4 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder={
            waitingForCounterparty
              ? "Client name"
              : "Ask for an invoice..."
          }
          disabled={busy}
        />
        <SendButton busy={busy} />
      </form>
    </div>
  );
}
