import { beforeEach, describe, expect, it, vi } from "vitest";

const selectLimitMock = vi.fn();
const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
const insertReturningMock = vi.fn();
const insertOnConflictDoNothingMock = vi.fn(() => ({
  returning: insertReturningMock,
}));
const insertValuesMock = vi.fn(() => ({
  onConflictDoNothing: insertOnConflictDoNothingMock,
}));
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

vi.mock("./db", () => ({
  getDb: () => ({
    insert: insertMock,
    select: vi.fn(() => ({ from: selectFromMock })),
  }),
}));

describe("findOrCreateWhatsAppConversation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    selectLimitMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    insertReturningMock
      .mockResolvedValueOnce([
        {
          id: "contact-1",
          phoneNumber: "971501234567",
          name: null,
          notes: null,
          createdAt: new Date("2026-07-04T08:00:00.000Z"),
          updatedAt: new Date("2026-07-04T08:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "conversation-1",
          channel: "whatsapp",
          externalContactId: "971501234567",
          aiAutoReplyEnabled: true,
          createdAt: new Date("2026-07-04T08:00:00.000Z"),
        },
      ]);
  });

  it("creates new WhatsApp conversations with AI auto-reply enabled", async () => {
    const { findOrCreateWhatsAppConversation } = await import(
      "./chat-repository"
    );

    await findOrCreateWhatsAppConversation({
      externalContactId: "971501234567",
    });

    expect(insertValuesMock.mock.calls).toContainEqual([
      expect.objectContaining({
        channel: "whatsapp",
        externalContactId: "971501234567",
        aiAutoReplyEnabled: true,
      }),
    ]);
  });
});
