import { Clock, Flame, GripVertical } from "lucide-react";

export function TaskCard({ card, active, onClick, dragHandleProps = {} }) {
  const riskClass = card.risk_score >= 80 ? "risk-low" : card.risk_score >= 60 ? "risk-med" : card.risk_score > 0 ? "risk-high" : "risk-none";
  return (
    <article className={`task-card ${active ? "active" : ""} lane-${card.model_lane}`} onClick={onClick}>
      <div className="card-stripe" data-platform={card.platform}></div>
      <button className="drag-handle" aria-label={`Drag ${card.title}`} onClick={(e) => e.stopPropagation()} {...dragHandleProps}>
        <GripVertical size={15}/>
      </button>
      <div className="task-card-top">
        <span className="badge">{card.card_type}</span>
        <span className="badge">{card.platform}</span>
        {card.model_lane === "raw" && <span className="badge raw"><Flame size={12}/> raw</span>}
      </div>
      <h3>{card.title}</h3>
      <p>{card.preview || card.objective || "No preview yet. Open inspector to program this AI task."}</p>
      <div className="task-meta">
        <span className={`risk-chip ${riskClass}`}>Risk {card.risk_score || "—"}</span>
        <span>{card.approval_state.replaceAll("_", " ")}</span>
        {card.reviewer_notes && <span className="reviewer-notes-badge" title={card.reviewer_notes}>📝</span>}
      </div>
      {card.tags && (
        <div className="card-tags">
          {card.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
            <span key={tag} className="tag-chip">{tag}</span>
          ))}
        </div>
      )}
      {card.scheduled_at && <div className="scheduled"><Clock size={13}/> {card.scheduled_at}</div>}
    </article>
  );
}
