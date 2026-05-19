import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Archive,
  Bot,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Clock,
  Flame,
  GripVertical,
  LayoutDashboard,
  ListChecks,
  Plus,
  Sparkles,
  Wand2,
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
  ["inbox", "Inbox", "Capture rough work."],
  ["idea", "Idea", "Define objective and setup."],
  ["drafting", "Drafting", "AI creates or edits output."],
  ["needs_review", "Needs Review", "Review risk and fit."],
  ["approved", "Approved", "Ready to schedule."],
  ["scheduled", "Scheduled", "Placed on calendar."],
  ["archived", "Archived", "Preserved, inactive."],
];

const cardTypes = ["post", "image", "video", "campaign", "bulk", "review", "polish", "repurpose"];
const outputTypes = ["post", "thread", "caption", "image", "video_script", "carousel", "campaign", "review", "polish"];
const aiRoles = ["strategist", "writer", "designer", "reviewer", "scheduler", "editor", "repurposer", "polisher"];
const modelLanes = ["safe", "raw", "reviewer", "polish", "image", "video"];

const taskTemplates = [
  {
    id: "thought_leader_post",
    label: "Thought Leader Post",
    card_type: "post",
    output_type: "post",
    ai_role: "writer",
    model_lane: "safe",
    platform: "x",
    constraints: "Clear, useful, confident. Avoid hype and unsupported claims.",
    execution_plan: "Create 3 concise post variants, then select the clearest one."
  },
  {
    id: "launch_week_bulk",
    label: "Launch Week Bulk Plan",
    card_type: "bulk",
    output_type: "campaign",
    ai_role: "strategist",
    model_lane: "safe",
    platform: "x",
    constraints: "Distribute ideas across multiple days. Each child job requires review.",
    execution_plan: "Create a one-week campaign plan and split it into child post jobs."
  },
  {
    id: "raw_creative_sandbox",
    label: "Raw Creative Sandbox",
    card_type: "post",
    output_type: "post",
    ai_role: "writer",
    model_lane: "raw",
    platform: "x",
    constraints: "Generate edgy creative angles only. Draft-only. Must be promoted before approval.",
    execution_plan: "Generate raw variants for inspiration, then promote one to a safe reviewed card."
  },
  {
    id: "image_prompt_job",
    label: "Image Prompt Job",
    card_type: "image",
    output_type: "image",
    ai_role: "designer",
    model_lane: "image",
    platform: "instagram",
    constraints: "Create image prompt, alt text, and caption. Do not publish directly.",
    execution_plan: "Generate one image concept, one prompt, one alt-text draft, and one caption."
  },
  {
    id: "short_video_script",
    label: "Short Video Script",
    card_type: "video",
    output_type: "video_script",
    ai_role: "editor",
    model_lane: "safe",
    platform: "tiktok",
    constraints: "Hook in first 2 seconds. Keep script under 45 seconds.",
    execution_plan: "Create hook, scene beats, spoken script, caption, and visual notes."
  }
];

function App() {
  const [tab, setTab] = useState("board");
  const [diagnostics, setDiagnostics] = useState(null);
  const [brands, setBrands] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [error, setError] = useState("");

  async function refreshAll(nextSelectedId = selectedId) {
    setError("");
    try {
      const [d, b, tc] = await Promise.all([api.diagnostics(), api.brands(), api.taskCards()]);
      setDiagnostics(d);
      setBrands(b);
      setCards(tc);
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

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brandmark">
          <div className="logo">LSA</div>
          <div>
            <strong>Local Social Agent</strong>
            <span>MVP 0.2.2 WYSIWYG Preview</span>
          </div>
        </div>

        <nav>
          <button className={tab === "board" ? "active" : ""} onClick={() => setTab("board")}><LayoutDashboard size={18}/> Job Board</button>
          <button className={tab === "create" ? "active" : ""} onClick={() => setTab("create")}><Plus size={18}/> New Card</button>
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
            <TaskCardCreator brands={brands} refresh={refreshAll} selectCard={selectCard} />
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
  const message = transitionMessage(card, targetState, options);
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

function transitionMessage(card, targetState, options = {}) {
  if (targetState === "scheduled") {
    return `Schedule "${card.title}"?\n\nThis creates a local scheduled job state. It will not publish to any platform in MVP 0.2.1.`;
  }
  if (targetState === "approved") {
    return `Approve "${card.title}"?\n\nApproval means it can be scheduled later. Raw cards cannot be approved directly.`;
  }
  if (targetState === "archived") {
    return `Archive "${card.title}"?\n\nThe card remains in history but leaves the active workflow.`;
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
          <p>Drag cards between states or use inspector/menu actions. Every meaningful move is confirmed.</p>
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

function TaskCardCreator({ brands, refresh, selectCard }) {
  const [form, setForm] = useState({
    title: "",
    card_type: "post",
    objective: "",
    output_type: "post",
    brand_id: "",
    platform: "x",
    source_material: "",
    ai_role: "writer",
    model_lane: "safe",
    constraints: "",
    workflow_rule: "approval_required",
    execution_plan: "",
    preview: "",
  });
  const [message, setMessage] = useState("");

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e) {
    e.preventDefault();
    setMessage("");
    try {
      const card = await api.createTaskCard({
        ...form,
        brand_id: form.brand_id ? Number(form.brand_id) : null,
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
            {taskTemplates.map(t => (
              <button type="button" key={t.id} onClick={() => setForm(prev => ({ ...prev, ...t }))}>{t.label}</button>
            ))}
          </div>
        </div>
        <SetupStep n="1" title="Objective">
          <label>Card title <input value={form.title} onChange={e => update("title", e.target.value)} required placeholder="OIQ launch post" /></label>
          <label>Objective <textarea value={form.objective} onChange={e => update("objective", e.target.value)} placeholder="What should this AI job accomplish?" /></label>
        </SetupStep>

        <SetupStep n="2" title="Output and destination">
          <div className="grid two">
            <label>Card type
              <select value={form.card_type} onChange={e => update("card_type", e.target.value)}>
                {cardTypes.map(x => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Output type
              <select value={form.output_type} onChange={e => update("output_type", e.target.value)}>
                {outputTypes.map(x => <option key={x}>{x}</option>)}
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


function platformRules(platform) {
  const rules = {
    x: { label: "X", max: 280, note: "Compact post preview with character count and thread warning." },
    linkedin: { label: "LinkedIn", max: 3000, note: "Professional long-form paragraph preview." },
    instagram: { label: "Instagram", max: 2200, note: "Caption, hashtags, media placeholder, and alt-text reminder." },
    mastodon: { label: "Mastodon", max: 500, note: "Content warning and instance-aware post preview." },
    youtube: { label: "YouTube", max: 5000, note: "Title/description/shorts script preview." },
    tiktok: { label: "TikTok", max: 2200, note: "Hook, visual beats, caption, and short video structure." },
  };
  return rules[platform] || rules.x;
}

function analyzePreview(text, platform) {
  const rule = platformRules(platform);
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
  return {
    ...rule,
    chars: value.length,
    remaining: rule.max - value.length,
    over,
    hashtags,
    links,
    paragraphs,
    threadParts,
  };
}

function EditablePreviewPanel({ card, refresh, selectCard, setError }) {
  const [draft, setDraft] = useState(card.preview || card.source_material || "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setDraft(card.preview || card.source_material || "");
  }, [card.id, card.preview, card.source_material]);

  const analysis = analyzePreview(draft, card.platform);

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
      <h3>WYSIWYG-ish editor</h3>
      <div className="preview-editor">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="Write or edit the visible output for this card." />
        <div className={`preview-stats ${analysis.over ? "over-limit" : ""}`}>
          <strong>{analysis.label}</strong>
          <span>{analysis.chars} / {analysis.max} characters</span>
          <span>{analysis.over ? `${Math.abs(analysis.remaining)} over limit` : `${analysis.remaining} remaining`}</span>
        </div>
        <button className="primary full" onClick={savePreview} disabled={saving}>{saving ? "Saving..." : "Save Preview"}</button>
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
        {text ? text.split("\\n").map((line, idx) => <p key={idx}>{line || " "}</p>) : <p>No preview yet.</p>}
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


function JobInspector({ detail, selectedCard, refresh, selectCard, setError }) {
  const card = detail?.card || selectedCard;
  const [schedule, setSchedule] = useState("");

  if (!card) {
    return (
      <aside className="inspector">
        <h2>No card selected</h2>
        <p>Select a card to inspect its AI task setup, preview, schedule, risk, and history.</p>
      </aside>
    );
  }

  async function action(actionName) {
    const actionLabels = {
      generate: "Generate output for this card?",
      review: "Run reviewer on this card?",
      promote_raw: "Promote this raw card into a safe child card?",
      split_bulk: "Create child job cards from this bulk/campaign card?",
      archive: "Archive this card?",
    };
    if (!window.confirm(actionLabels[actionName] || `Run ${actionName}?`)) return;
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
    }
  }

  async function move(target_state) {
    await guardedMove(
      card,
      target_state,
      refresh,
      selectCard,
      setError,
      target_state === "scheduled" ? { scheduled_at: schedule || new Date(Date.now() + 86400000).toISOString() } : {}
    );
  }

  const explanation = detail?.explanation;
  const history = detail?.history || [];

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <h2>{card.title}</h2>
        <span className={`badge ${card.model_lane === "raw" ? "raw" : ""}`}>{card.model_lane}</span>
      </div>

      <p className="doctrine">Visible, inspectable, schedulable, programmable AI work order.</p>

      <section className="inspector-section">
        <h3>Truth panel</h3>
        <dl>
          <dt>Type</dt><dd>{card.card_type} / {card.output_type}</dd>
          <dt>Platform</dt><dd>{card.platform}</dd>
          <dt>State</dt><dd>{card.workflow_state.replaceAll("_", " ")}</dd>
          <dt>Approval</dt><dd>{card.approval_state.replaceAll("_", " ")}</dd>
          <dt>Risk</dt><dd>{card.risk_score || "Not reviewed"}</dd>
          <dt>Scheduled</dt><dd>{card.scheduled_at || "Not scheduled"}</dd>
        </dl>
      </section>

      <section className="inspector-section">
        <h3>AI task setup</h3>
        <p><strong>Objective:</strong> {card.objective || "No objective set."}</p>
        <p><strong>Role:</strong> {card.ai_role}</p>
        <p><strong>Constraints:</strong> {card.constraints || "No constraints."}</p>
        <p><strong>Execution:</strong> {card.execution_plan || "No execution plan."}</p>
      </section>

      <EditablePreviewPanel card={card} refresh={refresh} selectCard={selectCard} setError={setError} />

      {card.reviewer_notes && (
        <section className="inspector-section">
          <h3>Reviewer notes</h3>
          <p>{card.reviewer_notes}</p>
        </section>
      )}

      {explanation && (
        <section className="inspector-section">
          <h3>Next best action</h3>
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

      <section className="inspector-section">
        <h3>Actions</h3>
        <div className="action-grid">
          <button onClick={() => action("generate")}><Sparkles size={14}/> Generate</button>
          <button onClick={() => action("review")}><ListChecks size={14}/> Review</button>
          <button onClick={() => move("approved")}><CheckCircle size={14}/> Approve</button>
          <button onClick={() => action("promote_raw")}><Wand2 size={14}/> Promote Raw</button>
          <button onClick={() => action("split_bulk")}><Bot size={14}/> Split Bulk</button>
          <button onClick={() => move("archived")}><Archive size={14}/> Archive</button>
        </div>
      </section>

      <section className="inspector-section">
        <h3>Schedule</h3>
        <input type="datetime-local" value={schedule} onChange={e => setSchedule(e.target.value)} />
        <button className="primary full" onClick={() => move("scheduled")}><CalendarDays size={14}/> Schedule Card</button>
        <small>Scheduling creates a local scheduled job state. It does not publish.</small>
      </section>

      <section className="inspector-section">
        <h3>History</h3>
        {history.length === 0 && <p>No card history yet.</p>}
        {history.slice(0, 8).map(event => (
          <div className="history-row" key={event.id}>
            <strong>{event.action}</strong>
            <span>{event.before_state || "—"} → {event.after_state || "—"}</span>
            <small>{event.created_at}</small>
          </div>
        ))}
      </section>
    </aside>
  );
}

function CalendarSurface({ cards, refresh, selectCard, setError }) {
  const approved = cards.filter(c => c.workflow_state === "approved");
  const scheduled = cards.filter(c => c.workflow_state === "scheduled");
  const days = nextSevenDays();

  async function scheduleOnDay(card, day) {
    await guardedMove(card, "scheduled", refresh, selectCard, setError, { scheduled_at: `${day.iso}T14:00:00` });
  }

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>Calendar Scheduler</h1>
          <p>Click a day slot to schedule approved cards. Drag/drop calendar integration comes after this surface feels right.</p>
        </div>
      </header>

      <div className="grid two">
        <div className="card">
          <h2>Approved cards ready to schedule</h2>
          {approved.length === 0 && <p>No approved cards yet.</p>}
          {approved.map(c => <TaskCard key={c.id} card={c} onClick={() => selectCard(c.id)} />)}
        </div>

        <div className="calendar-grid">
          {days.map(day => (
            <div className="calendar-day" key={day.iso}>
              <div className="calendar-day-head">
                <strong>{day.label}</strong>
                <span>{day.iso}</span>
              </div>
              <div className="calendar-slot">
                {approved.slice(0, 3).map(card => (
                  <button key={card.id} onClick={() => scheduleOnDay(card, day)}>
                    Schedule “{card.title}” at 2 PM
                  </button>
                ))}
                {scheduled.filter(c => (c.scheduled_at || "").startsWith(day.iso)).map(card => (
                  <div className="scheduled-card" key={card.id} onClick={() => selectCard(card.id)}>
                    <Clock size={13}/> {card.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
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
          <p>The app should fail soft and keep local fallback drafting available.</p>
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

createRoot(document.getElementById("root")).render(<App />);
