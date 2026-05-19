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
  stats: () => request("/api/stats"),
  auditLog: (limit = 50) => request(`/api/audit-log?limit=${limit}`),
  models: () => request("/api/models"),
  brands: () => request("/api/brands"),
  createBrand: (payload) => request("/api/brands", { method: "POST", body: JSON.stringify(payload) }),
  updateBrand: (id, payload) => request(`/api/brands/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteBrand: (id) => request(`/api/brands/${id}`, { method: "DELETE" }),
  campaigns: () => request("/api/campaigns"),
  campaign: (id) => request(`/api/campaigns/${id}`),
  createCampaign: (payload) => request("/api/campaigns", { method: "POST", body: JSON.stringify(payload) }),
  updateCampaign: (id, payload) => request(`/api/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteCampaign: (id) => request(`/api/campaigns/${id}`, { method: "DELETE" }),
  drafts: () => request("/api/drafts"),
  generateDrafts: (payload) => request("/api/drafts/generate", { method: "POST", body: JSON.stringify(payload) }),
  updateDraftStatus: (id, status) => request(`/api/drafts/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  promoteDraft: (id) => request(`/api/drafts/${id}/promote-safe`, { method: "POST" }),
  taskCards: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ""));
    const query = qs.toString() ? "?" + qs : "";
    return request(`/api/task-cards${query}`);
  },
  duplicateTaskCard: (id) => request(`/api/task-cards/${id}/duplicate`, { method: "POST" }),
  deleteTaskCard: (id) => request(`/api/task-cards/${id}`, { method: "DELETE" }),
  taskCardMeta: () => request("/api/task-cards/meta"),
  taskCard: (id) => request(`/api/task-cards/${id}`),
  createTaskCard: (payload) => request("/api/task-cards", { method: "POST", body: JSON.stringify(payload) }),
  moveTaskCard: (id, payload) => request(`/api/task-cards/${id}/move`, { method: "PATCH", body: JSON.stringify(payload) }),
  cardAction: (id, action, model) => request(`/api/task-cards/${id}/action`, { method: "POST", body: JSON.stringify({ action, ...(model ? { model } : {}) }) }),
  updateTaskCard: (id, payload) => request(`/api/task-cards/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  taskCardPreview: (id) => request(`/api/task-cards/${id}/preview`),
  exportTaskCard:  (id) => request(`/api/task-cards/${id}/export`),
  bulkMoveCards: (payload) => request("/api/task-cards/bulk-move", { method: "POST", body: JSON.stringify(payload) }),
};
