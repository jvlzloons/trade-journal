/**
 * Prop firm account tracker – data + money math (no React here).
 *
 * The ledger is a chronological list of entries (oldest first):
 *   purchase: { id, type: "purchase", firm, size, cost, funding, status, date, note }
 *   payout:   { id, type: "payout", accountId, amount, date, note }
 *
 * Funding rule: a purchase is paid from the unspent payout ("profit") balance
 * first, and anything over that balance comes from your own money.
 * Set funding: "own" on a purchase to pay it entirely from your own money.
 */

export const PROP_LS_KEY = "trade-journal-propfirms-v1";

// Challenge prices per firm, keyed by account size.
export const PRICE_LIST = {
  The5ers: { 5000: 39, 10000: 69, 25000: 176 },
};

export const ACCOUNT_STATUSES = ["Active", "Passed", "Funded", "Breached"];

const uid = () => crypto.randomUUID();
const round2 = (n) => Math.round(n * 100) / 100;

export const sizeLabel = (size) => {
  const n = Number(size) || 0;
  return n >= 1000 && Number.isInteger(n / 1000) ? `${n / 1000}K` : n.toLocaleString();
};

export const newPurchase = (firm = "The5ers") => ({
  id: uid(),
  type: "purchase",
  firm,
  size: 25000,
  cost: PRICE_LIST[firm]?.[25000] ?? 0,
  funding: "auto",
  status: "Active",
  date: "",
  note: "",
});

export const newPayout = (accountId = "") => ({
  id: uid(),
  type: "payout",
  accountId,
  amount: 0,
  date: "",
  note: "",
});

// Josh's history so far, in the order it happened.
export function seedPropData() {
  const a5k = uid();
  const a25k = uid();
  const a10k = uid();
  const a25k2 = uid();
  const buy = (id, size, status, note) => ({
    id,
    type: "purchase",
    firm: "The5ers",
    size,
    cost: PRICE_LIST.The5ers[size],
    funding: "auto",
    status,
    date: "",
    note,
  });
  return {
    entries: [
      buy(a5k, 5000, "Funded", "First account"),
      { id: uid(), type: "payout", accountId: a5k, amount: 400, date: "", note: "First payout" },
      buy(a25k, 25000, "Breached", "Bought with the 5K payout. Breached, no profit"),
      buy(a10k, 10000, "Breached", "Bought with the 5K payout. Breached, no profit"),
      buy(a25k2, 25000, "Active", "Rest of the payout + own money"),
    ],
  };
}

export function loadPropData() {
  try {
    const raw = localStorage.getItem(PROP_LS_KEY);
    if (!raw) return seedPropData();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.entries) ? parsed : seedPropData();
  } catch {
    return seedPropData();
  }
}

export function savePropData(data) {
  localStorage.setItem(PROP_LS_KEY, JSON.stringify(data));
}

/**
 * Walks the ledger in order and works out where every dollar came from.
 * Returns:
 *   rows     – each entry plus fromProfit / fromOwn / profit balance after it
 *   accounts – one per purchase, with payouts received and net result
 *   totals   – spent, fromProfit, fromOwn, payouts, net, profitBalance
 */
export function computePropStats(entries) {
  // Pass 1: labels ("The5ers 25K #2" when the same firm + size was bought twice).
  const sameKind = {};
  for (const e of entries) {
    if (e.type !== "purchase") continue;
    const key = `${e.firm}|${e.size}`;
    sameKind[key] = (sameKind[key] || 0) + 1;
  }
  const seen = {};
  const accounts = new Map();
  for (const e of entries) {
    if (e.type !== "purchase") continue;
    const key = `${e.firm}|${e.size}`;
    seen[key] = (seen[key] || 0) + 1;
    const base = `${e.firm} ${sizeLabel(e.size)}`;
    const label = sameKind[key] > 1 ? `${base} #${seen[key]}` : base;
    accounts.set(e.id, {
      ...e,
      label,
      cost: Number(e.cost) || 0,
      fromProfit: 0,
      fromOwn: 0,
      payouts: 0,
      net: 0,
    });
  }

  // Pass 2: run through the money in order.
  let pool = 0;
  const totals = { spent: 0, fromProfit: 0, fromOwn: 0, payouts: 0 };
  const rows = entries.map((e) => {
    if (e.type === "purchase") {
      const acc = accounts.get(e.id);
      const cost = acc.cost;
      const fromProfit = e.funding === "own" ? 0 : round2(Math.min(cost, pool));
      const fromOwn = round2(cost - fromProfit);
      pool = round2(pool - fromProfit);
      acc.fromProfit = fromProfit;
      acc.fromOwn = fromOwn;
      totals.spent += cost;
      totals.fromProfit += fromProfit;
      totals.fromOwn += fromOwn;
      return { ...e, label: acc.label, cost, fromProfit, fromOwn, profitAvailable: round2(pool + fromProfit), pool };
    }
    const amount = Number(e.amount) || 0;
    const acc = accounts.get(e.accountId);
    if (acc) acc.payouts += amount;
    totals.payouts += amount;
    const before = pool;
    pool = round2(pool + amount);
    return { ...e, amount, accountLabel: acc?.label ?? "Deleted account", profitAvailable: before, pool };
  });

  for (const acc of accounts.values()) acc.net = round2(acc.payouts - acc.cost);

  return {
    rows,
    accounts: [...accounts.values()],
    totals: {
      spent: round2(totals.spent),
      fromProfit: round2(totals.fromProfit),
      fromOwn: round2(totals.fromOwn),
      payouts: round2(totals.payouts),
      net: round2(totals.payouts - totals.spent),
      profitBalance: pool,
    },
  };
}
