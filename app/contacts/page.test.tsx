// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listWhatsAppContacts } from "../../lib/chat-repository";
import ContactsPage from "./page";

vi.mock("../../lib/chat-repository", () => ({
  listWhatsAppContacts: vi.fn(),
}));

const listWhatsAppContactsMock = vi.mocked(listWhatsAppContacts);

describe("ContactsPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("shows WhatsApp contacts linked to their conversations", async () => {
    listWhatsAppContactsMock.mockResolvedValue([
      {
        id: "contact-1",
        phoneNumber: "971501234567",
        name: "Aisha",
        tags: ["vip", "parent"],
        conversationId: "conversation-1",
        lastMessageAt: new Date("2026-07-04T10:00:00.000Z"),
        aiAutoReplyEnabled: false,
      },
      {
        id: "contact-2",
        phoneNumber: "971509999999",
        name: null,
        tags: ["lead"],
        conversationId: "conversation-2",
        lastMessageAt: new Date("2026-07-04T09:00:00.000Z"),
        aiAutoReplyEnabled: true,
      },
    ]);

    render(await ContactsPage());

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(
      within(items[0]).getByRole("link", { name: /aisha/i }),
    ).toHaveAttribute("href", "/contacts/contact-1");
    expect(within(items[0]).getByText(/971501234567/)).toBeInTheDocument();
    expect(within(items[0]).getByText("vip")).toBeInTheDocument();
    expect(within(items[0]).getByText(/Human/)).toBeInTheDocument();
    expect(
      within(items[1]).getByRole("link", { name: /971509999999/i }),
    ).toHaveAttribute("href", "/contacts/contact-2");
    expect(within(items[1]).getByText(/AI/)).toBeInTheDocument();
  });
});
