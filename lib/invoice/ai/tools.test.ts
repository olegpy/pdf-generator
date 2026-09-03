import { describe, expect, it } from "vitest";
import { examplePrompt } from "../demo";
import {
  draftFromToolInput,
  generateInvoiceToolInput,
  lastUserText,
  linesFromUserText,
} from "./tools";

const history = [
  { role: "user" as const, content: examplePrompt },
  { role: "user" as const, content: "Acme Corp" },
];

describe("linesFromUserText", () => {
  it("reads the qty format used by the example prompt", () => {
    expect(linesFromUserText(examplePrompt)).toEqual([
      { description: "Development", quantity: 10, unitPrice: 150 },
      { description: "Notion license", quantity: 1, unitPrice: 20 },
    ]);
  });

  it("reads a quantity written before the price", () => {
    expect(linesFromUserText("10 licenses at $150")).toEqual([
      { description: "licenses", quantity: 10, unitPrice: 150 },
    ]);
  });

  it("falls back to a single unit when only a price is given", () => {
    expect(linesFromUserText("Design $500")).toEqual([
      { description: "Design", quantity: 1, unitPrice: 500 },
    ]);
  });

  it("returns nothing when there is no price", () => {
    expect(linesFromUserText("make me an invoice please")).toEqual([]);
  });
});

describe("lastUserText", () => {
  it("uses the latest user message as the bill-to name", () => {
    expect(lastUserText(history)).toBe("Acme Corp");
  });
});

describe("generateInvoiceToolInput", () => {
  it("accepts a call with no arguments", () => {
    expect(generateInvoiceToolInput.safeParse({}).success).toBe(true);
  });
});

describe("draftFromToolInput", () => {
  const emptyCall = generateInvoiceToolInput.parse({});

  it("recovers bill-to and lines from the conversation", () => {
    expect(draftFromToolInput(emptyCall, history)).toMatchObject({
      counterparty: { name: "Acme Corp" },
      lines: [
        { description: "Development", quantity: 10, unitPrice: 150 },
        { description: "Notion license", quantity: 1, unitPrice: 20 },
      ],
    });
  });

  it("keeps arguments the model did send", () => {
    const call = generateInvoiceToolInput.parse({
      counterparty: { name: "Globex" },
      lines: [{ description: "Support", quantity: 2, unitPrice: 50 }],
    });

    expect(draftFromToolInput(call, history)).toMatchObject({
      counterparty: { name: "Globex" },
      lines: [{ description: "Support", quantity: 2, unitPrice: 50 }],
    });
  });

  it("fails when the conversation has no line items", () => {
    expect(() =>
      draftFromToolInput(emptyCall, [{ role: "user", content: "Acme Corp" }]),
    ).toThrow("At least one invoice line is required.");
  });

  it("fails when there is no bill-to name anywhere", () => {
    expect(() => draftFromToolInput(emptyCall, [])).toThrow(
      "Counterparty name is required.",
    );
  });
});
