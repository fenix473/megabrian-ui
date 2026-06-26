import { useState, useEffect, useCallback } from "react";
import { getApiBase } from "./api.js";
import Calendar from "./Calendar.jsx";
import "./App.css";

const API = getApiBase();

const FAN_123 = [
  { n: 1, speed: "low" },
  { n: 2, speed: "medium" },
  { n: 3, speed: "high" },
];

const FAN_ICON =
  "M12 12a3 3 0 010-6c4 0 4 6 0 6zM12 12a3 3 0 010 6c-4 0-4-6 0-6zM12 12a3 3 0 016 0c0 4-6 4-6 0zM12 12a3 3 0 01-6 0c0-4 6-4 6 0z";

function AirQualityLabel(aqi) {
  if (aqi == null || aqi === "") return "—";
  const n = Number(aqi);
  if (Number.isNaN(n)) return String(aqi);
  if (n <= 50) return "good";
  if (n <= 100) return "moderate";
  return "elevated";
}

// Austin, TX time-based dark mode: dark before 7 am or after 8 pm
function isDaytime() {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
  return hour >= 7 && hour < 20;
}

function PlanCard({ winix, loading, onBubbleClick, apiBase }) {
  const powered = !!winix?.power;
  const disabled = loading || !winix;
  const Y_CORR_BOT = 118;
  const Y_BED_BOT = 228;
  const X_STEM_L = 362;
  const X_STEM_R = 438;

  return (
    <div className="card card--plan" id="plan-card">
      <div className="plan-wrap plan-wrap--fill">
        <div className="plan-status" aria-live="polite" title={apiBase}>
          <span className={`plan-status__led${winix ? " plan-status__led--on" : ""}`} aria-hidden />
          {loading ? "Updating" : winix ? "Online" : "…"}
          <span className="plan-status__host">{apiBase.replace(/^https?:\/\//, "")}</span>
        </div>
        <svg
          className="plan-svg plan-svg--stretch"
          viewBox="0 0 820 560"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Floor plan"
        >
          <defs>
            <pattern id="hearthGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="oklch(0.86 0.008 80)" strokeWidth="0.5" opacity="0.5" />
            </pattern>
            <filter id="hearthSoft" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="0.6" />
            </filter>
          </defs>
          <rect x="0" y="0" width="820" height="560" fill="url(#hearthGrid)" />
          <rect x="92" y="76" width="640" height="428" rx="10" fill="oklch(0 0 0 / 0.08)" filter="url(#hearthSoft)" />
          <rect className="room-fill" x="86" y="66" width="628" height="428" />
          <rect x="86" y="66" width="628" height="428" fill="none" stroke="var(--wall)" strokeWidth="10" strokeLinejoin="miter" />
          <line x1="86" y1={Y_CORR_BOT} x2={X_STEM_L} y2={Y_CORR_BOT} stroke="var(--wall)" strokeWidth="6" strokeLinecap="butt" />
          <line x1={X_STEM_R} y1={Y_CORR_BOT} x2="714" y2={Y_CORR_BOT} stroke="var(--wall)" strokeWidth="6" strokeLinecap="butt" />
          <line x1={X_STEM_L} y1={Y_CORR_BOT} x2={X_STEM_L} y2={Y_BED_BOT} stroke="var(--wall)" strokeWidth="6" />
          <line x1={X_STEM_R} y1={Y_CORR_BOT} x2={X_STEM_R} y2={Y_BED_BOT} stroke="var(--wall)" strokeWidth="6" />
          <line x1="86" y1={Y_BED_BOT} x2="714" y2={Y_BED_BOT} stroke="var(--wall)" strokeWidth="6" />
          <rect className={`room-hi${powered ? " on" : ""}`} x="86" y={Y_BED_BOT} width="628" height={494 - Y_BED_BOT} />
          <text className="room-label" x="400" y="98" textAnchor="middle">Corridor</text>
          <text className="room-label" x="224" y="180" textAnchor="middle">Bedroom · West</text>
          <text className="room-label" x="576" y="180" textAnchor="middle">Bedroom · East</text>
          <text className="room-label" x="400" y="360" textAnchor="middle">Living room</text>
          <text className="room-area" x="400" y="378" textAnchor="middle">Winix 5510</text>
          <g
            className={`bubble${powered ? " active" : ""}`}
            transform="translate(400 410)"
            role="button"
            tabIndex={0}
            style={{ cursor: disabled ? "default" : "pointer" }}
            onClick={() => !disabled && onBubbleClick()}
            onKeyDown={(e) => {
              if (!disabled && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onBubbleClick();
              }
            }}
          >
            <circle className="b-pulse" r="14" cx="0" cy="0" />
            <circle className="b-bg" r="14" cx="0" cy="0" />
            <path className="b-ic" d={FAN_ICON} transform="translate(-9 -9) scale(0.75)" />
          </g>
        </svg>
        <div className="legend legend--compact">
          <div className="li"><span className="sw" style={{ background: "var(--accent)" }} />On</div>
          <div className="li"><span className="sw" style={{ background: "var(--line-2)" }} />Off</div>
          <div className="li"><span className="sw" style={{ background: "var(--good)" }} />Link</div>
        </div>
      </div>
    </div>
  );
}

function PowerSwitch({ on, disabled, onToggle }) {
  return (
    <button
      type="button"
      className={`switch${on ? " on" : ""}`}
      disabled={disabled}
      onClick={() => onToggle(!on)}
      aria-pressed={on}
      aria-label="Power"
    />
  );
}

export default function App() {
  const [page, setPage] = useState("calendar");
  const [dark, setDark] = useState(() => !isDaytime());

  // Winix state (only used on room page but fetched lazily)
  const [winix, setWinix] = useState(null);
  const [loading, setLoading] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  // Apply dark class to root html element
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Re-check Austin time every minute
  useEffect(() => {
    const t = setInterval(() => setDark(!isDaytime()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/winix/status`);
      setWinix(await r.json());
    } catch {}
  }, []);

  // Only fetch winix when on room page
  useEffect(() => {
    if (page === "room") fetchStatus();
  }, [page, fetchStatus]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const run = async (fn) => {
    setLoading(true);
    try { await fn(); }
    finally { setLoading(false); }
  };

  const winixPower = (on) =>
    run(async () => {
      const r = await fetch(`${API}/winix/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      setWinix(await r.json());
    });

  const winixSpeed = (speed) =>
    run(async () => {
      const r = await fetch(`${API}/winix/speed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed }),
      });
      setWinix(await r.json());
    });

  const winixMode = (mode) =>
    run(async () => {
      const r = await fetch(`${API}/winix/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      setWinix(await r.json());
    });

  const winixPlasma = (on) =>
    run(async () => {
      const r = await fetch(`${API}/winix/plasma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      setWinix(await r.json());
    });

  const aqiNum = winix?.aqi != null && !Number.isNaN(Number(winix.aqi)) ? Number(winix.aqi) : null;
  const aqiBar = aqiNum == null ? 0 : Math.min(100, Math.round((aqiNum / 150) * 100));

  const hh = String(clock.getHours()).padStart(2, "0");
  const mm = String(clock.getMinutes()).padStart(2, "0");
  const dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][clock.getDay()];
  const dateLong = clock.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="app app--one-screen">
      <header className="masthead">
        <div className="masthead__brand">
          <span className="masthead__mark" aria-hidden />
          <span className="masthead__title">
            <strong>Megabrain</strong>
          </span>
          <span className="masthead__os">Custom OS v0.1</span>
        </div>

        {/* Page tabs */}
        <nav className="masthead__tabs">
          <button
            className={`tab${page === "calendar" ? " tab--on" : ""}`}
            onClick={() => setPage("calendar")}
          >
            Calendar
          </button>
          <button
            className={`tab${page === "room" ? " tab--on" : ""}`}
            onClick={() => setPage("room")}
          >
            Home
          </button>
        </nav>

        <span className="masthead__place">Forest Hideout</span>
      </header>

      {/* ── Calendar page ── */}
      {page === "calendar" && <Calendar />}

      {/* ── Room page ── */}
      {page === "room" && (
        <div className="grid">
          <PlanCard
            winix={winix}
            loading={loading}
            apiBase={API}
            onBubbleClick={() => winix && winixPower(!winix.power)}
          />

          <div className="field">
            <div className="card" id="overview">
              <div className="now">
                <div>
                  <div className="clock">
                    {hh}:{mm}
                    <small> · {dn}</small>
                  </div>
                  <div className="date">{dateLong}</div>
                </div>
                <div className="weather">
                  <div className="temp">
                    {winix?.aqi != null ? `${winix.aqi}` : "—"}
                    <small style={{ color: "var(--ink-3)", fontSize: "13px" }}> AQI</small>
                  </div>
                  <div className="meta">
                    {winix
                      ? `MODE ${String(winix.mode).toUpperCase()} · FAN ${(winix.speed || "—").toUpperCase()}`
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="stats stats--two">
                <div className="stat">
                  <div className="l">Air q.</div>
                  <div className="v">
                    {winix?.aqi ?? "—"}
                    <small>{winix?.aqi != null ? AirQualityLabel(winix.aqi) : ""}</small>
                  </div>
                  <div className="bar"><i style={{ width: `${aqiBar}%` }} /></div>
                </div>
                <div className="stat">
                  <div className="l">Purifier</div>
                  <div className="v">
                    {winix ? (winix.power ? "On" : "Off") : "—"}
                    <small>{winix ? "Winix 5510" : ""}</small>
                  </div>
                  <div className="bar"><i style={{ width: winix?.power ? "100%" : "0%" }} /></div>
                </div>
              </div>
            </div>

            <div className="card" id="control-card">
              {!winix ? (
                <div className="hint">
                  <div className="big">Loading purifier…</div>
                  <div>Telemetry will appear here. Plan shows living-room air only.</div>
                </div>
              ) : (
                <div id="control-content">
                  <div className="panel-h">
                    <div>
                      <div className="room-tag">Living room</div>
                      <div className="system">Air purifier</div>
                    </div>
                    <div className="right">
                      <span style={{ fontSize: "11px", color: "var(--ink-3)", fontFamily: "JetBrains Mono, monospace" }}>
                        {winix.power ? "ON" : "OFF"}
                      </span>
                      <PowerSwitch on={winix.power} disabled={loading} onToggle={winixPower} />
                    </div>
                  </div>
                  <div className="panel-body panel-body--phys">
                    <div className="phys-row" role="group" aria-label="Fan speed">
                      <span className="phys-row__label">Fan</span>
                      <div className="phys-row__btns">
                        {FAN_123.map(({ n, speed }) => (
                          <button
                            key={n}
                            type="button"
                            className={`phys-btn${winix.speed === speed ? " phys-btn--on" : ""}`}
                            disabled={loading}
                            onClick={() => winixSpeed(speed)}
                          >
                            {n}
                          </button>
                        ))}
                        <button
                          type="button"
                          className={`phys-btn phys-btn--wide${winix.speed === "sleep" ? " phys-btn--on" : ""}`}
                          disabled={loading}
                          onClick={() => winixSpeed("sleep")}
                        >
                          Sleep
                        </button>
                      </div>
                    </div>
                    <div className="phys-row" role="group" aria-label="PlasmaWave">
                      <span className="phys-row__label">Plasma</span>
                      <div className="phys-row__btns">
                        <button
                          type="button"
                          className={`phys-btn phys-btn--wide${!winix.plasmawave ? " phys-btn--on" : ""}`}
                          disabled={loading}
                          onClick={() => winixPlasma(false)}
                        >
                          Off
                        </button>
                        <button
                          type="button"
                          className={`phys-btn phys-btn--wide${winix.plasmawave ? " phys-btn--on" : ""}`}
                          disabled={loading}
                          onClick={() => winixPlasma(true)}
                        >
                          On
                        </button>
                      </div>
                    </div>
                    <div className="phys-row" role="group" aria-label="Mode">
                      <span className="phys-row__label">Mode</span>
                      <div className="phys-row__btns phys-row__btns--grow">
                        <button
                          type="button"
                          className={`phys-btn phys-btn--wide${winix.mode === "auto" ? " phys-btn--on" : ""}`}
                          disabled={loading}
                          onClick={() => winixMode("auto")}
                        >
                          Auto
                        </button>
                        <button
                          type="button"
                          className={`phys-btn phys-btn--wide${winix.mode === "manual" ? " phys-btn--on" : ""}`}
                          disabled={loading}
                          onClick={() => winixMode("manual")}
                        >
                          Manual
                        </button>
                      </div>
                    </div>
                    <div className="small-grid">
                      <div className="kv">
                        <div className="k">Air q.</div>
                        <div className="v">
                          {winix.aqi ?? "—"}
                          <small>{winix.aqi != null ? ` · ${AirQualityLabel(winix.aqi)}` : ""}</small>
                        </div>
                      </div>
                      <div className="kv">
                        <div className="k">Humidity</div>
                        <div className="v">—<small> · n/a</small></div>
                      </div>
                      <div className="kv">
                        <div className="k">PM 2.5</div>
                        <div className="v">—<small> · n/a</small></div>
                      </div>
                      <div className="kv">
                        <div className="k">Filter</div>
                        <div className="v">
                          {winix.filter_hours != null ? `${winix.filter_hours}` : "—"}
                          <small>{winix.filter_hours != null ? " · hours" : ""}</small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
