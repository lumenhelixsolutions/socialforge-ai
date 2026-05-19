import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, CalendarDays, FileText, FolderKanban, LayoutDashboard, Plus, Tag } from "lucide-react";
import { api } from "./lib/api";
import { readableError } from "./lib/utils";
import { FALLBACK_TEMPLATES } from "./lib/constants";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/ToastContainer";
import { JobBoard } from "./components/JobBoard";
import { JobInspector } from "./components/JobInspector";
import { TaskCardCreator } from "./components/TaskCardCreator";
import { BrandsManager } from "./components/BrandsManager";
import { CampaignsManager } from "./components/CampaignsManager";
import { CalendarSurface } from "./components/CalendarSurface";
import { Health } from "./components/Health";
import { DraftsStudio } from "./components/DraftsStudio";
import "./styles.css";

function App() {
  const [tab, setTab] = useState("board");
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState(null);
  const [brands, setBrands] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [cards, setCards] = useState([]);
  const [meta, setMeta] = useState(null);
  const [availableModels, setAvailableModels] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [error, setError] = useState("");

  const addToast = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

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
      api.models().then(r => setAvailableModels(r.models || [])).catch(() => {});
      if (nextSelectedId) {
        const detail = await api.taskCard(nextSelectedId);
        setSelectedDetail(detail);
      }
    } catch (err) {
      setError(readableError(err));
    } finally {
      setLoading(false);
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

  // Keyboard shortcuts — ignored when focus is inside an input/textarea/select
  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "b": setTab("board"); break;
        case "n": setTab("create"); break;
        case "d": setTab("drafts"); break;
        case "g": setTab("brands"); break;
        case "c": setTab("campaigns"); break;
        case "k": setTab("calendar"); break;
        case "h": setTab("health"); break;
        case "r": refreshAll(); break;
        case "Escape":
          setSelectedId(null);
          setSelectedDetail(null);
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Sidebar attention badges
  const attentionCount = useMemo(
    () => cards.filter(c => c.workflow_state === "needs_review" || c.workflow_state === "needs_edit").length,
    [cards]
  );
  const approvedCount = useMemo(
    () => cards.filter(c => c.workflow_state === "approved").length,
    [cards]
  );

  const selectedCard = selectedDetail?.card || cards.find(c => c.id === selectedId) || null;
  const platformPreviewRules = meta?.platform_preview_rules || null;
  const templates = meta?.templates || FALLBACK_TEMPLATES;

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
        <p>Loading SocialForge AI…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <ToastContainer toasts={toasts} dismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />
      <aside className="sidebar">
        <div className="brandmark">
          <div className="logo">SF</div>
          <div>
            <strong>SocialForge AI</strong>
            <span>v0.3.3 local-first</span>
          </div>
        </div>

        <nav>
          <button className={tab === "board"     ? "active" : ""} onClick={() => setTab("board")}>
            <LayoutDashboard size={18}/> Job Board
            {attentionCount > 0 && <span className="nav-badge">{attentionCount}</span>}
          </button>
          <button className={tab === "create"    ? "active" : ""} onClick={() => setTab("create")}><Plus size={18}/> New Card</button>
          <button className={tab === "drafts"    ? "active" : ""} onClick={() => setTab("drafts")}><FileText size={18}/> Drafts</button>
          <button className={tab === "brands"    ? "active" : ""} onClick={() => setTab("brands")}><Tag size={18}/> Brands</button>
          <button className={tab === "campaigns" ? "active" : ""} onClick={() => setTab("campaigns")}><FolderKanban size={18}/> Campaigns</button>
          <button className={tab === "calendar"  ? "active" : ""} onClick={() => setTab("calendar")}>
            <CalendarDays size={18}/> Calendar
            {approvedCount > 0 && <span className="nav-badge nav-badge-ok">{approvedCount}</span>}
          </button>
          <button className={tab === "health"    ? "active" : ""} onClick={() => setTab("health")}><Activity size={18}/> Health</button>
        </nav>

        <div className="small-card">
          <strong>Card doctrine</strong>
          <p>A card is a visible, inspectable, schedulable, programmable AI work order.</p>
        </div>

        <div className="kbd-hint">
          <span className="kbd">b</span>board
          <span className="kbd">n</span>new
          <span className="kbd">r</span>refresh
          <span className="kbd">esc</span>deselect
        </div>
      </aside>

      <main className="main split-main">
        <section className="workspace">
          {error && <div className="error">Note: {error}</div>}

          {tab === "board" && (
            <JobBoard cards={cards} selectedId={selectedId} selectCard={selectCard} refresh={refreshAll} setError={setError} />
          )}
          {tab === "create" && (
            <TaskCardCreator brands={brands} campaigns={campaigns} templates={templates} refresh={refreshAll} selectCard={selectCard} />
          )}
          {tab === "drafts" && (
            <DraftsStudio
              brands={brands}
              onCardCreated={async (card) => {
                await refreshAll(card.id);
                selectCard(card.id);
                setTab("board");
              }}
            />
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
            <Health diagnostics={diagnostics} availableModels={availableModels} cards={cards} refresh={refreshAll} />
          )}
        </section>

        <JobInspector
          detail={selectedDetail}
          selectedCard={selectedCard}
          platformPreviewRules={platformPreviewRules}
          brands={brands}
          campaigns={campaigns}
          availableModels={availableModels}
          refresh={refreshAll}
          selectCard={selectCard}
          setError={setError}
          addToast={addToast}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
