# Kanban Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/kanban` page with six draggable stacked cards whose order persists after refresh.

**Architecture:** The route file stays a Server Component and renders a focused Client Component for browser drag events and `localStorage`. Card data uses stable IDs so the same order model can later be saved in a database table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind global CSS, Vitest, Testing Library.

## Global Constraints

- Create the public route with `app/kanban/page.tsx`.
- Use a Client Component for state, drag event handlers, and `localStorage`.
- Do not add a drag-and-drop dependency for this small vertical reorder interaction.
- Persist an ordered list of stable card IDs in `localStorage`.
- Use the titles `Creator`, `Marketer`, `Buidler`, `Evaluator`, `Emphatiser`, and `Grinder`.
- Keep styling aligned with existing CSS variables and app shell.

---

### Task 1: Kanban Board Component

**Files:**
- Create: `app/components/kanban-board.tsx`
- Test: `app/components/kanban-board.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `export function KanbanBoard(): JSX.Element`
- Produces: draggable cards with `data-testid="kanban-card"` and `data-card-id`

- [ ] **Step 1: Write the failing tests**

Create `app/components/kanban-board.test.tsx` with tests for rendering the six cards, drag reorder persistence, and loading a saved order.

- [ ] **Step 2: Run the component test to verify it fails**

Run: `npm test -- app/components/kanban-board.test.tsx`

Expected: FAIL because `./kanban-board` does not exist.

- [ ] **Step 3: Write the component implementation**

Create `app/components/kanban-board.tsx` as a Client Component. Define the six card records, read saved order in an effect, handle `dragStart`, `dragOver`, and `drop`, and save reordered IDs to `localStorage`.

- [ ] **Step 4: Add page-level styling**

Append `.kanban-*` selectors to `app/globals.css` using existing CSS variables, an 8px radius, and responsive spacing.

- [ ] **Step 5: Run the component test to verify it passes**

Run: `npm test -- app/components/kanban-board.test.tsx`

Expected: PASS.

### Task 2: Kanban Route

**Files:**
- Create: `app/kanban/page.tsx`
- Test: `app/kanban/page.test.tsx`

**Interfaces:**
- Consumes: `KanbanBoard` from `../components/kanban-board`
- Produces: default export `KanbanPage`

- [ ] **Step 1: Write the failing page test**

Create `app/kanban/page.test.tsx` to render `await KanbanPage()` and assert the page heading and board are present.

- [ ] **Step 2: Run the page test to verify it fails**

Run: `npm test -- app/kanban/page.test.tsx`

Expected: FAIL because `app/kanban/page.tsx` does not exist.

- [ ] **Step 3: Write the page implementation**

Create `app/kanban/page.tsx`, import `KanbanBoard`, and render a simple page section with an `h1` and the board.

- [ ] **Step 4: Run the page test to verify it passes**

Run: `npm test -- app/kanban/page.test.tsx`

Expected: PASS.

### Task 3: Full Verification

**Files:**
- Verify: all created and modified files

**Interfaces:**
- Consumes: completed Task 1 and Task 2
- Produces: verified working feature

- [ ] **Step 1: Run focused tests**

Run: `npm test -- app/components/kanban-board.test.tsx app/kanban/page.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run lint**

Run: `npm run lint`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm run build`

Expected: PASS.
