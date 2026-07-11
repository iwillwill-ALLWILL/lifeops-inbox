// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LifeOpsApp } from "./lifeops-app";

afterEach(() => {
  vi.useRealTimers();
});

describe("LifeOpsApp", () => {
  it("runs a built-in sample through the parser and connects a fact to its exact source", async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    render(<LifeOpsApp />);

    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));

    expect(await screen.findByText("Pay $184.62")).toBeInTheDocument();
    expect(screen.getByText(/Built-in sample loaded/i)).toBeInTheDocument();

    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Amount due.*\$184\.62/i }));

    const mark = screen.getByTestId("selected-evidence");
    expect(mark.tagName).toBe("MARK");
    expect(mark).toHaveTextContent("$184.62");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
  });

  it("scrolls selected evidence without smooth motion when reduced motion is preferred", () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    render(<LifeOpsApp />);
    fireEvent.click(screen.getByRole("button", { name: /Overdue renewal bill/i }));

    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Amount due.*\$184\.62/i }));

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
  });

  it("keeps pasted text local and shows a concrete empty-input recovery", () => {
    render(<LifeOpsApp />);

    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/Paste a notice or choose a sample/i);
  });

  it("uses the current date for pasted text but the fixed demo date for built-in samples", async () => {
    vi.setSystemTime(new Date("2026-06-01T12:00:00Z"));
    render(<LifeOpsApp />);

    fireEvent.change(screen.getByLabelText(/Paste the notice/i), {
      target: { value: "Amount due: $42.00\nDue date: July 14, 2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));

    const pastedAction = screen.getByText("Pay $42.00");
    expect(pastedAction.closest(".action-lane")).toHaveClass("action-lane--later");

    fireEvent.click(screen.getByRole("button", { name: /Genesis hackathon deadlines/i }));
    const sampleAction = screen.getByText("Complete internal qa deadline");
    expect(sampleAction.closest(".action-lane")).toHaveClass("action-lane--soon");
  });

  it("shows an explicit PST time unchanged in both the fact and action displays", async () => {
    render(<LifeOpsApp />);
    fireEvent.change(screen.getByLabelText(/Paste the notice/i), {
      target: {
        value: "Departs: San Francisco (SFO) — Aug 18, 2026 at 10:30 PM PST",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /Get next actions/i }));

    expect(await screen.findByText("Aug 18, 2026, 10:30 PM PST")).toBeInTheDocument();
    expect(screen.getByText("Aug 18, 10:30 PM PST")).toBeInTheDocument();
  });
});
