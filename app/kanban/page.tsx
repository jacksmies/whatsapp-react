import { KanbanBoard } from "../components/kanban-board";

export default function KanbanPage() {
  return (
    <section className="kanban-page">
      <header className="kanban-page-header">
        <h1>Kanban</h1>
      </header>
      <KanbanBoard />
    </section>
  );
}
