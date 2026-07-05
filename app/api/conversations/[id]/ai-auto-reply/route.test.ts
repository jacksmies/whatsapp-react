import { afterEach, describe, expect, it, vi } from "vitest";
import { setAiAutoReply } from "../../../../../lib/chat-repository";
import { PATCH } from "./route";

vi.mock("../../../../../lib/chat-repository", () => ({
  setAiAutoReply: vi.fn(),
}));

const setAiAutoReplyMock = vi.mocked(setAiAutoReply);

describe("PATCH /api/conversations/[id]/ai-auto-reply", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates the conversation AI auto-reply setting", async () => {
    setAiAutoReplyMock.mockResolvedValue({
      id: "conversation-1",
      channel: "whatsapp",
      externalContactId: "971501234567",
      aiAutoReplyEnabled: true,
      createdAt: new Date("2026-07-04T09:00:00.000Z"),
    });

    const response = await PATCH(
      new Request(
        "http://localhost/api/conversations/conversation-1/ai-auto-reply",
        {
          method: "PATCH",
          body: JSON.stringify({ enabled: true }),
        },
      ),
      { params: Promise.resolve({ id: "conversation-1" }) },
    );

    await expect(response.json()).resolves.toEqual({
      conversation: {
        id: "conversation-1",
        channel: "whatsapp",
        externalContactId: "971501234567",
        aiAutoReplyEnabled: true,
        createdAt: "2026-07-04T09:00:00.000Z",
      },
    });
    expect(response.status).toBe(200);
    expect(setAiAutoReplyMock).toHaveBeenCalledWith("conversation-1", true);
  });
});
