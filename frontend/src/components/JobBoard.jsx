import { useMemo, useState } from "react";
import { Activity, Archive, Search, X } from "lucide-react";
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useDroppable, useSensor, useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { columns } from "../lib/constants";
import { guardedMove } from "../lib/utils";
import { TaskCard } from "./TaskCard";

function SortableTaskCard({ card, active, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(card.id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "dragging" : ""}>
      <TaskCard card={card} active={active} onClick={onClick} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function BoardColumn({ id, label, rule, cards, selectedId, selectCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${id}` });
  return (
    <div className={`board-column ${isOver ? "over" : ""}`} ref={setNodeRef}>
      <div className="column-header">
        <div className="column-header-top">
          <strong>{label}</strong>
          {cards.length > 0 && <span className="column-count">{cards.length}</span>}
        </div>
        <span>{rule}</span>
      </div>
      <SortableContext items={cards.map(c => String(c.id))} strategy={verticalListSortingStrategy}>
        <div className="card-stack">
          {cards.map(card => (
            <SortableTaskCard key={card.id} card={card} active={selectedId === card.id} onClick={() => selectCard(card.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function JobBoard({ cards, selectedId, selectCard, refresh, setError }) {
  const [query, setQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterLane, setFilterLane] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const filteredCards = useMemo(() => {
    let out = cards;
    if (!showArchived) out = out.filter(c => c.workflow_state !== "archived");
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.objective || "").toLowerCase().includes(q) ||
        (c.preview || "").toLowerCase().includes(q)
      );
    }
    if (filterPlatform) out = out.filter(c => c.platform === filterPlatform);
    if (filterLane)     out = out.filter(c => c.model_lane === filterLane);
    return out;
  }, [cards, query, filterPlatform, filterLane, showArchived]);

  const grouped = useMemo(() => {
    const result = Object.fromEntries(columns.map(([id]) => [id, []]));
    for (const card of filteredCards) {
      const key = result[card.workflow_state] ? card.workflow_state : "idea";
      result[key].push(card);
    }
    return result;
  }, [filteredCards]);

  const archivedCount = cards.filter(c => c.workflow_state === "archived").length;
  const isFiltered = query || filterPlatform || filterLane;

  async function onDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    const card = cards.find(c => String(c.id) === String(active.id));
    if (!card) return;
    const targetState = String(over.id).replace("column-", "");
    if (!columns.some(([id]) => id === targetState)) return;
    if (targetState === card.workflow_state) return;
    await guardedMove(card, targetState, refresh, selectCard, setError);
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Job Board <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>({cards.length} card{cards.length !== 1 ? "s" : ""})</span></h1>
          <p>Drag cards between states or use inspector actions. Every meaningful move is confirmed.</p>
        </div>
        <button className="primary" onClick={() => refresh()}><Activity size={16}/> Refresh</button>
      </header>

      <div className="board-filter-bar">
        <div className="board-search">
          <Search size={14}/>
          <input
            type="search"
            placeholder="Search cards…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">All platforms</option>
          <option value="x">X</option>
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
          <option value="mastodon">Mastodon</option>
          <option value="youtube">YouTube</option>
          <option value="tiktok">TikTok</option>
        </select>
        <select value={filterLane} onChange={e => setFilterLane(e.target.value)}>
          <option value="">All lanes</option>
          <option value="safe">Safe</option>
          <option value="raw">Raw</option>
          <option value="reviewer">Reviewer</option>
          <option value="polish">Polish</option>
        </select>
        <button
          className={`filter-clear-btn ${showArchived ? "filter-active" : ""}`}
          onClick={() => setShowArchived(s => !s)}
          title={showArchived ? "Hide archived cards" : "Show archived cards"}
        >
          <Archive size={13}/> {showArchived ? "Hide archived" : `Archived (${archivedCount})`}
        </button>
        {isFiltered && (
          <button className="filter-clear-btn" onClick={() => { setQuery(""); setFilterPlatform(""); setFilterLane(""); }}>
            <X size={13}/> Clear
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <div className="board">
          {columns.map(([id, label, rule]) => (
            <BoardColumn key={id} id={id} label={label} rule={rule} cards={grouped[id] || []} selectedId={selectedId} selectCard={selectCard} />
          ))}
        </div>
      </DndContext>
    </section>
  );
}
