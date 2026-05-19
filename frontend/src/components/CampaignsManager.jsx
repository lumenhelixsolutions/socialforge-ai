import { useState } from "react";
import { ChevronRight, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { readableError } from "../lib/utils";
import { TaskCard } from "./TaskCard";

export function CampaignsManager({ campaigns, cards, brands, refresh, selectCard, setError }) {
  const empty = { name: "", goal: "", brand_id: "" };
  const [form, setForm] = useState(empty);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  function update(k, v) { setForm(prev => ({ ...prev, [k]: v })); }
  function updateEdit(k, v) { setEditForm(prev => ({ ...prev, [k]: v })); }

  function startEdit(e, camp) {
    e.stopPropagation();
    setEditId(camp.id);
    setEditForm({ name: camp.name, goal: camp.goal });
  }

  async function saveEdit(id) {
    try {
      await api.updateCampaign(id, editForm);
      await refresh();
      setEditId(null);
    } catch (err) {
      setError(readableError(err));
    }
  }

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

  async function toggleStatus(e, campaign) {
    e.stopPropagation();
    try {
      await api.updateCampaign(campaign.id, { status: campaign.status === "active" ? "closed" : "active" });
      await refresh();
    } catch (err) {
      setError(readableError(err));
    }
  }

  async function deleteCampaign(e, campaign) {
    e.stopPropagation();
    if (!window.confirm(`Delete campaign "${campaign.name}"? Linked task cards will have their campaign removed.`)) return;
    try {
      await api.deleteCampaign(campaign.id);
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
            const isEditing = editId === camp.id;
            return (
              <div className={`campaign-card ${camp.status === "closed" ? "closed" : ""}`} key={camp.id}>
                <div className="campaign-card-head" onClick={() => !isEditing && setExpanded(isOpen ? null : camp.id)}>
                  {isEditing ? (
                    <div className="campaign-inline-edit" onClick={e => e.stopPropagation()}>
                      <input value={editForm.name} onChange={e => updateEdit("name", e.target.value)} placeholder="Campaign name" />
                      <textarea value={editForm.goal} onChange={e => updateEdit("goal", e.target.value)} placeholder="Goal" style={{ minHeight: 50 }} />
                      <div className="campaign-edit-actions">
                        <button className="primary" onClick={() => saveEdit(camp.id)}>Save</button>
                        <button onClick={() => setEditId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <strong>{camp.name}</strong>
                        {brandName && <span className="brand-label" style={{ marginLeft: 8 }}>{brandName}</span>}
                        {camp.goal && <span className="campaign-goal">{camp.goal}</span>}
                      </div>
                      <div className="campaign-card-meta">
                        <span className={`badge ${camp.status === "closed" ? "" : "badge-active"}`}>{camp.status}</span>
                        <span className="badge">{campCards.length} card{campCards.length !== 1 ? "s" : ""}</span>
                        <button className="icon-btn" onClick={e => startEdit(e, camp)} title="Edit campaign"><Pencil size={12}/></button>
                        <button className="icon-btn danger-btn" onClick={e => deleteCampaign(e, camp)} title="Delete campaign"><Trash2 size={12}/></button>
                        <ChevronRight size={14} className={isOpen ? "rotated" : ""}/>
                      </div>
                    </>
                  )}
                </div>

                {isOpen && !isEditing && (
                  <div className="campaign-card-body">
                    {campCards.length === 0 && <p>No cards assigned to this campaign yet.</p>}
                    <div className="campaign-cards-grid">
                      {campCards.map(c => (
                        <TaskCard key={c.id} card={c} onClick={() => selectCard(c.id)} />
                      ))}
                    </div>
                    <div className="campaign-actions">
                      <button type="button" onClick={e => toggleStatus(e, camp)}>
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
