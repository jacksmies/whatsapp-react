// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getContactDetail } from "../../../lib/chat-repository";
import ContactDetailPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("../../../lib/chat-repository", () => ({
  getContactDetail: vi.fn(),
}));

const getContactDetailMock = vi.mocked(getContactDetail);
const notFoundMock = vi.mocked(notFound);

describe("ContactDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("shows editable contact fields and links to the conversation messages", async () => {
    getContactDetailMock.mockResolvedValue({
      id: "contact-1",
      phoneNumber: "971501234567",
      name: "Aisha",
      notes: "Prefers morning calls.",
      tags: ["vip", "parent"],
      conversationId: "conversation-1",
      messageCount: 12,
      aiAutoReplyEnabled: false,
    });

    render(
      await ContactDetailPage({
        params: Promise.resolve({ id: "contact-1" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Aisha" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Aisha");
    expect(screen.getByLabelText("Notes")).toHaveValue(
      "Prefers morning calls.",
    );
    expect(screen.getByText("vip")).toBeInTheDocument();
    expect(screen.getByText("parent")).toBeInTheDocument();
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "12 messages" })).toHaveAttribute(
      "href",
      "/conversations/conversation-1",
    );
  });

  it("renders not found when the contact does not exist", async () => {
    getContactDetailMock.mockResolvedValue(null);

    await expect(
      ContactDetailPage({
        params: Promise.resolve({ id: "missing" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });
});
