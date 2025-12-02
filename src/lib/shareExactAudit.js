// src/lib/shareExactAudit.js (fixed - embeds ONLY the PNG)
export const WORKER_BASE = "https://pnl.jab067.workers.dev";

/**
 * Shares the exact on-screen audit by:
 * 1) POSTing a snapshot to /audit/snap
 * 2) Opening Warpcast composer with ONLY the image embedded
 * The miniapp link goes in the text body to avoid overriding the image preview.
 */
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
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Worker /audit/snap failed: ${r.status} ${t}`);
  }
  const { image } = await r.json();
  if (!image) throw new Error("Worker did not return an image URL");

  const title = percentileData?.title || "Trader";
  const miniUrl = typeof window !== "undefined" ? window.location.origin : "https://pnl-tracker.example";
  const text =
    `📋 TRIDENT LLC AUDIT\n\n` +
    `Subject: ${snap.subject}\n` +
    `Score: ${snap.score}/100 • "${title}"\n\n` +
    `${auditNarrative?.castLine || snap.quote || ""}\n\n` +
    `Get audited: ${miniUrl}`;

  const u = new URL("https://warpcast.com/~/compose");
  u.searchParams.set("text", text);
  // IMPORTANT: only embed the image. Do NOT also embed the site URL.
  u.searchParams.append("embeds[]", image);

  if (typeof window !== "undefined") window.location.href = u.toString();
  return u.toString();
}
