// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ContactDetailForm } from "./contact-detail-form";

const contact = {
  id: "contact-1",
  phoneNumber: "971501234567",
  name: "Aisha",
  notes: "Prefers morning calls.",
  tags: ["vip", "parent"],
  conversationId: "conversation-1",
  messageCount: 12,
  aiAutoReplyEnabled: false,
};

describe("ContactDetailForm", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a cross on each tag delete button and removes the selected tag", async () => {
    render(<ContactDetailForm contact={contact} />);

    const removeVip = screen.getByRole("button", { name: "Remove vip tag" });
    expect(removeVip).toHaveTextContent("vip");
    expect(removeVip).toHaveTextContent("×");

    await userEvent.click(removeVip);

    expect(
      screen.queryByRole("button", { name: "Remove vip tag" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove parent tag" }),
    ).toBeInTheDocument();
  });
});
