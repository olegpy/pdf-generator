import { InvoiceChat } from "./components/invoice-chat";
import { InvoiceForm } from "./components/invoice-form";

const highlights = [
  {
    title: "Tool calling",
    body: "The model fetches the seller, then generates the PDF. It only asks for the client name.",
  },
  {
    title: "MCP",
    body: "Same tools at /api/mcp for Claude or ChatGPT: get_issuer, generate_invoice.",
  },
  {
    title: "One invoice model",
    body: "Chat, MCP, and the form all go through the same Zod schema and PDF renderer.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
              AI demo
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Invoice agent
            </h1>
          </div>
          <p className="font-mono text-xs text-zinc-500">
            MCP · AI SDK · Zod · pdf-lib
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 py-8 sm:px-8">
        <section className="flex flex-col gap-6">
          <p className="max-w-2xl text-lg leading-7 text-zinc-700 dark:text-zinc-300">
            Ask for an invoice in plain language. An agent with tools looks up
            the seller, collects the client name, and returns a PDF. The form
            below is the same invoice without the model.
          </p>
          <ul className="grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Ask the agent</h2>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
            <InvoiceChat />
          </div>
        </section>

        <section className="flex flex-col gap-4 border-t border-zinc-200 pt-12 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-semibold">Or fill the invoice</h2>
            <p className="mt-1 text-sm text-zinc-500">
              React 19 <span className="font-mono">useActionState</span> and a
              Server Action. Qty and price are editable; amount and total are
              calculated.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
            <InvoiceForm />
          </div>
        </section>
      </main>
    </div>
  );
}
