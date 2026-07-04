// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chat } from "./chat";

describe("Chat", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("focuses the message input when the chat loads", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a message for Ollama..."),
      ).toHaveFocus();
    });
  });

  it("scrolls to the latest message and keeps the input focused after a reply", async () => {
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "A local response" },
        }),
      ),
    );

    render(<Chat />);

    const input = screen.getByPlaceholderText("Type a message for Ollama...");
    await userEvent.type(input, "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("A local response");

    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "end",
    });
    expect(input).toHaveFocus();
  });
});
