// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatTranscript } from "./chat-transcript";

describe("ChatTranscript", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a small timestamp inside each chat bubble", () => {
    const createdAt = new Date("2026-07-04T09:00:00.000Z");
    const expectedTime = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(createdAt);

    render(
      <ChatTranscript
        messages={[
          {
            id: "message-1",
            role: "user",
            content: "Hello",
            createdAt,
          },
        ]}
      />,
    );

    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText(expectedTime)).toBeInTheDocument();
  });
});
