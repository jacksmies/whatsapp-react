import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getConversation,
  getConversationMessages,
} from "../../../../lib/chat-repository";
import { GET } from "./route";

vi.mock("../../../../lib/chat-repository", () => ({
  getConversation: vi.fn(),
  getConversationMessages: vi.fn(),
}));

const getConversationMock = vi.mocked(getConversation);
const getConversationMessagesMock = vi.mocked(getConversationMessages);

describe("GET /api/conversations/[id]", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns the latest conversation and messages", async () => {
    getConversationMock.mockResolvedValue({
      id: "conversation-1",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: false,
      createdAt: new Date("2026-07-04T08:00:00.000Z"),
    });
    getConversationMessagesMock.mockResolvedValue([
      {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "Fresh message",
        externalMessageId: "wamid.1",
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/conversations/conversation-1"),
      { params: Promise.resolve({ id: "conversation-1" }) },
    );

    await expect(response.json()).resolves.toEqual({
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
          content: "Fresh message",
          externalMessageId: "wamid.1",
          createdAt: "2026-07-04T09:00:00.000Z",
        },
      ],
    });
    expect(response.status).toBe(200);
  });
});
