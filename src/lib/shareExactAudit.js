// src/lib/shareExactAudit.js
// Helper to share the EXACT on-screen audit via your Worker snapshot routes.
// Works in Vite or Next. Adjust WORKER_BASE if your subdomain changes.

export const WORKER_BASE = "https://pnl.jab067.workers.dev";

export async function shareExactAudit({ user, pnlData, percentileData, auditNarrative }) {
  // Build the exact snapshot you render in the UI
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
    quote: auditNarrative?.quote || "",
    findings: auditNarrative?.habits || auditNarrative?.findings || []
  };

  // Ask the Worker to store the snapshot and give us a stable image URL
  const res = await fetch(`${WORKER_BASE}/audit/snap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(snap)
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Share failed: ${res.status} ${err}`);
  }
  const { image } = await res.json();

  // Compose the cast text
  const title = percentileData?.title || "Trader";
  const text =
    `📋 TRIDENT LLC AUDIT\n\n` +
    `Subject: ${snap.subject}\n` +
    `Score: ${snap.score}/100 • "${title}"\n\n` +
    `${auditNarrative?.castLine || snap.quote || ""}\n\n` +
    `Get audited ${typeof window !== "undefined" ? window.location.origin : ""}`;

  // Open Warpcast composer with your text and the image URL embedded
  const u = new URL("https://warpcast.com/~/compose");
  u.searchParams.set("text", text);
  u.searchParams.append("embeds[]", image);
  if (typeof window !== "undefined") {
    window.location.href = u.toString();
  }
  return u.toString();
}
