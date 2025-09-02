import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Trade Journal – Tailwind-free version
 * - Pure React + inline/CSS styles (no Tailwind required)
 * - Month & Year calendars, day details, Add/Edit Trade modal, unlimited screenshot previews
 * - LocalStorage for metadata (screenshots are preview-only blob URLs; wire a backend for permanence)
 */

/*************************
 * Utilities
 *************************/
const fmtDateKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const parseDateKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const currency = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(n).toFixed(2);

/*************************
 * Local Storage helpers
 *************************/
const LS_KEY = "trade-journal-no-tailwind-v1";
function loadJournal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { trades: [] };
    return JSON.parse(raw);
  } catch {
    return { trades: [] };
  }
}
function saveJournal(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/*************************
 * Data Types
 *************************/
const newTradeTemplate = (dateKey) => ({
  id: crypto.randomUUID(),
  dateKey: dateKey || fmtDateKey(new Date()),
  title: "",
  pair: "",
  status: "Win", // Win | Loss | BE
  side: "Long", // Long | Short
  openTime: new Date().toISOString(),
  entry: "",
  stop: "",
  tp: "",
  rr: "",
  confidence: 1,
  rating: 0,
  tags: [],
  notes: "",
  screenshots: [], // [{name, url}] (preview only; not persistent after reload)
  pnl: 0,
});

/*************************
 * Styles (simple dark theme)
 *************************/
const colors = {
  bg: "#0b0b0c",
  panel: "#121214",
  panelSoft: "#16161a",
  border: "#26262b",
  text: "#e6e6eb",
  textDim: "#9ca3af",
  accent: "#6366f1",
  red: "#ef4444",
  green: "#34d399",
};
const styles = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif",
  },
  container: { maxWidth: 1100, margin: "0 auto", padding: "24px" },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    backdropFilter: "saturate(120%) blur(6px)",
    background: "rgba(11,11,12,0.6)",
    borderBottom: `1px solid ${colors.border}`,
  },
  topbarInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
  },
  brand: { fontWeight: 800, fontSize: 18 },
  btn: {
    background: colors.panelSoft,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
  },
  btnPrimary: {
    background: colors.accent,
    border: `1px solid ${colors.accent}`,
    color: "white",
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
  },
  heroWrap: {
    minHeight: "68vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    flexDirection: "column",
    gap: 16,
  },
  heroH1: { fontSize: 54, fontWeight: 900, letterSpacing: -1, margin: 0 },
  heroP: { color: colors.textDim, maxWidth: 600, lineHeight: 1.6 },
  grid7: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    borderRadius: 14,
    overflow: "hidden",
  },
  cell: {
    height: 112,
    border: `1px solid ${colors.border}`,
    background: colors.panel,
  },
  cellBtn: {
    height: 112,
    border: `1px solid ${colors.border}`,
    background: colors.panel,
    textAlign: "left",
    padding: 8,
    cursor: "pointer",
  },
  monthHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  thWeekdays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    color: colors.textDim,
    fontSize: 13,
    marginBottom: 4,
  },
  tableDay: {
    border: `1px solid ${colors.border}`,
    background: colors.panelSoft,
    borderRadius: 14,
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "3fr 1fr 2fr 3fr 1fr 2fr",
    background: "#0f0f12",
    color: colors.textDim,
    fontSize: 12,
    borderBottom: `1px solid ${colors.border}`,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "3fr 1fr 2fr 3fr 1fr 2fr",
    borderBottom: `1px solid ${colors.border}`,
  },
  pill: (bg, fg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: fg,
    border: `1px solid ${colors.border}`,
  }),
  input: {
    width: "100%",
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: 12,
    padding: "8px 10px",
  },
  textarea: {
    width: "100%",
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    color: colors.text,
    borderRadius: 12,
    padding: 12,
  },
  card: {
    background: colors.panelSoft,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 12,
  },
  label: { fontSize: 12, color: colors.textDim, marginBottom: 4, display: "block" },
  modalShade: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 0 },
  modal: {
    position: "fixed",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,                 // make the whole modal stack high
  },
  modalInner: {
    position: "relative",         // <-- add
    zIndex: 1,                    // <-- add (above the shade)
    width: "95vw",
    maxWidth: 900,
    background: colors.panel,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },
  modalHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
  modalBody: { padding: 16 },
};

/*************************
 * Small UI helpers
 *************************/
const Pill = ({ children, tone = "zinc" }) => {
  const tones = {
    emerald: styles.pill("rgba(16,185,129,0.18)", "#d1fae5"),
    rose: styles.pill("rgba(244,63,94,0.18)", "#ffe4e6"),
    cyan: styles.pill("rgba(34,211,238,0.18)", "#cffafe"),
    violet: styles.pill("rgba(139,92,246,0.18)", "#ede9fe"),
    zinc: styles.pill("rgba(39,39,42,0.7)", "#e5e7eb"),
  };
  return <span style={tones[tone] || tones.zinc}>{children}</span>;
};

function Section({ children }) {
  return <div style={{ marginBottom: 16 }}>{children}</div>;
}
function Row({ cols = "1fr 1fr", gap = 12, children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap }}>{children}</div>
  );
}

/*************************
 * Modal
 *************************/
const Modal = ({ open, onClose, children, title }) => {
  if (!open) return null;
  return (
    <div style={styles.modal}>
      <div style={styles.modalShade} onClick={onClose} />
      <div style={styles.modalInner} onClick={(e)=>e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h3 style={{margin:0, fontSize:16}}>{title}</h3>
          <button onClick={onClose} style={{...styles.btn}}>Close</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
};

/*************************
 * Trade Form
 *************************/
const TradeForm = ({ initial, onSave, onCancel }) => {
  const [t, setT] = useState(initial);
  const fileInputRef = useRef(null);

  const set = (k, v) => setT((prev) => ({ ...prev, [k]: v }));
  const addTag = (tag) => {
    if (!tag) return;
    setT((prev) => ({
      ...prev,
      tags: Array.from(new Set([...(prev.tags || []), tag])),
    }));
  };
  const removeTag = (tag) =>
    setT((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== tag) }));
  const removeShot = (idx) =>
    setT((prev) => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== idx),
    }));

  const onFiles = async (files) => {
    const shots = [];
    for (const f of files) {
      const url = URL.createObjectURL(f);
      shots.push({ name: f.name, url });
    }
    setT((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...shots] }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...t });
      }}
    >
      <Section>
        <Row cols="2fr 1fr">
          <div>
            <label style={styles.label}>Title</label>
            <input
              value={t.title}
              onChange={(e) => set("title", e.target.value)}
              style={styles.input}
              placeholder="Jan 22, 2024"
            />
          </div>
          <div>
            <label style={styles.label}>Date</label>
            <input
              type="date"
              value={t.dateKey}
              onChange={(e) => set("dateKey", e.target.value)}
              style={styles.input}
            />
          </div>
        </Row>
      </Section>

      <Section>
        <label style={styles.label}>
          Screenshots <span style={{ color: colors.textDim, fontSize: 12 }}>(no limit)</span>
        </label>
        {t.screenshots.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 12,
            }}
          >
            {t.screenshots.map((s, idx) => (
              <div
                key={idx}
                style={{
                  position: "relative",
                  width: 224,
                  height: 128,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <img
                  src={s.path ? s.path : s.url}
                  alt={s.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => removeShot(idx)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    ...styles.btn,
                    padding: "4px 8px",
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={styles.btn}
          >
            Upload images
          </button>
          <span style={{ fontSize: 12, color: colors.textDim }}>
            Tip: you can add as many screenshots as you need.
          </span>
        </div>
      </Section>

      <Section>
        <Row cols="repeat(5, 1fr)" gap={12}>
          <div>
            <label style={styles.label}>Pair</label>
            <input
              value={t.pair}
              onChange={(e) => set("pair", e.target.value)}
              placeholder="OANDA:EURUSD"
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Status</label>
            <select
              value={t.status}
              onChange={(e) => set("status", e.target.value)}
              style={styles.input}
            >
              <option>Win</option>
              <option>Loss</option>
              <option>BE</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Side</label>
            <select
              value={t.side}
              onChange={(e) => set("side", e.target.value)}
              style={styles.input}
            >
              <option>Long</option>
              <option>Short</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Open Time</label>
            <input
              type="datetime-local"
              value={t.openTime?.slice(0, 16)}
              onChange={(e) => set("openTime", e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>P&L (USD)</label>
            <input
              type="number"
              step="0.01"
              value={t.pnl}
              onChange={(e) => set("pnl", Number(e.target.value))}
              style={styles.input}
            />
          </div>
        </Row>
      </Section>

      <Section>
        <Row cols="repeat(4, 1fr)" gap={12}>
          <div>
            <label style={styles.label}>Entry</label>
            <input
              value={t.entry}
              onChange={(e) => set("entry", e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Stop</label>
            <input
              value={t.stop}
              onChange={(e) => set("stop", e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Take Profit</label>
            <input
              value={t.tp}
              onChange={(e) => set("tp", e.target.value)}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Risk/Reward</label>
            <input
              value={t.rr}
              onChange={(e) => set("rr", e.target.value)}
              placeholder="2"
              style={styles.input}
            />
          </div>
        </Row>
      </Section>

      <Section>
        <Row cols="1fr 1fr" gap={12}>
          <div>
            <label style={styles.label}>Checklist (optional)</label>
            <select style={styles.input}>
              <option value="">Select a checklist</option>
              <option>Standard Setup</option>
              <option>News Day Caution</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Tags</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                id="tag-input"
                placeholder="type a tag and press Add"
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("tag-input");
                  const v = el.value.trim();
                  if (v) {
                    addTag(v);
                    el.value = "";
                  }
                }}
                style={styles.btn}
              >
                Add
              </button>
            </div>
            {t.tags?.length > 0 && (
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {t.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 8px",
                      borderRadius: 999,
                      fontSize: 12,
                      background: colors.panel,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      style={{ ...styles.btn, padding: "2px 6px" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </Row>
      </Section>

      <Section>
        <Row cols="1fr 1fr" gap={24}>
          <div>
            <label style={styles.label}>Confidence level</label>
            <input
              type="range"
              min={1}
              max={5}
              value={t.confidence}
              onChange={(e) => set("confidence", Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 12, color: colors.textDim }}>{t.confidence} / 5</div>
          </div>
          <div>
            <label style={styles.label}>Trade Rating</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set("rating", i)}
                  style={{
                    fontSize: 22,
                    color: i <= t.rating ? "#fbbf24" : "#6b7280",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        </Row>
      </Section>

      <Section>
        <label style={styles.label}>Notes</label>
        <textarea
          rows={6}
          value={t.notes}
          onChange={(e) => set("notes", e.target.value)}
          style={styles.textarea}
          placeholder="out of kz"
        />
      </Section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <button type="button" onClick={onCancel} style={styles.btn}>
          Cancel
        </button>
        <button type="submit" style={styles.btnPrimary}>
          Save
        </button>
      </div>
    </form>
  );
};

/*************************
 * Trade Viewer (read-only)
 *************************/
const InfoRow = ({label, children}) => (
  <div style={{display:"grid", gridTemplateColumns:"140px 1fr", gap:12, marginBottom:8}}>
    <div style={{color: colors.textDim, fontSize:12}}>{label}</div>
    <div>{children ?? "—"}</div>
  </div>
);

const TradeViewer = ({trade})=>{
  if(!trade) return null;
  return (
    <div style={{display:"grid", gridTemplateColumns:"1fr", gap:16}}>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
        <div style={styles.card}>
          <InfoRow label="Title">{trade.title || "Untitled"}</InfoRow>
          <InfoRow label="Date">{trade.dateKey}</InfoRow>
          <InfoRow label="Open Time">{new Date(trade.openTime).toLocaleString()}</InfoRow>
          <InfoRow label="Pair">{trade.pair}</InfoRow>
          <InfoRow label="Status"><Pill tone={trade.status==='Win'?'emerald': trade.status==='Loss'?'rose':'zinc'}>{trade.status}</Pill></InfoRow>
          <InfoRow label="Side"><Pill tone={trade.side==='Long'?'cyan':'violet'}>{trade.side}</Pill></InfoRow>
          <InfoRow label="P&L">{currency(Number(trade.pnl||0))}</InfoRow>
        </div>

        <div style={styles.card}>
          <InfoRow label="Entry">{trade.entry}</InfoRow>
          <InfoRow label="Stop">{trade.stop}</InfoRow>
          <InfoRow label="Take Profit">{trade.tp}</InfoRow>
          <InfoRow label="Risk/Reward">{trade.rr}</InfoRow>
          <InfoRow label="Confidence">{trade.confidence} / 5</InfoRow>
          <InfoRow label="Rating">
            <span style={{fontSize:18, letterSpacing:2}}>
              {"★".repeat(trade.rating)}{"☆".repeat(5-trade.rating)}
            </span>
          </InfoRow>
          <InfoRow label="Tags">
            {trade.tags?.length ? trade.tags.map(t=>(
              <span key={t} style={{marginRight:6, padding:"2px 8px", borderRadius:999, background: colors.panel, border:`1px solid ${colors.border}`, fontSize:12}}>#{t}</span>
            )) : "—"}
          </InfoRow>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{marginBottom:6, color:colors.textDim, fontSize:12}}>Notes</div>
        <div style={{whiteSpace:"pre-wrap"}}>{trade.notes || "—"}</div>
      </div>

      <div style={styles.card}>
        <div style={{marginBottom:6, color:colors.textDim, fontSize:12}}>Screenshots</div>
        {trade.screenshots?.length ? (
          <div style={{display:"flex", flexWrap:"wrap", gap:10}}>
            {trade.screenshots.map((s, i)=>(
              <a key={i}
                 href={s.path ? s.path : s.url}
                 target="_blank" rel="noreferrer"
                 title={s.name}
                 style={{display:"block", width:220, height:124, border:`1px solid ${colors.border}`, borderRadius:12, overflow:"hidden"}}>
                <img
                  src={s.path ? s.path : s.url}
                  alt={s.name}
                  style={{width:"100%", height:"100%", objectFit:"cover"}}
                />
              </a>
            ))}
          </div>
        ) : "No screenshots."}
      </div>
    </div>
  );
};


/*************************
 * Month View
 *************************/
const MonthView = ({ date, tradesByDay, onPrev, onNext, onToggleYear, onDayClick }) => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const firstDow = (start.getDay() + 6) % 7; // Monday=0
  const days = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= end.getDate(); d++)
    days.push(new Date(date.getFullYear(), date.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  const dayCells = days.map((d, idx) => {
    if (!d) return <div key={idx} style={styles.cell} />;
    const dk = fmtDateKey(d);
    const list = tradesByDay[dk] || [];
    const total = list.reduce((a, b) => a + (b.pnl || 0), 0);

    let pillStyle = styles.pill("rgba(39,39,42,0.7)", "#e5e7eb");
    if (total > 0) pillStyle = styles.pill("rgba(16,185,129,0.18)", "#d1fae5");
    if (total < 0) pillStyle = styles.pill("rgba(244,63,94,0.18)", "#ffe4e6");

    return (
      <button key={idx} onClick={() => onDayClick(dk)} style={styles.cellBtn}>
        <div style={{ fontSize: 12, color: colors.textDim }}>{d.getDate()}</div>
        {list.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={pillStyle}>
              {currency(total)}{" "}
              <span style={{ opacity: 0.8, fontSize: 11 }}>
                • {list.length} {list.length === 1 ? "trade" : "trades"}
              </span>
            </span>
          </div>
        )}
      </button>
    );
  });

  return (
    <div>
      <div style={styles.monthHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onPrev} style={styles.btn}>
            ‹
          </button>
          <div style={{ fontSize: 18, fontWeight: 600 }}>
            {months[date.getMonth()]}{" "}
            <span style={{ color: colors.textDim }}>{date.getFullYear()}</span>
          </div>
          <button onClick={onNext} style={styles.btn}>
            ›
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onToggleYear} style={styles.btn}>
            Year
          </button>
        </div>
      </div>

      <div style={styles.thWeekdays}>
        {weekdays.map((w) => (
          <div key={w} style={{ padding: "6px 8px" }}>
            {w}
          </div>
        ))}
      </div>

      <div style={styles.grid7}>{dayCells}</div>
    </div>
  );
};

/*************************
 * Year View
 *************************/
const YearView = ({ year, tradesByDay, onBackToMonth, onPickMonth }) => {
  return (
    <div>
      <div style={{ ...styles.monthHeader, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{year}</div>
        <button onClick={onBackToMonth} style={styles.btn}>
          Month
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {months.map((m, mi) => {
          const date = new Date(year, mi, 1);
          const start = startOfMonth(date);
          const end = endOfMonth(date);
          const firstDow = (start.getDay() + 6) % 7;
          const days = [];
          for (let i = 0; i < firstDow; i++) days.push(null);
          for (let d = 1; d <= end.getDate(); d++) days.push(new Date(year, mi, d));
          while (days.length % 7 !== 0) days.push(null);

          return (
            <div key={m} style={{ ...styles.card, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: `1px solid ${colors.border}`,
                  padding: "8px 10px",
                }}
              >
                <div style={{ fontWeight: 600 }}>{m}</div>
                <button onClick={() => onPickMonth(mi)} style={{ ...styles.btn, padding: "4px 8px" }}>
                  Open
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  fontSize: 11,
                  color: colors.textDim,
                  borderBottom: `1px solid ${colors.border}`,
                }}
              >
                {weekdays.map((w) => (
                  <div key={w} style={{ padding: "6px 8px" }}>
                    {w}
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
                {days.map((d, idx) => {
                  if (!d)
                    return <div key={idx} style={{ height: 28, border: `1px solid ${colors.border}` }} />;
                  const dk = fmtDateKey(d);
                  const list = tradesByDay[dk] || [];
                  const total = list.reduce((a, b) => a + (b.pnl || 0), 0);

                  let bubble = null;
                  if (list.length > 0) {
                    let pillStyle = styles.pill("rgba(39,39,42,0.7)", "#e5e7eb");
                    if (total > 0) pillStyle = styles.pill("rgba(16,185,129,0.18)", "#d1fae5");
                    if (total < 0) pillStyle = styles.pill("rgba(244,63,94,0.18)", "#ffe4e6");
                    bubble = <span style={pillStyle}>{list.length}</span>;
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        height: 28,
                        border: `1px solid ${colors.border}`,
                        fontSize: 11,
                        padding: "0 6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: list.length ? "#0e0e11" : "transparent",
                      }}
                    >
                      <span style={{ color: colors.textDim }}>{d.getDate()}</span>
                      {bubble}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/*************************
 * Day Details
 *************************/
const DayDetails = ({ dateKey, trades, onView, onEdit, onDelete }) => {
  const day = parseDateKey(dateKey);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 14, color: colors.textDim, marginBottom: 8 }}>
        {day.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>

      <div style={styles.tableDay}>
        <div style={styles.tableHeader}>
          <div style={{ padding: 8 }}>Pair</div>
          <div style={{ padding: 8 }}>Status</div>
          <div style={{ padding: 8 }}>Open Time</div>
          <div style={{ padding: 8 }}>Title</div>
          <div style={{ padding: 8 }}>Side</div>
          <div style={{ padding: 8 }}>Actions</div>
        </div>

        {trades.length === 0 && (
          <div style={{ padding: 12, fontSize: 14, color: colors.textDim }}>No trades logged.</div>
        )}

        {trades.map((tr) => (
          <div key={tr.id} style={{ ...styles.tableRow, alignItems: "center" }}>
            <div style={{ padding: 8 }}>{tr.pair || "—"}</div>
            <div style={{ padding: 8 }}>
              <Pill tone={tr.status === "Win" ? "emerald" : tr.status === "Loss" ? "rose" : "zinc"}>
                {tr.status}
              </Pill>
            </div>
            <div style={{ padding: 8 }}>{new Date(tr.openTime).toLocaleString()}</div>
            <div style={{ padding: 8 }}>{tr.title || "Untitled"}</div>
            <div style={{ padding: 8 }}>
              <Pill tone={tr.side === "Long" ? "cyan" : "violet"}>{tr.side}</Pill>
            </div>
            <div style={{ padding: 8, display: "flex", gap: 8 }}>
              <button onClick={() => onView(tr)} style={styles.btn}>View</button>
              <button onClick={() => onEdit(tr)} style={styles.btn}>Edit</button>
              <button onClick={() => onDelete(tr)} style={{ ...styles.btn, background: "#3b0b0b" }}>
                Delete
              </button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

/*************************
 * Hero / Home
 *************************/
const Hero = ({ onGoCalendar, onAddTrade }) => {
  return (
    <div style={styles.heroWrap}>
      <h1 style={styles.heroH1}>Josh's Journal</h1>
      <p style={styles.heroP}>
        Fast, personal trade journaling with calendar insights, unlimited screenshots, and ratings —
        all stored locally for your eyes only.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={onGoCalendar} style={styles.btn}>
          📅 Open Calendar
        </button>
        <button onClick={onAddTrade} style={styles.btnPrimary}>
          ＋ Add Trade
        </button>
      </div>
    </div>
  );
};

/*************************
 * Root App
 *************************/
export default function TradeJournalApp() {
  const [viewer, setViewer] = useState(null); // { trade }
  const [state, setState] = useState(() => loadJournal());
  const [view, setView] = useState("home"); // home | calendar | year
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() =>
    fmtDateKey(new Date())
  );
  const [modal, setModal] = useState(null);

  useEffect(() => {
    saveJournal(state);
  }, [state]);

  const tradesByDay = useMemo(() => {
    const map = {};
    for (const t of state.trades) {
      (map[t.dateKey] ||= []).push(t);
    }
    return map;
  }, [state.trades]);

  const openAdd = (dateKey) => {
    const initial = newTradeTemplate(dateKey || selectedDayKey);
    setModal({ mode: "create", trade: initial });
  };

  const handleSave = (trade) => {
    setState((prev) => ({
      ...prev,
      trades: prev.trades.some((x) => x.id === trade.id)
        ? prev.trades.map((x) => (x.id === trade.id ? trade : x))
        : [...prev.trades, trade],
    }));
    setModal(null);
  };

  const handleDelete = (trade) => {
    if (confirm("Delete this trade?")) {
      setState((prev) => ({
        ...prev,
        trades: prev.trades.filter((x) => x.id !== trade.id),
      }));
    }
  };

  const dayTrades = tradesByDay[selectedDayKey] || [];

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.brand}>My Notes</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => setView("home")} style={styles.btn}>
              Home
            </button>
            <button onClick={() => setView("calendar")} style={styles.btn}>
              Month
            </button>
            <button onClick={() => setView("year")} style={styles.btn}>
              Year
            </button>
            <button onClick={() => openAdd()} style={styles.btnPrimary}>
              Add Trade
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={styles.container}>
        {view === "home" && (
          <Hero onGoCalendar={() => setView("calendar")} onAddTrade={() => openAdd()} />
        )}

        {view === "calendar" && (
          <>
            <MonthView
              date={monthAnchor}
              tradesByDay={tradesByDay}
              onPrev={() => setMonthAnchor(addMonths(monthAnchor, -1))}
              onNext={() => setMonthAnchor(addMonths(monthAnchor, 1))}
              onToggleYear={() => setView("year")}
              onDayClick={(dk) => {
                setSelectedDayKey(dk);
                scrollToDetails();
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => openAdd(selectedDayKey)}
                style={styles.btnPrimary}
              >
                Add trade for this day
              </button>
            </div>
            <DayDetails
              dateKey={selectedDayKey}
              trades={dayTrades}
              onView={(tr) => setViewer({ trade: tr })}
              onEdit={(tr) => setModal({ mode: "edit", trade: tr })}
              onDelete={handleDelete}
            />
          </>
        )}

        {view === "year" && (
          <YearView
            year={monthAnchor.getFullYear()}
            tradesByDay={tradesByDay}
            onBackToMonth={() => setView("calendar")}
            onPickMonth={(mi) => {
              setMonthAnchor(new Date(monthAnchor.getFullYear(), mi, 1));
              setView("calendar");
            }}
          />
        )}
      </div>

      {/* Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.mode === "edit" ? "Edit Trade" : "Add Trade"}
      >
        {modal && (
          <TradeForm
            initial={modal.trade}
            onSave={handleSave}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>
      {/* Viewer Modal */}
      <Modal
        open={!!viewer}
        onClose={() => setViewer(null)}
        title={viewer ? "View Trade" : ""}>
        {viewer && <TradeViewer trade={viewer.trade} />}
      </Modal>
    </div>
  );
}

function scrollToDetails() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}
