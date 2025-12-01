import React, { useState, useEffect, useCallback } from 'react';

// Farcaster Mini App SDK
import { useFrameContext } from '@farcaster/miniapp-sdk-react';

// viem / wagmi style utils (no wagmi config needed for simple calls)
import { encodeFunctionData } from 'viem';

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------

const API_BASE = 'https://pnl-api.reside.eth.limo';
const PNL_TOKEN_ADDRESS = '0x5C5aE7554DCBACAdA3aD6D2d17489C9936E84884';
const BADGE_CONTRACT_ADDRESS = '0xCA3FD5824151e478d02515b59Eda3E62d4E238fe';

// Badge Contract ABI (mint + view)
const BADGE_ABI = [
  {
    type: 'function',
    name: 'mintBadge',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'badgeType', type: 'uint8' },
      { name: 'winRateBps', type: 'uint256' },
      { name: 'volumeUsd', type: 'uint256' },
      { name: 'profitUsdAbs', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'hasMinted',
    stateMutability: 'view',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'badgeType', type: 'uint8' }
    ],
    outputs: [
      { name: 'minted', type: 'bool' }
    ]
  }
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  const absValue = Math.abs(value);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: absValue >= 1000000 ? 0 : 2
  });
  return formatter.format(value);
};

const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(1)}%`;
};

const shortenAddress = (addr) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

// Arithmetic helpers
const safeDivide = (numerator, denominator) => {
  if (!denominator || denominator === 0) return 0;
  return numerator / denominator;
};

// -----------------------------------------------------------------------------
// LORE GENERATION
// -----------------------------------------------------------------------------

const generateLore = (summary, tokens, biggestWin, biggestLoss) => {
  if (!summary) return null;
  const { winRate, totalRealizedProfit, totalFumbled, totalTradingVolume } = summary;
  
  let archetype = 'The NPC';
  let quote = 'I trade, therefore I am.';
  let color = '#64748b';

  // Archetype logic (tuned to feel modern but not cringe)
  if (totalRealizedProfit > 50000) {
    archetype = 'Based';
    quote = 'You leave each cycle with more than you brought in.';
    color = '#eab308';
  } else if (totalRealizedProfit > 10000) {
    archetype = 'Edge Carrier';
    quote = 'You have a repeatable edge and you use it.';
    color = '#22c55e';
  } else if (winRate > 70) {
    archetype = 'Precision Trader';
    quote = 'You do not chase charts. You wait for setups.';
    color = '#06b6d4';
  } else if (totalFumbled > 20000) {
    archetype = 'Almost Early';
    quote = 'You find meta early and then let it run without you.';
    color = '#f97316';
  } else if (totalRealizedProfit < -5000) {
    archetype = 'Liquidity Donor';
    quote = 'You are currently financing other people\'s screenshots.';
    color = '#ef4444';
  } else if (totalTradingVolume > 100000) {
    archetype = 'Flow Trader';
    quote = 'You live in the order flow rather than on the sidelines.';
    color = '#8b5cf6';
  } else {
    archetype = 'Working File';
    quote = 'The story is still being written. The curve can bend either way.';
    color = '#94a3b8';
  }

  // Habits
  const habits = [
    biggestWin ? `Legendary entry on $${biggestWin.symbol}` : 'Still looking for a big win',
    biggestLoss ? `Donated heavily to the $${biggestLoss.symbol} community` : 'Risk management expert',
    totalFumbled > 1000
      ? `Allergic to holding winners (Missed $${formatNumber(totalFumbled)})`
      : 'Diamond hands activated',
    `Win Rate: ${winRate.toFixed(1)}% (${winRate > 50 ? 'Better than a coin flip' : 'Inverse me'})`
  ];

  // Top bags by deploy volume
  const topBags = [...tokens]
    .sort((a, b) => (b.totalUsdInvested || 0) - (a.totalUsdInvested || 0))
    .slice(0, 4);

  return { archetype, quote, color, habits, topBags };
};

// -----------------------------------------------------------------------------
// SHARED STYLES / COMPONENTS
// -----------------------------------------------------------------------------

const colors = {
  bg: '#fafafa',
  ink: '#0b0b0b',
  muted: '#6b7280',
  accent: '#111827',
  border: '#e5e7eb',
  pill: '#111827',
  pillText: '#f9fafb',
  metricLabel: '#9ca3af',
  metricValue: '#111827',
  success: '#22c55e',
  error: '#b91c1c',
  panelBg: '#ffffff',
  gold: '#b45309',
  goldBg: '#fffbeb',
  goldBorder: '#fde68a',
  mint: '#059669',
  mintBg: '#ecfdf5',
  mintBorder: '#6ee7b7'
};

const Metric = ({ label, value, isPositive, isWarning }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div
      style={{
        fontSize: '11px',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: colors.metricLabel,
        marginBottom: '4px'
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '14px',
        fontWeight: 600,
        color: isPositive ? colors.success : isWarning ? colors.error : colors.metricValue
      }}
    >
      {value}
    </div>
  </div>
);

const Panel = ({ children, style }) => (
  <div
    style={{
      borderRadius: '18px',
      background: colors.panelBg,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 18px 40px rgba(15,23,42,0.08)',
      padding: '20px',
      ...style
    }}
  >
    {children}
  </div>
);

const BadgePill = ({ label, tone = 'neutral' }) => {
  const palette =
    tone === 'positive'
      ? { bg: '#ecfdf3', border: '#bbf7d0', text: '#166534' }
      : tone === 'negative'
      ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' }
      : tone === 'warning'
      ? { bg: '#fffbeb', border: '#fde68a', text: '#92400e' }
      : { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: '999px',
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase'
      }}
    >
      {label}
    </span>
  );
};

// -----------------------------------------------------------------------------
// BADGES
// -----------------------------------------------------------------------------

const badgeDefinitions = [
  {
    id: 0,
    label: 'First Report',
    icon: '📊',
    description: 'Generated your first onchain PnL report on Base.',
    qualify: (s) => (s?.totalTokensTraded || 0) > 0,
    tone: 'positive'
  },
  {
    id: 1,
    label: 'Volume Runner',
    icon: '🏃‍♂️',
    description: 'Traded over $10k total volume.',
    qualify: (s) => (s?.totalTradingVolume || 0) >= 10_000,
    tone: 'positive'
  },
  {
    id: 2,
    label: 'Green Month',
    icon: '📈',
    description: 'More realized profit than loss overall.',
    qualify: (s) => (s?.totalRealizedProfit || 0) > 0,
    tone: 'positive'
  },
  {
    id: 3,
    label: 'Pain Ledger',
    icon: '💊',
    description: 'Realized more than $1k in losses.',
    qualify: (s) => (s?.totalRealizedProfit || 0) < -1000,
    tone: 'negative'
  },
  {
    id: 4,
    label: 'Diamond Hands',
    icon: '💎',
    description: 'Held at least one winning bag for a 5x or more.',
    qualify: (s) => (s?.maxMultiple || 0) >= 5,
    tone: 'positive'
  },
  {
    id: 5,
    label: 'Missed Meta',
    icon: '😬',
    description: 'Let over $5k of upside run without you.',
    qualify: (s) => (s?.totalFumbled || 0) >= 5000,
    tone: 'warning'
  }
];

const getAllBadges = (summary) => {
  const s = summary || {};
  const winRate = s.winRate || 0;
  const volume = s.totalTradingVolume || 0;
  const profit = s.totalRealizedProfit || 0;
  const fumbled = s.totalFumbled || 0;
  const tokens = s.totalTokensTraded || 0;

  return [
    {
      id: 0,
      label: 'First Report',
      title: 'Onchain File Opened',
      icon: '📊',
      description: 'You generated your first onchain PnL report on Base.',
      qualifies: tokens > 0,
      tone: 'positive'
    },
    {
      id: 1,
      label: 'Volume Runner',
      title: 'Volume Runner',
      icon: '🏃‍♂️',
      description: 'Cumulative trading volume over $10k.',
      qualifies: volume >= 10_000,
      tone: 'positive'
    },
    {
      id: 2,
      label: 'Green Month',
      title: 'Green Month',
      icon: '📈',
      description: 'More realized profit than loss overall.',
      qualifies: profit > 0,
      tone: 'positive'
    },
    {
      id: 3,
      label: 'Pain Ledger',
      title: 'Pain Ledger',
      icon: '💊',
      description: 'Realized more than $1k in realized losses.',
      qualifies: profit < -1000,
      tone: 'negative'
    },
    {
      id: 4,
      label: 'Diamond Hands',
      title: 'Diamond Hands',
      icon: '💎',
      description: 'At least one position hit 5x from your entry.',
      qualifies: s.maxMultiple >= 5,
      tone: 'positive'
    },
    {
      id: 5,
      label: 'Missed Meta',
      title: 'Missed Meta',
      icon: '😬',
      description: 'Let more than $5k of upside vanish after you sold.',
      qualifies: fumbled >= 5000,
      tone: 'warning'
    }
  ];
};

const BadgeCard = ({ badge, isClaimed, isLocked, onClaim, loading }) => {
  const { id, icon, title, description, tone } = badge;

  const pill =
    tone === 'positive'
      ? 'Positive'
      : tone === 'negative'
      ? 'Rekt'
      : tone === 'warning'
      ? 'Spicy'
      : 'Neutral';

  return (
    <div
      style={{
        borderRadius: '14px',
        border: `1px solid ${isClaimed ? colors.mintBorder : colors.border}`,
        padding: '14px 14px 12px',
        background: isClaimed ? colors.mintBg : isLocked ? '#f9fafb' : '#fff',
        fontSize: '11px',
        fontWeight: 600,
        color: isClaimed ? colors.mint : isLocked ? colors.muted : colors.ink,
        opacity: isLocked ? 0.7 : 1,
        minWidth: '140px',
        flex: '1 1 140px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{icon}</span>
          <span>{title}</span>
        </div>
        {isClaimed && <span style={{ fontSize: '10px', color: colors.mint }}>✓ Minted</span>}
        {isLocked && <span style={{ fontSize: '10px' }}>🔒</span>}
      </div>
      <div
        style={{
          marginTop: '6px',
          fontSize: '11px',
          color: isLocked ? colors.muted : '#4b5563',
          fontWeight: 400
        }}
      >
        {description}
      </div>
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <BadgePill
          label={pill}
          tone={tone === 'positive' ? 'positive' : tone === 'negative' ? 'negative' : 'warning'}
        />
        <button
          disabled={isLocked || isClaimed || loading}
          onClick={() => onClaim(id)}
          style={{
            padding: '4px 10px',
            borderRadius: '999px',
            border: 'none',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: isLocked ? 'not-allowed' : 'pointer',
            background: isClaimed ? '#e5e7eb' : isLocked ? '#f3f4f6' : '#111827',
            color: isClaimed || isLocked ? '#6b7280' : '#f9fafb'
          }}
        >
          {isClaimed ? 'Minted' : isLocked ? 'Locked' : loading ? 'Minting...' : 'Mint'}
        </button>
      </div>
    </div>
  );
};

const BadgeSection = ({ summary, claimedBadges, onClaimBadge, claimingBadge }) => {
  const badges = getAllBadges(summary || {});
  const qualified = badges.filter((b) => b.qualifies);
  const unqualified = badges.filter((b) => !b.qualifies);

  return (
    <Panel style={{ marginTop: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: '12px'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: colors.metricLabel
            }}
          >
            Trading Badges
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              marginTop: '4px',
              color: colors.ink
            }}
          >
            Mintable onchain achievements
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        {badges.map((badge) => {
          const isClaimed = claimedBadges.includes(badge.id);
          const isLocked = !badge.qualifies;
          const loading = claimingBadge === badge.id;
          return (
            <BadgeCard
              key={badge.id}
              badge={badge}
              isClaimed={isClaimed}
              isLocked={isLocked}
              loading={loading}
              onClaim={onClaimBadge}
            />
          );
        })}
      </div>

      <div
        style={{
          marginTop: '12px',
          padding: '8px 10px',
          borderRadius: '6px',
          background: '#f8fafc',
          border: `1px solid ${colors.border}`,
          fontSize: '10px',
          color: colors.muted,
          textAlign: 'center'
        }}
      >
        Free to mint (gas only) • Each badge can only be minted once
      </div>
    </Panel>
  );
};

// -----------------------------------------------------------------------------
// RANKING / SCORE
// -----------------------------------------------------------------------------

const getScoreTier = (score) => {
  if (score >= 90) return { label: 'Top 1%', color: '#22c55e', description: 'Elite execution.' };
  if (score >= 75)
    return { label: 'Top 10%', color: '#4ade80', description: 'Consistently ahead of the crowd.' };
  if (score >= 60)
    return { label: 'Solid', color: '#38bdf8', description: 'Disciplined and selective.' };
  if (score >= 40)
    return {
      label: 'Room to improve',
      color: '#eab308',
      description: 'Plenty of reps, edges still forming.'
    };
  if (score >= 25)
    return {
      label: 'High variance',
      color: '#f97316',
      description: 'You are playing an expensive game.'
    };
  return {
    label: 'Rebuild phase',
    color: '#ef4444',
    description: 'Right now the best trade is reflection.'
  };
};

// Rough percentile based on score
const calculatePercentile = (summary) => {
  if (!summary) return null;
  const score = summary.tradingScore || 0;

  const percentile = Math.max(1, Math.min(99, Math.round(score)));

  return { score, percentile };
};

const ScoreTierBadge = ({ score }) => {
  const { label, color, description } = getScoreTier(score);

  const gradient =
    score >= 90
      ? 'linear-gradient(135deg,#f97316,#facc15,#22c55e)'
      : score >= 75
      ? 'linear-gradient(135deg,#22c55e,#4ade80,#a7f3d0)'
      : score >= 60
      ? 'linear-gradient(135deg,#0ea5e9,#38bdf8,#a5b4fc)'
      : score >= 40
      ? 'linear-gradient(135deg,#eab308,#facc15,#fed7aa)'
      : score >= 25
      ? 'linear-gradient(135deg,#f97316,#fdba74,#fed7aa)'
      : 'linear-gradient(135deg,#ef4444,#f97316,#fed7aa)';

  const emoji =
    score >= 90 ? '🧠' : score >= 75 ? '📈' : score >= 60 ? '🎯' : score >= 40 ? '🛠️' : '🩹';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        borderRadius: '999px',
        background: gradient,
        color: '#0f172a',
        boxShadow: '0 12px 30px rgba(15,23,42,0.35)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.35,
          background:
            'radial-gradient(circle at 0 0, rgba(255,255,255,0.25), transparent 55%), radial-gradient(circle at 100% 100%, rgba(15,23,42,0.2), transparent 55%)'
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '26px',
          height: '26px',
          borderRadius: '999px',
          background: 'rgba(15,23,42,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px'
        }}
      >
        {emoji}
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.9
          }}
        >
          Tier
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700 }}>{label}</div>
        <div
          style={{
            fontSize: '11px',
            opacity: 0.9,
            marginTop: '2px'
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// MAIN RANK CARD
// -----------------------------------------------------------------------------

const RankCard = ({ user, summary, biggestWin, biggestLoss, onShare, isGated }) => {
  if (!summary || !user) return null;

  const rank = calculatePercentile(summary);
  const score = rank?.score || 0;
  const percentile = rank?.percentile || 0;
  const topPercentile = 100 - percentile;

  const pnl = summary.totalRealizedProfit || 0;
  const pnlSign = pnl >= 0 ? '+' : '-';
  const realized = Math.abs(pnl);

  const winRate = summary.winRate || 0;
  const totalTokens = summary.totalTokensTraded || 0;

  const scoreTier = getScoreTier(score);

  const mainMessage =
    score >= 75
      ? 'You are in control of your exits.'
      : score >= 60
      ? 'You respect risk and let winners breathe.'
      : score >= 40
      ? 'You have enough reps, now refine your filters.'
      : score >= 25
      ? 'Think in campaigns rather than individual bets.'
      : 'Size down, slow down, and trade less often.';

  const pnlTone = pnl > 0 ? 'positive' : pnl < 0 ? 'negative' : 'neutral';

  return (
    <Panel
      style={{
        padding: '20px 18px 18px',
        background:
          'radial-gradient(circle at 0 0, #e5e7eb, #f9fafb 40%, #e5e7eb 85%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* subtle texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: 0.6,
          pointerEvents: 'none'
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header row: avatar + in profit / loss */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '16px',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '999px',
                overflow: 'hidden',
                border: '2px solid rgba(15,23,42,0.15)',
                boxShadow: '0 4px 10px rgba(15,23,42,0.3)'
              }}
            >
              {user.pfpUrl && (
                <img
                  src={user.pfpUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: colors.ink
                }}
              >
                {user.displayName || 'Trader'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: colors.muted
                }}
              >
                @{user.username || 'anon'}.eth
              </div>
            </div>
          </div>
          <BadgePill
            label={pnl >= 0 ? 'In profit' : 'In loss'}
            tone={pnl >= 0 ? 'positive' : 'negative'}
          />
        </div>

        {/* Main body grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,0.9fr)',
            gap: '16px'
          }}
        >
          {/* Left: big score */}
          <div
            style={{
              borderRadius: '18px',
              background:
                'radial-gradient(circle at 0 0, #0f172a, #020617 55%)',
              padding: '16px 16px 14px',
              color: '#e5e7eb',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: '-40%',
                background:
                  'radial-gradient(circle at 0 0, rgba(96,165,250,0.18), transparent 45%)',
                opacity: 0.75
              }}
            />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      opacity: 0.7
                    }}
                  >
                    Trading Score
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      marginTop: '2px',
                      opacity: 0.85
                    }}
                  >
                    Top {topPercentile}% on Base
                  </div>
                </div>
                <ScoreTierBadge score={score} />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '8px',
                  marginBottom: '4px'
                }}
              >
                <div
                  style={{
                    fontSize: '40px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em'
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    opacity: 0.7
                  }}
                >
                  /100
                </div>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  opacity: 0.9,
                  marginTop: '2px'
                }}
              >
                {mainMessage}
              </div>
            </div>
          </div>

          {/* Right: summary stats */}
          <div
            style={{
              borderRadius: '18px',
              background: '#f1f5f9',
              padding: '14px 14px 12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                  marginBottom: '4px'
                }}
              >
                Snapshot
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Metric
                  label="Realized PnL"
                  value={`${pnlSign}${formatCurrency(realized)}`}
                  isPositive={pnl > 0}
                  isWarning={pnl < 0}
                />
                <Metric
                  label="Win Rate"
                  value={formatPercent(winRate)}
                  isPositive={winRate >= 50}
                />
                <Metric label="Tokens" value={totalTokens} />
              </div>
            </div>
            <button
              onClick={onShare}
              style={{
                marginTop: '4px',
                width: '100%',
                borderRadius: '999px',
                padding: '9px 12px',
                border: 'none',
                background: '#111827',
                color: '#f9fafb',
                fontSize: '12px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Share my rank
            </button>
          </div>
        </div>
      </div>
    </Panel>
  );
};

// -----------------------------------------------------------------------------
// LORE CARD (Dark neon, social share friendly)
// -----------------------------------------------------------------------------

const LoreCard = ({ summary, tokens, user, biggestWin, biggestLoss, onShare }) => {
  const lore = generateLore(summary, tokens, biggestWin, biggestLoss);
  const rank = calculatePercentile(summary);
  if (!lore || !rank) return null;

  const score = rank.percentile;
  const topPercent = 100 - score;

  const radius = 52;
  const strokeWidth = 6;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  const scoreColor =
    score >= 80 ? '#22c55e' : score >= 60 ? '#38bdf8' : score >= 40 ? '#eab308' : '#f97316';

  const headerLine =
    score >= 80
      ? 'Certified onchain menace.'
      : score >= 60
      ? 'The file reads: you know what you are doing.'
      : score >= 40
      ? 'The auditors see upside if you keep refining.'
      : 'The report suggests slowing down and tightening your rules.';

  const pnl = summary.totalRealizedProfit || 0;
  const pnlSign = pnl >= 0 ? '+' : '-';
  const realizedAbs = Math.abs(pnl);

  const containerBg =
    'radial-gradient(circle at 0 0, #4c1d95 0%, #020617 50%, #0f172a 100%)';

  return (
    <Panel
      style={{
        marginTop: '18px',
        padding: '22px 18px 18px',
        background: containerBg,
        border: '1px solid rgba(148,163,184,0.3)',
        position: 'relative',
        overflow: 'hidden',
        color: '#e5e7eb'
      }}
    >
      {/* texture */}
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          backgroundImage:
            'radial-gradient(circle at 0 0, rgba(94,234,212,0.2), transparent 60%), radial-gradient(circle at 100% 100%, rgba(129,140,248,0.28), transparent 55%)',
          opacity: 0.9,
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(#020617 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.32,
          mixBlendMode: 'soft-light'
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 40,
          opacity: 0.22,
          fontSize: '80px',
          fontWeight: 900,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(15,23,42,0.6)',
          transform: 'rotate(-32deg)',
          pointerEvents: 'none'
        }}
      >
        LORE FILE
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* header: avatar + text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '28px'
          }}
        >
          <div style={{ position: 'relative' }}>
            <img
              src={user?.pfpUrl}
              alt=""
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: `2px solid ${lore.color}`,
                boxShadow: `0 0 20px ${lore.color}40`
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '2px solid #0a0a0f'
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                letterSpacing: '-0.01em'
              }}
            >
              {user?.displayName || 'Onchain citizen'}
            </div>
            <div
              style={{
                fontSize: '12px',
                opacity: 0.7
              }}
            >
              @{user?.username || 'anon'} • Trading Lore
            </div>
          </div>
        </div>

        {/* center row: score ring + archetype */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            alignItems: 'center'
          }}
        >
          <div style={{ position: 'relative', width: '120px', height: '120px' }}>
            <svg
              width="120"
              height="120"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="rgba(15,23,42,0.75)"
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={scoreColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.8))',
                  transition: 'stroke-dashoffset 0.8s ease-out'
                }}
              />
            </svg>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textShadow: `0 0 30px ${scoreColor}60`
                }}
              >
                {score}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.4)',
                  fontWeight: 500,
                  marginTop: '2px',
                  letterSpacing: '0.05em'
                }}
              >
                Percentile
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                opacity: 0.75
              }}
            >
              Archetype
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: '4px',
                color: '#f9fafb'
              }}
            >
              {lore.archetype}
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '13px',
                lineHeight: 1.7,
                opacity: 0.9
              }}
            >
              <span
                style={{
                  padding: '4px 9px',
                  borderRadius: '999px',
                  background: 'rgba(15,23,42,0.7)',
                  border: `1px solid ${lore.color}40`,
                  boxShadow: `0 0 18px ${lore.color}38`
                }}
              >
                {`Top ${topPercent}% on Base • `}
                {pnlSign}
                {formatCurrency(realizedAbs)} realized
              </span>
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '13px',
                fontStyle: 'italic',
                color: '#e5e7eb'
              }}
            >
              “{lore.quote}”
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: '12px',
                opacity: 0.9
              }}
            >
              {headerLine}
            </div>
          </div>
        </div>

        {/* habits */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginBottom: '18px'
          }}
        >
          {lore.habits.map((habit, i) => (
            <div
              key={i}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background:
                  i === 0
                    ? 'rgba(15,23,42,0.85)'
                    : 'rgba(15,23,42,0.65)',
                border:
                  i === 0
                    ? `1px solid ${lore.color}50`
                    : '1px solid rgba(148,163,184,0.5)',
                fontSize: '12px'
              }}
            >
              {habit}
            </div>
          ))}
        </div>

        {/* top bags */}
        {lore.topBags && lore.topBags.length > 0 && (
          <div style={{ marginBottom: '16px', textAlign: 'center' }}>
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: '10px',
                opacity: 0.6
              }}
            >
              Top Bags
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              {lore.topBags.map((t, idx) => (
                <div
                  key={idx}
                  style={{
                    minWidth: '70px',
                    padding: '6px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(148,163,184,0.4)',
                    background: 'rgba(15,23,42,0.65)',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {t.symbol || t.name || 'Token'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      opacity: 0.7
                    }}
                  >
                    Vol: {formatNumber(t.totalUsdInvested || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onShare}
          style={{
            width: '100%',
            borderRadius: '999px',
            padding: '10px 12px',
            border: 'none',
            background: '#f9fafb',
            color: '#0f172a',
            fontSize: '12px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Share lore from "The Auditor"
        </button>
      </div>
    </Panel>
  );
};

// -----------------------------------------------------------------------------
// AUDIT REPORT CARD (paper-style, light mode, for screenshots / exports)
// -----------------------------------------------------------------------------

const AuditReportCard = ({ user, summary, lore, rank, biggestWin, biggestLoss }) => {
  if (!user || !summary || !lore || !rank) return null;

  const score = rank.percentile;
  const auditDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const stampColor = score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#b91c1c';
  const stampBorder = score >= 80 ? '#86efac' : score >= 50 ? '#fcd34d' : '#fca5a5';
  const stampRotate = score % 2 === 0 ? 'rotate(-10deg)' : 'rotate(8deg)';

  const pnl = summary.totalRealizedProfit || 0;
  const pnlSign = pnl >= 0 ? '+' : '-';
  const realizedAbs = Math.abs(pnl);

  const keyTrades = [];
  if (biggestWin) keyTrades.push({ type: 'Best trade', ...biggestWin });
  if (biggestLoss) keyTrades.push({ type: 'Worst trade', ...biggestLoss });

  return (
    <div
      style={{
        background: '#f2f0e9',
        backgroundImage: 'radial-gradient(#e5e4dc 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        borderRadius: '2px',
        padding: '20px',
        color: '#1f2937',
        border: '2px solid #1f2937',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        position: 'relative',
        overflow: 'hidden',
        margin: '0 auto 24px',
        maxWidth: '480px'
      }}
    >
      {/* watermark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
          fontSize: '70px',
          fontWeight: 900,
          color: '#f3f4f6',
          pointerEvents: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap'
        }}
      >
        AUDIT FILE
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            borderBottom: '2px solid #000',
            paddingBottom: '16px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                alt=""
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  border: '1px solid #000',
                  filter: 'grayscale(100%)',
                  objectFit: 'cover'
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.05em'
                }}
              >
                {user.displayName || 'Trader'}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280'
                }}
              >
                @{user.username || 'anon'} • Ref: #{user.fid}
              </div>
            </div>
          </div>

          {/* score stamp */}
          <div
            style={{
              border: `3px solid ${stampColor}`,
              padding: '8px 10px',
              borderRadius: '8px',
              textAlign: 'center',
              transform: stampRotate,
              background: `${stampColor}10`,
              boxShadow: `4px 4px 0 ${stampBorder}`
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                lineHeight: 1,
                color: stampColor
              }}
            >
              {score}
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}
            >
              / 100
            </div>
          </div>
        </div>

        {/* archetype */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#111827',
              letterSpacing: '0.08em',
              marginBottom: '8px'
            }}
          >
            {lore.archetype}
          </div>
          {lore.quote && (
            <div
              style={{
                fontSize: '13px',
                fontStyle: 'italic',
                background: '#fef3c7',
                display: 'inline-block',
                padding: '4px 12px',
                transform: 'skew(-6deg)',
                border: '1px solid #fcd34d'
              }}
            >
              “{lore.quote}”
            </div>
          )}
        </div>

        {/* metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0,1fr))',
            background: '#020617',
            color: '#f9fafb',
            borderRadius: '6px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              padding: '10px 12px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700
              }}
            >
              {summary.totalTokensTraded}
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                opacity: 0.6,
                letterSpacing: '0.1em'
              }}
            >
              Tokens
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              textAlign: 'center',
              borderLeft: '1px solid #1f2937',
              borderRight: '1px solid #1f2937'
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700
              }}
            >
              {summary.winRate.toFixed(0)}%
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                opacity: 0.6,
                letterSpacing: '0.1em'
              }}
            >
              Win rate
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700
              }}
            >
              {pnlSign}
              {formatCurrency(realizedAbs)}
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                opacity: 0.6,
                letterSpacing: '0.1em'
              }}
            >
              Realized
            </div>
          </div>
        </div>

        {/* performance extremes */}
        {(biggestWin || biggestLoss) && (
          <div
            style={{
              marginBottom: '24px'
            }}
          >
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign: 'center',
                marginBottom: '10px',
                color: '#4b5563'
              }}
            >
              Performance extremes
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                flexDirection: 'row'
              }}
            >
              {biggestWin && (
                <div
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #86efac',
                    background: '#dcfce7',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em'
                    }}
                  >
                    Best trade
                  </div>
                  <div
                    style={{
                      fontWeight: 700
                    }}
                  >
                    {biggestWin.symbol || biggestWin.name}
                  </div>
                  <div>Realized: {formatCurrency(biggestWin.realizedProfitUsd || 0)}</div>
                  <div>Peak multiple: {biggestWin.maxMultiple?.toFixed(1) || '—'}x</div>
                </div>
              )}
              {biggestLoss && (
                <div
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid #fecaca',
                    background: '#fee2e2',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '11px'
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em'
                    }}
                  >
                    Worst trade
                  </div>
                  <div
                    style={{
                      fontWeight: 700
                    }}
                  >
                    {biggestLoss.symbol || biggestLoss.name}
                  </div>
                  <div>Realized: {formatCurrency(biggestLoss.realizedProfitUsd || 0)}</div>
                  <div>
                    Drawdown: {formatCurrency(Math.abs(biggestLoss.realizedProfitUsd || 0))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* habits list */}
        <div>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              textAlign: 'center',
              marginBottom: '10px',
              color: '#6b7280'
            }}
          >
            Audit findings
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {lore.habits.slice(0, 3).map((habit, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  borderRadius: '4px',
                  border: '1px solid #111827',
                  background: i === 0 ? '#111827' : 'rgba(0,0,0,0.02)',
                  color: i === 0 ? '#f9fafb' : '#111827',
                  fontSize: '11px',
                  textAlign: 'center'
                }}
              >
                {habit}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '10px',
            borderTop: '1px dashed #9ca3af',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#6b7280'
          }}
        >
          <div>Auditor: The Auditor</div>
          <div>Date: {auditDate}</div>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// MAIN APP
// -----------------------------------------------------------------------------

export default function PNLTrackerApp() {
  const { frameData } = useFrameContext();

  const [user, setUser] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [primaryWallet, setPrimaryWallet] = useState(null);
  const [activeScope, setActiveScope] = useState('primary');
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [isGated, setIsGated] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [checkingGate, setCheckingGate] = useState(true);
  const [envError, setEnvError] = useState(null);
  const [claimingBadge, setClaimingBadge] = useState(null);
  const [claimedBadges, setClaimedBadges] = useState([]);
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintError, setMintError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const frameUser = frameData?.user;

  // Fetch basic user + wallets
  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!frameUser?.fid) return;

        const res = await fetch(`${API_BASE}/user/${frameUser.fid}`);
        if (!res.ok) throw new Error('Failed to fetch user');
        const data = await res.json();

        setUser(data.user);
        setWallets(data.wallets || []);
        setPrimaryWallet(data.primaryWallet || null);
      } catch (err) {
        console.error('user fetch failed', err);
      }
    };
    fetchUser();
  }, [frameUser]);

  // Fetch pnl report
  const fetchPnL = useCallback(
    async (scope = 'primary') => {
      if (!frameUser?.fid) return;
      setLoading(true);
      setMintError(null);

      try {
        const params = new URLSearchParams();
        params.set('scope', scope);
        if (primaryWallet?.address) params.set('primary', primaryWallet.address);

        const res = await fetch(`${API_BASE}/pnl/${frameUser.fid}?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch pnl');
        const data = await res.json();

        setPnlData(data);
      } catch (err) {
        console.error('pnl fetch failed', err);
      } finally {
        setLoading(false);
      }
    },
    [frameUser, primaryWallet]
  );

  useEffect(() => {
    fetchPnL(activeScope);
  }, [fetchPnL, activeScope]);

  // Gate check
  useEffect(() => {
    const checkGate = async () => {
      if (!primaryWallet?.address) return;
      setCheckingGate(true);

      try {
        const res = await fetch(
          `${API_BASE}/gate/${primaryWallet.address}?token=${PNL_TOKEN_ADDRESS}`
        );
        if (!res.ok) throw new Error('Failed to check gate');
        const data = await res.json();

        setIsGated(!data.hasAccess);
        setTokenBalance(data.balance || 0);
      } catch (err) {
        console.error('gate check failed', err);
        setEnvError('Failed to check token gate');
      } finally {
        setCheckingGate(false);
      }
    };
    checkGate();
  }, [primaryWallet]);

  // Claimed badges
  useEffect(() => {
    const fetchBadges = async () => {
      if (!primaryWallet?.address) return;
      try {
        const res = await fetch(`${API_BASE}/badges/${primaryWallet.address}`);
        if (!res.ok) throw new Error('Failed to fetch minted badges');
        const data = await res.json();
        setClaimedBadges(data.claimed || []);
      } catch (err) {
        console.error('fetch badges failed', err);
      }
    };
    fetchBadges();
  }, [primaryWallet]);

  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary) return;

      const rank = calculatePercentile(summary);
      const score = rank?.score || 0;
      const topPercent = 100 - (rank?.percentile || 0);

      const pnl = summary.totalRealizedProfit || 0;
      const pnlSign = pnl >= 0 ? '+' : '-';
      const realized = formatCurrency(Math.abs(pnl));
      const winRate = summary.winRate || 0;

      const handleText = user?.username ? `@${user.username}` : 'this trader';
      const statusWord = pnl >= 0 ? 'Profitable' : 'Unprofitable';

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const imageUrl = `${API_BASE}/share/${frameUser.fid}?scope=${activeScope}`;

      const castText = `Using $PNL: My Trading Score is ${score}/100 📊\n\nTop ${topPercent}% on Base\n${statusWord}: ${pnlSign}${realized}\nWin rate: ${winRate.toFixed(
        1
      )}%\n\nGet your score:`;

      await sdk.actions.composeCast({
        text: castText,
        embeds: [imageUrl, appLink]
      });
    } catch (err) {
      console.error('share pnl failed', err);
    }
  };

  const handleShareLore = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary) return;

      const tokensArr = pnlData?.tokens || [];
      const biggestWin = pnlData?.biggestWin || null;
      const biggestLoss = pnlData?.biggestLoss || null;

      const lore = generateLore(summary, tokensArr, biggestWin, biggestLoss);
      const rank = calculatePercentile(summary);
      if (!lore || !rank) return;

      const score = rank.percentile;
      const topPercent = 100 - score;

      const pnlValue = summary.totalRealizedProfit || 0;
      const pnlDisplay = `${pnlValue >= 0 ? '+' : '-'}${formatCurrency(
        Math.abs(pnlValue)
      )}`;

      const handle = user?.username ? `@${user.username}` : 'this trader';
      const winRate =
        typeof summary.winRate === 'number'
          ? summary.winRate.toFixed(1)
          : summary.winRate;
      const tokenCount = summary.totalTokensTraded || 0;
      const topBagSymbols = (lore.topBags || [])
        .map((t) => t.symbol)
        .slice(0, 3)
        .join(', ');

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';

      const storyLines = [
        '📜 From The Auditor',
        '',
        `Dear ${handle},`,
        `Your trading score is ${score}/100 (Top ${topPercent}% on Base).`,
        `Realized PnL: ${pnlDisplay} · Win rate: ${winRate}% across ${tokenCount} tokens.`,
        `Archetype: ${lore.archetype} - "${lore.quote}"`
      ];

      if (topBagSymbols) {
        storyLines.push(`Key bags on record: ${topBagSymbols}.`);
      }

      storyLines.push('Signed,');
      storyLines.push('The Auditor');
      storyLines.push('');
      storyLines.push('Get your own audit:');

      const castText = storyLines.join('\n');

      await sdk.actions.composeCast({
        text: castText,
        embeds: [appLink]
      });
    } catch (err) {
      console.error('share lore failed', err);
    }
  };

  const handleShareFumble = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const fumble = pnlData?.biggestFumble;
      if (!fumble) return;

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const missed = fumble.missedUpsideUsd || 0;
      const tokenName = fumble.name || fumble.symbol || 'a token';
      const multiple =
        fumble.totalSoldUsd > 0
          ? (fumble.currentValueSoldTokens / fumble.totalSoldUsd).toFixed(1)
          : '?';

      const messages = [
        `Using $PNL I discovered I left ${formatCurrency(
          missed
        )} on the table by selling $${tokenName} too early.`,
        `I sold my $${tokenName} bag and it went another ${multiple}x without me.`,
        `Apparently my biggest fumble so far is $${tokenName}. The upside I missed: ${formatCurrency(
          missed
        )}.`
      ];

      const text =
        messages[Math.floor(Math.random() * messages.length)] +
        '\n\nCheck your own pain ledger:';

      await sdk.actions.composeCast({
        text,
        embeds: [appLink]
      });
    } catch (err) {
      console.error('share fumble failed', err);
    }
  };

  const handleClaimBadge = async (badgeType) => {
    if (!pnlData?.summary || !primaryWallet?.address) return;

    try {
      setClaimingBadge(badgeType);
      setMintError(null);
      setMintTxHash(null);

      const summary = pnlData.summary;
      const badgeTypeNum = Number(badgeType);
      const winRate = BigInt(Math.floor((summary.winRate || 0) * 100));
      const volume = BigInt(Math.floor(summary.totalTradingVolume || 0));
      const profit = BigInt(
        Math.floor(Math.abs(summary.totalRealizedProfit || 0))
      );

      const data = encodeFunctionData({
        abi: BADGE_ABI,
        functionName: 'mintBadge',
        args: [badgeTypeNum, winRate, volume, profit]
      });

      const { sdk } = await import('@farcaster/miniapp-sdk');
      const tx = await sdk.wallet.sendTransaction({
        to: BADGE_CONTRACT_ADDRESS,
        data,
        chainId: 8453n,
        value: 0n
      });

      if (tx?.hash) {
        setMintTxHash(tx.hash);
      }

      const res = await fetch(
        `${API_BASE}/badges/${primaryWallet.address}?refresh=1`
      );
      if (res.ok) {
        const data = await res.json();
        setClaimedBadges(data.claimed || []);
      }
    } catch (err) {
      console.error('badge mint failed', err);
      setMintError(
        'Badge mint failed. If you rejected the transaction, nothing was sent.'
      );
    } finally {
      setClaimingBadge(null);
    }
  };

  const summary = pnlData?.summary;
  const tokens = pnlData?.tokens || [];
  const biggestWin = pnlData?.biggestWin || null;
  const biggestLoss = pnlData?.biggestLoss || null;

  const lore = summary
    ? generateLore(summary, tokens, biggestWin, biggestLoss)
    : null;
  const rank = summary ? calculatePercentile(summary) : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.ink,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        padding: '16px 12px 20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          maxWidth: '520px',
          margin: '0 auto'
        }}
      >
        {/* header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '999px',
                border: '1px solid #111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px'
              }}
            >
              Ψ
            </div>
            <div>
              <div
                style={{
                  fontSize: '14px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase'
                }}
              >
                PnL Tracker
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: colors.muted
                }}
              >
                Quietly tracks how your trading really went.
              </div>
            </div>
          </div>

          {/* wallet selector */}
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: colors.metricLabel,
                marginBottom: '4px'
              }}
            >
              Primary
            </div>
            <div
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: `1px solid ${colors.border}`,
                fontSize: '12px',
                background: '#f9fafb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>
                {primaryWallet?.ens ||
                  shortenAddress(primaryWallet?.address || '') ||
                  'No wallet'}
              </span>
            </div>
          </div>
        </header>

        {/* scope selector */}
        <div
          style={{
            marginBottom: '16px',
            display: 'flex',
            gap: '8px'
          }}
        >
          {[
            { id: 'primary', label: 'Primary' },
            { id: 'all', label: 'All wallets' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveScope(opt.id)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '999px',
                border:
                  activeScope === opt.id
                    ? 'none'
                    : `1px solid ${colors.border}`,
                background:
                  activeScope === opt.id ? '#111827' : 'transparent',
                color:
                  activeScope === opt.id
                    ? '#f9fafb'
                    : colors.metricLabel,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                cursor: 'pointer'
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* tabs */}
        {pnlData?.summary && (
          <div
            className="no-scrollbar"
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              overflowX: 'auto',
              paddingBottom: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            {['stats', 'airdrops', 'badges', 'lore'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  border:
                    activeTab === tab
                      ? 'none'
                      : `1px solid ${colors.border}`,
                  background:
                    activeTab === tab ? colors.accent : colors.panelBg,
                  color:
                    activeTab === tab
                      ? colors.pillText
                      : colors.muted,
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab === 'stats'
                  ? 'Stats'
                  : tab === 'airdrops'
                  ? `Airdrops${
                      pnlData?.airdrops?.airdropCount
                        ? ` (${pnlData.airdrops.airdropCount})`
                        : ''
                    }`
                  : tab === 'lore'
                  ? 'Lore'
                  : 'Badges'}
              </button>
            ))}
          </div>
        )}

        {/* rank card when not on lore */}
        {!isGated && activeTab !== 'lore' && pnlData?.summary && (
          <RankCard
            user={user}
            summary={pnlData.summary}
            biggestWin={biggestWin}
            biggestLoss={biggestLoss}
            onShare={handleSharePnL}
            isGated={isGated}
          />
        )}

        {/* lore tab */}
        {!isGated &&
          activeTab === 'lore' &&
          pnlData?.summary && (
            <div>
              <AuditReportCard
                user={user}
                summary={pnlData.summary}
                lore={lore}
                rank={rank}
                biggestWin={biggestWin}
                biggestLoss={biggestLoss}
              />
              <LoreCard
                user={user}
                summary={pnlData.summary}
                tokens={tokens}
                biggestWin={biggestWin}
                biggestLoss={biggestLoss}
                onShare={handleShareLore}
              />
            </div>
          )}

        {/* badges tab */}
        {!isGated &&
          activeTab === 'badges' &&
          pnlData?.summary && (
            <BadgeSection
              summary={pnlData.summary}
              claimedBadges={claimedBadges}
              onClaimBadge={handleClaimBadge}
              claimingBadge={claimingBadge}
            />
          )}

        {/* airdrops tab */}
        {!isGated &&
          activeTab === 'airdrops' &&
          pnlData?.airdrops && (
            <Panel style={{ marginTop: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '12px'
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: colors.metricLabel
                    }}
                  >
                    Airdrops
                  </div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      marginTop: '4px',
                      color: colors.ink
                    }}
                  >
                    Retroactive rewards overview
                  </div>
                </div>
                <BadgePill
                  label={
                    pnlData.airdrops.totalUsd
                      ? `Est. ${formatCurrency(
                          pnlData.airdrops.totalUsd
                        )}`
                      : 'No major drops yet'
                  }
                  tone={
                    pnlData.airdrops.totalUsd
                      ? 'positive'
                      : 'warning'
                  }
                />
              </div>

              {pnlData.airdrops.list?.length ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {pnlData.airdrops.list.map((drop, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: `1px solid ${colors.border}`,
                        background: '#f9fafb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            marginBottom: '2px'
                          }}
                        >
                          {drop.name}
                        </div>
                        <div
                          style={{
                            color: colors.muted,
                            fontSize: '11px'
                          }}
                        >
                          {drop.reason}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: 'right'
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 600
                          }}
                        >
                          {formatCurrency(drop.valueUsd)}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: colors.muted
                          }}
                        >
                          {drop.token}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px 10px',
                    borderRadius: '10px',
                    background: '#f9fafb',
                    border: `1px dashed ${colors.border}`,
                    fontSize: '12px',
                    color: colors.muted
                  }}
                >
                  No major airdrops detected yet for this wallet set.
                </div>
              )}
            </Panel>
          )}

        {/* gate notice */}
        {isGated && (
          <Panel
            style={{
              marginTop: '18px',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '6px'
              }}
            >
              Unlock full report with $PNL
            </div>
            <div
              style={{
                fontSize: '12px',
                color: colors.muted,
                marginBottom: '10px'
              }}
            >
              Hold at least 10M $PNL in your primary wallet to unlock full
              stats, lore, badges, and more.
            </div>
            <div
              style={{
                fontSize: '11px',
                color: colors.metricLabel,
                marginBottom: '8px'
              }}
            >
              Current balance:{' '}
              <span
                style={{
                  fontWeight: 600
                }}
              >
                {formatNumber(tokenBalance)} PNL
              </span>
            </div>
            <button
              style={{
                padding: '9px 14px',
                borderRadius: '999px',
                border: 'none',
                background: '#111827',
                color: '#f9fafb',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor: 'pointer'
              }}
            >
              View $PNL onchain
            </button>
          </Panel>
        )}

        {/* footer */}
        <div
          style={{
            marginTop: '16px',
            fontSize: '10px',
            color: colors.metricLabel,
            textAlign: 'center'
          }}
        >
          Built for Base traders • $PNL mini-app
        </div>
      </div>
    </div>
  );
}
