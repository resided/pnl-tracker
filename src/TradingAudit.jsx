import React from 'react';

/**
 * Uses existing pnlData + percentileData + auditNarrative props.
 */

const TradingAudit = ({ pnlData, user, percentileData, auditNarrative }) => {
  if (!pnlData || !pnlData.summary || !user) return null;

  const summary = pnlData.summary || {};
  const tokens = pnlData.tokens || [];
  const biggestWin = pnlData.biggestWin;
  const biggestLoss = pnlData.biggestLoss;
  const biggestFumble = pnlData.biggestFumble;

  const score =
    typeof percentileData?.percentile === 'number'
      ? Math.round(percentileData.percentile)
      : 50;

  const archetypeTitle = percentileData?.title || 'Onchain Trader';
  const archetypeEmoji = percentileData?.emoji || '📊';
  const archetypeVibe =
    percentileData?.vibe || 'Somewhere between disciplined and degen.';
  const archetypeCallout =
    percentileData?.callout ||
    'Not the worst on Base. Not yet legendary either.';

  const grade = getGrade(score);

  const realized = Number(summary.totalRealizedProfit || 0);
  const winRate =
    typeof summary.winRate === 'number'
      ? summary.winRate
      : summary.winRate
      ? parseFloat(String(summary.winRate).replace('%', '')) || 0
      : 0;

  const volume = Number(summary.totalTradingVolume || 0);
  const totalTokens = Number(summary.totalTokensTraded || tokens.length || 0);
  const fumbled = Number(summary.totalFumbled || 0);
  const wins = Number(
    summary.wins || tokens.filter((t) => t.isProfitable).length || 0,
  );
  const losses = Number(
    summary.losses || tokens.filter((t) => !t.isProfitable).length || 0,
  );

  const longestHold = summary.longestHold || '~14 days';
  const avgHold = summary.avgHoldTime || '~18 hrs';
  const shortestHold = summary.shortestHold || '~2 hrs';

  const handle = user.username ? `@${user.username}` : '';
  const displayName = user.displayName || user.username || 'Unnamed trader';
  const shortWallet = user.wallet ? truncateAddress(user.wallet) : '';

  const topics = buildTopics({
    summary,
    tokens,
    biggestWin,
    biggestLoss,
    biggestFumble,
  });

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const narrative =
    auditNarrative ||
    getFallbackNarrative({
      realized,
      winRate,
      fumbled,
      volume,
      totalTrades: summary.totalTrades || wins + losses,
    });

  const topTokenSymbols = getTopTokenSymbols(tokens);

  return (
    <div style={outerWrap}>
      <style>{scorecardCSS}</style>
      <div className="scorecard">
        {/* Header */}
        <header className="scorecard-header">
          <div className="scorecard-header-left">
            <div className="scorecard-avatar-ring">
              {user.pfpUrl ? (
                <img
                  src={user.pfpUrl}
                  alt={displayName}
                  className="scorecard-avatar-img"
                />
              ) : (
                <div className="scorecard-avatar-fallback">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="scorecard-identity">
              <div className="scorecard-name">{displayName}</div>
              {handle && <div className="scorecard-handle">{handle}</div>}
              {shortWallet && (
                <div className="scorecard-wallet">{shortWallet}</div>
              )}
            </div>
          </div>
          <div className="scorecard-header-right">
            <div className="scorecard-tagline">TRIDENT</div>
            <div className="scorecard-subtag">TRADING REPORT</div>
            <div className="scorecard-date">{formattedDate}</div>
          </div>
        </header>

        {/* Grade + Archetype */}
        <section className="scorecard-main">
          <div className="scorecard-grade-tile">
            <div className="scorecard-grade-letter">{grade}</div>
            <div className="scorecard-grade-score">
              <span className="scorecard-grade-number">{score}</span>
              <span className="scorecard-grade-outof">/100</span>
            </div>
            <div className="scorecard-grade-label">Trident score</div>
          </div>

          <div className="scorecard-archetype">
            <div className="scorecard-archetype-title">
              <span className="scorecard-archetype-emoji">{archetypeEmoji}</span>
              <span>{archetypeTitle}</span>
            </div>
            <div className="scorecard-archetype-vibe">{archetypeVibe}</div>
            <div className="scorecard-archetype-callout">
              {archetypeCallout}
            </div>
          </div>
        </section>

        {/* Narrative */}
        <section className="scorecard-section">
          <div className="scorecard-section-label">AUDITOR&apos;S NOTE</div>
          <p className="scorecard-narrative">{narrative}</p>
        </section>

        {/* Stats rows */}
        <section className="scorecard-stats">
          <div className="scorecard-stats-row">
            <StatTile
              label="REALIZED PNL"
              value={formatSignedUsd(realized)}
              tone={realized > 0 ? 'good' : realized < 0 ? 'bad' : undefined}
            />
            <StatTile
              label="WIN RATE"
              value={winRate ? `${winRate.toFixed(1)}%` : '—'}
            />
            <StatTile label="VOLUME" value={formatCompactUsd(volume)} />
          </div>

          <div className="scorecard-stats-row">
            <StatTile label="TOKENS" value={String(totalTokens)} />
            <StatTile
              label="WINS"
              value={String(wins)}
              tone={wins > losses ? 'good' : undefined}
            />
            <StatTile
              label="LOSSES"
              value={String(losses)}
              tone={losses > wins ? 'bad' : undefined}
            />
          </div>
        </section>

        {/* Hold times and best / worst */}
        <section className="scorecard-section">
          <div className="scorecard-section-label">HOLDING PATTERN</div>
          <div className="scorecard-holds">
            <HoldTile label="LONGEST" value={longestHold} tone="good" />
            <HoldTile label="AVERAGE" value={avgHold} />
            <HoldTile label="SHORTEST" value={shortestHold} tone="bad" />
          </div>
          <div className="scorecard-best-worst">
            <div className="scorecard-token-pill best">
              <div className="scorecard-token-label">BEST BAG</div>
              <div className="scorecard-token-main">
                <span>{biggestWin?.symbol || biggestWin?.name || 'TBD'}</span>
                {typeof biggestWin?.realizedProfitUsd === 'number' && (
                  <span className="scorecard-token-pnl">
                    {formatSignedUsd(biggestWin.realizedProfitUsd)}
                  </span>
                )}
              </div>
            </div>
            <div className="scorecard-token-pill worst">
              <div className="scorecard-token-label">WORST BAG</div>
              <div className="scorecard-token-main">
                <span>{biggestLoss?.symbol || biggestLoss?.name || 'TBD'}</span>
                {typeof biggestLoss?.realizedProfitUsd === 'number' && (
                  <span className="scorecard-token-pnl">
                    {formatSignedUsd(biggestLoss.realizedProfitUsd)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Topics / habits */}
        <section className="scorecard-section">
          <div className="scorecard-section-label">TRADING HABITS</div>
          <div className="scorecard-topics">
            {topics.map((t, i) => (
              <div key={i} className="scorecard-topic-chip">
                {t}
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="scorecard-footer">
          <span>TRIDENT · $PNL TRADING REPORT</span>
          <span>Screenshot and cast your score →</span>
        </footer>

        {topTokenSymbols.length > 0 && (
          <div className="scorecard-mini-strip">
            Top bags touched this run: {topTokenSymbols.join(' · ')}
          </div>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ label, value, tone }) => {
  const className = [
    'scorecard-stat-tile',
    tone === 'good' ? 'good' : '',
    tone === 'bad' ? 'bad' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <div className="scorecard-stat-value">{value}</div>
      <div className="scorecard-stat-label">{label}</div>
    </div>
  );
};

const HoldTile = ({ label, value, tone }) => {
  const className = [
    'scorecard-hold-tile',
    tone === 'good' ? 'good' : '',
    tone === 'bad' ? 'bad' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={className}>
      <div className="scorecard-hold-value">{value}</div>
      <div className="scorecard-hold-label">{label}</div>
    </div>
  );
};

// Helpers

function getGrade(score) {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function truncateAddress(addr) {
  if (!addr || typeof addr !== 'string') return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatSignedUsd(val) {
  const n = Number(val || 0);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: abs >= 1000 ? 0 : 2,
    maximumFractionDigits: abs >= 1000 ? 0 : 2,
  });
  return `${sign}$${formatted}`;
}

function formatCompactUsd(val) {
  const n = Number(val || 0);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(0)}`;
}

function getTopTokenSymbols(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return [];
  const ignore = new Set(['WETH', 'ETH', 'USDC', 'USDT', 'DAI', 'cbBTC']);
  return [...tokens]
    .filter((t) => t && !ignore.has(t.symbol))
    .sort((a, b) => (b.totalUsdInvested || 0) - (a.totalUsdInvested || 0))
    .slice(0, 4)
    .map((t) => t.symbol)
    .filter(Boolean);
}

function buildTopics({ summary, tokens, biggestWin, biggestLoss, biggestFumble }) {
  const topics = [];
  const profit = Number(summary.totalRealizedProfit || 0);
  const wr =
    typeof summary.winRate === 'number'
      ? summary.winRate
      : summary.winRate
      ? parseFloat(String(summary.winRate).replace('%', '')) || 0
      : 0;
  const fumbledVal = Number(summary.totalFumbled || 0);
  const trades = Number(summary.totalTrades || 0);
  const longestHold = String(summary.longestHold || '');
  const avgHold = String(summary.avgHoldTime || '');

  if (profit > 25000) topics.push('Cycle survivor with receipts');
  else if (profit > 5000) topics.push('Net green across chaos');
  else if (profit < -1000) topics.push('Liquidity donor in reform');

  if (wr > 65) topics.push('High hit rate entries');
  else if (wr < 35 && trades > 15) topics.push('Buys tops, panic exits bottoms');

  if (fumbledVal > 5000) topics.push('Lets winners run without them');
  if (trades > 80) topics.push('Lives in the trade history tab');
  if (trades > 0 && trades < 15) topics.push('Selective sniper, low sample size');

  if (longestHold.includes('day')) topics.push('Willing to hold through noise');
  if (avgHold.toLowerCase().includes('min')) topics.push('Speedrunning positions');

  if (biggestWin?.symbol) topics.push(`Prints on ${biggestWin.symbol}`);
  if (biggestLoss?.symbol) topics.push(`Still mad at ${biggestLoss.symbol}`);
  if (biggestFumble?.symbol) topics.push(`Early exit on ${biggestFumble.symbol}`);

  const unique = Array.from(new Set(topics));
  if (unique.length === 0) return ['Perfectly mid. Statistically normal.'];

  return unique.slice(0, 5);
}

function getFallbackNarrative({ realized, winRate, fumbled, volume, totalTrades }) {
  if (realized > 20000 && winRate > 55) {
    return 'Consistently green and sizing with intent. Either genuinely skilled or on a suspiciously long heater.';
  }
  if (realized > 0 && fumbled > realized * 1.5) {
    return 'Finds winners early then hands the final leg to everyone else. Lock in exit plans before the next run.';
  }
  if (realized < -2000 && winRate < 35) {
    return 'A dependable counter indicator. Buys local tops with conviction, sells bottoms with precision. Time to slow down and size smaller.';
  }
  if (realized > 0 && realized < 1000) {
    return 'Slightly profitable. In memecoins, not losing money already puts you ahead of most of the timeline.';
  }
  if (volume > 100000 && Math.abs(realized) < 500) {
    return 'Huge spin of the wheel for surprisingly little net outcome. High activity, low extraction. Review which trades actually mattered.';
  }
  if (!totalTrades || totalTrades < 10) {
    return 'Sample size is tiny. The chain has seen glimpses of your strategy, not the full movie yet.';
  }
  return 'Performance is within normal Farcaster degen bounds. Not catastrophic, not legendary. The story is still being written.';
}

// CSS as string for exportable card
const scorecardCSS = `
.scorecard {
  max-width: 420px;
  width: 100%;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background:
    radial-gradient(circle at 0 0, rgba(45, 212, 191, 0.09), transparent 60%),
    radial-gradient(circle at 100% 100%, rgba(59, 130, 246, 0.12), transparent 55%),
    #020617;
  box-shadow:
    0 22px 45px rgba(15, 23, 42, 0.85),
    inset 0 0 0 1px rgba(15, 23, 42, 0.9);
  padding: 18px 16px 14px;
  color: #e5e7eb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif;
  position: relative;
  overflow: hidden;
}

/* grid overlay */
.scorecard::before {
  content: "";
  position: absolute;
  inset: -40%;
  background-image:
    linear-gradient(rgba(15,23,42,0.35) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,0.35) 1px, transparent 1px);
  background-size: 26px 26px;
  opacity: 0.4;
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.scorecard-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.scorecard-header-left {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.scorecard-avatar-ring {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  padding: 2px;
  background:
    conic-gradient(from 140deg, #22c55e, #38bdf8, #818cf8, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scorecard-avatar-img,
.scorecard-avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  border: 1px solid rgba(15,23,42,0.9);
  background: #020617;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.scorecard-identity {
  min-width: 0;
}

.scorecard-name {
  font-size: 14px;
  font-weight: 600;
  color: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scorecard-handle {
  font-size: 11px;
  color: #22c55e;
}

.scorecard-wallet {
  font-size: 10px;
  color: #64748b;
}

.scorecard-header-right {
  text-align: right;
  font-size: 10px;
  color: #94a3b8;
}

.scorecard-tagline {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-weight: 600;
}

.scorecard-subtag {
  margin-top: 2px;
}

.scorecard-date {
  margin-top: 3px;
  font-variant-numeric: tabular-nums;
}

.scorecard-main {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.scorecard-grade-tile {
  width: 112px;
  border-radius: 16px;
  padding: 10px 10px 11px;
  background:
    radial-gradient(circle at 0 0, rgba(248, 250, 252, 0.08), transparent 60%),
    #020617;
  border: 1px solid rgba(148, 163, 184, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.scorecard-grade-letter {
  font-size: 30px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.scorecard-grade-score {
  margin-top: 2px;
}

.scorecard-grade-number {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.scorecard-grade-outof {
  font-size: 11px;
  color: #9ca3af;
  margin-left: 2px;
}

.scorecard-grade-label {
  margin-top: 4px;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #9ca3af;
}

.scorecard-archetype {
  flex: 1;
  min-width: 0;
  border-radius: 16px;
  padding: 10px 12px;
  border: 1px solid rgba(30, 64, 175, 0.7);
  background: rgba(15, 23, 42, 0.95);
}

.scorecard-archetype-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #e5e7eb;
  margin-bottom: 3px;
}

.scorecard-archetype-emoji {
  font-size: 13px;
}

.scorecard-archetype-vibe {
  font-size: 13px;
  font-weight: 600;
  color: #f9fafb;
  margin-bottom: 4px;
}

.scorecard-archetype-callout {
  font-size: 11px;
  color: #cbd5f5;
}

.scorecard-section {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
  border-radius: 14px;
  border: 1px solid rgba(30, 64, 175, 0.5);
  background: rgba(15, 23, 42, 0.96);
  padding: 10px 10px 9px;
}

.scorecard-section-label {
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 4px;
}

.scorecard-narrative {
  font-size: 12px;
  line-height: 1.5;
  color: #e5e7eb;
}

.scorecard-stats {
  position: relative;
  z-index: 1;
  margin-bottom: 12px;
}

.scorecard-stats-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.scorecard-stats-row + .scorecard-stats-row {
  margin-top: 8px;
}

.scorecard-stat-tile {
  border-radius: 12px;
  border: 1px solid rgba(31, 41, 55, 0.9);
  background: rgba(15, 23, 42, 0.96);
  padding: 7px 8px 8px;
  text-align: center;
}

.scorecard-stat-tile.good {
  border-color: rgba(34, 197, 94, 0.8);
  background: rgba(22, 163, 74, 0.16);
}

.scorecard-stat-tile.bad {
  border-color: rgba(248, 113, 113, 0.85);
  background: rgba(185, 28, 28, 0.16);
}

.scorecard-stat-value {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.scorecard-stat-label {
  margin-top: 2px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #9ca3af;
}

.scorecard-holds {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 6px;
}

.scorecard-hold-tile {
  border-radius: 10px;
  border: 1px solid rgba(31, 41, 55, 0.9);
  background: rgba(15, 23, 42, 0.96);
  padding: 6px 6px 7px;
  text-align: center;
}

.scorecard-hold-tile.good {
  border-color: rgba(52, 211, 153, 0.8);
}

.scorecard-hold-tile.bad {
  border-color: rgba(248, 113, 113, 0.8);
}

.scorecard-hold-value {
  font-size: 12px;
  font-weight: 600;
}

.scorecard-hold-label {
  margin-top: 2px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #9ca3af;
}

.scorecard-best-worst {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.scorecard-token-pill {
  border-radius: 12px;
  padding: 7px 9px 8px;
  border: 1px solid rgba(31, 41, 55, 0.9);
  background: rgba(15, 23, 42, 0.96);
}

.scorecard-token-pill.best {
  border-color: rgba(34, 197, 94, 0.9);
}

.scorecard-token-pill.worst {
  border-color: rgba(248, 113, 113, 0.9);
}

.scorecard-token-label {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #9ca3af;
  margin-bottom: 2px;
}

.scorecard-token-main {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
}

.scorecard-token-pnl {
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.scorecard-topics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.scorecard-topic-chip {
  font-size: 10px;
  padding: 4px 7px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.85);
  background: rgba(15, 23, 42, 0.95);
  white-space: nowrap;
}

.scorecard-footer {
  position: relative;
  z-index: 1;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(30, 64, 175, 0.7);
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #6b7280;
}

.scorecard-mini-strip {
  margin-top: 4px;
  font-size: 9px;
  color: #64748b;
  text-align: left;
}

@media (max-width: 480px) {
  .scorecard {
    border-radius: 16px;
    padding: 16px 14px 12px;
  }

  .scorecard-main {
    flex-direction: row;
  }
}
`;

const outerWrap = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  padding: '12px 0 24px',
};

export default TradingAudit;
