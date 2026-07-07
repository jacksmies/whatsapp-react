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
    body: "The Creator asks 'What could exist?' They generate lots of ideas, including unusual or unexpected ones, and enjoy imagining possibilities others haven't thought of yet. When the group is stuck, the Creator opens up new directions. Their contribution is the raw material every project starts from: fresh ideas.",
  },
  {
    id: "marketer",
    title: "Marketer",
    body: "The Marketer asks 'Why should people care?' They take an idea and explain it in a way that excites others, whether that's teammates, customers, or an audience. Comfortable presenting and persuading, they build energy and momentum around the work. Without a Marketer, even great ideas can go unnoticed.",
  },
  {
    id: "builder",
    title: "Builder",
    body: "The Builder asks 'How do we make it real?' They turn abstract ideas into something you can see and touch — a prototype, drawing, slide deck, model, or piece of code. Builders love the moment when an idea stops being talk and becomes a real thing. They give the group something concrete to react to and improve.",
  },
  {
    id: "evaluator",
    title: "Evaluator",
    body: "The Evaluator asks \"Which option is best?\" They spot weaknesses in ideas early, compare alternatives honestly, and help the group make smart choices instead of just enthusiastic ones. Evaluators aren't negative — they're the quality filter. Their contribution is better decisions and fewer costly mistakes.",
  },
  {
    id: "empathiser",
    title: "Empathiser",
    body: 'The Empathiser asks "How do we work well together?" They notice how people are feeling, make sure everyone is heard and included, and step in gently when tension builds. They keep the human side of the team healthy. Their contribution is trust — the foundation that lets everyone else do their best work.',
  },
  {
    id: "grinder",
    title: "Grinder",
    body: 'The Grinder asks "How do we keep going?" They stay committed when the excitement fades and the work gets repetitive, following the steps until the job is genuinely done. Grinders are the reason projects get finished rather than abandoned at 80%. Their contribution is consistency and completion.',
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

  return sortedCards.length === defaultCards.length
    ? sortedCards
    : defaultCards;
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
      const draggedCard = currentCards.find(
        (card) => card.id === draggedCardId,
      );
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
      {cards.map((card, index) => (
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
          <div className="kanban-card-rank-area">
            <span className="kanban-card-rank" aria-label={`Rank ${index + 1}`}>
              {index + 1}
            </span>
            <div className="kanban-card-handle" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
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
