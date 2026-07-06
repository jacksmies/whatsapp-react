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
const executeMock = vi.fn();

vi.mock("./db", () => ({
  getDb: () => ({
    execute: executeMock,
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

describe("listCourseAvailability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns matching available courses ordered by the repository query", async () => {
    executeMock.mockResolvedValue({
      rows: [
        {
          id: "course-1",
          title: "Public Speaking Course",
          startDate: "2026-08-15",
          availability: 8,
        },
      ],
    });
    const { listCourseAvailability } = await import("./chat-repository");

    await expect(
      listCourseAvailability({ courseTitle: " public speaking " }),
    ).resolves.toEqual([
      {
        id: "course-1",
        title: "Public Speaking Course",
        startDate: new Date("2026-08-15"),
        availability: 8,
      },
    ]);

    expect(executeMock).toHaveBeenCalledOnce();
  });

  it("filters mixed course rows by requested month and year", async () => {
    executeMock.mockResolvedValue({
      rows: [
        {
          id: "course-1",
          title: "Public Speaking Course",
          startDate: "2026-07-15",
          availability: 8,
        },
        {
          id: "course-2",
          title: "Public Speaking Course",
          startDate: "2026-08-03",
          availability: 3,
        },
      ],
    });
    const { listCourseAvailability } = await import("./chat-repository");

    await expect(
      listCourseAvailability({
        courseTitle: "public speaking",
        month: "august",
        year: 2026,
      }),
    ).resolves.toEqual([
      {
        id: "course-2",
        title: "Public Speaking Course",
        startDate: new Date("2026-08-03"),
        availability: 3,
      },
    ]);
  });

  it("returns no courses when the title is blank", async () => {
    const { listCourseAvailability } = await import("./chat-repository");

    await expect(
      listCourseAvailability({ courseTitle: "   " }),
    ).resolves.toEqual([]);

    expect(executeMock).not.toHaveBeenCalled();
  });
});
