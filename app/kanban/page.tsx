import { KanbanBoard } from "../components/kanban-board";

export default function KanbanPage() {
  return (
    <section className="kanban-page">
      <header className="kanban-page-header">
        <h1>Team Roles</h1>
        <div className="kanban-page-instructions">
          <h2>Which roles fit you best?</h2>
          <p>
            Below are six roles that people naturally take on when working in a
            team. There are no good or bad roles &mdash; every team needs all
            six to succeed.
          </p>
          <p>Read each description carefully. Then rank the roles from 1 to 6:</p>
          <ul>
            <li>
              Put at the top (1) the role that suits you best &mdash; the one
              that feels natural and gives you the most energy.
            </li>
            <li>
              Put at the bottom (6) the role that fits you least &mdash; the
              one that drains you or that you&apos;d rather avoid.
            </li>
            <li>Order the rest in between.</li>
          </ul>
          <p>
            Don&apos;t rank them based on what you think you should be, or what
            sounds most impressive. Be honest: which roles would you genuinely
            enjoy doing every day?
          </p>
        </div>
      </header>
      <KanbanBoard />
    </section>
  );
}
