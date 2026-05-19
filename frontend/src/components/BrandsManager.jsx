import { useState } from "react";
import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { readableError } from "../lib/utils";

export function BrandsManager({ brands, refresh, setError }) {
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
