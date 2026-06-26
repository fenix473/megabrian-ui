import { useState, useEffect, useCallback } from "react";
import { getApiBase } from "./api.js";
import "./Calendar.css";

const API = getApiBase();

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDays(monthDate) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  const days = [];
  for (let i = 0; i < first.getDay(); i++) {
    days.push({ date: new Date(y, m, i - first.getDay() + 1), current: false });
  }
  for (let i = 1; i <= last.getDate(); i++) {
    days.push({ date: new Date(y, m, i), current: true });
  }
  while (days.length < 42) {
    days.push({ date: new Date(y, m + 1, days.length - last.getDate() - first.getDay() + 1), current: false });
  }
  return days;
}

function fmtTime(isoStr) {
  if (!isoStr || !isoStr.includes("T")) return null;
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function eventDayKey(isoStr) {
  return isoStr ? isoStr.split("T")[0] : null;
}

export default function Calendar() {
  const today = new Date();
  const [month, setMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calLists, setCalLists] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    summary: "",
    date: today.toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "10:00",
    account: "",
    calendar: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(async (m) => {
    setLoading(true);
    try {
      const start = new Date(m.getFullYear(), m.getMonth(), 1)
        .toISOString().split("T")[0];
      const end = new Date(m.getFullYear(), m.getMonth() + 1, 0)
        .toISOString().split("T")[0];
      const r = await fetch(`${API}/calendar/events?start=${start}&end=${end}`);
      if (r.ok) setEvents(await r.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchCalLists = useCallback(async () => {
    try {
      const r = await fetch(`${API}/calendar/list`);
      if (r.ok) {
        const data = await r.json();
        setCalLists(data);
        // Default account to first key
        setForm(f => ({ ...f, account: f.account || Object.keys(data)[0] || "" }));
      }
    } catch {}
  }, []);

  useEffect(() => { fetchEvents(month); }, [month, fetchEvents]);
  useEffect(() => { fetchCalLists(); }, [fetchCalLists]);

  const days = getDays(month);

  const eventsOn = (date) => {
    const key = date.toISOString().split("T")[0];
    return events.filter(e => eventDayKey(e.start) === key);
  };

  const selectedEvents = selected ? eventsOn(selected) : [];

  const handleDayClick = (date) => {
    setSelected(date);
    setShowAdd(false);
    setForm(f => ({ ...f, date: date.toISOString().split("T")[0] }));
  };

  const openAdd = () => {
    setShowAdd(true);
  };

  const handleAdd = async () => {
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const accounts = Object.keys(calLists);
      const account = form.account || accounts[0] || "Libero";
      const calName = form.calendar || calLists[account]?.[0] || "Home";
      const startDt = new Date(`${form.date}T${form.startTime}`);
      const endDt = new Date(`${form.date}T${form.endTime}`);
      if (endDt <= startDt) endDt.setHours(startDt.getHours() + 1);
      await fetch(`${API}/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: form.summary,
          start: startDt.toISOString(),
          end: endDt.toISOString(),
          calendar: calName,
          account,
        }),
      });
      setShowAdd(false);
      setForm(f => ({ ...f, summary: "", startTime: "09:00", endTime: "10:00" }));
      fetchEvents(month);
    } finally {
      setSaving(false);
    }
  };

  const accounts = Object.keys(calLists);
  const activeAccount = form.account || accounts[0] || "";

  // Unique accounts that have events on selected day (for panel color dots)
  const accountsWithEvents = [...new Set(selectedEvents.map(e => e.account))];

  return (
    <div className="cal-root">
      {/* ── Month nav ─────────────────────────────── */}
      <div className="cal-nav">
        <button
          className="cal-nav__arrow"
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="cal-nav__center">
          <span className="cal-nav__title">
            {MONTHS[month.getMonth()]} {month.getFullYear()}
          </span>
          {loading && <span className="cal-nav__spin" aria-hidden />}
        </div>
        <button
          className="cal-nav__arrow"
          onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          aria-label="Next month"
        >
          ›
        </button>
        <button
          className="cal-nav__today"
          onClick={() => {
            const t = new Date();
            setMonth(new Date(t.getFullYear(), t.getMonth(), 1));
            setSelected(t);
          }}
        >
          Today
        </button>
      </div>

      {/* ── Body ──────────────────────────────────── */}
      <div className="cal-body">

        {/* Grid */}
        <div className="cal-grid-wrap">
          <div className="cal-weekdays">
            {WEEKDAYS.map(d => <div key={d} className="cal-wd">{d}</div>)}
          </div>
          <div className="cal-grid">
            {days.map(({ date, current }, i) => {
              const isToday = isSameDay(date, today);
              const isSel = selected && isSameDay(date, selected);
              const dayEvents = eventsOn(date);
              const accountsSeen = [...new Map(dayEvents.map(e => [e.account, e])).values()];
              return (
                <button
                  key={i}
                  className={[
                    "cal-day",
                    !current && "cal-day--out",
                    isToday && "cal-day--today",
                    isSel && !isToday && "cal-day--sel",
                    isSel && isToday && "cal-day--sel-today",
                  ].filter(Boolean).join(" ")}
                  onClick={() => handleDayClick(date)}
                  aria-label={date.toLocaleDateString()}
                  aria-pressed={isSel}
                >
                  <span className="cal-day__num">{date.getDate()}</span>
                  {accountsSeen.length > 0 && (
                    <div className="cal-day__dots">
                      {accountsSeen.slice(0, 3).map(e => (
                        <span
                          key={e.account}
                          className={`cal-dot cal-dot--${e.account.toLowerCase()}`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="cal-panel">
          <div className="cal-panel__head">
            <div>
              <div className="cal-panel__weekday">
                {selected
                  ? selected.toLocaleDateString(undefined, { weekday: "long" })
                  : ""}
              </div>
              <div className="cal-panel__daynum">
                {selected ? selected.getDate() : ""}
                <span className="cal-panel__month">
                  {selected
                    ? " " + selected.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                    : ""}
                </span>
              </div>
            </div>
            <button className="cal-add-btn" onClick={openAdd} title="New event">
              <span>+</span>
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="cal-form">
              <input
                className="cal-input"
                placeholder="Event title"
                value={form.summary}
                autoFocus
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
              />
              <div className="cal-form__row">
                <label className="cal-label">Date</label>
                <input
                  type="date"
                  className="cal-input cal-input--sm"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="cal-form__row">
                <label className="cal-label">Time</label>
                <input
                  type="time"
                  className="cal-input cal-input--sm"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                />
                <span className="cal-form__arr">→</span>
                <input
                  type="time"
                  className="cal-input cal-input--sm"
                  value={form.endTime}
                  onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                />
              </div>
              {accounts.length > 0 && (
                <div className="cal-form__row">
                  <label className="cal-label">Who</label>
                  <select
                    className="cal-input cal-input--sm"
                    value={activeAccount}
                    onChange={e =>
                      setForm(f => ({ ...f, account: e.target.value, calendar: "" }))
                    }
                  >
                    {accounts.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              )}
              {calLists[activeAccount]?.length > 0 && (
                <div className="cal-form__row">
                  <label className="cal-label">Cal</label>
                  <select
                    className="cal-input cal-input--sm"
                    value={form.calendar}
                    onChange={e => setForm(f => ({ ...f, calendar: e.target.value }))}
                  >
                    <option value="">— pick calendar —</option>
                    {calLists[activeAccount].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div className="cal-form__actions">
                <button className="cal-form__cancel" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button
                  className="cal-form__save"
                  onClick={handleAdd}
                  disabled={saving || !form.summary.trim()}
                >
                  {saving ? "Saving…" : "Add event"}
                </button>
              </div>
            </div>
          )}

          {/* Events list */}
          <div className="cal-events">
            {selectedEvents.length === 0 ? (
              <div className="cal-events__empty">No events</div>
            ) : (
              selectedEvents.map((e, i) => {
                const t = fmtTime(e.start);
                const tEnd = fmtTime(e.end);
                return (
                  <div key={e.uid ?? i} className="cal-event">
                    <span className={`cal-event__stripe cal-event__stripe--${e.account.toLowerCase()}`} />
                    <div className="cal-event__body">
                      <div className="cal-event__title">{e.summary}</div>
                      <div className="cal-event__meta">
                        {e.allDay
                          ? "All day"
                          : t
                          ? `${t}${tEnd ? ` – ${tEnd}` : ""}`
                          : ""}
                        <span className="cal-event__who">
                          {e.account} · {e.calendar}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Account legend */}
          <div className="cal-legend">
            {["Libero", "Jasmine"].map(name => (
              <div key={name} className="cal-legend__item">
                <span className={`cal-dot cal-dot--${name.toLowerCase()}`} />
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
