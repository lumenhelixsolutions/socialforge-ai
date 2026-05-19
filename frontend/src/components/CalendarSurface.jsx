import { useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import { api } from "../lib/api";
import { readableError, guardedMove } from "../lib/utils";

function nextSevenDays() {
  const fmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: fmt.format(d) };
  });
}

export function CalendarSurface({ cards, refresh, selectCard, setError }) {
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
