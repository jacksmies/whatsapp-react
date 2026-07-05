import { describe, expect, it, vi, afterEach } from "vitest";
import {
  disableAiAutoReply,
  getConversation,
  saveMessage,
} from "../../../../../lib/chat-repository";
import { sendWhatsAppTextMessage } from "../../../../../lib/whatsapp";
import { POST } from "./route";

vi.mock("../../../../../lib/chat-repository", () => ({
  disableAiAutoReply: vi.fn(),
  getConversation: vi.fn(),
  saveMessage: vi.fn(),
}));

vi.mock("../../../../../lib/whatsapp", () => ({
  sendWhatsAppTextMessage: vi.fn(),
}));

const disableAiAutoReplyMock = vi.mocked(disableAiAutoReply);
const getConversationMock = vi.mocked(getConversation);
const saveMessageMock = vi.mocked(saveMessage);
const sendWhatsAppTextMessageMock = vi.mocked(sendWhatsAppTextMessage);

describe("POST /api/conversations/[id]/messages", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("sends a human WhatsApp reply, disables AI auto-reply, and stores the message", async () => {
    getConversationMock.mockResolvedValue({
      id: "conversation-1",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: true,
      createdAt: new Date("2026-07-04T09:00:00.000Z"),
    });
    sendWhatsAppTextMessageMock.mockResolvedValue({
      messageId: "wamid.outbound",
    });
    saveMessageMock.mockResolvedValue({
      id: "message-1",
      conversationId: "conversation-1",
      role: "assistant",
      senderType: "human",
      content: "Hello from a human",
      createdAt: new Date("2026-07-04T10:00:00.000Z"),
    });

    const response = await POST(
      new Request("http://localhost/api/conversations/conversation-1/messages", {
        method: "POST",
        body: JSON.stringify({ content: "Hello from a human" }),
      }),
      { params: Promise.resolve({ id: "conversation-1" }) },
    );

    await expect(response.json()).resolves.toEqual({
      message: {
        id: "message-1",
        conversationId: "conversation-1",
        role: "assistant",
        senderType: "human",
        content: "Hello from a human",
        createdAt: "2026-07-04T10:00:00.000Z",
      },
      aiAutoReplyEnabled: false,
    });
    expect(response.status).toBe(200);
    expect(disableAiAutoReplyMock).toHaveBeenCalledWith("conversation-1");
    expect(sendWhatsAppTextMessageMock).toHaveBeenCalledWith({
      to: "971501234567",
      text: "Hello from a human",
    });
    expect(saveMessageMock).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      role: "assistant",
      senderType: "human",
      content: "Hello from a human",
      externalMessageId: "wamid.outbound",
    });
  });
});
