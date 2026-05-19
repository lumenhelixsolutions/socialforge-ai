import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Archive,
  Bot,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  Flame,
  FolderKanban,
  GripVertical,
  LayoutDashboard,
  ListChecks,
  Pencil,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "./lib/api";
import "./styles.css";

const columns = [
  ["inbox",       "Inbox",        "Capture rough work."],
  ["idea",        "Idea",         "Define objective and setup."],
  ["drafting",    "Drafting",     "AI creates or edits output."],
  ["needs_review","Needs Review", "Review risk and fit."],
  ["needs_edit",  "Needs Edit",   "Returned for revision."],
  ["approved",    "Approved",     "Ready to schedule."],
  ["scheduled",   "Scheduled",    "Placed on calendar."],
  ["archived",    "Archived",     "Preserved, inactive."],
];

const cardTypes = ["post", "image", "video", "campaign", "bulk", "review", "polish", "repurpose"];
const outputTypes = ["post", "thread", "caption", "image", "video_script", "carousel", "campaign", "review", "polish"];
const aiRoles = ["strategist", "writer", "designer", "reviewer", "scheduler", "editor", "repurposer", "polisher"];
const modelLanes = ["safe", "raw", "reviewer", "polish", "image", "video"];

// Fallback templates used before meta loads
const FALLBACK_TEMPLATES = [
  { id: "thought_leader_post", label: "Thought Leader Post", card_type: "post", output_type: "post", ai_role: "writer", model_lane: "safe", platform: "x", constraints: "Clear, useful, confident. Avoid hype and unsupported claims.", execution_plan: "Create 3 concise post variants, then select the clearest one." },
  { id: "launch_week_bulk", label: "Launch Week Bulk Plan", card_type: "bulk", output_type: "campaign", ai_role: "strategist", model_lane: "safe", platform: "x", constraints: "Distribute ideas across multiple days. Each child job requires review.", execution_plan: "Create a one-week campaign plan and split it into child post jobs." },
  { id: "raw_creative_sandbox", label: "Raw Creative Sandbox", card_type: "post", output_type: "post", ai_role: "writer", model_lane: "raw", platform: "x", constraints: "Generate edgy creative angles only. Draft-only. Must be promoted before approval.", execution_plan: "Generate raw variants for inspiration, then promote one to a safe reviewed card." },
  { id: "image_prompt_job", label: "Image Prompt Job", card_type: "image", output_type: "image", ai_role: "designer", model_lane: "image", platform: "instagram", constraints: "Create image prompt, alt text, and caption. Do not publish directly.", execution_plan: "Generate one image concept, one prompt, one alt-text draft, and one caption." },
  { id: "short_video_script", label: "Short Video Script", card_type: "video", output_type: "video_script", ai_role: "editor", model_lane: "safe", platform: "tiktok", constraints: "Hook in first 2 seconds. Keep script under 45 seconds.", execution_plan: "Create hook, scene beats, spoken script, caption, and visual notes." },
];

// Fallback platform rules used before meta loads
const FALLBACK_PLATFORM_RULES = {
  x:        { label: "X / Twitter",  max: 280,  note: "Compact post preview with character count and thread warning." },
  linkedin:  { label: "LinkedIn",     max: 3000, note: "Professional long-form paragraph preview." },
  instagram: { label: "Instagram",    max: 2200, note: "Caption, hashtags, media placeholder, and alt-text reminder." },
  mastodon:  { label: "Mastodon",     max: 500,  note: "Content warning and instance-aware post preview." },
  youtube:   { label: "YouTube",      max: 5000, note: "Title/description/shorts script preview." },
  tiktok:    { label: "TikTok",       max: 2200, note: "Hook, visual beats, caption, and short video structure." },
};

function getPlatformRule(platform, metaRules) {
  if (metaRules && metaRules[platform]) {
    const r = metaRules[platform];
    return { label: r.label, max: r.max_chars, note: r.wysiwyg_note };
  }
  return FALLBACK_PLATFORM_RULES[platform] || FALLBACK_PLATFORM_RULES.x;
}

function analyzePreview(text, platform, metaRules) {
  const rule = getPlatformRule(platform, metaRules);
  const value = text || "";
  const hashtags = value.split(/\s+/).filter(x => x.startsWith("#") && x.length > 1);
  const links = value.split(/\s+/).filter(x => x.startsWith("http://") || x.startsWith("https://"));
  const paragraphs = value.split(/\n+/).filter(x => x.trim().length > 0);
  const over = value.length > rule.max;
  const threadParts = [];
  if (platform === "x" && over) {
    const words = value.split(/\s+/);
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > rule.max) {
        if (current) threadParts.push(current);
        current = word;
      } else {
        current = (current + " " + word).trim();
      }
    }
    if (current) threadParts.push(current);
  }
  return { ...rule, chars: value.length, remaining: rule.max - value.length, over, hashtags, links, paragraphs, threadParts };
}

function App() {
  const [tab, setTab] = useState("board");
  const [diagnostics, setDiagnostics] = useState(null);
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [error, setError] = useState("");

  async function refreshAll(nextSelectedId = selectedId) {
    setError("");
    try {
      const [d, b, camp, tc, m] = await Promise.all([
        api.diagnostics(),
        api.brands(),
        api.campaigns(),
        api.taskCards(),
        api.taskCardMeta(),
      ]);
      setDiagnostics(d);
      setBrands(b);
      setCampaigns(camp);
      setCards(tc);
      setMeta(m);
      if (nextSelectedId) {
        const detail = await api.taskCard(nextSelectedId);
        setSelectedDetail(detail);
      }
    } catch (err) {
      setError(readableError(err));
    }
  }

  async function selectCard(id) {
    setSelectedId(id);
    try {
      setSelectedDetail(await api.taskCard(id));
    } catch (err) {
      setError(readableError(err));
    }
  }

  useEffect(() => { refreshAll(null); }, []);

  const selectedCard = selectedDetail?.card || cards.find(c => c.id === selectedId) || null;
  const platformPreviewRules = meta?.platform_preview_rules || null;
  const templates = meta?.templates || FALLBACK_TEMPLATES;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brandmark">
          <div className="logo">SF</div>
          <div>
            <strong>SocialForge AI</strong>
            <span>v0.3.2 local-first</span>
          </div>
        </div>

        <nav>
          <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}><LayoutDashboard size={18}/> Job Board</button>
          <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}><Plus size={18}/> New Card</button>
          <button className={tab === "drafts" ? "active" : ""} onClick={() => setTab("drafts")}><FileText size={18}/> Drafts</button>
          <button className={tab === "brands" ? "active" : ""} onClick={() => setTab("brands")}><Tag size={18}/> Brands</button>
          <button className={tab === "campaigns" ? "active" : ""} onClick={() => setTab("campaigns")}><FolderKanban size={18}/> Campaigns</button>
          <button className={tab === "calendar" ? "active" : ""} onClick={() => setTab("calendar")}><CalendarDays size={18}/> Calendar</button>
          <button className={tab === "health" ? "active" : ""} onClick={() => setTab("health")}><Activity size={18}/> Health</button>
        </nav>

        <div className="small-card">
          <strong>Card doctrine</strong>
          <p>A card is a visible, inspectable, schedulable, programmable AI work order.</p>
        </div>
      </aside>

      <main className="main split-main">
        <section className="workspace">
          {error && <div className="error">Note: {error}</div>}

          {tab === "board" && (
            <JobBoard
              cards={cards}
              selectedId={selectedId}
              selectCard={selectCard}
              refresh={refreshAll}
              setError={setError}
            />
          )}

          {tab === "create" && (
            <TaskCardCreator
              brands={brands}
              campaigns={campaigns}
              templates={templates}
              refresh={refreshAll}
              selectCard={selectCard}
            />
          )}

          {tab === "drafts" && (
            <DraftsStudio brands={brands} />
          )}

          {tab === "brands" && (
            <BrandsManager brands={brands} refresh={refreshAll} setError={setError} />
          )}

          {tab === "campaigns" && (
            <CampaignsManager
              campaigns={campaigns}
              cards={cards}
              brands={brands}
              refresh={refreshAll}
              selectCard={(id) => { selectCard(id); setTab("board"); }}
              setError={setError}
            />
          )}

          {tab === "calendar" && (
            <CalendarSurface cards={cards} refresh={refreshAll} selectCard={selectCard} setError={setError} />
          )}

          {tab === "health" && (
            <Health diagnostics={diagnostics} refresh={refreshAll} />
          )}
        </section>

        <JobInspector
          detail={selectedDetail}
          selectedCard={selectedCard}
          platformPreviewRules={platformPreviewRules}
          brands={brands}
          campaigns={campaigns}
          refresh={refreshAll}
          selectCard={selectCard}
          setError={setError}
        />
      </main>
    </div>
  );
}

function readableError(err) {
  try {
    const obj = JSON.parse(String(err.message));
    return obj.detail || err.message;
  } catch {
    return err.message || String(err);
  }
}

async function guardedMove(card, targetState, refresh, selectCard, setError, options = {}) {
  const message = transitionMessage(card, targetState);
  if (!window.confirm(message)) return;

  try {
    const payload = { target_state: targetState };
    if (targetState === "scheduled") {
      payload.scheduled_at = options.scheduled_at || new Date(Date.now() + 86400000).toISOString();
    }
    const updated = await api.moveTaskCard(card.id, payload);
    await refresh(updated.id);
    await selectCard(updated.id);
  } catch (err) {
    setError(readableError(err));
  }
}

function transitionMessage(card, targetState) {
  if (targetState === "scheduled") {
    return `Schedule "${card.title}"?\n\nThis creates a local scheduled job state. It does not publish to any platform.`;
  }
  if (targetState === "approved") {
    return `Approve "${card.title}"?\n\nApproval means it can be scheduled. Raw cards cannot be approved directly.`;
  }
  if (targetState === "archived") {
    return `Archive "${card.title}"?\n\nThe card remains in history but leaves the active workflow.`;
  }
  if (targetState === "needs_edit") {
    return `Send "${card.title}" back to editing?`;
  }
  return `Move "${card.title}" to ${targetState.replaceAll("_", " ")}?`;
}

function JobBoard({ cards, selectedId, selectCard, refresh, setError }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const grouped = useMemo(() => {
    const result = Object.fromEntries(columns.map(([id]) => [id, []]));
    for (const card of cards) {
      const key = result[card.workflow_state] ? card.workflow_state : "idea";
      result[key].push(card);
    }
    return result;
  }, [cards]);

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
          <h1>Job Board</h1>
          <p>Drag cards between states or use inspector actions. Every meaningful move is confirmed.</p>
        </div>
        <button className="primary" onClick={() => refresh()}><Activity size={16}/> Refresh</button>
      </header>

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

function BoardColumn({ id, label, rule, cards, selectedId, selectCard }) {
  const { setNodeRef, isOver } = useDroppable({ id: `column-${id}` });
  return (
    <div className={`board-column ${isOver ? "over" : ""}`} ref={setNodeRef}>
      <div className="column-header">
        <strong>{label}</strong>
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

function SortableTaskCard({ card, active, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: String(card.id) });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "dragging" : ""}>
      <TaskCard card={card} active={active} onClick={onClick} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function TaskCard({ card, active, onClick, dragHandleProps = {} }) {
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
      </div>
      {card.scheduled_at && <div className="scheduled"><Clock size={13}/> {card.scheduled_at}</div>}
    </article>
  );
}

function TaskCardCreator({ brands, campaigns, templates, refresh, selectCard }) {
  const [form, setForm] = useState({
    title: "", card_type: "post", objective: "", output_type: "post",
    brand_id: "", campaign_id: "", platform: "x", source_material: "", ai_role: "writer",
    model_lane: "safe", constraints: "", workflow_rule: "approval_required",
    execution_plan: "", preview: "",
  });
  const [message, setMessage] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importError, setImportError] = useState("");

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  function loadFromJson() {
    setImportError("");
    try {
      const parsed = JSON.parse(importJson);
      const fields = parsed.exported_fields || parsed;
      setForm(prev => ({ ...prev, ...fields, brand_id: prev.brand_id }));
      setImportJson("");
      setImportError("Loaded — review the fields below, then create the card.");
    } catch {
      setImportError("Invalid JSON. Paste the full exported card JSON.");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      const card = await api.createTaskCard({
        ...form,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
      });
      await refresh(card.id);
      await selectCard(card.id);
      setMessage("Visual AI task card created.");
    } catch (err) {
      setMessage(readableError(err));
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>New Visual AI Task Card</h1>
          <p>Program the AI task with structured fields instead of a giant prompt.</p>
        </div>
      </header>

      <form className="card form" onSubmit={submit}>
        <div className="template-panel">
          <strong>Template presets</strong>
          <div className="template-chips">
            {templates.map(t => (
              <button type="button" key={t.id} onClick={() => setForm(prev => ({ ...prev, ...t }))}>{t.label}</button>
            ))}
          </div>
        </div>

        <PresetsPanel form={form} onLoad={fields => setForm(prev => ({ ...prev, ...fields }))} />

        <SetupStep n="1" title="Objective">
          <label>Card title <input value={form.title} onChange={e => update("title", e.target.value)} required placeholder="OIQ launch post" /></label>
          <label>Objective <textarea value={form.objective} onChange={e => update("objective", e.target.value)} placeholder="What should this AI job accomplish?" /></label>
        </SetupStep>

        <SetupStep n="2" title="Output and destination">
          <div className="grid two">
            <label>Output type
              <select value={form.output_type} onChange={e => update("output_type", e.target.value)}>
                {outputTypes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Workflow rule
              <select value={form.workflow_rule} onChange={e => update("workflow_rule", e.target.value)}>
                <option value="approval_required">Approval required</option>
                <option value="auto_approve">Auto approve</option>
                <option value="review_only">Review only</option>
              </select>
            </label>
          </div>
          <div className="grid two">
            <label>Brand / project
              <select value={form.brand_id} onChange={e => update("brand_id", e.target.value)}>
                <option value="">No brand profile</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
            <label>Campaign
              <select value={form.campaign_id} onChange={e => update("campaign_id", e.target.value)}>
                <option value="">No campaign</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="grid two">
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
            <label>Card type
              <select value={form.card_type} onChange={e => update("card_type", e.target.value)}>
                {cardTypes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
        </SetupStep>

        <SetupStep n="3" title="AI programming">
          <div className="grid two">
            <label>AI role
              <select value={form.ai_role} onChange={e => update("ai_role", e.target.value)}>
                {aiRoles.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Model lane
              <select value={form.model_lane} onChange={e => update("model_lane", e.target.value)}>
                {modelLanes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <label>Source material <textarea value={form.source_material} onChange={e => update("source_material", e.target.value)} placeholder="Notes, transcript, brief, link summary, or seed idea." /></label>
          <label>Constraints <textarea value={form.constraints} onChange={e => update("constraints", e.target.value)} placeholder="Tone, length, claims to avoid, required phrases, CTA, safety limits." /></label>
          <label>Execution plan <textarea value={form.execution_plan} onChange={e => update("execution_plan", e.target.value)} placeholder="What steps should the AI perform?" /></label>
        </SetupStep>

        <SetupStep n="4" title="Preview">
          <label>Initial preview <textarea value={form.preview} onChange={e => update("preview", e.target.value)} placeholder="Optional WYSIWYG-ish preview or draft text." /></label>
        </SetupStep>

        <div className="import-json-panel">
          <strong>Import from JSON</strong>
          <p>Paste an exported card JSON to pre-fill the fields above.</p>
          <textarea
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder='{"exported_fields": {"title": "...", "platform": "x", ...}}'
            style={{ minHeight: 80, fontFamily: "monospace", fontSize: 12 }}
          />
          <button type="button" onClick={loadFromJson} disabled={!importJson.trim()}>Load from JSON</button>
          {importError && <p className={importError.startsWith("Loaded") ? "note" : "import-error"}>{importError}</p>}
        </div>

        <button className="primary"><Plus size={16}/> Create Card</button>
        {message && <p className="note">{message}</p>}
      </form>
    </section>
  );
}

function SetupStep({ n, title, children }) {
  return (
    <div className="setup-step">
      <div className="step-title"><span>{n}</span><strong>{title}</strong></div>
      {children}
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
          ? text.split("\n").map((line, idx) => <p key={idx}>{line || " "}</p>)
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

function JobInspector({ detail, selectedCard, platformPreviewRules, brands, campaigns, refresh, selectCard, setError }) {
  const card = detail?.card || selectedCard;
  const [schedule, setSchedule] = useState("");
  const [running, setRunning] = useState("");
  const [itab, setItab] = useState("setup");

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
      const result = await api.cardAction(card.id, actionName);
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

      {itab === "setup" && (
        <>
          <section className="inspector-section">
            <h3>Card</h3>
            <dl>
              <dt>Type</dt><dd>{card.card_type} / {card.output_type}</dd>
              <dt>Platform</dt><dd>{card.platform}</dd>
              <dt>Approval</dt><dd>{card.approval_state.replaceAll("_", " ")}</dd>
              {card.scheduled_at && <><dt>Scheduled</dt><dd>{card.scheduled_at}</dd></>}
              {brand && <><dt>Brand</dt><dd>{brand.name}</dd></>}
              {campaign && <><dt>Campaign</dt><dd>{campaign.name}</dd></>}
            </dl>
          </section>

          <section className="inspector-section">
            <h3>AI task</h3>
            <p><strong>Objective:</strong> {card.objective || "No objective set."}</p>
            <p><strong>Role:</strong> {card.ai_role}</p>
            {card.constraints && <p><strong>Constraints:</strong> {card.constraints}</p>}
            {card.execution_plan && <p><strong>Execution:</strong> {card.execution_plan}</p>}
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
            <h3>Export</h3>
            <button className="action-grid-full" onClick={exportCard}>↓ Export card as JSON</button>
            <small>Downloads a JSON file you can re-import to create a new card.</small>
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

function BrandsManager({ brands, refresh, setError }) {
  const empty = { name: "", voice: "", audience: "", forbidden_claims: "", preferred_words: "" };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }
  function updateEdit(k, v) { setEditForm(prev => ({ ...prev, [k]: v })); }

  function startEdit(brand) {
    setEditId(brand.id);
    setEditForm({ name: brand.name, voice: brand.voice, audience: brand.audience, forbidden_claims: brand.forbidden_claims, preferred_words: brand.preferred_words });
  }

  async function saveEdit(id) {
    try {
      await api.updateBrand(id, editForm);
      await refresh();
      setEditId(null);
    } catch (err) {
      setError(readableError(err));
    }
  }

  async function deleteBrand(brand) {
    if (!window.confirm(`Delete brand "${brand.name}"? Task cards using this brand will have their brand removed.`)) return;
    try {
      await api.deleteBrand(brand.id);
      await refresh();
    } catch (err) {
      setError(readableError(err));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.createBrand(form);
      await refresh();
      setForm(empty);
      setMessage("Brand profile created.");
    } catch (err) {
      setMessage(readableError(err));
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Brand Profiles</h1>
          <p>Brand profiles shape AI voice, tone, preferred vocabulary, and forbidden claims across all generated content.</p>
        </div>
      </header>

      {brands.length === 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p>No brand profiles yet. Create one below to apply voice, audience, and safety rules to AI-generated content.</p>
        </div>
      )}

      <div className="brand-list">
        {brands.map(b => (
          <div className="brand-card" key={b.id}>
            {editId === b.id ? (
              <div className="brand-edit-form">
                <label>Name <input value={editForm.name} onChange={e => updateEdit("name", e.target.value)} /></label>
                <label>Voice / tone <textarea value={editForm.voice} onChange={e => updateEdit("voice", e.target.value)} style={{ minHeight: 60 }} /></label>
                <label>Audience <textarea value={editForm.audience} onChange={e => updateEdit("audience", e.target.value)} style={{ minHeight: 60 }} /></label>
                <label>Preferred words <input value={editForm.preferred_words} onChange={e => updateEdit("preferred_words", e.target.value)} /></label>
                <label>Forbidden claims <input value={editForm.forbidden_claims} onChange={e => updateEdit("forbidden_claims", e.target.value)} /></label>
                <div className="brand-edit-actions">
                  <button className="primary" onClick={() => saveEdit(b.id)}>Save</button>
                  <button onClick={() => setEditId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="brand-card-head">
                  <strong>{b.name}</strong>
                  <div className="brand-card-controls">
                    <button title="Edit brand" onClick={() => startEdit(b)}><Pencil size={13}/></button>
                    <button title="Delete brand" className="danger-btn" onClick={() => deleteBrand(b)}><Trash2 size={13}/></button>
                  </div>
                </div>
                {b.voice && <p><span className="brand-label">Voice</span> {b.voice}</p>}
                {b.audience && <p><span className="brand-label">Audience</span> {b.audience}</p>}
                {b.preferred_words && <p><span className="brand-label">Preferred words</span> {b.preferred_words}</p>}
                {b.forbidden_claims && <p><span className="brand-label">Forbidden claims</span> {b.forbidden_claims}</p>}
              </>
            )}
          </div>
        ))}
      </div>

      <form className="card form" onSubmit={submit} style={{ marginTop: brands.length > 0 ? 20 : 0 }}>
        <h2><Tag size={18}/> New brand profile</h2>

        <label>Brand name
          <input value={form.name} onChange={e => update("name", e.target.value)} required placeholder="My Brand" />
        </label>

        <div className="grid two">
          <label>Voice / tone
            <textarea value={form.voice} onChange={e => update("voice", e.target.value)} placeholder="Conversational, expert, direct. No hype." style={{ minHeight: 80 }} />
          </label>
          <label>Target audience
            <textarea value={form.audience} onChange={e => update("audience", e.target.value)} placeholder="Indie developers, solo creators, small teams." style={{ minHeight: 80 }} />
          </label>
        </div>

        <label>Preferred words
          <input value={form.preferred_words} onChange={e => update("preferred_words", e.target.value)} placeholder="local, useful, clear, simple (comma or space separated)" />
        </label>

        <label>Forbidden claims
          <input value={form.forbidden_claims} onChange={e => update("forbidden_claims", e.target.value)} placeholder="guaranteed, best, #1 (comma separated — these lower brand match score)" />
        </label>

        <button className="primary"><Plus size={16}/> Create Brand</button>
        {message && <p className="note">{message}</p>}
      </form>
    </section>
  );
}

function CalendarSurface({ cards, refresh, selectCard, setError }) {
  const approved = cards.filter(c => c.workflow_state === "approved");
  const scheduled = cards.filter(c => c.workflow_state === "scheduled");
  const days = nextSevenDays();
  const [pickerDay, setPickerDay] = useState(null);
  const [pickerCardId, setPickerCardId] = useState("");
  const [timeSlot, setTimeSlot] = useState("14:00");

  async function scheduleCard() {
    if (!pickerCardId || !pickerDay) return;
    const card = approved.find(c => String(c.id) === String(pickerCardId));
    if (!card) return;
    await guardedMove(card, "scheduled", refresh, selectCard, setError, {
      scheduled_at: `${pickerDay}T${timeSlot}:00`,
    });
    setPickerDay(null);
    setPickerCardId("");
  }

  async function unschedule(card) {
    if (!window.confirm(`Unschedule "${card.title}" and return it to Approved?`)) return;
    try {
      const updated = await api.moveTaskCard(card.id, { target_state: "approved" });
      await refresh(updated.id);
    } catch (err) {
      setError(readableError(err));
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Calendar Scheduler</h1>
          <p>Assign approved cards to days. Publishing is not enabled — this is local scheduling only.</p>
        </div>
      </header>

      <div className="calendar-layout">
        <div className="calendar-queue">
          <h2>Ready to schedule <span className="badge">{approved.length}</span></h2>
          {approved.length === 0 && <p className="muted">No approved cards. Approve cards on the board first.</p>}
          {approved.map(c => (
            <div key={c.id} className="queue-card" onClick={() => selectCard(c.id)}>
              <div className="queue-card-top">
                <span className="badge">{c.platform}</span>
                <span className="badge">{c.card_type}</span>
              </div>
              <strong>{c.title}</strong>
              <p>{c.preview || c.objective || "No preview."}</p>
            </div>
          ))}
        </div>

        <div className="calendar-week">
          {days.map(day => {
            const dayScheduled = scheduled.filter(c => (c.scheduled_at || "").startsWith(day.iso));
            const isPickerOpen = pickerDay === day.iso;
            return (
              <div className="calendar-day" key={day.iso}>
                <div className="calendar-day-head">
                  <strong>{day.label}</strong>
                  <span className="muted">{day.iso}</span>
                </div>

                <div className="calendar-slot">
                  {dayScheduled.map(card => (
                    <div className="scheduled-card" key={card.id} onClick={() => selectCard(card.id)}>
                      <div className="scheduled-card-row">
                        <Clock size={12}/>
                        <span>{(card.scheduled_at || "").slice(11, 16)}</span>
                        <strong>{card.title}</strong>
                      </div>
                      <button
                        className="unschedule-btn"
                        onClick={(e) => { e.stopPropagation(); unschedule(card); }}
                        title="Unschedule"
                      ><X size={11}/></button>
                    </div>
                  ))}

                  {approved.length > 0 && !isPickerOpen && (
                    <button className="add-slot-btn" onClick={() => { setPickerDay(day.iso); setPickerCardId(""); }}>
                      <Plus size={13}/> Schedule here
                    </button>
                  )}

                  {isPickerOpen && (
                    <div className="slot-picker">
                      <select value={pickerCardId} onChange={e => setPickerCardId(e.target.value)} autoFocus>
                        <option value="">Pick a card…</option>
                        {approved.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                      <input type="time" value={timeSlot} onChange={e => setTimeSlot(e.target.value)} />
                      <div className="slot-picker-actions">
                        <button className="primary" onClick={scheduleCard} disabled={!pickerCardId}>Schedule</button>
                        <button onClick={() => setPickerDay(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function nextSevenDays() {
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: fmt.format(d) };
  });
}

function Health({ diagnostics, refresh }) {
  return (
    <section>
      <header className="page-header">
        <div>
          <h1>System Health</h1>
          <p>The app fails soft and keeps local fallback drafting available when Ollama is offline.</p>
        </div>
        <button className="primary" onClick={() => refresh()}><Activity size={16}/> Run Diagnostics</button>
      </header>

      <div className="card">
        {!diagnostics && <p>No diagnostics loaded.</p>}
        {diagnostics?.checks?.map(c => (
          <div className="check" key={c.name}>
            <CheckCircle size={17} className={c.ok ? "ok" : "warn"} />
            <div><strong>{c.name}</strong><span>{c.message}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DraftsStudio({ brands }) {
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
            <DraftCard key={draft.id} draft={draft} onStatus={updateStatus} onPromote={promote} />
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

function DraftCard({ draft, onStatus, onPromote }) {
  const [expanded, setExpanded] = useState(false);
  const scoreClass = draft.score >= 80 ? "score-ok" : draft.score >= 60 ? "score-med" : "score-bad";
  const scores = [
    ["Clarity", draft.clarity_score], ["Tone", draft.tone_score],
    ["Platform", draft.platform_fit_score], ["Claims", draft.claim_risk_score],
    ["Legal", draft.legal_risk_score], ["Spam", draft.spam_risk_score],
    ["Brand", draft.brand_match_score],
  ].filter(([, v]) => v > 0);

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
        </div>
      )}

      <button className="draft-expand-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? "▲ Less" : "▼ More"}
      </button>
    </div>
  );
}

function PresetsPanel({ form, onLoad }) {
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sf-presets") || "[]"); } catch { return []; }
  });
  const [saveName, setSaveName] = useState("");
  const [open, setOpen] = useState(false);

  function save() {
    if (!saveName.trim()) return;
    const preset = {
      name: saveName.trim(),
      platform: form.platform,
      ai_role: form.ai_role,
      model_lane: form.model_lane,
      constraints: form.constraints,
      execution_plan: form.execution_plan,
    };
    const updated = [...presets.filter(p => p.name !== preset.name), preset];
    localStorage.setItem("sf-presets", JSON.stringify(updated));
    setPresets(updated);
    setSaveName("");
  }

  function remove(name) {
    const updated = presets.filter(p => p.name !== name);
    localStorage.setItem("sf-presets", JSON.stringify(updated));
    setPresets(updated);
  }

  return (
    <div className="preset-panel">
      <div className="preset-panel-head">
        <strong>Saved presets</strong>
        <button type="button" className="preset-toggle" onClick={() => setOpen(o => !o)}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <div className="preset-panel-body">
          {presets.length === 0 && <small>No presets yet. Fill the platform, role, constraints, and execution plan fields, then save.</small>}
          <div className="preset-chips">
            {presets.map(p => (
              <div key={p.name} className="preset-chip">
                <button type="button" onClick={() => onLoad(p)}>{p.name}</button>
                <button type="button" className="preset-delete" onClick={() => remove(p.name)} title="Remove preset"><X size={11}/></button>
              </div>
            ))}
          </div>
          <div className="preset-save-row">
            <input
              placeholder="Preset name"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
            />
            <button type="button" onClick={save} disabled={!saveName.trim()}>Save preset</button>
          </div>
          <small>Saves platform, AI role, model lane, constraints, and execution plan.</small>
        </div>
      )}
    </div>
  );
}

function CampaignsManager({ campaigns, cards, brands, refresh, selectCard, setError }) {
  const empty = { name: "", goal: "", brand_id: "" };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(null);

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await api.createCampaign({ ...form, brand_id: form.brand_id ? Number(form.brand_id) : null });
      await refresh();
      setForm(empty);
      setMessage("Campaign created.");
    } catch (err) {
      setMessage(readableError(err));
    }
  }

  async function toggleStatus(campaign) {
    try {
      await api.updateCampaign(campaign.id, { status: campaign.status === "active" ? "closed" : "active" });
      await refresh();
    } catch (err) {
      setError(readableError(err));
    }
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Campaign Planner</h1>
          <p>Group task cards into named campaigns. Campaigns track a shared goal and brand across multiple cards.</p>
        </div>
      </header>

      {campaigns.length > 0 && (
        <div className="campaign-list">
          {campaigns.map(camp => {
            const campCards = cards.filter(c => c.campaign_id === camp.id);
            const brandName = brands.find(b => b.id === camp.brand_id)?.name;
            const isOpen = expanded === camp.id;
            return (
              <div className={`campaign-card ${camp.status === "closed" ? "closed" : ""}`} key={camp.id}>
                <div className="campaign-card-head" onClick={() => setExpanded(isOpen ? null : camp.id)}>
                  <div>
                    <strong>{camp.name}</strong>
                    {brandName && <span className="brand-label">{brandName}</span>}
                    {camp.goal && <span className="campaign-goal">{camp.goal}</span>}
                  </div>
                  <div className="campaign-card-meta">
                    <span className={`badge ${camp.status === "closed" ? "" : "badge-active"}`}>{camp.status}</span>
                    <span className="badge">{campCards.length} card{campCards.length !== 1 ? "s" : ""}</span>
                    <ChevronRight size={14} className={isOpen ? "rotated" : ""}/>
                  </div>
                </div>

                {isOpen && (
                  <div className="campaign-card-body">
                    {campCards.length === 0 && <p>No cards assigned to this campaign yet.</p>}
                    <div className="campaign-cards-grid">
                      {campCards.map(c => (
                        <TaskCard key={c.id} card={c} onClick={() => selectCard(c.id)} />
                      ))}
                    </div>
                    <div className="campaign-actions">
                      <button type="button" onClick={() => toggleStatus(camp)}>
                        {camp.status === "active" ? "Close campaign" : "Reopen campaign"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {campaigns.length === 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <p>No campaigns yet. Create one below to group related task cards under a shared goal.</p>
        </div>
      )}

      <form className="card form" onSubmit={submit}>
        <h2><FolderKanban size={18}/> New campaign</h2>

        <label>Campaign name
          <input value={form.name} onChange={e => update("name", e.target.value)} required placeholder="Launch Week Q2" />
        </label>

        <label>Goal
          <textarea value={form.goal} onChange={e => update("goal", e.target.value)} placeholder="What is this campaign trying to achieve?" style={{ minHeight: 70 }} />
        </label>

        <label>Brand (optional)
          <select value={form.brand_id} onChange={e => update("brand_id", e.target.value)}>
            <option value="">No brand</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        <button className="primary"><Plus size={16}/> Create Campaign</button>
        {message && <p className="note">{message}</p>}
      </form>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
