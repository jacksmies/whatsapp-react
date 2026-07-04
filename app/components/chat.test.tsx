// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Chat } from "./chat";

describe("Chat", () => {
  it("focuses the message input when the chat loads", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("Type a message for Ollama..."),
      ).toHaveFocus();
    });
  });
});
