# Kanban Page Design

## Goal

Create a `/kanban` page with six vertically stacked, draggable boxes. Users can reorder the boxes and the order persists after refresh.

## Page Structure

The route is `app/kanban/page.tsx`. It renders a focused client component that owns the draggable list interaction.

The six cards are:

- Creator
- Marketer
- Buidler
- Evaluator
- Emphatiser
- Grinder

Each card displays its title and placeholder lorem ipsum body copy.

## Interaction

Cards are stacked in one column. A user can drag a card and drop it over another card to change the order.

The current card order is saved in `localStorage` as stable card IDs. On first load, or if saved data is invalid, the component falls back to the default order.

## Future Database Fit

The persisted browser value should be shaped like an ordered list of stable card IDs. This can later map to a database table that stores card ID, position, and a user or workspace owner key.

## Styling

The page should follow the existing app shell and global design tokens. Cards should have modest radius, clear borders, readable spacing, and a visible drag affordance without introducing a new visual system.

## Testing

Add component tests for initial rendering, drag reorder behavior, and persisted order loading.
