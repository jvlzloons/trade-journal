import React, { useEffect, useMemo, useRef, useState } from "react";

function ErrorBoundary({ children, label = "Error" }) {
  const [err, setErr] = React.useState(null);
  if (err) {
    return (
      <div style={{ padding: 12, border: "1px solid #444", borderRadius: 8, background: "#1a1a1a" }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{label}</div>
        <pre style={{ whiteSpace: "pre-wrap", color: "#fca5a5" }}>{String(err.stack || err)}</pre>
      </div>
    );
  }
  return (
    <React.Suspense fallback={<div style={{padding:12}}>Loading…</div>}>
      <BoundaryInner onError={setErr}>{children}</BoundaryInner>
    </React.Suspense>
  );
}
function BoundaryInner({ children, onError }) {
  try {
    return children;
  } catch (e) {
    onError(e);
    return null;
  }
}


/**
 * Trade Journal – Tailwind-free version
 * Pure React + inline styles
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
  id: (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random()),
  dateKey: dateKey || fmtDateKey(new Date()),
  title: "",
  pair: "",
  status: "Win",           // Win | Loss | BE
  side: "Long",            // Long | Short
  openTime: new Date().toISOString(),
  rr: "",                  // Risk/Reward
  confidence: 1,
  rating: 0,
  tags: [],
  notes: "",
  checklist: "",
  screenshots: [],         // [{name, url}] or {name, path}
  pnl: 0,
});

/*************************
 * Theme
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

/*************************
 * Styles
 *************************/
const styles = {
  page: {
    minHeight: "100dvh",
    background: "#141414",
    color: "#e7e7e7",
    display: "flex",
    flexDirection: "column",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
  },

  /* --- Top Bar --- */
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 40,
    background: "rgba(20,20,20,0.75)",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "saturate(160%) blur(8px)",
  },
  topbarInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  brand: {
    fontWeight: 800,
    letterSpacing: "-0.02em",
    fontSize: "clamp(14px, 2.4vw, 18px)",
    whiteSpace: "nowrap",
  },
  actions: {
    marginLeft: "auto",
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    overflowX: "auto",
    paddingBottom: 4,
  },

  /* --- Buttons --- */
  btn: {
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.06)",
    color: "#e7e7e7",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: "nowrap",
    transition: "background 120ms ease",
  },
  btnPrimary: {
    padding: "8px 14px",
    borderRadius: 999,
    border: "1px solid rgba(115,125,255,0.35)",
    background: "rgba(115,125,255,0.2)",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    whiteSpace: "nowrap",
    boxShadow: "0 0 0 1px rgba(115,125,255,0.15) inset",
    transition: "background 120ms ease",
  },

  /* --- Body / Containers --- */
  main: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 12px",
    width: "100%",
    flex: 1,
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 12px",
    width: "100%",
  },

  /* --- Responsive grid --- */
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    alignItems: "start",
  },

  /* --- Cards --- */
  card: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.04)",
    padding: 16,
  },

  /* --- Hero --- */
  heroWrap: {
    textAlign: "center",
    padding: "32px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.04)",
  },
  heroH1: {
    fontSize: "clamp(28px, 6vw, 48px)",
    fontWeight: 900,
    letterSpacing: "-0.03em",
    margin: 0,
  },
  heroP: {
    marginTop: 8,
    color: "rgba(231,231,231,0.8)",
    fontSize: "clamp(14px, 2.8vw, 16px)",
    lineHeight: 1.5,
    maxWidth: 700,
    marginInline: "auto",
  },

  /* --- Inputs --- */
  label: {
    display: "block",
    fontSize: 12,
    color: colors.textDim,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#0f0f11",
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    padding: "8px 10px",
    outline: "none",
  },
  textarea: {
    width: "100%",
    background: "#0f0f11",
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 10,
    outline: "none",
  },

  /* --- Modal --- */
  modal: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalShade: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
  },
  modalInner: {
    position: "relative",
    width: "min(720px, 100%)",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(30,30,30,1)",
    padding: 16,
    maxHeight: "85vh",
    overflow: "auto",
  },
  modalHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalBody: {
    marginTop: 4,
  },

  /* --- Table (day details) --- */
  tableDay: {
    width: "100%",
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.9fr 1.5fr 1.5fr 0.8fr 1fr",
    borderBottom: `1px solid ${colors.border}`,
    background: "#0f0f11",
    fontSize: 12,
    color: colors.textDim,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.9fr 1.5fr 1.5fr 0.8fr 1fr",
    borderTop: `1px solid ${colors.border}`,
    fontSize: 14,
  },

  /* --- Month grid --- */
  monthHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  thWeekdays: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    fontSize: 12,
    color: colors.textDim,
    borderBottom: `1px solid ${colors.border}`,
  },
  grid7: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 0,
    borderLeft: `1px solid ${colors.border}`,
    borderRight: `1px solid ${colors.border}`,
    borderBottom: `1px solid ${colors.border}`,
    borderTop: `1px solid ${colors.border}`,
  },
  cell: {
    height: 72,
    border: `1px solid ${colors.border}`,
  },
  cellBtn: {
    height: 72,
    border: `1px solid ${colors.border}`,
    width: "100%",
    textAlign: "left",
    padding: "6px 8px",
    background: "transparent",
    color: colors.text,
    cursor: "pointer",
  },

  /* --- Misc --- */
  viewportBox: {
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.35)",
  },

  // Dynamic pill style factory (used by <Pill/>)
  pill: (bg, textColor) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: textColor,
    border: `1px solid ${colors.border}`,
  }),
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
  
  const onPaste = async (e) => {
    const items = e.clipboardData?.items || [];
    const files = [];
    for (const it of items) {
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f && f.type.startsWith("image/")) files.push(f);
      }
    }
    if (!files.length) return;
    e.preventDefault();
    e.stopPropagation();
    await onFiles(files);
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }} onPaste={onPaste}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={(e) => onFiles(e.target.files)}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.btn}>
            Upload images
          </button>
          <span style={{ fontSize: 12, color: colors.textDim }}>
            Tip: click here and press Ctrl+V to paste screenshots.
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
        <Row cols="1fr" gap={12}>
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
            <select
              value={t.checklist}
              onChange={(e)=>set("checklist", e.target.value)}
              style={styles.input}
            >
              <option value="">Select a checklist</option>
              <option>W1 &gt; H4 &gt; m15</option>
              <option>D1 &gt; H1 &gt; m5</option>
              <option>H4 &gt; m15 &gt; m5</option>
              <option>Orderblock &gt; m5</option>
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
 * Trade Viewer
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
          <InfoRow label="Checklist">{trade.checklist || "—"}</InfoRow>
        </div>

        <div style={styles.card}>
          <InfoRow label="Entry">{trade.entry}</InfoRow>
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
  // Guard against invalid 'date'
  const today = new Date();
  const base = (date instanceof Date && !isNaN(date)) ? date : today;

  // Defensive helpers
  const safeFmt = (d) => {
    try { return fmtDateKey(d); } catch { return fmtDateKey(today); }
  };
  const sumPnL = (arr = []) => {
    try { return arr.reduce((a, b) => a + (Number(b?.pnl) || 0), 0); } catch { return 0; }
  };

  let start, end;
  try {
    start = startOfMonth(base);
    end = endOfMonth(base);
  } catch {
    start = startOfMonth(today);
    end = endOfMonth(today);
  }

  let firstDow = 0;
  try {
    firstDow = (start.getDay() + 6) % 7; // Monday=0
  } catch {
    firstDow = 0;
  }

  const days = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= end.getDate(); d++) days.push(new Date(base.getFullYear(), base.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  const dayCells = days.map((d, idx) => {
    if (!d) return <div key={idx} style={styles.cell} />;

    const dk = safeFmt(d);
    const list = (tradesByDay && tradesByDay[dk]) ? tradesByDay[dk] : [];
    const total = sumPnL(list);

    // choose pill tone based on PnL
    let pillStyle = styles.pill("rgba(39,39,42,0.7)", "#e5e7eb");
    if (total > 0) pillStyle = styles.pill("rgba(16,185,129,0.18)", "#d1fae5");
    if (total < 0) pillStyle = styles.pill("rgba(244,63,94,0.18)", "#ffe4e6");

    return (
      <button
        key={idx}
        onClick={() => onDayClick && onDayClick(dk)}
        style={styles.cellBtn}
        title={`${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`}
      >
        <div style={{ fontSize: 12, color: "#9ca3af" }}>{d.getDate()}</div>
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

  // Wrap header+grid in a mini boundary to surface any errors
  return (
    <ErrorBoundary label="MonthView render error">
      <div>
        <div style={styles.monthHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onPrev} style={styles.btn}>‹</button>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {months[base.getMonth()]}{" "}
              <span style={{ color: "#9ca3af" }}>{base.getFullYear()}</span>
            </div>
            <button onClick={onNext} style={styles.btn}>›</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onToggleYear} style={styles.btn}>Year</button>
          </div>
        </div>

        <div style={styles.thWeekdays}>
          {weekdays.map((w) => (
            <div key={w} style={{ padding: "6px 8px" }}>{w}</div>
          ))}
        </div>

        <div style={styles.grid7}>{dayCells}</div>
      </div>
    </ErrorBoundary>
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
        <button onClick={onBackToMonth} style={styles.btn}>Month</button>
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
          <div style={{ padding: 12, fontSize: 14, color: colors.textDim }}>
            No trades logged.
          </div>
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
            <div style={{ padding: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onView(tr)} style={styles.btn}>View</button>
              <button onClick={() => onEdit(tr)} style={styles.btn}>Edit</button>
              <button
                onClick={() => onDelete(tr)}
                style={{ ...styles.btn, background: "#3b0b0b" }}
              >
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
        Trade Journal of Josh Villaluz for Forex Trading.
        Made September 2025
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
          <div style={styles.brand}>Trade Journal</div>
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
        title={viewer ? "View Trade" : ""}
      >
        {viewer && <TradeViewer trade={viewer.trade} />}
      </Modal>
    </div>
  );
}

function scrollToDetails() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}
