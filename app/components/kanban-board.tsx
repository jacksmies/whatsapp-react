"use client";

import { useState } from "react";

type KanbanCard = {
  id: string;
  title: string;
  body: string;
};

const storageKey = "kanban-card-order";

const defaultCards: KanbanCard[] = [
  {
    id: "creator",
    title: "Creator",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
  {
    id: "marketer",
    title: "Marketer",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
  {
    id: "buidler",
    title: "Buidler",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
  {
    id: "evaluator",
    title: "Evaluator",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
  {
    id: "emphatiser",
    title: "Emphatiser",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
  {
    id: "grinder",
    title: "Grinder",
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer vitae ligula sed arcu posuere luctus.",
  },
];

function sortCardsByIds(ids: unknown) {
  if (
    !Array.isArray(ids) ||
    ids.length !== defaultCards.length ||
    !ids.every((id) => typeof id === "string")
  ) {
    return defaultCards;
  }

  const cardsById = new Map(defaultCards.map((card) => [card.id, card]));
  const sortedCards = ids
    .map((id) => cardsById.get(id))
    .filter((card): card is KanbanCard => Boolean(card));

  return sortedCards.length === defaultCards.length ? sortedCards : defaultCards;
}

function readInitialCards() {
  if (typeof window === "undefined") return defaultCards;

  const savedOrder = localStorage.getItem(storageKey);
  if (!savedOrder) return defaultCards;

  try {
    return sortCardsByIds(JSON.parse(savedOrder));
  } catch {
    return defaultCards;
  }
}

export function KanbanBoard() {
  const [cards, setCards] = useState(readInitialCards);
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);

  function moveCard(targetCardId: string) {
    if (!draggedCardId || draggedCardId === targetCardId) return;

    setCards((currentCards) => {
      const draggedCard = currentCards.find((card) => card.id === draggedCardId);
      if (!draggedCard) return currentCards;

      const withoutDraggedCard = currentCards.filter(
        (card) => card.id !== draggedCardId,
      );
      const targetIndex = withoutDraggedCard.findIndex(
        (card) => card.id === targetCardId,
      );

      if (targetIndex < 0) return currentCards;

      const nextCards = [
        ...withoutDraggedCard.slice(0, targetIndex),
        draggedCard,
        ...withoutDraggedCard.slice(targetIndex),
      ];

      localStorage.setItem(
        storageKey,
        JSON.stringify(nextCards.map((card) => card.id)),
      );

      return nextCards;
    });
    setDraggedCardId(null);
  }

  return (
    <div className="kanban-board" role="region" aria-label="Kanban card order">
      {cards.map((card) => (
        <article
          className="kanban-card"
          data-card-id={card.id}
          data-testid="kanban-card"
          draggable
          key={card.id}
          onDragEnd={() => setDraggedCardId(null)}
          onDragOver={(event) => event.preventDefault()}
          onDragStart={() => setDraggedCardId(card.id)}
          onDrop={() => moveCard(card.id)}
        >
          <div className="kanban-card-handle" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="kanban-card-copy">
            <h2>{card.title}</h2>
            <p>{card.body}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
