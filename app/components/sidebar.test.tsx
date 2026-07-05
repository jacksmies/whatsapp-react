// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders primary chat navigation with settings separated at the bottom", () => {
    render(<Sidebar />);

    const primaryNavigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    const secondaryNavigation = screen.getByRole("navigation", {
      name: "Secondary navigation",
    });

    expect(
      within(primaryNavigation).getByRole("link", { name: "Chat" }),
    ).toHaveAttribute("href", "/");
    expect(
      within(primaryNavigation).getByRole("link", { name: "Conversations" }),
    ).toHaveAttribute("href", "/conversations");
    expect(
      within(primaryNavigation).getByRole("link", { name: "Contacts" }),
    ).toHaveAttribute("href", "/contacts");
    expect(
      within(secondaryNavigation).getByRole("link", { name: "Settings" }),
    ).toHaveAttribute("href", "/settings");
  });
});
