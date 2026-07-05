// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ContactsList } from "./contacts-list";

const contacts = [
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
    name: "Omar",
    tags: ["lead"],
    conversationId: "conversation-2",
    lastMessageAt: new Date("2026-07-04T09:00:00.000Z"),
    aiAutoReplyEnabled: true,
  },
];

describe("ContactsList", () => {
  afterEach(() => {
    cleanup();
  });

  it("filters contacts by name, phone number, and tag from one search box", async () => {
    render(<ContactsList contacts={contacts} />);

    const search = screen.getByRole("searchbox", { name: "Search contacts" });

    await userEvent.type(search, "vip");
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.queryByText("Omar")).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "999");
    expect(screen.queryByText("Aisha")).not.toBeInTheDocument();
    expect(screen.getByText("Omar")).toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "aisha");
    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(1);
    expect(
      within(items[0]).getByRole("link", { name: /aisha/i }),
    ).toHaveAttribute("href", "/contacts/contact-1");
  });
});
