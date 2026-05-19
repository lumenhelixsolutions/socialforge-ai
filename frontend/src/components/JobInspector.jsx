import { useCallback, useEffect, useRef, useState } from "react";
import {
  Archive, Bot, CalendarDays, CheckCircle, ChevronRight, Flame,
  ListChecks, Pencil, Plus, Sparkles, Trash2, Wand2,
} from "lucide-react";
import { api } from "../lib/api";
import { readableError, guardedMove, getPlatformRule, analyzePreview } from "../lib/utils";
import { cardTypes, outputTypes, aiRoles, modelLanes } from "../lib/constants";

function RiskBreakdown({ card }) {
  if (!card.risk_score) return null;
  const scores = [
    ["Clarity",     card.clarity_score],
    ["Tone",        card.tone_score],
    ["Platform",    card.platform_fit_score],
    ["Claims",      card.claim_risk_score],
    ["Legal",       card.legal_risk_score],
    ["Spam",        card.spam_risk_score],
    ["Brand match", card.brand_match_score],
  ].filter(([, v]) => v != null && v !== 0);

  if (scores.length === 0) return null;

  return (
    <section className="inspector-section">
      <h3>Risk breakdown</h3>
      <div className="score-grid">
        {scores.map(([label, value]) => (
          <span key={label} className={value >= 80 ? "score-ok" : value >= 60 ? "score-med" : "score-bad"}>
            {label}: {value}
          </span>
        ))}
      </div>
    </section>
  );
}

function PlatformPreviewCard({ card, text, analysis }) {
  return (
    <div className={`platform-render platform-render-${card.platform}`}>
      <div className="platform-render-head">
        <strong>{analysis.label} Preview</strong>
        <span>{card.card_type} · {card.output_type}</span>
      </div>

      {card.platform === "instagram" && <div className="media-placeholder">Media / image placeholder</div>}
      {card.platform === "youtube" && <div className="media-placeholder">Video title / description / thumbnail prompt</div>}
      {card.platform === "tiktok" && <div className="media-placeholder">Short video hook + visual beats</div>}
      {card.platform === "mastodon" && <div className="content-warning-row">CW option: add content warning in future editor pass</div>}

      <div className="platform-body">
        {text
          ? text.split("\n").map((line, idx) => <p key={idx}>{line || " "}</p>)
          : <p>No preview yet.</p>}
      </div>

      {analysis.threadParts.length > 1 && (
        <div className="thread-preview">
          <strong>Thread split preview</strong>
          {analysis.threadParts.map((part, idx) => <div key={idx}>{idx + 1}/{analysis.threadParts.length}: {part}</div>)}
        </div>
      )}

      {(analysis.hashtags.length > 0 || analysis.links.length > 0) && (
        <div className="preview-detected">
          {analysis.hashtags.length > 0 && <span>Hashtags: {analysis.hashtags.join(" ")}</span>}
          {analysis.links.length > 0 && <span>Links: {analysis.links.length}</span>}
        </div>
      )}

      <small>{analysis.note}</small>
    </div>
  );
}

function EditablePreviewPanel({ card, platformPreviewRules, refresh, selectCard, setError }) {
  const [draft, setDraft] = useState(card.preview || card.source_material || "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    setDraft(card.preview || card.source_material || "");
  }, [card.id, card.preview, card.source_material]);

  const autoResize = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(150, el.scrollHeight) + "px";
  }, []);

  useEffect(() => { autoResize(textareaRef.current); }, [draft, autoResize]);

  const analysis = analyzePreview(draft, card.platform, platformPreviewRules);
  const fieldHints = platformPreviewRules?.[card.platform]?.fields || [];
  const pct = Math.min(100, (analysis.chars / analysis.max) * 100);

  async function savePreview() {
    setSaving(true);
    try {
      const updated = await api.updateTaskCard(card.id, { preview: draft });
      await refresh(updated.id);
      await selectCard(updated.id);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="inspector-section">
      <h3>Preview editor</h3>
      {fieldHints.length > 0 && (
        <div className="field-hints">
          <span>Expected fields:</span>
          {fieldHints.map(f => <span key={f} className="field-hint-chip">{f.replaceAll("_", " ")}</span>)}
        </div>
      )}
      <div className="preview-editor">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => { setDraft(e.target.value); autoResize(e.target); }}
          placeholder="Write or edit the visible output for this card."
          style={{ overflow: "hidden", minHeight: 150, resize: "none" }}
        />
        <div className="char-bar-wrap">
          <div className={`char-bar ${analysis.over ? "over" : pct > 85 ? "warn" : ""}`}>
            <div className="char-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className={`preview-stats ${analysis.over ? "over-limit" : ""}`}>
            <strong>{analysis.label}</strong>
            <span>{analysis.chars} / {analysis.max}</span>
            <span>{analysis.over ? `${Math.abs(analysis.remaining)} over` : `${analysis.remaining} left`}</span>
          </div>
        </div>
        <button className="primary full" onClick={savePreview} disabled={saving}>{saving ? "Saving…" : "Save Preview"}</button>
      </div>
      <PlatformPreviewCard card={card} text={draft} analysis={analysis} />
    </section>
  );
}

export function JobInspector({ detail, selectedCard, platformPreviewRules, brands, campaigns, availableModels, refresh, selectCard, setError, addToast }) {
  const card = detail?.card || selectedCard;
  const [schedule, setSchedule] = useState("");
  const [running, setRunning] = useState("");
  const [itab, setItab] = useState("setup");
  const [selectedModel, setSelectedModel] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setEditForm({
      title: card.title,
      card_type: card.card_type,
      objective: card.objective,
      output_type: card.output_type,
      platform: card.platform,
      ai_role: card.ai_role,
      model_lane: card.model_lane,
      constraints: card.constraints,
      execution_plan: card.execution_plan,
      source_material: card.source_material,
      workflow_rule: card.workflow_rule,
      tags: card.tags || "",
    });
    setEditMode(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.updateTaskCard(card.id, editForm);
      await refresh(card.id);
      await selectCard(card.id);
      setEditMode(false);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setSaving(false);
    }
  }

  function ue(k, v) { setEditForm(prev => ({ ...prev, [k]: v })); }

  if (!card) {
    return (
      <aside className="inspector">
        <div className="inspector-empty">
          <h2>No card selected</h2>
          <p>Select a card from the board to inspect its AI task setup, preview, risk score, and history.</p>
        </div>
      </aside>
    );
  }

  async function action(actionName) {
    const actionLabels = {
      generate:    "Generate output for this card?",
      review:      "Run reviewer on this card?",
      polish:      `Polish the current draft for ${card.platform}? The model will refine the existing content.`,
      promote_raw: "Promote this raw card into a safe child card?",
      split_bulk:  "Create child job cards from this bulk/campaign card?",
      archive:     "Archive this card?",
    };
    if (!window.confirm(actionLabels[actionName] || `Run ${actionName}?`)) return;
    setRunning(actionName);
    try {
      const result = await api.cardAction(card.id, actionName, selectedModel || undefined);
      if (result?.id) {
        await refresh(result.id);
        await selectCard(result.id);
      } else if (result?.children?.length) {
        await refresh(result.children[0].id);
        await selectCard(result.children[0].id);
      } else {
        await refresh(card.id);
      }
    } catch (err) {
      setError(readableError(err));
    } finally {
      setRunning("");
    }
  }

  function exportCard() {
    api.exportTaskCard(card.id).then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `card-${card.id}-${card.title.replace(/\s+/g, "-").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }).catch(err => setError(readableError(err)));
  }

  async function move(target_state) {
    await guardedMove(
      card, target_state, refresh, selectCard, setError,
      target_state === "scheduled" ? { scheduled_at: schedule || new Date(Date.now() + 86400000).toISOString() } : {}
    );
  }

  async function duplicateCard() {
    if (!window.confirm(`Duplicate "${card.title}"? A copy will be created in ${card.model_lane === "raw" ? "Drafting" : "Idea"} state.`)) return;
    try {
      const copy = await api.duplicateTaskCard(card.id);
      addToast?.(`Duplicated as "${copy.title}"`, "success");
      await refresh(copy.id);
      await selectCard(copy.id);
    } catch (err) {
      setError(readableError(err));
    }
  }

  async function deleteCard() {
    if (!window.confirm(`Permanently delete "${card.title}"? This cannot be undone.`)) return;
    try {
      await api.deleteTaskCard(card.id);
      addToast?.(`Deleted "${card.title}"`, "info");
      await refresh(null);
    } catch (err) {
      setError(readableError(err));
    }
  }

  const explanation = detail?.explanation;
  const history = detail?.history || [];
  const brand = brands.find(b => b.id === card.brand_id);
  const campaign = campaigns.find(c => c.id === card.campaign_id);

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <div>
          <h2>{card.title}</h2>
          <div className="inspector-badges">
            <span className={`badge ${card.model_lane === "raw" ? "raw" : ""}`}>{card.model_lane}</span>
            <span className="badge">{card.workflow_state.replaceAll("_", " ")}</span>
            {card.risk_score > 0 && (
              <span className={`badge ${card.risk_score >= 80 ? "risk-badge-ok" : card.risk_score >= 60 ? "risk-badge-med" : "risk-badge-bad"}`}>
                Risk {card.risk_score}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="inspector-tabs">
        {[["setup", "Setup"], ["preview", "Preview"], ["actions", "Actions"], ["history", "History"]].map(([id, label]) => (
          <button key={id} className={itab === id ? "active" : ""} onClick={() => setItab(id)}>{label}</button>
        ))}
      </div>

      {itab === "setup" && !editMode && (
        <>
          <section className="inspector-section">
            <div className="section-head-row">
              <h3>Card</h3>
              <button className="icon-btn" onClick={startEdit} title="Edit card fields"><Pencil size={13}/> Edit</button>
            </div>
            <dl>
              <dt>Type</dt><dd>{card.card_type} / {card.output_type}</dd>
              <dt>Platform</dt><dd>{card.platform}</dd>
              <dt>Approval</dt><dd>{card.approval_state.replaceAll("_", " ")}</dd>
              {card.scheduled_at && <><dt>Scheduled</dt><dd>{card.scheduled_at}</dd></>}
              {brand && <><dt>Brand</dt><dd>{brand.name}</dd></>}
              {campaign && <><dt>Campaign</dt><dd>{campaign.name}</dd></>}
            </dl>
          </section>

          {card.tags && (
            <section className="inspector-section" style={{ paddingTop: 0 }}>
              <div className="card-tags">
                {card.tags.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="tag-chip">{tag}</span>
                ))}
              </div>
            </section>
          )}

          <section className="inspector-section">
            <h3>AI task</h3>
            <p><strong>Objective:</strong> {card.objective || "No objective set."}</p>
            <p><strong>Role:</strong> {card.ai_role} · {card.model_lane}</p>
            {card.constraints && <p><strong>Constraints:</strong> {card.constraints}</p>}
            {card.execution_plan && <p><strong>Execution:</strong> {card.execution_plan}</p>}
            {card.source_material && (
              <details className="source-material-details">
                <summary>Source material</summary>
                <p>{card.source_material}</p>
              </details>
            )}
          </section>

          {card.reviewer_notes && (
            <section className="inspector-section">
              <h3>Reviewer notes</h3>
              <p>{card.reviewer_notes}</p>
            </section>
          )}

          {explanation && (
            <section className="inspector-section">
              <h3>Next action</h3>
              <p>{explanation.what_happens_next}</p>
            </section>
          )}

          {detail?.children?.length > 0 && (
            <section className="inspector-section">
              <h3>Child jobs</h3>
              {detail.children.map(child => (
                <button key={child.id} className="child-link" onClick={() => selectCard(child.id)}>
                  <ChevronRight size={14}/> {child.title}
                </button>
              ))}
            </section>
          )}
        </>
      )}

      {itab === "setup" && editMode && (
        <div className="inspector-edit-form">
          <div className="inspector-edit-head">
            <strong>Edit card fields</strong>
            <button className="icon-btn" onClick={() => setEditMode(false)}>Cancel</button>
          </div>

          <label>Title
            <input value={editForm.title} onChange={e => ue("title", e.target.value)} />
          </label>

          <div className="grid two">
            <label>Card type
              <select value={editForm.card_type} onChange={e => ue("card_type", e.target.value)}>
                {cardTypes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Output type
              <select value={editForm.output_type} onChange={e => ue("output_type", e.target.value)}>
                {outputTypes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <div className="grid two">
            <label>Platform
              <select value={editForm.platform} onChange={e => ue("platform", e.target.value)}>
                <option value="x">X</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
                <option value="mastodon">Mastodon</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </label>
            <label>AI role
              <select value={editForm.ai_role} onChange={e => ue("ai_role", e.target.value)}>
                {aiRoles.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>

          <div className="grid two">
            <label>Model lane
              <select value={editForm.model_lane} onChange={e => ue("model_lane", e.target.value)}>
                {modelLanes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Workflow rule
              <select value={editForm.workflow_rule} onChange={e => ue("workflow_rule", e.target.value)}>
                <option value="approval_required">Approval required</option>
                <option value="auto_approve">Auto approve</option>
                <option value="review_only">Review only</option>
              </select>
            </label>
          </div>

          <label>Objective
            <textarea value={editForm.objective} onChange={e => ue("objective", e.target.value)} style={{ minHeight: 70 }} />
          </label>

          <label>Constraints
            <textarea value={editForm.constraints} onChange={e => ue("constraints", e.target.value)} style={{ minHeight: 70 }} />
          </label>

          <label>Execution plan
            <textarea value={editForm.execution_plan} onChange={e => ue("execution_plan", e.target.value)} style={{ minHeight: 70 }} />
          </label>

          <label>Source material
            <textarea value={editForm.source_material} onChange={e => ue("source_material", e.target.value)} style={{ minHeight: 80 }} />
          </label>

          <label>Tags
            <input value={editForm.tags} onChange={e => ue("tags", e.target.value)} placeholder="launch, q2, organic (comma separated)" />
          </label>

          <button className="primary" onClick={saveEdit} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      {itab === "preview" && (
        <>
          <RiskBreakdown card={card} />
          <EditablePreviewPanel
            card={card}
            platformPreviewRules={platformPreviewRules}
            refresh={refresh}
            selectCard={selectCard}
            setError={setError}
          />
        </>
      )}

      {itab === "actions" && (
        <>
          <section className="inspector-section">
            <h3>AI actions</h3>
            {availableModels.length > 0 && (
              <div className="model-picker">
                <label>Model</label>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                  <option value="">Default</option>
                  {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
            <div className="action-grid">
              <button onClick={() => action("generate")} disabled={!!running} className={running === "generate" ? "running" : ""}><Sparkles size={14}/> {running === "generate" ? "Generating…" : "Generate"}</button>
              <button onClick={() => action("polish")}   disabled={!!running} className={running === "polish"   ? "running" : ""}><Wand2 size={14}/> {running === "polish"   ? "Polishing…" : "Polish"}</button>
              <button onClick={() => action("review")}   disabled={!!running} className={running === "review"   ? "running" : ""}><ListChecks size={14}/> {running === "review"   ? "Reviewing…" : "Review"}</button>
              <button onClick={() => action("promote_raw")} disabled={!!running}><Flame size={14}/> Promote Raw</button>
              <button onClick={() => action("split_bulk")}  disabled={!!running}><Bot size={14}/> Split Bulk</button>
            </div>
          </section>

          <section className="inspector-section">
            <h3>Move</h3>
            <div className="action-grid">
              <button onClick={() => move("approved")}   disabled={!!running}><CheckCircle size={14}/> Approve</button>
              <button onClick={() => move("needs_edit")} disabled={!!running}><Pencil size={14}/> Send to Edit</button>
              <button onClick={() => move("archived")}   disabled={!!running}><Archive size={14}/> Archive</button>
            </div>
          </section>

          <section className="inspector-section">
            <h3>Schedule</h3>
            <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} />
            <button className="primary full" onClick={() => move("scheduled")} disabled={!!running}><CalendarDays size={14}/> Schedule Card</button>
            <small>Scheduling creates a local job state. It does not publish to any platform.</small>
          </section>

          <section className="inspector-section">
            <h3>Duplicate &amp; export</h3>
            <button className="action-grid-full" onClick={duplicateCard}>⊕ Duplicate card</button>
            <button className="action-grid-full" onClick={exportCard} style={{ marginTop: 6 }}>↓ Export card as JSON</button>
            <small>Duplicate creates an identical card in Idea/Drafting state. Export downloads JSON you can re-import.</small>
          </section>

          <section className="inspector-section">
            <h3>Delete</h3>
            <button className="action-grid-full danger" onClick={deleteCard}>
              <Trash2 size={13}/> Permanently delete card
            </button>
            <small>Removes the card and its audit history. Cannot be undone.</small>
          </section>
        </>
      )}

      {itab === "history" && (
        <section className="inspector-section">
          <h3>History</h3>
          {history.length === 0 && <p>No card history yet.</p>}
          {history.slice(0, 12).map(event => (
            <div className="history-row" key={event.id}>
              <strong>{event.action}</strong>
              <span>{event.before_state || "—"} → {event.after_state || "—"}</span>
              <small>{event.created_at}</small>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}
