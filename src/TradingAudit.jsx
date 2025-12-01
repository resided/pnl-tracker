// TradingAudit.jsx
import React from 'react';

// viral trading scorecard

const TradingAudit = ({ pnlData, user, percentileData, auditNarrative }) => {
  if (!pnlData || !pnlData.summary) return null;

  const { summary, tokens = [], biggestWin, biggestLoss, biggestFumble } = pnlData;

  const score = percentileData?.percentile ?? 50;
  const rankTitle = percentileData?.title ?? 'Trader';
  const rankEmoji = percentileData?.emoji ?? '📊';
  const rankVibe = percentileData?.vibe ?? 'Holding steady';
  const rankCallout = percentileData?.callout ?? 'Middle of the pack on Base';

  const grade = getGrade(score);
  const handle = user?.username ? `@${user.username}` : 'Unnamed trader';
  const displayName = user?.displayName || user?.username || 'Anon';
  const walletAddress = user?.wallet || '';
  const shortWallet = walletAddress ? truncateAddress(walletAddress) : '';

  const realized = summary.totalRealizedProfit ?? 0;
  const volume = summary.totalTradingVolume ?? 0;
  const winRate = typeof summary.winRate === 'number' ? summary.winRate.toFixed(1) : summary.winRate;
  const fumbled = summary.totalFumbled ?? 0;
  const tokensTraded = summary.totalTokensTraded ?? tokens.length ?? 0;

  // Simple “topics” based on your metrics for screenshot-friendly chips
  const topics = buildTopics({ summary, tokens, biggestWin, biggestLoss, biggestFumble });

  const bestLabel = biggestWin?.symbol || biggestWin?.name;
  const worstLabel = biggestLoss?.symbol || biggestLoss?.name;
  const fumbleLabel = biggestFumble?.symbol || biggestFumble?.name;

  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div style={outerWrap}>
      <div style={card}>
        {/* Header: avatar + handle + meta */}
        <div style={headerRow}>
          <div style={avatarWrap}>
            {user?.pfpUrl ? (
              <img
                src={user.pfpUrl}
                alt={displayName}
                style={avatarImage}
              />
            ) : (
              <div style={avatarFallback}>
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={displayNameStyle}>{displayName}</div>
            <div style={handleStyle}>{handle}</div>
            {shortWallet && (
              <div style={walletStyle}>{shortWallet}</div>
            )}
          </div>
          <div style={headerMeta}>
            <div style={headerMetaLabel}>TRADING REPORT</div>
            <div style={headerMetaDate}>{formattedDate}</div>
          </div>
        </div>

        {/* Score + Archetype row */}
        <div style={scoreRow}>
          <div style={scoreTile}>
            <div style={scoreGrade}>{grade}</div>
            <div style={scoreOutOf}>{score}/100</div>
            <div style={scoreLabel}>Trident Score</div>
          </div>

          <div style={personaBlock}>
            <div style={personaLabel}>
              {rankEmoji} {rankTitle}
            </div>
            <div style={personaVibe}>{rankVibe}</div>
            <div style={personaCallout}>{rankCallout}</div>
          </div>
        </div>

        {/* Narrative / Roast */}
        <div style={narrativeBlock}>
          <div style={narrativeLabel}>FROM THE AUDITOR</div>
          <div style={narrativeText}>
            {auditNarrative ||
              getFallbackNarrative(summary, {
                totalTrades: summary.totalTrades,
                winRate,
                fumbled
              })}
          </div>
        </div>

        {/* Stats strip: analogous to “casts / likes / recasts” */}
        <div style={statsRow}>
          <StatTile
            label="Realized PnL"
            value={formatSignedUsd(realized)}
            emphasis={realized >= 0 ? 'good' : 'bad'}
          />
          <StatTile
            label="Win Rate"
            value={winRate ? `${winRate}%` : '—'}
          />
          <StatTile
            label="Volume Traded"
            value={formatCompactUsd(volume)}
          />
        </div>

        {/* Second stats strip: streaks / fumbles */}
        <div style={{ ...statsRow, marginTop: 10 }}>
          <StatTile
            label="Tokens Traded"
            value={tokensTraded.toString()}
          />
          <StatTile
            label="Fumbled Gains"
            value={formatCompactUsd(fumbled, { signed: false })}
            emphasis={fumbled > 0 ? 'warn' : undefined}
          />
          <StatTile
            label="Best Bag"
            value={bestLabel || 'TBD'}
          />
        </div>

        {/* “Talking to” / “Topics” equivalent */}
        <div style={topicsBlock}>
          <div style={topicsLabel}>TRADING HABITS</div>
          <div style={chipRow}>
            {topics.map((t, i) => (
              <div key={i} style={chip}>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={footerRow}>
          <span style={footerLeft}>TRIDENT LLC · $PNL TRACKER</span>
          <span style={footerRight}>Screenshot & cast your score →</span>
        </div>
      </div>
    </div>
  );
};

// Small stat tile component
const StatTile = ({ label, value, emphasis }) => {
  const baseStyle = { ...statTile };
  if (emphasis === 'good') {
    baseStyle.background = '#ecfdf3';
    baseStyle.borderColor = '#bbf7d0';
    baseStyle.color = '#166534';
  }
  if (emphasis === 'bad') {
    baseStyle.background = '#fef2f2';
    baseStyle.borderColor = '#fecaca';
    baseStyle.color = '#991b1b';
  }
  if (emphasis === 'warn') {
    baseStyle.background = '#fffbeb';
    baseStyle.borderColor = '#fef3c7';
    baseStyle.color = '#92400e';
  }

  return (
    <div style={baseStyle}>
      <div style={statValue}>{value}</div>
      <div style={statLabel}>{label}</div>
    </div>
  );
};

// --- Helpers ---------------------------------------------------

function getGrade(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

function truncateAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatSignedUsd(val) {
  if (val === null || val === undefined || Number.isNaN(val)) return '$0';
  const sign = val >= 0 ? '+' : '−';
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString(undefined, {
    maximumFractionDigits: abs >= 1000 ? 0 : 2,
    minimumFractionDigits: abs >= 1000 ? 0 : 0
  });
  return `${sign}$${formatted}`;
}

function formatCompactUsd(val, opts = {}) {
  if (val === null || val === undefined || Number.isNaN(val)) return '$0';
  const signed = opts.signed ?? true;
  const sign = !signed ? '' : val >= 0 ? '+' : '−';
  const abs = Math.abs(val);

  let num;
  let suffix = '';
  if (abs >= 1_000_000) {
    num = (abs / 1_000_000).toFixed(1);
    suffix = 'M';
  } else if (abs >= 1_000) {
    num = (abs / 1_000).toFixed(1);
    suffix = 'K';
  } else {
    num = abs.toFixed(0);
  }

  return `${sign}$${num}${suffix}`;
}

function buildTopics({ summary, tokens, biggestWin, biggestLoss, biggestFumble }) {
  const topics = [];

  const profit = summary.totalRealizedProfit ?? 0;
  const winRate = summary.winRate ?? 0;
  const fumbled = summary.totalFumbled ?? 0;

  if (profit > 20000) topics.push('Cycle survivor');
  if (profit > 50000) topics.push('Exits in profit, not in cope');
  if (profit < 0) topics.push('Liquidity donor in recovery');

  if (winRate > 65) topics.push('High hit-rate entries');
  if (winRate < 40) topics.push('Buys tops, sells vibes');

  if (fumbled > 10_000) topics.push('Lets winners run… without them');
  if (summary.totalTokensTraded > 20) topics.push('Touches every new ticker');
  if (summary.totalTradingVolume > 100_000) topics.push('Size is not the issue');

  if (biggestWin?.symbol) topics.push(`Prints on ${biggestWin.symbol}`);
  if (biggestLoss?.symbol) topics.push(`Still mad at ${biggestLoss.symbol}`);
  if (biggestFumble?.symbol) topics.push(`Early exit on ${biggestFumble.symbol}`);

  // Deduplicate and cap
  const unique = Array.from(new Set(topics));
  if (unique.length === 0) return ['Perfectly mid, statistically normal'];
  return unique.slice(0, 5);
}

// Very lightweight local fallback if auditNarrative is missing
function getFallbackNarrative(summary, { totalTrades, winRate, fumbled }) {
  const profit = summary?.totalRealizedProfit ?? 0;
  const wr = typeof winRate === 'number' ? winRate : parseFloat(winRate || '0') || 0;
  const fum = fumbled ?? 0;

  if (profit > 10000 && wr > 55) {
    return 'Consistently up only. Either genuinely skilled or running a suspiciously long heater.';
  }
  if (fum > profit * 2 && fum > 5000) {
    return 'Finds winners early, then hands the final leg to everyone else like a charity.';
  }
  if (wr < 35 && profit < 0) {
    return 'A reliable counter-indicator. Buys local tops with conviction, sells bottoms with precision.';
  }
  if (profit > 0 && profit < 1000) {
    return 'Slightly green. In memecoins, not losing money is already above average.';
  }
  return 'Performance within normal parameters. Neither catastrophic nor legendary. Yet.';
}

// --- Styles ----------------------------------------------------

const outerWrap = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '12px 0 24px'
};

const card = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 20,
  background: '#020617',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  boxShadow:
    '0 18px 40px rgba(15, 23, 42, 0.55), inset 0 0 0 1px rgba(15, 23, 42, 0.8)',
  padding: 18,
  color: '#e5e7eb',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, system-ui, San Francisco, Inter, sans-serif',
  position: 'relative',
  overflow: 'hidden'
};

const headerRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 16
};

const avatarWrap = {
  width: 44,
  height: 44,
  borderRadius: '999px',
  padding: 2,
  background:
    'radial-gradient(circle at 0% 0%, #38bdf8, #1d4ed8 40%, #0f172a 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const avatarImage = {
  width: '100%',
  height: '100%',
  borderRadius: '999px',
  objectFit: 'cover',
  border: '1px solid rgba(15,23,42,0.5)'
};

const avatarFallback = {
  width: '100%',
  height: '100%',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#020617',
  color: '#e5e7eb',
  fontWeight: 700,
  fontSize: 18
};

const displayNameStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#f9fafb',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis'
};

const handleStyle = {
  fontSize: 11,
  color: '#22c55e'
};

const walletStyle = {
  fontSize: 10,
  color: '#64748b'
};

const headerMeta = {
  textAlign: 'right',
  fontSize: 10,
  color: '#94a3b8'
};

const headerMetaLabel = {
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: 600
};

const headerMetaDate = {
  marginTop: 2,
  fontVariantNumeric: 'tabular-nums'
};

const scoreRow = {
  display: 'flex',
  gap: 14,
  marginBottom: 14
};

const scoreTile = {
  width: 112,
  borderRadius: 16,
  background:
    'radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.15), rgba(15, 23, 42, 1))',
  border: '1px solid rgba(148, 163, 184, 0.65)',
  padding: 12,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center'
};

const scoreGrade = {
  fontSize: 32,
  fontWeight: 800,
  letterSpacing: '0.04em',
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
};

const scoreOutOf = {
  marginTop: 2,
  fontSize: 11,
  color: '#e5e7eb',
  fontVariantNumeric: 'tabular-nums'
};

const scoreLabel = {
  marginTop: 6,
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#9ca3af'
};

const personaBlock = {
  flex: 1,
  minWidth: 0,
  borderRadius: 16,
  background: 'rgba(15, 23, 42, 0.9)',
  border: '1px solid rgba(51, 65, 85, 0.9)',
  padding: 12
};

const personaLabel = {
  fontSize: 11,
  fontWeight: 600,
  color: '#e5e7eb',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  marginBottom: 4
};

const personaVibe = {
  fontSize: 13,
  fontWeight: 600,
  color: '#f9fafb',
  marginBottom: 4
};

const personaCallout = {
  fontSize: 11,
  color: '#9ca3af'
};

const narrativeBlock = {
  borderRadius: 14,
  background: '#020617',
  border: '1px solid rgba(51, 65, 85, 0.9)',
  padding: 12,
  marginBottom: 14
};

const narrativeLabel = {
  fontSize: 9,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: 4
};

const narrativeText = {
  fontSize: 12,
  lineHeight: 1.5,
  color: '#e5e7eb'
};

const statsRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8,
  marginTop: 4
};

const statTile = {
  borderRadius: 12,
  border: '1px solid rgba(51, 65, 85, 0.85)',
  background: 'rgba(15, 23, 42, 0.95)',
  padding: '8px 10px',
  textAlign: 'center',
  minHeight: 48,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center'
};

const statValue = {
  fontSize: 13,
  fontWeight: 600,
  fontVariantNumeric: 'tabular-nums'
};

const statLabel = {
  marginTop: 2,
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#9ca3af'
};

const topicsBlock = {
  marginTop: 16,
  marginBottom: 12
};

const topicsLabel = {
  fontSize: 9,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  color: '#6b7280',
  marginBottom: 6
};

const chipRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6
};

const chip = {
  fontSize: 10,
  padding: '5px 8px',
  borderRadius: 999,
  background: 'rgba(30, 64, 175, 0.18)',
  border: '1px solid rgba(59, 130, 246, 0.45)',
  color: '#e5e7eb',
  whiteSpace: 'nowrap'
};

const footerRow = {
  borderTop: '1px solid rgba(30, 41, 59, 0.9)',
  marginTop: 8,
  paddingTop: 8,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 9,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.12em'
};

const footerLeft = {};
const footerRight = {};

// ---------------------------------------------------------------

export default TradingAudit;
