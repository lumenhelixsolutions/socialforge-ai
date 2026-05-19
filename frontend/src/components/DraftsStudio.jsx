import { useEffect, useState } from "react";
import { FileText, Flame, Plus, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { readableError } from "../lib/utils";

function DraftCard({ draft, onStatus, onPromote, onCreateCard }) {
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const scoreClass = draft.score >= 80 ? "score-ok" : draft.score >= 60 ? "score-med" : "score-bad";
  const scores = [
    ["Clarity", draft.clarity_score], ["Tone", draft.tone_score],
    ["Platform", draft.platform_fit_score], ["Claims", draft.claim_risk_score],
    ["Legal", draft.legal_risk_score], ["Spam", draft.spam_risk_score],
    ["Brand", draft.brand_match_score],
  ].filter(([, v]) => v > 0);

  async function createTaskCard() {
    if (!window.confirm(`Create a task card from this draft? The draft will stay in the Drafts Studio.`)) return;
    setCreating(true);
    try {
      const card = await api.createTaskCard({
        title: draft.topic ? draft.topic.slice(0, 80) : `Draft ${draft.id}`,
        card_type: "post",
        objective: draft.topic || "",
        output_type: "post",
        brand_id: draft.brand_id || null,
        platform: draft.platform,
        source_material: draft.content,
        preview: draft.content,
        ai_role: "writer",
        model_lane: draft.raw_sandbox ? "raw" : "safe",
        constraints: draft.hashtags ? `Hashtags: ${draft.hashtags}` : "",
        workflow_rule: "approval_required",
        execution_plan: "",
      });
      if (onCreateCard) await onCreateCard(card);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={`draft-card ${draft.raw_sandbox ? "raw" : ""} status-${draft.status}`}>
      <div className="draft-card-head" onClick={() => setExpanded(e => !e)}>
        <div className="draft-card-meta">
          <span className="badge">{draft.platform}</span>
          {draft.raw_sandbox ? <span className="badge raw"><Flame size={11}/> raw</span> : <span className="badge">safe</span>}
          <span className={`draft-score ${scoreClass}`}>{draft.score || "—"}</span>
        </div>
        <div className="draft-status-row">
          <select
            value={draft.status}
            onChange={e => { e.stopPropagation(); onStatus(draft.id, e.target.value); }}
            onClick={e => e.stopPropagation()}
            className="draft-status-select"
          >
            <option value="draft">Draft</option>
            <option value="needs_edit">Needs Edit</option>
            <option value="approved">Approved</option>
            <option value="scheduled">Scheduled</option>
            <option value="rejected">Rejected</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="draft-content">
        {draft.content}
      </div>

      {expanded && (
        <div className="draft-details">
          {draft.hook && <p><strong>Hook:</strong> {draft.hook}</p>}
          {draft.hashtags && <p><strong>Hashtags:</strong> {draft.hashtags}</p>}
          {draft.risk_notes && <p><strong>Risk notes:</strong> {draft.risk_notes}</p>}
          {scores.length > 0 && (
            <div className="score-grid">
              {scores.map(([label, value]) => (
                <span key={label} className={`${value >= 80 ? "score-ok" : value >= 60 ? "score-med" : "score-bad"}`}>
                  {label}: {value}
                </span>
              ))}
            </div>
          )}
          {draft.raw_sandbox && (
            <button className="primary" style={{ marginTop: 8 }} onClick={() => onPromote(draft)}>
              <Flame size={13}/> Promote to Safe Draft
            </button>
          )}
          <button className="draft-to-card-btn" onClick={createTaskCard} disabled={creating}>
            <Plus size={13}/> {creating ? "Creating…" : "→ Create Task Card"}
          </button>
        </div>
      )}

      <button className="draft-expand-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? "▲ Less" : "▼ More"}
      </button>
    </div>
  );
}

export function DraftsStudio({ brands, onCardCreated }) {
  const emptyForm = {
    topic: "", platform: "x", lane: "safe", brand_id: "",
    goal: "engagement", tone: "clear, useful, human", count: 5,
  };
  const [form, setForm] = useState(emptyForm);
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.drafts().then(setDrafts).catch(() => {});
  }, []);

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function generate(e) {
    e.preventDefault();
    setGenerating(true);
    setMessage("");
    try {
      const result = await api.generateDrafts({
        ...form,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        count: Number(form.count),
      });
      setDrafts(prev => [...result.drafts, ...prev]);
      setMessage(`Generated ${result.drafts.length} draft${result.drafts.length !== 1 ? "s" : ""}.`);
    } catch (err) {
      setMessage(readableError(err));
    } finally {
      setGenerating(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      const updated = await api.updateDraftStatus(id, status);
      setDrafts(prev => prev.map(d => d.id === id ? updated : d));
    } catch (err) {
      setMessage(readableError(err));
    }
  }

  async function promote(draft) {
    if (!window.confirm(`Promote raw draft to a reviewed safe draft? The original will be archived.`)) return;
    try {
      const promoted = await api.promoteDraft(draft.id);
      setDrafts(prev => prev.map(d => d.id === draft.id ? { ...d, status: "archived" } : d));
      setDrafts(prev => [promoted, ...prev]);
    } catch (err) {
      setMessage(readableError(err));
    }
  }

  const activeDrafts = drafts.filter(d => d.status !== "archived");
  const archivedCount = drafts.length - activeDrafts.length;

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Drafts Studio</h1>
          <p>Generate AI drafts from a topic brief. Safe lane for review-ready content; raw lane for creative exploration before promotion.</p>
        </div>
      </header>

      <form className="card form" onSubmit={generate}>
        <h2><FileText size={16}/> Generate drafts</h2>
        <label>Topic / brief
          <textarea
            value={form.topic}
            onChange={e => update("topic", e.target.value)}
            required
            placeholder="What should the AI write about? Include key angles, context, or seed ideas."
            style={{ minHeight: 80 }}
          />
        </label>
        <div className="grid three">
          <label>Platform
            <select value={form.platform} onChange={e => update("platform", e.target.value)}>
              <option value="x">X</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="mastodon">Mastodon</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>
          </label>
          <label>Lane
            <select value={form.lane} onChange={e => update("lane", e.target.value)}>
              <option value="safe">Safe (reviewed)</option>
              <option value="raw">Raw (creative)</option>
            </select>
          </label>
          <label>Count
            <select value={form.count} onChange={e => update("count", e.target.value)}>
              {[1, 2, 3, 5, 7, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="grid two">
          <label>Brand (optional)
            <select value={form.brand_id} onChange={e => update("brand_id", e.target.value)}>
              <option value="">No brand</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label>Goal
            <input value={form.goal} onChange={e => update("goal", e.target.value)} placeholder="engagement" />
          </label>
        </div>
        <label>Tone
          <input value={form.tone} onChange={e => update("tone", e.target.value)} placeholder="clear, useful, human" />
        </label>
        <button className="primary" disabled={generating}>
          <Sparkles size={15}/> {generating ? "Generating…" : "Generate Drafts"}
        </button>
        {message && <p className="note">{message}</p>}
      </form>

      {activeDrafts.length > 0 && (
        <div className="drafts-list">
          <div className="drafts-list-head">
            <strong>{activeDrafts.length} active draft{activeDrafts.length !== 1 ? "s" : ""}</strong>
            {archivedCount > 0 && <span className="muted">{archivedCount} archived</span>}
          </div>
          {activeDrafts.map(draft => (
            <DraftCard key={draft.id} draft={draft} onStatus={updateStatus} onPromote={promote} onCreateCard={onCardCreated} />
          ))}
        </div>
      )}

      {activeDrafts.length === 0 && drafts.length === 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <p>No drafts yet. Generate some above — or they'll appear here once created.</p>
        </div>
      )}
    </section>
  );
}
