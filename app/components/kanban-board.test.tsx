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

function cardRanks() {
  return screen
    .getAllByTestId("kanban-card")
    .map((card) => within(card).getByLabelText(/Rank \d/).textContent);
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
      "Builder",
      "Evaluator",
      "Empathiser",
      "Grinder",
    ]);
    expect(cardRanks()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(screen.getByText(/The Creator asks/i)).toBeInTheDocument();
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
      "Builder",
      "Evaluator",
      "Empathiser",
    ]);
    expect(cardRanks()).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(JSON.parse(String(localStorage.getItem(storageKey)))).toEqual([
      "grinder",
      "creator",
      "marketer",
      "builder",
      "evaluator",
      "empathiser",
    ]);
  });

  it("loads a saved card order from local storage", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify([
        "marketer",
        "creator",
        "grinder",
        "builder",
        "empathiser",
        "evaluator",
      ]),
    );

    render(<KanbanBoard />);

    expect(cardTitles()).toEqual([
      "Marketer",
      "Creator",
      "Grinder",
      "Builder",
      "Empathiser",
      "Evaluator",
    ]);
  });
});
