// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getContactForConversation,
  getConversation,
  getConversationMessages,
} from "../../../lib/chat-repository";
import ConversationDetailPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("../../../lib/chat-repository", () => ({
  getContactForConversation: vi.fn(),
  getConversation: vi.fn(),
  getConversationMessages: vi.fn(),
}));

const getContactForConversationMock = vi.mocked(getContactForConversation);
const getConversationMock = vi.mocked(getConversation);
const getConversationMessagesMock = vi.mocked(getConversationMessages);
const notFoundMock = vi.mocked(notFound);

describe("ConversationDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("renders the full conversation history", async () => {
    getConversationMock.mockResolvedValue({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: false,
      createdAt: new Date("2026-07-04T08:00:00.000Z"),
    });
    getContactForConversationMock.mockResolvedValue({
      id: "contact-1",
      phoneNumber: "971501234567",
    });
    getConversationMessagesMock.mockResolvedValue([
      {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "What courses do you offer?",
        externalMessageId: null,
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
      {
        id: "message-2",
        conversationId: "conversation-1",
        role: "assistant",
        senderType: "ai",
        content: "We offer public speaking and AI courses.",
        externalMessageId: null,
        createdAt: new Date("2026-07-04T09:01:00.000Z"),
      },
    ]);

    render(
      await ConversationDetailPage({
        params: Promise.resolve({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "WhatsApp 971501234567" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "WhatsApp 971501234567" }),
    ).toHaveAttribute("href", "/contacts/contact-1");
    expect(screen.getByText("What courses do you offer?")).toBeInTheDocument();
    expect(
      screen.getByText("We offer public speaking and AI courses."),
    ).toBeInTheDocument();
    expect(screen.getByText("Human operator mode")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", { name: "Conversation mode" }),
    ).toHaveTextContent("Human");
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("renders not found when the conversation does not exist", async () => {
    getConversationMock.mockResolvedValue(null);
    getContactForConversationMock.mockResolvedValue(null);
    getConversationMessagesMock.mockResolvedValue([]);

    await expect(
      ConversationDetailPage({
        params: Promise.resolve({ id: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
