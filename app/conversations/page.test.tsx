// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listConversations } from "../../lib/chat-repository";
import ConversationsPage from "./page";

vi.mock("../../lib/chat-repository", () => ({
  listConversations: vi.fn(),
}));

const listConversationsMock = vi.mocked(listConversations);

describe("ConversationsPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("shows conversations with their latest message in repository order", async () => {
    listConversationsMock.mockResolvedValue([
      {
        id: "newer",
        channel: "whatsapp",
        externalContactId: "971501234567",
        aiAutoReplyEnabled: false,
        updatedAt: new Date("2026-07-04T10:30:00.000Z"),
        lastMessage: {
          role: "assistant",
          senderType: "human",
          content: "Newest reply",
        },
      },
      {
        id: "older",
        channel: "web",
        externalContactId: null,
        aiAutoReplyEnabled: false,
        updatedAt: new Date("2026-07-04T09:15:00.000Z"),
        lastMessage: {
          role: "user",
          senderType: "customer",
          content: "Older question",
        },
      },
    ]);

    render(await ConversationsPage());

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByRole("link", { name: /whatsapp 971501234567/i }),
    ).toHaveAttribute("href", "/conversations/newer");
    expect(within(items[0]).getByText("Newest reply")).toBeInTheDocument();
    expect(
      within(items[1]).getByRole("link", { name: /conversation older/i }),
    ).toHaveAttribute("href", "/conversations/older");
    expect(within(items[1]).getByText("Older question")).toBeInTheDocument();
  });
});
