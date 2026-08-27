"use client";

import {
  useActionState,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import { useFormStatus } from "react-dom";
import { ExamplePrompt } from "./example-prompt";
import {
  createInvoiceAction,
  type InvoiceFormState,
} from "@/app/actions/invoice";
import { exampleLines, demoIssuer } from "@/lib/invoice/demo";
import type { InvoiceLineInput } from "@/lib/invoice/schema";

type LineDraft = InvoiceLineInput & { key: string };

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unitPrice: 0,
  };
}

const initialState: InvoiceFormState = {
  invoice: null,
  error: null,
};

function money(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function Field({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <input
        className="h-10 rounded-lg border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
        {...props}
      />
    </label>
  );
}

function GenerateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-full bg-zinc-900 px-5 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-950"
    >
      {pending ? "Generating..." : "Generate PDF"}
    </button>
  );
}

export function InvoiceForm() {
  const [state, formAction] = useActionState(
    createInvoiceAction,
    initialState,
  );
  const [lines, setLines] = useState<LineDraft[]>([
    { key: "line-1", description: "", quantity: 1, unitPrice: 0 },
  ]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );
    return { subtotal, total: subtotal };
  }, [lines]);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function fillExample() {
    setLines(
      exampleLines.map((line) => ({
        ...line,
        key: crypto.randomUUID(),
      })),
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <ExamplePrompt actionLabel="Fill fields" onAction={fillExample} />
      <div className="grid gap-6 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">From (demo seller)</legend>
          <Field
            label="Name"
            name="issuerName"
            defaultValue={demoIssuer.name}
          />
          <Field
            label="Email"
            name="issuerEmail"
            type="email"
            defaultValue={demoIssuer.email}
          />
          <Field
            label="Tax ID"
            name="issuerTaxId"
            defaultValue={demoIssuer.taxId}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">Address</span>
            <textarea
              name="issuerAddress"
              className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
              defaultValue={demoIssuer.address}
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium">Bill to</legend>
          <Field
            label="Name"
            name="counterpartyName"
            required
            placeholder="Client or company"
          />
          <Field label="Email" name="counterpartyEmail" type="email" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-500">Address</span>
            <textarea
              name="counterpartyAddress"
              className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
        </fieldset>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-medium">Lines</legend>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-24 px-3 py-2 font-medium">Qty</th>
                <th className="w-32 px-3 py-2 font-medium">Price</th>
                <th className="w-32 px-3 py-2 font-medium">Amount</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.key}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-2 py-2">
                    <input
                      className="h-10 w-full rounded-md border border-transparent px-2 outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
                      placeholder="e.g. Development"
                      name="description"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, {
                          description: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="h-10 w-full rounded-md border border-transparent px-2 outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
                      name="quantity"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(line.key, {
                          quantity: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="h-10 w-full rounded-md border border-transparent px-2 outline-none focus:border-zinc-300 dark:focus:border-zinc-700"
                      name="unitPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(line.key, {
                          unitPrice: Number(event.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-zinc-500">
                    {money(line.quantity * line.unitPrice)}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      className="text-xs text-zinc-400 hover:text-zinc-700"
                      onClick={() =>
                        setLines((current) =>
                          current.filter((item) => item.key !== line.key),
                        )
                      }
                      disabled={lines.length === 1}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          className="mt-3 text-sm text-zinc-600 underline dark:text-zinc-400"
          onClick={() =>
            setLines((current) => [...current, emptyLine()])
          }
        >
          Add line
        </button>
      </fieldset>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex w-full max-w-md flex-col gap-1 text-sm">
          <span className="text-zinc-500">Notes</span>
          <textarea
            name="notes"
            className="min-h-20 rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>
        <p className="text-lg font-semibold">Total {money(totals.total)}</p>
      </div>

      {state.error ? (
        <p aria-live="polite" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <GenerateButton />
        {state.invoice ? (
          <a
            href={state.invoice.downloadUrl}
            className="inline-flex h-11 items-center rounded-full border border-zinc-200 px-5 text-sm font-medium dark:border-zinc-800"
          >
            Download {state.invoice.number}
          </a>
        ) : null}
      </div>
    </form>
  );
}
