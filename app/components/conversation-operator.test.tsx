// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConversationOperator } from "./conversation-operator";

describe("ConversationOperator", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("lets a human send a WhatsApp reply and turns off AI auto-reply", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: {
            id: "human-reply",
            conversationId: "conversation-1",
            role: "assistant",
            senderType: "human",
            content: "A human reply",
            createdAt: "2026-07-04T10:00:00.000Z",
          },
          aiAutoReplyEnabled: false,
        }),
      ),
    );

    render(
      <ConversationOperator
        conversation={{
          id: "conversation-1",
          channel: "whatsapp",
          externalContactId: "971501234567",
          aiAutoReplyEnabled: true,
        }}
        initialMessages={[
          {
            id: "message-1",
            conversationId: "conversation-1",
            role: "user",
            senderType: "customer",
            content: "Hello",
            createdAt: new Date("2026-07-04T09:00:00.000Z"),
          },
        ]}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText("Write a human reply..."),
      "A human reply",
    );
    await userEvent.click(screen.getByRole("button", { name: "Send to WhatsApp" }));

    await screen.findByText("A human reply");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/conversations/conversation-1/messages",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "A human reply" }),
      }),
    );
    await waitFor(() => {
      expect(screen.getByText("Human operator mode")).toBeInTheDocument();
    });
  });

  it("refreshes the transcript when new WhatsApp messages arrive", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          conversation: {
            id: "conversation-1",
            channel: "whatsapp",
            externalContactId: "971501234567",
            aiAutoReplyEnabled: false,
            createdAt: "2026-07-04T08:00:00.000Z",
          },
          messages: [
            {
              id: "message-1",
              conversationId: "conversation-1",
              role: "user",
              senderType: "customer",
              content: "Hello",
              externalMessageId: "wamid.1",
              createdAt: "2026-07-04T09:00:00.000Z",
            },
            {
              id: "message-2",
              conversationId: "conversation-1",
              role: "user",
              senderType: "customer",
              content: "New WhatsApp message",
              externalMessageId: "wamid.2",
              createdAt: "2026-07-04T09:01:00.000Z",
            },
          ],
        }),
      ),
    );

    render(
      <ConversationOperator
        conversation={{
          id: "conversation-1",
          channel: "whatsapp",
          externalContactId: "971501234567",
          aiAutoReplyEnabled: false,
          createdAt: new Date("2026-07-04T08:00:00.000Z"),
        }}
        initialMessages={[
          {
            id: "message-1",
            conversationId: "conversation-1",
            role: "user",
            senderType: "customer",
            content: "Hello",
            externalMessageId: "wamid.1",
            createdAt: new Date("2026-07-04T09:00:00.000Z"),
          },
        ]}
        refreshIntervalMs={10}
      />,
    );

    expect(await screen.findByText("New WhatsApp message")).toBeInTheDocument();
  });
});
