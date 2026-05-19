import { useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { readableError } from "../lib/utils";
import { cardTypes, outputTypes, aiRoles, modelLanes } from "../lib/constants";

function SetupStep({ n, title, children }) {
  return (
    <div className="setup-step">
      <div className="step-title"><span>{n}</span><strong>{title}</strong></div>
      {children}
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

export function TaskCardCreator({ brands, campaigns, templates, refresh, selectCard }) {
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
