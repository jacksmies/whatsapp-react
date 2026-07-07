// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import KanbanPage from "./page";

describe("KanbanPage", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders the kanban page heading and board", () => {
    render(<KanbanPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Kanban" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Kanban card order" }),
    ).toBeInTheDocument();
  });
});
