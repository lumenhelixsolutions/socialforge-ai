import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle } from "lucide-react";
import { api } from "../lib/api";

export function Health({ diagnostics, availableModels, cards, refresh }) {
  const [auditLog, setAuditLog] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    setLoadingAudit(true);
    api.auditLog(40).then(setAuditLog).catch(() => {}).finally(() => setLoadingAudit(false));
  }, []);

  const stateCounts = useMemo(() => {
    const counts = {};
    for (const card of cards) counts[card.workflow_state] = (counts[card.workflow_state] || 0) + 1;
    return counts;
  }, [cards]);

  const stateOrder = ["inbox", "idea", "drafting", "needs_review", "needs_edit", "approved", "scheduled", "archived"];

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>System Health</h1>
          <p>Diagnostics, DB stats, available models, and recent activity log.</p>
        </div>
        <button className="primary" onClick={() => refresh()}><Activity size={16}/> Refresh</button>
      </header>

      <div className="health-grid">
        <div className="card">
          <h2>Diagnostics</h2>
          {!diagnostics && <p className="muted">No diagnostics loaded.</p>}
          {diagnostics?.checks?.map(c => (
            <div className="check" key={c.name}>
              <CheckCircle size={17} className={c.ok ? "ok" : "warn"} />
              <div><strong>{c.name}</strong><span>{c.message}</span></div>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Board stats <span className="muted">({cards.length} cards total)</span></h2>
          <div className="stat-grid">
            {stateOrder.map(state => (
              <div key={state} className="stat-cell">
                <span className="stat-count">{stateCounts[state] || 0}</span>
                <span className="stat-label">{state.replaceAll("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>Local models</h2>
          {availableModels.length === 0 && <p className="muted">Ollama offline or no models installed.</p>}
          {availableModels.map(m => (
            <div key={m} className="check">
              <CheckCircle size={15} className="ok" />
              <span>{m}</span>
            </div>
          ))}
        </div>

        <div className="card health-audit">
          <h2>Recent activity</h2>
          {loadingAudit && <p className="muted">Loading…</p>}
          {!loadingAudit && auditLog.length === 0 && <p className="muted">No audit events yet.</p>}
          {auditLog.map(ev => (
            <div className="audit-row" key={ev.id}>
              <div className="audit-row-main">
                <span className="audit-entity">{ev.entity_type}</span>
                <strong>{ev.action.replaceAll("_", " ")}</strong>
                {ev.card_title && <span className="muted">"{ev.card_title}"</span>}
              </div>
              <div className="audit-row-states">
                {ev.before_state && <span>{ev.before_state}</span>}
                {ev.before_state && ev.after_state && <span>→</span>}
                {ev.after_state && <span>{ev.after_state}</span>}
              </div>
              <small className="muted">{ev.created_at}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
