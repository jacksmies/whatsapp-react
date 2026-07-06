import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildAcademyMessages } from "../../../../lib/academy-chat";
import {
  findOrCreateWhatsAppConversation,
  getConversationMessages,
  saveMessage,
  saveMessageIfNew,
} from "../../../../lib/chat-repository";
import { requestOllamaChatWithTools } from "../../../../lib/ollama";
import { academyTools } from "../../../../lib/tools/registry";
import { sendWhatsAppTextMessage } from "../../../../lib/whatsapp";
import { GET, POST } from "./route";

vi.mock("../../../../lib/academy-chat", () => ({
  buildAcademyMessages: vi.fn(({ messages }) => messages),
}));

vi.mock("../../../../lib/chat-repository", () => ({
  findOrCreateWhatsAppConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  saveMessage: vi.fn(),
  saveMessageIfNew: vi.fn(),
}));

vi.mock("../../../../lib/ollama", () => ({
  requestOllamaChatWithTools: vi.fn(),
}));

vi.mock("../../../../lib/tools/registry", () => ({
  academyTools: [
    {
      type: "function",
      function: {
        name: "list_course_availability",
        description: "List available course dates.",
        parameters: {
          type: "object",
          required: ["courseTitle"],
          properties: {
            courseTitle: { type: "string" },
          },
        },
      },
      execute: vi.fn(),
    },
  ],
}));

vi.mock("../../../../lib/whatsapp", () => ({
  sendWhatsAppTextMessage: vi.fn(),
}));

const buildAcademyMessagesMock = vi.mocked(buildAcademyMessages);
const findOrCreateWhatsAppConversationMock = vi.mocked(
  findOrCreateWhatsAppConversation,
);
const getConversationMessagesMock = vi.mocked(getConversationMessages);
const saveMessageMock = vi.mocked(saveMessage);
const saveMessageIfNewMock = vi.mocked(saveMessageIfNew);
const requestOllamaChatWithToolsMock = vi.mocked(requestOllamaChatWithTools);
const sendWhatsAppTextMessageMock = vi.mocked(sendWhatsAppTextMessage);

function signedRequest(body: object) {
  const rawBody = JSON.stringify(body);
  const signature = createHmac("sha256", "app-secret")
    .update(rawBody)
    .digest("hex");

  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: {
      "x-hub-signature-256": `sha256=${signature}`,
    },
    body: rawBody,
  });
}

const inboundTextPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      changes: [
        {
          value: {
            contacts: [
              {
                wa_id: "971501234567",
                profile: { name: "Aisha" },
              },
            ],
            messages: [
              {
                from: "971501234567",
                id: "wamid.inbound",
                timestamp: "1783180800",
                type: "text",
                text: { body: "Hello from WhatsApp" },
              },
            ],
          },
        },
      ],
    },
  ],
};

describe("WhatsApp webhook", () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  it("verifies the webhook subscription challenge", async () => {
    process.env = {
      ...originalEnv,
      WHATSAPP_WEBHOOK_VERIFY_TOKEN: "verify-token",
    };

    const response = await GET(
      new Request(
        "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=challenge-code",
      ),
    );

    await expect(response.text()).resolves.toBe("challenge-code");
    expect(response.status).toBe(200);
  });

  it("sends and stores an AI reply for a new WhatsApp conversation by default", async () => {
    process.env = {
      ...originalEnv,
      OLLAMA_MODEL: "llama3.2",
      META_APP_SECRET: "app-secret",
    };
    findOrCreateWhatsAppConversationMock.mockResolvedValue({
      id: "conversation-1",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: true,
      createdAt: new Date("2026-07-04T08:00:00.000Z"),
    });
    saveMessageIfNewMock.mockResolvedValue({
      created: true,
      message: {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "Hello from WhatsApp",
        externalMessageId: "wamid.inbound",
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
    });
    getConversationMessagesMock.mockResolvedValue([
      {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "Hello from WhatsApp",
        externalMessageId: "wamid.inbound",
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
    ]);
    requestOllamaChatWithToolsMock.mockResolvedValue({
      role: "assistant",
      content: "AI WhatsApp reply",
    });
    sendWhatsAppTextMessageMock.mockResolvedValue({
      messageId: "wamid.outbound",
    });

    const response = await POST(signedRequest(inboundTextPayload));

    await expect(response.json()).resolves.toEqual({ received: true });
    expect(response.status).toBe(200);
    expect(findOrCreateWhatsAppConversationMock).toHaveBeenCalledWith({
      externalContactId: "971501234567",
    });
    expect(saveMessageIfNewMock).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      role: "user",
      senderType: "customer",
      content: "Hello from WhatsApp",
      externalMessageId: "wamid.inbound",
    });
    expect(requestOllamaChatWithToolsMock).toHaveBeenCalledWith({
      model: "llama3.2",
      messages: [{ role: "user", content: "Hello from WhatsApp" }],
      tools: academyTools,
    });
    expect(sendWhatsAppTextMessageMock).toHaveBeenCalledWith({
      to: "971501234567",
      text: "AI WhatsApp reply",
    });
  });

  it("sends and stores an AI reply when auto-reply is enabled", async () => {
    process.env = {
      ...originalEnv,
      META_APP_SECRET: "app-secret",
      OLLAMA_MODEL: "llama3.2",
    };
    findOrCreateWhatsAppConversationMock.mockResolvedValue({
      id: "conversation-1",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: true,
      createdAt: new Date("2026-07-04T08:00:00.000Z"),
    });
    saveMessageIfNewMock.mockResolvedValue({
      created: true,
      message: {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "Hello from WhatsApp",
        externalMessageId: "wamid.inbound",
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
    });
    getConversationMessagesMock.mockResolvedValue([
      {
        id: "message-1",
        conversationId: "conversation-1",
        role: "user",
        senderType: "customer",
        content: "Hello from WhatsApp",
        externalMessageId: "wamid.inbound",
        createdAt: new Date("2026-07-04T09:00:00.000Z"),
      },
    ]);
    requestOllamaChatWithToolsMock.mockResolvedValue({
      role: "assistant",
      content: "AI WhatsApp reply",
    });
    sendWhatsAppTextMessageMock.mockResolvedValue({
      messageId: "wamid.outbound",
    });

    const response = await POST(signedRequest(inboundTextPayload));

    await expect(response.json()).resolves.toEqual({ received: true });
    expect(buildAcademyMessagesMock).toHaveBeenCalledWith({
      knowledge: expect.any(String),
      messages: [{ role: "user", content: "Hello from WhatsApp" }],
    });
    expect(requestOllamaChatWithToolsMock).toHaveBeenCalledWith({
      model: "llama3.2",
      messages: [{ role: "user", content: "Hello from WhatsApp" }],
      tools: academyTools,
    });
    expect(sendWhatsAppTextMessageMock).toHaveBeenCalledWith({
      to: "971501234567",
      text: "AI WhatsApp reply",
    });
    expect(saveMessageMock).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      role: "assistant",
      senderType: "ai",
      content: "AI WhatsApp reply",
      externalMessageId: "wamid.outbound",
    });
  });

  it("rejects POST requests with an invalid signature", async () => {
    process.env = {
      ...originalEnv,
      META_APP_SECRET: "app-secret",
    };

    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: {
          "x-hub-signature-256": "sha256=wrong",
        },
        body: JSON.stringify(inboundTextPayload),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      error: "Invalid webhook signature.",
    });
    expect(response.status).toBe(401);
    expect(saveMessageIfNewMock).not.toHaveBeenCalled();
  });
});
