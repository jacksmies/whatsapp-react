// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { KanbanBoard } from "./kanban-board";

const storageKey = "kanban-card-order";

function cardTitles() {
  return screen
    .getAllByTestId("kanban-card")
    .map((card) => within(card).getByRole("heading", { level: 2 }).textContent);
}

describe("KanbanBoard", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("renders the six default kanban cards in order", () => {
    render(<KanbanBoard />);

    expect(cardTitles()).toEqual([
      "Creator",
      "Marketer",
      "Buidler",
      "Evaluator",
      "Emphatiser",
      "Grinder",
    ]);
    expect(screen.getAllByText(/Lorem ipsum/i)).toHaveLength(6);
  });

  it("moves a dragged card before the drop target and saves the order", () => {
    render(<KanbanBoard />);

    const cards = screen.getAllByTestId("kanban-card");
    fireEvent.dragStart(cards[5]);
    fireEvent.dragOver(cards[0]);
    fireEvent.drop(cards[0]);

    expect(cardTitles()).toEqual([
      "Grinder",
      "Creator",
      "Marketer",
      "Buidler",
      "Evaluator",
      "Emphatiser",
    ]);
    expect(JSON.parse(String(localStorage.getItem(storageKey)))).toEqual([
      "grinder",
      "creator",
      "marketer",
      "buidler",
      "evaluator",
      "emphatiser",
    ]);
  });

  it("loads a saved card order from local storage", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        "marketer",
        "creator",
        "grinder",
        "buidler",
        "emphatiser",
        "evaluator",
      ]),
    );

    render(<KanbanBoard />);

    expect(cardTitles()).toEqual([
      "Marketer",
      "Creator",
      "Grinder",
      "Buidler",
      "Emphatiser",
      "Evaluator",
    ]);
  });
});
