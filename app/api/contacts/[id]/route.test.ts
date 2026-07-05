import { afterEach, describe, expect, it, vi } from "vitest";
import { updateContact } from "../../../../lib/chat-repository";
import { PATCH } from "./route";

vi.mock("../../../../lib/chat-repository", () => ({
  updateContact: vi.fn(),
}));

const updateContactMock = vi.mocked(updateContact);

describe("PATCH /api/contacts/[id]", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("updates contact name and notes", async () => {
    updateContactMock.mockResolvedValue({
      id: "contact-1",
      phoneNumber: "971501234567",
      name: "Aisha",
      notes: "Prefers morning calls.",
      tags: ["vip", "parent"],
      createdAt: new Date("2026-07-04T08:00:00.000Z"),
      updatedAt: new Date("2026-07-04T09:00:00.000Z"),
    });

    const response = await PATCH(
      new Request("http://localhost/api/contacts/contact-1", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Aisha",
          notes: "Prefers morning calls.",
          tags: ["vip", "parent"],
        }),
      }),
      { params: Promise.resolve({ id: "contact-1" }) },
    );

    await expect(response.json()).resolves.toEqual({
      contact: {
        id: "contact-1",
        phoneNumber: "971501234567",
        name: "Aisha",
        notes: "Prefers morning calls.",
        tags: ["vip", "parent"],
        createdAt: "2026-07-04T08:00:00.000Z",
        updatedAt: "2026-07-04T09:00:00.000Z",
      },
    });
    expect(response.status).toBe(200);
    expect(updateContactMock).toHaveBeenCalledWith("contact-1", {
      name: "Aisha",
      notes: "Prefers morning calls.",
      tags: ["vip", "parent"],
    });
  });
});
