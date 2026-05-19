const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  diagnostics: () => request("/api/diagnostics"),
  models: () => request("/api/models"),
  brands: () => request("/api/brands"),
  createBrand: (payload) => request("/api/brands", { method: "POST", body: JSON.stringify(payload) }),
  campaigns: () => request("/api/campaigns"),
  createCampaign: (payload) => request("/api/campaigns", { method: "POST", body: JSON.stringify(payload) }),
  drafts: () => request("/api/drafts"),
  generateDrafts: (payload) => request("/api/drafts/generate", { method: "POST", body: JSON.stringify(payload) }),
  updateDraftStatus: (id, status) => request(`/api/drafts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  promoteDraft: (id) => request(`/api/drafts/${id}/promote-safe`, { method: "POST" }),
  taskCards: () => request("/api/task-cards"),
  taskCardMeta: () => request("/api/task-cards/meta"),
  taskCard: (id) => request(`/api/task-cards/${id}`),
  createTaskCard: (payload) => request("/api/task-cards", { method: "POST", body: JSON.stringify(payload) }),
  moveTaskCard: (id, payload) => request(`/api/task-cards/${id}/move`, { method: "PATCH", body: JSON.stringify(payload) }),
  cardAction: (id, action, model) => request(`/api/task-cards/${id}/action`, { method: "POST", body: JSON.stringify({ action, ...(model ? { model } : {}) }) }),
  updateTaskCard: (id, payload) => request(`/api/task-cards/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  taskCardPreview: (id) => request(`/api/task-cards/${id}/preview`)
};
