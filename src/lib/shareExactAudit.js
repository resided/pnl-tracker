// src/lib/shareExactAudit.js
export const WORKER_BASE = "https://pnl.jab067.workers.dev";

export async function shareExactAudit({ user, pnlData, percentileData, auditNarrative }) {
  const snap = {
    subject: user?.username || user?.displayName || "Anon",
    address: user?.wallet || "",
    pfp: user?.pfpUrl || "",
    score: Math.round(percentileData?.percentile ?? 50),
    percentile: Math.round(percentileData?.percentile ?? 50),
    summary: pnlData?.summary || {},
    tokens: pnlData?.tokens || [],
    biggestWin: pnlData?.biggestWin || null,
    biggestLoss: pnlData?.biggestLoss || null,
    quote: auditNarrative?.quote || ""
  };

  const r = await fetch(`${WORKER_BASE}/audit/snap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snap)
  });
  const { image } = await r.json();

  // Do NOT put a clickable URL in the text (Warpcast will unfurl it).
  // If you want to show the domain, obfuscate it so it won’t unfurl:
  const appName = "pnl-tracker.vercel.app"; // note the special hyphen  (U+2011)
  const title = percentileData?.title || "Trader";

  const text =
`📋 TRIDENT LLC AUDIT

Subject: ${snap.subject}
Score: ${snap.score}/100 • "${title}"

${auditNarrative?.castLine || snap.quote || ""}

Get audited: ${appName}`;

  // Only one embed — the PNG
  const u = new URL("https://warpcast.com/~/compose");
  u.searchParams.set("text", text);
  u.searchParams.append("embeds[]", image);

  // Debug: check the URL has exactly one embeds[] param
  console.log("compose:", u.toString());

  window.location.href = u.toString();
}
