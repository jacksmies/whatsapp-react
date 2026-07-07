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

  it("renders the team roles instructions and board", () => {
    render(<KanbanPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Team Roles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Which roles fit you best?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Below are six roles that people naturally take on/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Put at the top \(1\) the role that suits you best/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Don't rank them based on what you think you should be/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Kanban card order" }),
    ).toBeInTheDocument();
  });
});
