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

  it("does not render a timestamp for the static welcome message", () => {
    render(<Chat />);

    expect(
      screen.getByText("Hi. Ask me anything about Klaster."),
    ).toBeInTheDocument();
    expect(document.querySelector("time")).not.toBeInTheDocument();
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

  it("renders markdown in chat bubbles", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            role: "assistant",
            content:
              "This is **important**. Visit [Future Skills](https://example.com).",
          },
        }),
      ),
    );

    render(<Chat />);

    const input = screen.getByPlaceholderText("Type a message for Ollama...");
    await userEvent.type(input, "Show markdown");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    const boldText = await screen.findByText("important");
    const link = screen.getByRole("link", { name: "Future Skills" });

    expect(boldText.tagName).toBe("STRONG");
    expect(link).toHaveAttribute("href", "https://example.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("renders bare URLs in chat bubbles as clickable links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            role: "assistant",
            content: "Our website is https://klaster.me",
          },
        }),
      ),
    );

    render(<Chat />);

    const input = screen.getByPlaceholderText("Type a message for Ollama...");
    await userEvent.type(input, "what is your website");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    const link = await screen.findByRole("link", {
      name: "https://klaster.me",
    });

    expect(link).toHaveAttribute("href", "https://klaster.me");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("sends a page-session conversation id with chat requests", async () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("conversation-id")
      .mockReturnValue("message-id");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: { role: "assistant", content: "Tracked response" },
        }),
      ),
    );

    render(<Chat />);

    const input = screen.getByPlaceholderText("Type a message for Ollama...");
    await userEvent.type(input, "Track this");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));

    await screen.findByText("Tracked response");

    expect(randomUUID).toHaveBeenCalled();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      conversationId: "conversation-id",
      messages: expect.arrayContaining([
        { role: "user", content: "Track this" },
      ]),
    });
  });
});
