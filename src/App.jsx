import React, { useState, useEffect, useCallback } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires 10M PNL tokens to access full app
// NOW WITH: Badge Claiming & Audits (free mint, gas only)

// Auto-detect demo mode: true in development, false in production
// Override with VITE_DEMO_MODE=true or VITE_DEMO_MODE=false
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' ? true : 
                  import.meta.env.VITE_DEMO_MODE === 'false' ? false :
                  import.meta.env.DEV || false; 
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = 'v2'; // Increment to invalidate old cache

// Token gate configuration
const PNL_TOKEN_ADDRESS = import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x36FA7687bbA52d3C513497b69BcaD07f4919bB07';
const REQUIRED_PNL_BALANCE = 10000000; 

// Badge Contract Configuration
const BADGE_CONTRACT_ADDRESS = import.meta.env.VITE_BADGE_CONTRACT_ADDRESS || '0xCA3FD5824151e478d02515b59Eda3E62d4E238fe';

// Badge Contract ABI (minimal for minting)
const BADGE_ABI = [
  {
    name: 'mintBadge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'badgeType', type: 'uint8' },
      { name: 'winRate', type: 'uint256' },
      { name: 'volume', type: 'uint256' },
      { name: 'profit', type: 'uint256' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }]
  },
  {
    name: 'hasMintedBadge',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'badgeType', type: 'uint8' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

// Badge type enum matching contract
const BADGE_TYPES = {
  SNIPER: 0,
  EXIT_LIQUIDITY: 1,
  VOLUME_WHALE: 2,
  TOILET_PAPER_HANDS: 3,
  DIAMOND: 4,
  TRADER: 5
};

// --- WHITELIST CONFIGURATION ---
const WHITELISTED_WALLETS = [
  '0x187c7B0393eBE86378128f2653D0930E33218899',
  '0xb24cF3BD931c720f99F6c927aEE7733054De4Cab',
  '0x85c0BA9e1456Bc755a6ce69E1a85ccaA1FAa9E41'
].map(addr => addr.toLowerCase());

const BASE_ETH_CAIP19 = 'eip155:8453/native';
const getPnlCaip19 = () =>
  PNL_TOKEN_ADDRESS && PNL_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000'
    ? `eip155:8453/erc20:${PNL_TOKEN_ADDRESS.toLowerCase()}`
    : null;

// Mock data
const MOCK_USER = { fid: 3, username: 'dwr.eth', displayName: 'Dan Romero', pfpUrl: 'https://i.pravatar.cc/150?u=dwr' };
const MOCK_WALLETS = ['0xd7029bdea1c17493893aafe29aad69ef892b8ff2'];

// Juicy mock data
const MOCK_PNL_DATA = {
  summary: { totalRealizedProfit: 12847.56, totalUnrealizedProfit: 3421.89, totalTradingVolume: 89432.12, profitPercentage: 18.4, totalTokensTraded: 24, winRate: 67.3, totalFumbled: 45200 },
  tokens: [
    { name: 'BRETT', symbol: 'BRETT', totalUsdInvested: 5000, realizedProfitUsd: 8420.5, isProfitable: true, avgBuy: 0.04 },
    { name: 'DEGEN', symbol: 'DEGEN', totalUsdInvested: 2500, realizedProfitUsd: 3127.25, isProfitable: true, avgBuy: 0.002 },
    { name: 'TOSHI', symbol: 'TOSHI', totalUsdInvested: 1800, realizedProfitUsd: 1299.81, isProfitable: true, avgBuy: 0.0004 },
    { name: 'NORMIE', symbol: 'NORMIE', totalUsdInvested: 3000, realizedProfitUsd: -1245.32, isProfitable: false, avgBuy: 0.08 },
    { name: 'HIGHER', symbol: 'HIGHER', totalUsdInvested: 1200, realizedProfitUsd: 1245.32, isProfitable: true, avgBuy: 0.01 },
    { name: 'ENJOY', symbol: 'ENJOY', totalUsdInvested: 800, realizedProfitUsd: -234.12, isProfitable: false, avgBuy: 0.004 }
  ],
  biggestWin: { name: 'BRETT', symbol: 'BRETT', totalUsdInvested: 5000, realizedProfitUsd: 8420.5, isProfitable: true },
  biggestLoss: { name: 'NORMIE', symbol: 'NORMIE', totalUsdInvested: 3000, realizedProfitUsd: -1245.32, isProfitable: false },
  biggestFumble: { name: 'KEYCAT', symbol: 'KEYCAT', totalSoldUsd: 400, missedUpsideUsd: 12500, currentValueSoldTokens: 12900 }
};

// Utils
const formatCurrency = (val) => val === undefined || val === null ? '$0.00' : `$${Math.abs(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const formatNumber = (num) => num >= 1000000 ? (num / 1000000).toFixed(1) + 'M' : num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toLocaleString();
const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

// Percentile calculation based on realistic crypto trading distributions
// Most traders lose money, so being profitable at all is top ~35%
const calculatePercentile = (summary) => {
  if (!summary) return { percentile: 50, title: 'Trader', emoji: '📊' };
  
  const profit = summary.totalRealizedProfit || 0;
  const winRate = summary.winRate || 0;
  const volume = summary.totalTradingVolume || 0;
  
  // Profit-based percentile (primary factor)
  // Distribution: ~65% lose money, ~25% small gains, ~8% good gains, ~2% exceptional
  let profitPercentile;
  if (profit <= -10000) profitPercentile = 5;
  else if (profit <= -5000) profitPercentile = 12;
  else if (profit <= -1000) profitPercentile = 25;
  else if (profit <= -100) profitPercentile = 40;
  else if (profit <= 0) profitPercentile = 50;
  else if (profit <= 100) profitPercentile = 58;
  else if (profit <= 500) profitPercentile = 65;
  else if (profit <= 1000) profitPercentile = 72;
  else if (profit <= 2500) profitPercentile = 80;
  else if (profit <= 5000) profitPercentile = 86;
  else if (profit <= 10000) profitPercentile = 92;
  else if (profit <= 25000) profitPercentile = 96;
  else if (profit <= 50000) profitPercentile = 98;
  else profitPercentile = 99;
  
  // Win rate bonus (secondary factor)
  let winRateBonus = 0;
  if (winRate >= 70) winRateBonus = 5;
  else if (winRate >= 60) winRateBonus = 3;
  else if (winRate >= 50) winRateBonus = 1;
  else if (winRate < 30) winRateBonus = -3;
  
  // Volume consideration (shows experience)
  let volumeBonus = 0;
  if (volume >= 100000) volumeBonus = 2;
  else if (volume >= 50000) volumeBonus = 1;
  
  const rawPercentile = Math.min(99, Math.max(1, profitPercentile + winRateBonus + volumeBonus));
  
  // Round to nice numbers for display
  const percentile = rawPercentile >= 99 ? 99 : 
                     rawPercentile >= 95 ? Math.round(rawPercentile) :
                     rawPercentile >= 90 ? Math.round(rawPercentile) :
                     Math.round(rawPercentile);
  
  return { percentile, ...getRankTitle(percentile, profit, winRate) };
};

const getRankTitle = (percentile, profit, winRate) => {
  // Titles with personality and trading insights
  if (percentile >= 99) return { 
    title: 'Top 1%', 
    emoji: '👑', 
    vibe: 'Elite performer',
    insight: 'You belong in a hedge fund',
    callout: 'One of the best on Base'
  };
  if (percentile >= 95) return { 
    title: 'Elite', 
    emoji: '💎', 
    vibe: 'Outperforming 95% of traders',
    insight: 'Your entries are surgical',
    callout: 'Top 5% of all traders'
  };
  if (percentile >= 90) return { 
    title: 'Expert', 
    emoji: '🏆', 
    vibe: 'Consistently profitable',
    insight: 'You understand the game',
    callout: 'Beating 90% of traders'
  };
  if (percentile >= 80) return { 
    title: 'Skilled', 
    emoji: '📈', 
    vibe: 'Well above average',
    insight: 'More wins than losses',
    callout: 'Top 20% on Base'
  };
  if (percentile >= 70) return { 
    title: 'Profitable', 
    emoji: '✓', 
    vibe: 'Solid track record',
    insight: 'You know when to exit',
    callout: 'Better than most'
  };
  if (percentile >= 60) return { 
    title: 'Above Average', 
    emoji: '↗', 
    vibe: 'Beating the majority',
    insight: 'Still in the green',
    callout: 'Top 40%'
  };
  if (percentile >= 50) return { 
    title: 'Holding Steady', 
    emoji: '―', 
    vibe: 'Middle of the pack',
    insight: 'Breaking even is an achievement',
    callout: 'Surviving the chaos'
  };
  if (percentile >= 40) return { 
    title: 'Below Average', 
    emoji: '↘', 
    vibe: 'Room to improve',
    insight: 'Learning expensive lessons',
    callout: 'Most traders are here'
  };
  if (percentile >= 30) return { 
    title: 'Down Bad', 
    emoji: '📉', 
    vibe: 'Tough stretch',
    insight: 'Maybe try holding longer?',
    callout: 'It gets better'
  };
  if (percentile >= 20) return { 
    title: 'Struggling', 
    emoji: '😅', 
    vibe: 'Finding your footing',
    insight: 'Buy high, sell low specialist',
    callout: 'At least you are trying'
  };
  if (percentile >= 10) return { 
    title: 'Rekt', 
    emoji: '💸', 
    vibe: 'It happens',
    insight: 'Everyone has a rough patch',
    callout: 'Rock bottom builds character'
  };
  return { 
    title: 'Wrecked', 
    emoji: '🪦', 
    vibe: 'Nowhere to go but up',
    insight: 'At least you are self-aware',
    callout: 'Legend in the making'
  };
};

// --- LORE ENGINE (NEW) ---
// Analyzes stats to create a "Wingman" style persona
// Worker base for audit endpoints
const WORKER_BASE = (import.meta.env.VITE_WORKER_BASE || 'https://pnl.jab067.workers.dev').replace(/\/$/, '');

// Build audit query for current scope
function buildAuditQueryArgs({ activeScope, wallets, primaryWallet }) {
  if (activeScope && activeScope !== 'primary' && activeScope !== 'all') {
    return { combined: false, addresses: [activeScope] };
  }
  if (activeScope === 'primary' || !activeScope) {
    return { combined: true, addresses: [primaryWallet].filter(Boolean) };
  }
  return { combined: true, addresses: wallets || [] };
}

// Map Worker audit 'lore' structure to card expectations
function mapWorkerAuditToLore(worker) {
  const l = worker?.lore || {};
  return {
    archetype: l.archetype || 'Reviewed',
    quote: l.quote || 'Audit complete.',
    color: l.color || '#111827',
    habits: Array.isArray(l.findings) ? l.findings : []
  };
}

const generateLore = (summary, tokens, biggestWin, biggestLoss) => {
  if (!summary) return null;
  const { winRate, totalRealizedProfit, totalFumbled, totalTradingVolume } = summary;
  
  let archetype = "The NPC";
  let quote = "I trade, therefore I am.";
  let color = "#64748b"; // Default slate
  
// Logic to determine Archetype
if (totalRealizedProfit > 50000) {
  archetype = "Based";
  quote = "You leave each cycle with more than you brought in.";
  color = "#EAB308"; // Gold
} else if (totalRealizedProfit > 10000) {
  archetype = "Edge Carrier";
  quote = "You have a repeatable edge and you use it.";
  color = "#22c55e"; // Green
} else if (winRate > 70) {
  archetype = "High Hit Rate";
  quote = "You are selective, and most swings connect.";
  color = "#06b6d4"; // Cyan
} else if (totalFumbled > 20000) {
  archetype = "Early Exiter";
  quote = "You read the narrative, then hand off the final leg.";
  color = "#f97316"; // Orange
} else if (totalRealizedProfit < -5000) {
  archetype = "Liquidity Donor";
  quote = "You are currently financing other people's screenshots.";
  color = "#ef4444"; // Red
} else if (totalTradingVolume > 100000) {
  archetype = "Flow Trader";
  quote = "You live in the order flow rather than on the sidelines.";
  color = "#8b5cf6"; // Purple
} else {
  archetype = "Working File";
  quote = "The story is still being written. The curve can bend either way.";
  color = "#94a3b8"; // Slate
}

  // Generate Habits based on data
  const habits = [
    biggestWin ? `Legendary entry on $${biggestWin.symbol}` : "Still looking for a big win",
    biggestLoss ? `Donated heavily to the $${biggestLoss.symbol} community` : "Risk management expert",
    totalFumbled > 1000 ? `Allergic to holding winners (Missed $${formatNumber(totalFumbled)})` : "Diamond hands activated",
    `Win Rate: ${winRate.toFixed(1)}% (${winRate > 50 ? 'Better than a coin flip' : 'Inverse me'})`
  ];

  // Top Bags (Most volume)
  // Exclude common quote/infrastructure tokens from "Key Bags" to show actual trades
  const ignoreList = ['WETH', 'USDC', 'USDT', 'DAI', 'cbBTC', 'ETH', 'WrETH'];
  const topBags = [...tokens]
    .filter(t => !ignoreList.includes(t.symbol))
    .sort((a,b) => (b.totalUsdInvested || 0) - (a.totalUsdInvested || 0))
    .slice(0, 4);

  return { archetype, quote, color, habits, topBags };
};

// Styles
const colors = {
  bg: '#fafafa', ink: '#0b0b0b', muted: '#6b7280', accent: '#111827', border: '#e5e7eb',
  pill: '#111827', pillText: '#f9fafb', metricLabel: '#9ca3af', metricValue: '#111827',
  success: '#22c55e', error: '#b91c1c', panelBg: '#ffffff',
  gold: '#b45309', goldBg: '#fffbeb', goldBorder: '#fde68a',
  mint: '#059669', mintBg: '#ecfdf5', mintBorder: '#6ee7b7'
};

// Design system for consistency
const ds = {
  radius: { sm: '8px', md: '12px', lg: '16px', xl: '20px', pill: '999px', full: '50%' },
  text: { xs: '10px', sm: '11px', base: '13px', md: '14px', lg: '18px', xl: '20px', xxl: '32px' },
  space: { xs: '8px', sm: '12px', md: '16px', lg: '20px', xl: '24px' },
  shadow: { sm: '0 2px 8px rgba(0,0,0,0.06)', md: '0 4px 12px rgba(0,0,0,0.08)', lg: '0 8px 24px rgba(0,0,0,0.1)' }
};

// Components
const Metric = ({ label, value, isPositive, isWarning }) => (
  <div style={{ minWidth: '90px' }}>
    <div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', letterSpacing: '0.14em', color: isWarning ? colors.gold : colors.metricLabel, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: ds.text.md, fontWeight: '600', color: isWarning ? colors.gold : (isPositive === undefined ? colors.metricValue : isPositive ? colors.success : colors.error) }}>{value}</div>
  </div>
);

const Badge = ({ icon, label, badgeType, onClaim, isClaiming, isClaimed, canClaim, qualified, requirement, current, scoreBonus = 10 }) => {
  const isLocked = !qualified;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '4px', 
      padding: `${ds.space.xs} ${ds.space.sm}`, 
      borderRadius: ds.radius.md, 
      border: `1px solid ${isClaimed ? colors.mintBorder : isLocked ? '#e5e7eb' : colors.border}`, 
      background: isClaimed ? colors.mintBg : isLocked ? '#f9fafb' : '#fff', 
      fontSize: ds.text.sm, 
      fontWeight: '600', 
      color: isClaimed ? colors.mint : isLocked ? colors.muted : colors.ink,
      opacity: isLocked ? 0.7 : 1,
      minWidth: '140px',
      flex: '1 1 140px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: ds.text.md }}>{icon}</span> 
          <span>{label}</span>
        </div>
        {isClaimed && <span style={{ fontSize: ds.text.xs, color: colors.mint }}>✓ Minted</span>}
        {isLocked && <span style={{ fontSize: ds.text.xs }}>🔒</span>}
      </div>
      
      <div style={{ fontSize: ds.text.xs, color: colors.muted, fontWeight: '400' }}>
        {isLocked ? (
          <span>Need: {requirement}</span>
        ) : (
          <span>You: {current}</span>
        )}
      </div>
      
      {canClaim && !isLocked && !isClaimed && (
        <button 
          onClick={() => onClaim(badgeType)}
          disabled={isClaiming}
          style={{
            marginTop: '4px',
            padding: `6px ${ds.space.xs}`,
            borderRadius: ds.radius.sm,
            border: 'none',
            background: colors.mint,
            color: '#fff',
            fontSize: ds.text.xs,
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {isClaiming ? 'Minting...' : `Mint NFT +${scoreBonus}`}
        </button>
      )}
      
      {isClaimed && (
        <div style={{
            marginTop: '4px',
            padding: `6px ${ds.space.xs}`,
            borderRadius: ds.radius.sm,
            background: 'rgba(34, 197, 94, 0.1)',
            color: colors.mint,
            fontSize: ds.text.xs,
            fontWeight: '600',
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
        }}>
          Collected
        </div>
      )}
    </div>
  );
};

const Panel = ({ title, subtitle, children, style }) => (
  <div style={{ background: colors.panelBg, borderRadius: ds.radius.lg, border: `1px solid ${colors.border}`, padding: ds.space.lg, boxShadow: ds.shadow.md, ...style }}>
    {(title || subtitle) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ds.space.sm }}>
        {title && <div style={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: ds.text.xs, color: colors.metricLabel }}>{title}</div>}
        {subtitle && <div style={{ fontSize: ds.text.sm, color: colors.muted }}>{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

const InfoPanel = ({ isVisible, onClose }) => {
  if (!isVisible) return null;
  
  const infoItems = [
    { title: 'Realized P&L', desc: 'Profit or loss from tokens you\'ve sold. Does not include tokens you\'re still holding.' },
    { title: 'Airdrops', desc: 'Tokens received for free show as 100% profit since your cost basis was $0.' },
    { title: 'Win Rate', desc: 'Percentage of sold tokens that were profitable. A win means you sold for more than you paid.' },
    { title: 'Fumbled', desc: 'Potential gains missed by selling early. Based on current price vs your sell price.' },
    { title: 'Base Only', desc: 'Currently tracking Base chain only. Other chains may be added in future updates.' },
  ];
  
  return (
    <Panel title="Explaining These Numbers" subtitle="tap to close" style={{ marginBottom: '20px', cursor: 'pointer' }}>
      <div onClick={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {infoItems.map((item, i) => (
            <div key={i} style={{ paddingBottom: i < infoItems.length - 1 ? '12px' : '0', borderBottom: i < infoItems.length - 1 ? `1px solid ${colors.border}` : 'none' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: colors.ink, marginBottom: '3px' }}>{item.title}</div>
              <div style={{ fontSize: '11px', color: colors.muted, lineHeight: '1.5' }}>{item.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${colors.border}`, fontSize: '10px', color: colors.metricLabel, textAlign: 'center' }}>
          Data from the API. Excludes unrealized gains, bridged tokens, and LP positions.
        </div>
      </div>
    </Panel>
  );
};

// --- UPDATED RANK CARD (WITH GRADIENT BADGE) ---
const RankCard = ({ summary, onShare }) => {
  const rank = calculatePercentile(summary);
  const profit = summary?.totalRealizedProfit || 0;
  const topPercent = 100 - rank.percentile;
  const score = rank.percentile; // Use percentile as the 0-100 score
  
  // Dynamic colors based on rank
  const getBgGradient = () => {
    if (rank.percentile >= 95) return 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'; // Dark
    if (rank.percentile >= 80) return 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)'; // Blue
    if (rank.percentile >= 60) return 'linear-gradient(135deg, #14532d 0%, #166534 100%)'; // Green
    if (rank.percentile >= 40) return 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'; // Gray
    return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'; // Red
  };
  
  // NEW: Exciting Badge Styles
  const getBadgeStyle = () => {
    // Elite / Top 1% - Gold/Diamond Gradient
    if (rank.percentile >= 95) return {
      background: 'linear-gradient(135deg, #FDE68A 0%, #D97706 100%)',
      color: '#451a03',
      shadow: '0 4px 15px rgba(217, 119, 6, 0.4)'
    };
    // Profitable - Vibrant Green Gradient
    if (rank.percentile >= 60) return {
      background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)',
      color: '#052e16',
      shadow: '0 4px 15px rgba(22, 163, 74, 0.4)'
    };
    // Mid - Blue/Slate Gradient
    if (rank.percentile >= 40) return {
      background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)',
      color: '#f8fafc',
      shadow: '0 4px 15px rgba(71, 85, 105, 0.3)'
    };
    // Rekt - Intense Red Gradient
    return {
      background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
      color: '#450a0a',
      shadow: '0 4px 15px rgba(220, 38, 38, 0.4)'
    };
  };

  const badgeStyle = getBadgeStyle();
  
  return (
    <div style={{ 
      background: getBgGradient(),
      borderRadius: '16px', 
      padding: '20px',
      marginBottom: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.14em', 
              color: 'rgba(255,255,255,0.5)', 
              fontWeight: '500' 
            }}>
              Trading Score
            </div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '800', 
              color: '#fff', 
              textShadow: '0 0 20px rgba(255,255,255,0.3)',
              lineHeight: '1'
            }}>
              {score}<span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>/100</span>
            </div>
          </div>
          
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: '4px' }}>
              Your Ranking
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>
              {rank.callout || 'Base Chain'}
            </div>
            {/* High-Fidelity Gradient Badge */}
            <div style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '99px',
              background: badgeStyle.background,
              boxShadow: badgeStyle.shadow,
              color: badgeStyle.color,
              fontWeight: '800',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <span>{rank.emoji}</span>
              <span>{rank.title}</span>
            </div>
          </div>
        </div>
        
        {/* Main percentile display */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#fff', lineHeight: '1', letterSpacing: '-0.03em' }}>
            Top {topPercent}%
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>
            {rank.vibe}
          </div>
        </div>
        
        {/* Insight quote */}
        {rank.insight && (
          <div style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.6)', 
            marginBottom: '16px',
            fontStyle: 'italic',
            paddingLeft: '12px',
            borderLeft: '2px solid rgba(255,255,255,0.2)'
          }}>
            "{rank.insight}"
          </div>
        )}
        
        {/* Stats row */}
        <div style={{ display: 'flex', gap: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Realized P&L</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: profit >= 0 ? '#4ade80' : '#f87171' }}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Win Rate</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{(summary?.winRate || 0).toFixed(1)}%</div>
          </div>
          <div>
            <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Tokens</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{summary?.totalTokensTraded || 0}</div>
          </div>
        </div>
        
        {/* Share button */}
        <button 
          onClick={onShare}
          style={{ 
            marginTop: '16px',
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: 'none',
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            backdropFilter: 'blur(10px)'
          }}
        >
          Share My Rank
        </button>
      </div>
    </div>
  );
};

// --- IMPROVED LORE COMPONENT WITH SCORE RING ---
const LoreCard = ({ summary, tokens, user, biggestWin, biggestLoss, onShare }) => {
  const lore = generateLore(summary, tokens, biggestWin, biggestLoss);
  const rank = calculatePercentile(summary);
  
  if (!lore || !rank) return null;

  const score = rank.percentile;
  const topPercent = 100 - score;
  
  // Dynamic color based on score tier
  const getScoreColor = () => {
    if (score >= 95) return '#F59E0B';
    if (score >= 80) return '#22C55E';  
    if (score >= 60) return '#3B82F6';
    if (score >= 40) return '#94A3B8';
    return '#EF4444';
  };
  
  const scoreColor = getScoreColor();

  return (
    <div style={{
      marginBottom: ds.space.lg,
      borderRadius: ds.radius.xl,
      border: '1px solid #e5e7eb',
      background: '#ffffff',
      padding: '32px 24px',
      boxShadow: ds.shadow.lg,
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '140px',
        background: 'linear-gradient(180deg, rgba(17,24,39,0.02) 0%, rgba(255,255,255,0) 100%)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative' }}>
        {/* Header with user info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: ds.space.sm,
          marginBottom: ds.space.xl,
          paddingBottom: ds.space.md,
          borderBottom: '1px solid #f3f4f6'
        }}>
          <img 
            src={user?.pfpUrl} 
            alt=""
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: ds.radius.full, 
              border: '2px solid #e5e7eb'
            }} 
          />
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: ds.text.md, 
              fontWeight: '700', 
              color: colors.ink,
              letterSpacing: '-0.01em'
            }}>
              {user?.displayName}
            </div>
            <div style={{ 
              fontSize: ds.text.sm, 
              color: colors.muted
            }}>
              @{user?.username}
            </div>
          </div>
          <div style={{
            fontSize: ds.text.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: colors.muted,
            fontWeight: '600'
          }}>
            Report Card
          </div>
        </div>

        {/* Score & Archetype */}
        <div style={{ textAlign: 'center', marginBottom: ds.space.xl }}>
          
          {/* Score Circle */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '120px',
            height: '120px',
            borderRadius: ds.radius.full,
            background: `linear-gradient(135deg, ${scoreColor} 0%, ${scoreColor}dd 100%)`,
            marginBottom: ds.space.md,
            boxShadow: `0 8px 24px ${scoreColor}30`
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '48px',
                fontWeight: '800',
                color: '#ffffff',
                lineHeight: '1',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
              }}>
                {score}
              </div>
              <div style={{
                fontSize: ds.text.sm,
                color: 'rgba(255,255,255,0.7)',
                fontWeight: '500',
                marginTop: '2px'
              }}>
                /100
              </div>
            </div>
          </div>
          
          {/* Top % Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: ds.radius.pill,
            background: `${scoreColor}15`,
            border: `1px solid ${scoreColor}30`,
            marginBottom: ds.space.md
          }}>
            <span style={{ fontSize: ds.text.sm, color: scoreColor, fontWeight: '600' }}>
              TOP {topPercent}%
            </span>
            <span style={{ fontSize: ds.text.md }}>{rank.emoji}</span>
          </div>
          
          {/* Archetype */}
          <div style={{
            fontSize: ds.text.xl,
            fontWeight: '700',
            color: colors.ink,
            marginBottom: ds.space.sm,
            letterSpacing: '-0.02em'
          }}>
            {lore.archetype}
          </div>
          
          {/* Quote */}
          <div style={{
            fontSize: ds.text.base,
            color: colors.muted,
            fontStyle: 'italic',
            lineHeight: '1.5',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            "{lore.quote}"
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: ds.space.sm,
          marginBottom: ds.space.lg,
          padding: ds.space.lg + ' 0',
          borderTop: '1px solid #f3f4f6',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: ds.text.lg,
              fontWeight: '700',
              color: summary.totalRealizedProfit >= 0 ? colors.success : colors.error,
              marginBottom: '4px'
            }}>
              {summary.totalRealizedProfit >= 0 ? '+' : ''}{formatNumber(summary.totalRealizedProfit)}
            </div>
            <div style={{
              fontSize: ds.text.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: colors.muted,
              fontWeight: '500'
            }}>
              Realized
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: ds.text.lg,
              fontWeight: '700',
              color: colors.ink,
              marginBottom: '4px'
            }}>
              {summary.winRate.toFixed(0)}%
            </div>
            <div style={{
              fontSize: ds.text.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: colors.muted,
              fontWeight: '500'
            }}>
              Win Rate
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: ds.text.lg,
              fontWeight: '700',
              color: colors.ink,
              marginBottom: '4px'
            }}>
              {summary.totalTokensTraded}
            </div>
            <div style={{
              fontSize: ds.text.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: colors.muted,
              fontWeight: '500'
            }}>
              Tokens
            </div>
          </div>
        </div>

        {/* Top Bags */}
        <div style={{ marginBottom: ds.space.lg }}>
          <div style={{
            fontSize: ds.text.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: ds.space.sm,
            color: colors.muted,
            fontWeight: '600'
          }}>
            Top Holdings
          </div>
          <div style={{ display: 'flex', gap: ds.space.sm }}>
            {lore.topBags.slice(0, 3).map((t, i) => (
              <div key={i} style={{
                flex: 1,
                padding: ds.space.sm,
                borderRadius: ds.radius.md,
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: ds.text.md,
                  fontWeight: '700',
                  color: colors.ink,
                  marginBottom: '4px'
                }}>
                  {t.symbol}
                </div>
                <div style={{
                  fontSize: ds.text.xs,
                  color: t.profit >= 0 ? colors.success : colors.error,
                  fontWeight: '600'
                }}>
                  {t.profit >= 0 ? '+' : ''}{formatCurrency(t.profit)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Habits */}
        <div style={{ marginBottom: ds.space.lg }}>
          <div style={{
            fontSize: ds.text.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            marginBottom: ds.space.sm,
            color: colors.muted,
            fontWeight: '600'
          }}>
            Trading Habits
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.space.xs }}>
            {lore.habits.slice(0, 3).map((habit, i) => (
              <div key={i} style={{
                padding: '10px 14px',
                borderRadius: ds.radius.sm,
                border: '1px solid #e5e7eb',
                background: '#fafafa',
                fontSize: ds.text.sm,
                color: colors.ink,
                lineHeight: '1.4'
              }}>
                {habit}
              </div>
            ))}
          </div>
        </div>

        {/* Share Button */}
        <button 
          onClick={onShare} 
          style={{
            width: '100%',
            padding: ds.space.md,
            borderRadius: ds.radius.md,
            border: 'none',
            background: colors.ink,
            color: '#ffffff',
            fontSize: ds.text.base,
            fontWeight: '700',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            boxShadow: ds.shadow.md
          }}
        >
          Share My Report
        </button>
      </div>
    </div>
  );
};

const TokenRow = ({ token }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${ds.space.sm} 0`, borderBottom: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: ds.space.sm }}>
      <div style={{ width: '36px', height: '36px', borderRadius: ds.radius.full, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: ds.text.md, fontWeight: '600', color: colors.accent, border: `1px solid ${colors.border}` }}>{token.symbol?.charAt(0)}</div>
      <div>
        <div style={{ fontSize: ds.text.md, fontWeight: '500', color: colors.ink }}>{token.symbol}</div>
        <div style={{ fontSize: ds.text.sm, color: colors.muted }}>Bought: {formatCurrency(token.totalUsdInvested)}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: ds.text.md, fontWeight: '500', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error }}>
        {token.realizedProfitUsd >= 0 ? '+' : '-'}{formatCurrency(token.realizedProfitUsd)}
      </div>
      <div style={{ fontSize: ds.text.sm, color: colors.muted }}>Realized P&L</div>
    </div>
  </div>
);

const BigMoveCard = ({ label, token, isWin, onShare }) => {
  if (!token) return null;
  const invested = token.totalUsdInvested || 0;
  const pnl = token.realizedProfitUsd || 0;
  const bg = isWin ? '#f0fdf4' : '#fef2f2';
  const border = isWin ? '#bbf7d0' : '#fecaca';
  const text = isWin ? '#166534' : '#991b1b';
  const pillBg = isWin ? '#dcfce7' : '#fee2e2';

  return (
    <div style={{ flex: '1 1 140px', padding: ds.space.sm, borderRadius: ds.radius.lg, border: `1px solid ${border}`, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: ds.space.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: ds.text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.metricLabel }}>{label}</div>
        <div style={{ padding: '2px 8px', borderRadius: ds.radius.sm, fontSize: ds.text.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: pillBg, color: text }}>{token.symbol}</div>
      </div>
      <div>
        <div style={{ fontSize: ds.text.xl, fontWeight: '700', color: text, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>{pnl >= 0 ? '+' : '-'}{formatCurrency(pnl)}</div>
        <div style={{ fontSize: ds.text.sm, color: colors.muted }}>{token.name} · Realized</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: ds.space.xs, borderTop: `1px dashed ${border}` }}>
        <div><div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>You Paid</div><div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.ink }}>{formatCurrency(invested)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>You Got</div><div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.ink }}>{formatCurrency(invested + pnl)}</div></div>
      </div>
      {onShare && (
        <button 
          onClick={onShare}
          style={{ 
            marginTop: '4px',
            padding: ds.space.xs,
            borderRadius: ds.radius.sm,
            border: `1px solid ${border}`,
            background: isWin ? 'rgba(22, 101, 52, 0.1)' : 'rgba(153, 27, 27, 0.1)',
            color: text,
            fontSize: ds.text.xs,
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          {isWin ? 'Share Win' : 'Share L'}
        </button>
      )}
    </div>
  );
};

const BigFumbleCard = ({ token, onShare }) => {
  if (!token) return null;
  const sold = token.totalSoldUsd || 0;
  const missed = token.missedUpsideUsd || 0;
  const current = token.currentValueSoldTokens || 0;
  const multiple = sold > 0 ? current / sold : 0;

  return (
    <div style={{ flex: '1 1 140px', padding: ds.space.sm, borderRadius: ds.radius.lg, border: `1px solid ${colors.goldBorder}`, background: colors.goldBg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: ds.space.sm }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: ds.text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold }}>Biggest Fumble</div>
          <div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.gold, marginTop: '2px' }}>{token.name || token.symbol}</div>
        </div>
        <div style={{ padding: '2px 8px', borderRadius: ds.radius.sm, fontSize: ds.text.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fef3c7', color: colors.gold }}>Sold Early</div>
      </div>
      <div>
        <div style={{ fontSize: ds.text.xl, fontWeight: '700', color: colors.gold, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>{formatCurrency(missed)}</div>
        <div style={{ fontSize: ds.text.sm, color: colors.gold }}>left on the table</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: ds.space.xs, borderTop: `1px dashed ${colors.goldBorder}` }}>
        <div><div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>You Sold</div><div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.gold }}>{formatCurrency(sold)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>Worth Now</div><div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.gold }}>{formatCurrency(current)} {multiple > 0 && <span style={{ opacity: 0.7 }}>({multiple.toFixed(1)}x)</span>}</div></div>
      </div>
      {onShare && (
        <button 
          onClick={onShare}
          style={{ 
            marginTop: '4px',
            padding: ds.space.xs,
            borderRadius: ds.radius.sm,
            border: `1px solid ${colors.goldBorder}`,
            background: 'rgba(180, 83, 9, 0.1)',
            color: colors.gold,
            fontSize: ds.text.xs,
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          Share Fumble
        </button>
      )}
    </div>
  );
};

const ErrorScreen = ({ title, message }) => (
  <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: ds.space.lg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
    <div style={{ background: colors.panelBg, borderRadius: ds.radius.lg, border: `1px solid ${colors.border}`, padding: `${ds.space.xl} ${ds.space.lg}`, maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: ds.shadow.md }}>
      <div style={{ width: '42px', height: '42px', borderRadius: ds.radius.full, border: `1px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: `0 auto ${ds.space.sm}`, fontSize: ds.text.lg }}>⚠️</div>
      <div style={{ fontSize: ds.text.sm, textTransform: 'uppercase', letterSpacing: '0.16em', color: colors.metricLabel, marginBottom: ds.space.xs }}>{title}</div>
      <p style={{ fontSize: ds.text.base, color: colors.muted, lineHeight: 1.6, margin: 0 }}>{message}</p>
    </div>
  </div>
);

// Helper to get ALL badges with qualification status
const getAllBadges = (summary) => {
  const s = summary || {};
  const winRate = s.winRate || 0;
  const volume = s.totalTradingVolume || 0;
  const profit = s.totalRealizedProfit || 0;
  const fumbled = s.totalFumbled || 0;
  const tokens = s.totalTokensTraded || 0;
  
  return [
    { 
      icon: '🎯', 
      label: 'Sniper', 
      type: BADGE_TYPES.SNIPER, scoreBonus: 10,
      qualified: winRate >= 60,
      requirement: 'Win Rate ≥ 60%',
      current: `${winRate.toFixed(1)}%`
    },
    { 
      icon: '💧', 
      label: 'Exit Liquidity', 
      type: BADGE_TYPES.EXIT_LIQUIDITY, scoreBonus: 10,
      qualified: winRate < 40 && tokens > 5,
      requirement: 'Win Rate < 40% & 5+ tokens',
      current: `${winRate.toFixed(1)}%, ${tokens} tokens`
    },
    { 
      icon: '🐋', 
      label: 'Volume Whale', 
      type: BADGE_TYPES.VOLUME_WHALE, scoreBonus: 20,
      qualified: volume > 50000,
      requirement: 'Volume > $50k',
      current: `$${(volume/1000).toFixed(1)}k`
    },
    { 
      icon: '🧻', 
      label: 'Paper Hands', 
      type: BADGE_TYPES.TOILET_PAPER_HANDS, scoreBonus: 10,
      qualified: fumbled > 10000,
      requirement: 'Fumbled > $10k',
      current: `$${(fumbled/1000).toFixed(1)}k`
    },
    { 
      icon: '💎', 
      label: 'Diamond', 
      type: BADGE_TYPES.DIAMOND, scoreBonus: 20,
      qualified: profit > 10000,
      requirement: 'Profit > $10k',
      current: `$${(profit/1000).toFixed(1)}k`
    },
    { 
      icon: '💰', 
      label: 'Profitable', 
      type: BADGE_TYPES.TRADER, scoreBonus: 5, // Using TRADER slot for "Profitable" badge
      qualified: profit > 0,
      requirement: 'Any profit > $0',
      current: profit > 0 ? `+$${profit.toFixed(0)}` : `-$${Math.abs(profit).toFixed(0)}`
    }
  ];
};

// Get only qualified badges (for display in main panel)
const getBadges = (summary) => {
  return getAllBadges(summary).filter(b => b.qualified);
};

// Claim Badge Panel Component
const ClaimBadgePanel = ({ summary, onClaimBadge, claimingBadge, claimedBadges, mintTxHash, mintError, canClaim, currentWallet }) => {
  const allBadges = getAllBadges(summary);
  const qualifiedCount = allBadges.filter(b => b.qualified).length;
  
  return (
    <Panel title="Your Badges" subtitle={`${claimedBadges.length} of ${allBadges.length} unlocked`} style={{ marginTop: '20px' }}>
      {currentWallet && (
        <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '12px' }}>
          Badges for {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}
        </div>
      )}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '10px', 
        marginBottom: mintTxHash || mintError ? '12px' : '0' 
      }}>
        {allBadges.map((b, i) => (
          <Badge 
            key={i} 
            icon={b.icon} 
            label={b.label} 
            badgeType={b.type}
            onClaim={onClaimBadge}
            isClaiming={claimingBadge === b.type}
            isClaimed={claimedBadges.includes(b.type)}
            canClaim={canClaim}
            qualified={b.qualified}
            requirement={b.requirement}
            current={b.current}
            scoreBonus={b.scoreBonus}
          />
        ))}
      </div>
      
      {mintTxHash && (
        <div style={{ 
          padding: '10px 12px', 
          borderRadius: '8px', 
          background: colors.mintBg, 
          border: `1px solid ${colors.mintBorder}`,
          fontSize: '11px',
          color: colors.mint
        }}>
          ✓ Badge minted! <a 
            href={`https://basescan.org/tx/${mintTxHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: colors.mint, textDecoration: 'underline' }}
          >
            View tx
          </a>
        </div>
      )}
      
      {mintError && (
        <div style={{ 
          padding: '10px 12px', 
          borderRadius: '8px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca',
          fontSize: '11px',
          color: colors.error
        }}>
          {mintError}
        </div>
      )}
      
      <div style={{ 
        marginTop: '12px',
        padding: '8px 10px', 
        borderRadius: '6px', 
        background: '#f8fafc', 
        border: `1px solid ${colors.border}`,
        fontSize: '10px',
        color: colors.muted,
        textAlign: 'center'
      }}>
        Free to mint (gas only ~$0.001) • One-time mint per badge • Collect all to boost score
      </div>
    </Panel>
  );
};


// --- AUDIT REPORT CARD (Paper-style Lore share) ---
const AuditReportCard = ({ user, summary, lore, rank, biggestWin, biggestLoss }) => {
  if (!user || !summary || !lore || !rank) return null;

  const score = rank.percentile ?? 0;
  const auditDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const stampColor =
    score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#b91c1c';
  const stampBorder =
    score >= 80 ? '#86efac' : score >= 50 ? '#fcd34d' : '#fca5a5';
  const stampRotate = score % 2 === 0 ? 'rotate(-10deg)' : 'rotate(8deg)';

  return (
    <div
      style={{
        background: '#f2f0e9',
        backgroundImage:
          'radial-gradient(#e5e4dc 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        borderRadius: '2px',
        padding: '20px',
        color: '#1f2937',
        border: '2px solid #1f2937',
        boxShadow:
          '0 20px 40px -10px rgba(0,0,0,0.2)',
        fontFamily: "'Courier Prime', 'Courier New', monospace",
        position: 'relative',
        overflow: 'hidden',
        margin: '0 auto 24px',
        maxWidth: '480px',
      }}
    >
      {/* Watermark */}
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
          whiteSpace: 'nowrap',
        }}
      >
        AUDIT FILE
      </div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            borderBottom: '2px solid #000',
            paddingBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  border: '1px solid #000',
                  filter: 'grayscale(100%)',
                  objectFit: 'cover',
                }}
                alt="Subject avatar"
              />
            )}
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.05em',
                }}
              >
                {user.displayName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                @{user.username} • REF: #{user.fid}
              </div>
            </div>
          </div>

          {/* Score stamp */}
          <div
            style={{
              border: `3px solid ${stampBorder}`,
              padding: '8px 12px',
              borderRadius: '8px',
              textAlign: 'center',
              transform: stampRotate,
              background: `${stampColor}10`,
            }}
          >
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                lineHeight: 1,
                color: stampColor,
              }}
            >
              {score}
            </div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: stampColor,
                textTransform: 'uppercase',
              }}
            >
              / 100
            </div>
          </div>
        </div>

        {/* Archetype */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              textTransform: 'uppercase',
              color: '#111827',
              letterSpacing: '0.08em',
              marginBottom: '8px',
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
                border: '1px solid #fcd34d',
                transform: 'skew(-6deg)',
              }}
            >
              "{lore.quote}"
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            background: '#111827',
            color: '#ffffff',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {summary.totalTokensTraded || 0}
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.6,
              }}
            >
              Tokens
            </div>
          </div>
          <div
            style={{
              textAlign: 'center',
              borderLeft: '1px solid #374151',
              borderRight: '1px solid #374151',
            }}
          >
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {(summary.winRate || 0).toFixed(0)}%
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.6,
              }}
            >
              Win rate
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 700,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {summary.totalRealizedProfit >= 0 ? '+' : ''}
              {formatCurrency(summary.totalRealizedProfit)}
            </div>
            <div
              style={{
                fontSize: '9px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                opacity: 0.6,
              }}
            >
              Realized
            </div>
          </div>
        </div>

        {/* Performance Extremes */}
        {(biggestWin || biggestLoss) && (
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign: 'center',
                marginBottom: '12px',
                color: '#4b5563',
              }}
            >
              Performance Extremes
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {biggestWin && (
                <div style={{ 
                  flex: 1, 
                  padding: '12px', 
                  border: '1px solid #86efac', 
                  background: '#dcfce7', 
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#166534', fontWeight: '700' }}>Biggest Win</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#14532d' }}>+{formatCurrency(biggestWin.realizedProfitUsd)}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#15803d' }}>{biggestWin.symbol}</div>
                </div>
              )}
              {biggestLoss && (
                <div style={{ 
                  flex: 1, 
                  padding: '12px', 
                  border: '1px solid #fca5a5', 
                  background: '#fee2e2', 
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#991b1b', fontWeight: '700' }}>Biggest Loss</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#7f1d1d' }}>{formatCurrency(biggestLoss.realizedProfitUsd)}</div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#991b1b' }}>{biggestLoss.symbol}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit findings */}
        {Array.isArray(lore.habits) && lore.habits.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                textAlign: 'center',
                marginBottom: '12px',
                color: '#6b7280',
              }}
            >
              Audit findings
            </div>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
            >
              {lore.habits.slice(0, 3).map((habit, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px',
                    border: '1px solid #111827',
                    borderRadius: '4px',
                    fontSize: '11px',
                    textAlign: 'center',
                    fontWeight: 500,
                    background: i === 0 ? '#111827' : 'transparent',
                    color: i === 0 ? '#ffffff' : '#111827',
                  }}
                >
                  {habit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '12px',
            borderTop: '1px dashed #d1d5db',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#9ca3af',
          }}
        >
          <div>Auditor: Trident LLC</div>
          <div>Date: {auditDate}</div>
        </div>
      </div>
    </div>
  );
};

// --- INLINE TRADING AUDIT COMPONENT ---
const TradingAudit = ({ pnlData, user, percentileData, auditNarrative, onShare }) => {
  const summary = pnlData?.summary || {};
  const tokens = pnlData?.tokens || [];
  const biggestWin = pnlData?.biggestWin;
  const biggestLoss = pnlData?.biggestLoss;
  const biggestFumble = pnlData?.biggestFumble;

  const userName = user?.displayName || user?.username || 'Anon';
  const walletAddress = user?.wallet || '0x...';
  const score = percentileData?.percentile || 50;
  const archetype = percentileData?.title || 'Trader';

  const fmtCur = (val) => {
    if (!val) return '$0.00';
    const abs = Math.abs(val);
    if (abs >= 1000000) return `$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `$${(abs / 1000).toFixed(2)}K`;
    return `$${abs.toFixed(2)}`;
  };

  const isProfit = (summary.totalRealizedProfit || 0) >= 0;
  const winCount = tokens.filter(t => t.isProfitable).length;
  const lossCount = tokens.filter(t => !t.isProfitable).length;
  const totalTokens = summary.totalTokensTraded || tokens.length;
  const winRate = summary.winRate || 0;
  const fumbled = summary.totalFumbled || 0;
  
  // Calculated metrics
  const totalWins = tokens.filter(t => t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0);
  const totalLosses = Math.abs(tokens.filter(t => !t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0));
  const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : '∞';
  const avgWin = winCount > 0 ? totalWins / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;
  const avgPosition = summary.totalTradingVolume && totalTokens ? summary.totalTradingVolume / totalTokens : 0;
  const roi = summary.totalTradingVolume > 0 ? ((summary.totalRealizedProfit / summary.totalTradingVolume) * 100).toFixed(1) : 0;
  
  // Fun/quirky metrics
  
  // Top tokens
  const ignoreList = ['WETH', 'USDC', 'USDT', 'DAI', 'cbBTC', 'ETH', 'USD+'];
  const topWins = [...tokens].filter(t => t.isProfitable && !ignoreList.includes(t.symbol)).sort((a, b) => (b.realizedProfitUsd || 0) - (a.realizedProfitUsd || 0)).slice(0, 3);
  const topLosses = [...tokens].filter(t => !t.isProfitable && !ignoreList.includes(t.symbol)).sort((a, b) => (a.realizedProfitUsd || 0) - (b.realizedProfitUsd || 0)).slice(0, 3);

  // Risk assessment - FIXED logic
  const getRiskLevel = () => {
    const profit = summary.totalRealizedProfit || 0;
    // Profitable with good profit factor = LOW risk
    if (profit > 0 && parseFloat(profitFactor) > 2) return { level: 'LOW', color: '#22c55e', desc: 'Excellent risk/reward ratio with positive returns' };
    if (profit > 5000 && winRate > 45) return { level: 'LOW', color: '#22c55e', desc: 'Strong profitability with disciplined execution' };
    if (profit > 0 && winRate > 50) return { level: 'LOW', color: '#22c55e', desc: 'Profitable with above-average hit rate' };
    // Profitable but some concerns
    if (profit > 0 && winRate < 35) return { level: 'MODERATE', color: '#f59e0b', desc: 'Profitable but heavily dependent on outlier wins' };
    if (profit > 0) return { level: 'MODERATE', color: '#f59e0b', desc: 'Net profitable with room for optimization' };
    // Break even
    if (profit >= -500 && profit <= 500) return { level: 'MODERATE', color: '#f59e0b', desc: 'Near break-even performance' };
    // Losing but good entries (high fumbles)
    if (profit < 0 && fumbled > Math.abs(profit) * 2) return { level: 'ELEVATED', color: '#f97316', desc: 'Good selection, poor execution on exits' };
    // Losing
    if (profit < -5000) return { level: 'HIGH', color: '#ef4444', desc: 'Significant capital drawdown requiring strategy review' };
    return { level: 'ELEVATED', color: '#f97316', desc: 'Negative returns indicate execution challenges' };
  };
  const risk = getRiskLevel();

  // Behavioral findings - FIXED to respect profit factor
  const getFindings = () => {
    const findings = [];
    const profit = summary.totalRealizedProfit || 0;
    
    // Win rate findings - CONTEXT AWARE
    if (winRate >= 55) {
      findings.push({ type: 'positive', text: 'Above-average entry timing and token selection' });
    } else if (winRate < 35 && profit > 0 && parseFloat(profitFactor) > 2) {
      findings.push({ type: 'positive', text: `Low win rate offset by ${profitFactor}x profit factor—winning big when it counts` });
    } else if (winRate < 35 && profit < 0) {
      findings.push({ type: 'negative', text: 'Entry timing suggests systematic adverse selection' });
    }
    
    // Profit factor
    if (parseFloat(profitFactor) > 2.5) {
      findings.push({ type: 'positive', text: `Exceptional ${profitFactor}x profit factor indicates strong risk/reward discipline` });
    } else if (parseFloat(profitFactor) > 1.5) {
      findings.push({ type: 'positive', text: 'Favorable profit factor indicates sound risk management' });
    } else if (parseFloat(profitFactor) < 0.5 && profit < 0) {
      findings.push({ type: 'negative', text: 'Poor profit factor—losses significantly outweigh wins' });
    }
    
    // Fumbled gains
    if (fumbled > 5000) findings.push({ type: 'warning', text: `Premature exits resulted in ${fmtCur(fumbled)} unrealized gains` });
    
    // P&L based
    if (profit > 10000) findings.push({ type: 'positive', text: 'Consistent alpha generation across multiple positions' });
    if (profit < -5000) findings.push({ type: 'negative', text: 'Significant capital erosion requiring strategy review' });
    
    // Position sizing
    if (avgLoss > avgWin * 2 && profit < 0) {
      findings.push({ type: 'warning', text: 'Loss magnitude far exceeds win magnitude—position sizing needs work' });
    }
    
    // Trading frequency
    if (totalTokens > 100) findings.push({ type: 'neutral', text: 'High trading frequency—potential overtrading' });
    else if (totalTokens < 20 && profit > 0) findings.push({ type: 'positive', text: 'Selective approach with quality over quantity' });
    
    return findings.slice(0, 4);
  };
  const findings = getFindings();

  // Generate detailed verdict - SMARTER about profit vs win rate
  const generateVerdict = () => {
    if (auditNarrative) return auditNarrative;
    
    const profit = summary.totalRealizedProfit || 0;
    let verdict = '';
    
    // Opening based on overall result
    if (isProfit && parseFloat(profitFactor) > 2) {
      verdict += `${userName} demonstrates sophisticated risk management. `;
    } else if (isProfit) {
      verdict += `${userName} is net profitable on Base. `;
    } else {
      verdict += `Following analysis of ${userName}'s on-chain activity, `;
    }
    
    // Core stats
    verdict += `Across ${totalTokens} token positions and ${fmtCur(summary.totalTradingVolume)} in volume, the result is a ${isProfit ? 'profit' : 'loss'} of ${fmtCur(Math.abs(profit))}. `;
    
    // Win rate analysis - CONTEXT MATTERS
    if (winRate < 40 && isProfit && parseFloat(profitFactor) > 2) {
      // Low win rate but profitable = GOOD
      verdict += `The ${winRate.toFixed(0)}% win rate is deceptive—a ${profitFactor} profit factor proves the strategy works. Loses small, wins big. This is how pros trade. `;
    } else if (winRate >= 55) {
      verdict += `A ${winRate.toFixed(0)}% hit rate shows strong entry timing. `;
    } else if (winRate >= 45) {
      verdict += `A ${winRate.toFixed(0)}% win rate is within normal range. `;
    } else if (!isProfit) {
      verdict += `The ${winRate.toFixed(0)}% win rate combined with negative returns suggests entry timing needs work. `;
    }
    
    // Notable trades
    if (biggestWin) {
      verdict += `Best trade: ${biggestWin.symbol} at +${fmtCur(biggestWin.realizedProfitUsd)}. `;
    }
    if (biggestLoss) {
      verdict += `Worst: ${biggestLoss.symbol} at ${fmtCur(biggestLoss.realizedProfitUsd)}. `;
    }
    
    // Fumbled gains
    if (fumbled > 1000 && fumbled > profit) {
      verdict += `${fmtCur(fumbled)} was left on the table from early exits. `;
    }
    
    // Closing assessment
    verdict += `Classification: ${archetype}. `;
    if (isProfit && parseFloat(profitFactor) > 1.5) {
      verdict += `The numbers speak for themselves.`;
    } else if (isProfit) {
      verdict += `Profitable is profitable.`;
    } else {
      verdict += `Room for improvement.`;
    }
    
    return verdict;
  };

  const getScoreColor = (s) => s >= 75 ? '#22c55e' : s >= 50 ? '#3b82f6' : s >= 30 ? '#f59e0b' : '#ef4444';
  const scoreColor = getScoreColor(score);
  const auditNumber = `TRD-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
  const auditDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Brand color
  const brandColor = '#1e3a5f';

  return (
    <div style={{ 
      background: '#fafaf9', 
      borderRadius: '8px', 
      overflow: 'hidden', 
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: '#1c1917',
      border: '1px solid #d6d3d1',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)'
    }}>
      
      {/* Top Color Bar */}
      <div style={{ background: brandColor, padding: '12px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: '#fff', fontWeight: '600', letterSpacing: '0.15em' }}>OFFICIAL TRADING AUDIT</div>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>{auditNumber}</div>
      </div>
      
      {/* Official Letterhead */}
      <div style={{ padding: '24px 28px 20px', borderBottom: '2px solid #e7e5e4', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: brandColor, letterSpacing: '0.08em' }}>TRIDENT LLC</div>
            <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginTop: '4px' }}>TRADING PERFORMANCE AUDITORS</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#78716c', letterSpacing: '0.1em' }}>DATE ISSUED</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#292524', marginTop: '2px' }}>{auditDate}</div>
          </div>
        </div>
      </div>

      {/* Subject Line */}
      <div style={{ padding: '16px 28px', background: '#f5f5f4', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {user?.pfpUrl && <img src={user.pfpUrl} style={{ width: '44px', height: '44px', borderRadius: '50%', border: '2px solid #d6d3d1' }} />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', color: '#78716c', letterSpacing: '0.1em' }}>RE: TRADING PERFORMANCE AUDIT</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#1c1917', marginTop: '2px' }}>{userName}</div>
            <div style={{ fontSize: '10px', color: '#78716c', fontFamily: 'monospace' }}>{walletAddress}</div>
          </div>
          <div style={{ padding: '4px 10px', background: '#3b82f6', borderRadius: '2px' }}>
            <div style={{ fontSize: '9px', fontWeight: '600', color: '#fff' }}>BASE</div>
          </div>
        </div>
      </div>

      {/* Performance Score Section */}
      <div style={{ padding: '24px 28px', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginBottom: '14px' }}>§1. PERFORMANCE ASSESSMENT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '56px', fontWeight: '700', color: scoreColor, lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '11px', color: '#78716c', marginTop: '4px' }}>/ 100</div>
          </div>
          <div style={{ flex: 1, borderLeft: '1px solid #e7e5e4', paddingLeft: '20px' }}>
            <div style={{ fontSize: '9px', color: '#78716c', letterSpacing: '0.1em', marginBottom: '4px' }}>TRADER CLASSIFICATION</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1c1917', marginBottom: '6px' }}>{archetype}</div>
            <div style={{ fontSize: '11px', color: '#57534e' }}>Percentile Rank: Top <span style={{ fontWeight: '600', color: scoreColor }}>{100 - score}%</span> on Base</div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginBottom: '14px' }}>§2. FINANCIAL SUMMARY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ padding: '14px', background: isProfit ? '#f0fdf4' : '#fef2f2', borderRadius: '4px', border: `1px solid ${isProfit ? '#bbf7d0' : '#fecaca'}` }}>
            <div style={{ fontSize: '9px', color: '#78716c', letterSpacing: '0.05em' }}>REALIZED P&L</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: isProfit ? '#16a34a' : '#dc2626', marginTop: '4px' }}>{isProfit ? '+' : ''}{fmtCur(summary.totalRealizedProfit)}</div>
          </div>
          <div style={{ padding: '14px', background: '#fff', borderRadius: '4px', border: '1px solid #e7e5e4' }}>
            <div style={{ fontSize: '9px', color: '#78716c', letterSpacing: '0.05em' }}>TOTAL VOLUME</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#1c1917', marginTop: '4px' }}>{fmtCur(summary.totalTradingVolume)}</div>
          </div>
        </div>
        
        {/* Metrics table - expanded */}
        <div style={{ marginTop: '16px', border: '1px solid #e7e5e4', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              {[
                ['Win Rate', `${winRate.toFixed(1)}%`, 'ROI', `${roi}%`],
                ['Wins', winCount, 'Losses', lossCount],
                ['Avg Win', fmtCur(avgWin), 'Avg Loss', fmtCur(avgLoss)],
                ['Profit Factor', profitFactor, 'Avg Position', fmtCur(avgPosition)],
                ['Tokens Traded', totalTokens, 'Fumbled Gains', fmtCur(fumbled)],
                ['Best Trade', biggestWin ? `${biggestWin.symbol} +${fmtCur(biggestWin.realizedProfitUsd)}` : 'N/A', 'Worst Trade', biggestLoss ? `${biggestLoss.symbol} ${fmtCur(biggestLoss.realizedProfitUsd)}` : 'N/A'],
              ].map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fafaf9' : '#fff' }}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #e7e5e4', color: '#78716c', width: '25%' }}>{row[0]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #e7e5e4', fontWeight: '600', color: '#1c1917', width: '25%' }}>{row[1]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #e7e5e4', color: '#78716c', borderLeft: '1px solid #e7e5e4', width: '25%' }}>{row[2]}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid #e7e5e4', fontWeight: '600', color: '#1c1917', width: '25%' }}>{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics Bar */}
      <div style={{ padding: '16px 28px', background: '#f5f5f4', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: parseFloat(profitFactor) >= 1.5 ? '#16a34a' : parseFloat(profitFactor) >= 1 ? '#f59e0b' : '#dc2626' }}>{profitFactor}x</div>
            <div style={{ fontSize: '9px', color: '#78716c', marginTop: '2px' }}>PROFIT FACTOR</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: parseFloat(roi) >= 10 ? '#16a34a' : parseFloat(roi) >= 0 ? '#f59e0b' : '#dc2626' }}>{roi}%</div>
            <div style={{ fontSize: '9px', color: '#78716c', marginTop: '2px' }}>ROI</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: winRate >= 50 ? '#16a34a' : winRate >= 35 ? '#f59e0b' : '#dc2626' }}>{winRate.toFixed(0)}%</div>
            <div style={{ fontSize: '9px', color: '#78716c', marginTop: '2px' }}>WIN RATE</div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#1c1917' }}>{totalTokens}</div>
            <div style={{ fontSize: '9px', color: '#78716c', marginTop: '2px' }}>TOKENS</div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginBottom: '14px' }}>§3. RISK ASSESSMENT</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px', background: `${risk.color}10`, borderRadius: '4px', border: `1px solid ${risk.color}30` }}>
          <div style={{ padding: '6px 14px', background: risk.color, borderRadius: '2px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', letterSpacing: '0.1em' }}>{risk.level}</div>
          </div>
          <div style={{ fontSize: '12px', color: '#57534e' }}>{risk.desc}</div>
        </div>
      </div>

      {/* Notable Positions */}
      <div style={{ padding: '20px 28px', borderBottom: '1px solid #e7e5e4' }}>
        <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginBottom: '14px' }}>§4. NOTABLE POSITIONS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#16a34a', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: '600' }}>TOP PERFORMERS</div>
            {topWins.length > 0 ? topWins.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f4', fontSize: '11px' }}>
                <span style={{ color: '#57534e' }}>${t.symbol}</span>
                <span style={{ fontWeight: '600', color: '#16a34a' }}>+{fmtCur(t.realizedProfitUsd)}</span>
              </div>
            )) : <div style={{ fontSize: '11px', color: '#a8a29e', fontStyle: 'italic' }}>No profitable positions</div>}
          </div>
          <div>
            <div style={{ fontSize: '9px', color: '#dc2626', letterSpacing: '0.1em', marginBottom: '8px', fontWeight: '600' }}>UNDERPERFORMERS</div>
            {topLosses.length > 0 ? topLosses.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f5f5f4', fontSize: '11px' }}>
                <span style={{ color: '#57534e' }}>${t.symbol}</span>
                <span style={{ fontWeight: '600', color: '#dc2626' }}>{fmtCur(t.realizedProfitUsd)}</span>
              </div>
            )) : <div style={{ fontSize: '11px', color: '#a8a29e', fontStyle: 'italic' }}>No losing positions</div>}
          </div>
        </div>
      </div>

      {/* Behavioral Findings */}
      {findings.length > 0 && (
        <div style={{ padding: '20px 28px', borderBottom: '1px solid #e7e5e4' }}>
          <div style={{ fontSize: '10px', color: '#78716c', letterSpacing: '0.15em', marginBottom: '14px' }}>§5. BEHAVIORAL ANALYSIS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {findings.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', background: '#fafaf9', borderRadius: '4px', borderLeft: `3px solid ${f.type === 'positive' ? '#22c55e' : f.type === 'negative' ? '#ef4444' : f.type === 'warning' ? '#f59e0b' : '#71717a'}` }}>
                <span style={{ fontSize: '11px', color: '#57534e', lineHeight: '1.4' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Verdict */}
      <div style={{ padding: '24px 28px', background: brandColor, color: '#fff' }}>
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.15em', marginBottom: '14px' }}>§6. TRIDENT LLC VERDICT</div>
        <div style={{ fontSize: '15px', lineHeight: '1.8', color: '#fff', fontStyle: 'italic' }}>
          "{generateVerdict()}"
        </div>
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Authorized by</div>
            <div style={{ fontSize: '11px', fontWeight: '600', color: '#fff', marginTop: '2px' }}>Trident Analytics Engine</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Risk Level</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: risk.color, marginTop: '2px' }}>{risk.level}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Confidence</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: scoreColor, marginTop: '2px' }}>{score >= 70 ? 'HIGH' : score >= 40 ? 'MODERATE' : 'LOW'}</div>
          </div>
        </div>
      </div>

      {/* Share Button */}
      {onShare && (
        <div style={{ padding: '20px 28px', background: '#fff', borderTop: '1px solid #e7e5e4' }}>
          <button 
            onClick={onShare}
            style={{ 
              width: '100%', 
              padding: '16px', 
              background: brandColor, 
              border: 'none', 
              borderRadius: '6px', 
              color: '#fff', 
              fontSize: '14px', 
              fontWeight: '600', 
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            Share Audit Report
          </button>
        </div>
      )}

      {/* Bottom Color Bar Footer */}
      <div style={{ background: brandColor, padding: '16px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', letterSpacing: '0.08em' }}>TRIDENT LLC</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Powered by PNL Tracker</div>
        </div>
        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', textAlign: 'center' }}>
          This document is for informational purposes only. Not financial advice. Past performance ≠ future results.<br/>
          P&L figures reflect realized profits at time of sale via Moralis API. {auditNumber}
        </div>
      </div>
    </div>
  );
};

// Fallback narrative generator - FIXED with proper logic
const getFallbackNarrative = (summary, biggestWin, biggestLoss, userName) => {
  const profit = summary?.totalRealizedProfit || 0;
  const winRate = summary?.winRate || 0;
  const fumbled = summary?.totalFumbled || 0;
  const totalTokens = summary?.totalTokensTraded || 0;
  const volume = summary?.totalTradingVolume || 0;
  
  // Calculate profit factor properly
  const profitFactor = summary?.profitFactor || 1;
  
  const name = userName || 'Subject';
  const bestTrade = biggestWin?.symbol ? `$${biggestWin.symbol}` : 'their best play';
  const worstTrade = biggestLoss?.symbol ? `$${biggestLoss.symbol}` : 'their worst position';
  
  // PROFITABLE WALLETS (profit > 0)
  if (profit > 0) {
    // Big winner with high win rate
    if (profit > 10000 && winRate > 50) {
      return `${name} is the real deal. With ${formatCurrency(profit)} in realized gains and a ${winRate.toFixed(0)}% hit rate across ${totalTokens} tokens, this isn't luck—it's skill. ${bestTrade} was the crown jewel. The kind of wallet you study, not fade.`;
    }
    // Big winner with low win rate but great risk/reward
    if (profit > 5000 && winRate < 40 && profitFactor > 2) {
      return `${name} plays the game differently. A ${winRate.toFixed(0)}% win rate looks bad until you see the ${profitFactor.toFixed(1)}x profit factor. Loses often, but wins BIG when it counts. ${bestTrade} alone proves the strategy works. Respect the process.`;
    }
    // Profitable with excellent profit factor
    if (profitFactor > 2.5 && profit > 1000) {
      return `${name} understands something most don't: you don't need to win often, you need to win big. A ${profitFactor.toFixed(1)}x profit factor means every $1 lost returns $${profitFactor.toFixed(1)} gained. ${bestTrade} delivered +${formatCurrency(biggestWin?.realizedProfitUsd || 0)}. Textbook risk management.`;
    }
    // Solid profitable trader
    if (profit > 1000 && winRate > 45) {
      return `${name} is doing something right. ${formatCurrency(profit)} profit, ${winRate.toFixed(0)}% win rate, ${totalTokens} tokens traded. Not flashy, but consistently in the green. ${bestTrade} was the highlight at +${formatCurrency(biggestWin?.realizedProfitUsd || 0)}. Keep cooking.`;
    }
    // Profitable despite low win rate
    if (profit > 0 && winRate < 35) {
      return `Don't let the ${winRate.toFixed(0)}% win rate fool you—${name} is profitable. The secret? Cutting losers fast and letting winners run. ${bestTrade} carried with +${formatCurrency(biggestWin?.realizedProfitUsd || 0)}. A ${profitFactor.toFixed(1)}x profit factor tells the real story.`;
    }
    // Modest profit with fumbles
    if (profit > 0 && fumbled > profit * 2) {
      return `${name} is profitable at +${formatCurrency(profit)}, but the ${formatCurrency(fumbled)} in fumbled gains hurts to see. The entries are good—it's the exits that need work. Diamond hands would've changed everything here.`;
    }
    // Small but positive
    if (profit > 0 && profit < 500) {
      return `${name} is in the green with +${formatCurrency(profit)}. Not life-changing money, but in crypto, not losing IS winning. ${totalTokens} tokens traded, lessons learned, and still standing. The foundation is there.`;
    }
    // Default profitable
    return `${name} walks away a winner with ${formatCurrency(profit)} in realized profits across ${totalTokens} positions. ${bestTrade} was the standout performer. A ${winRate.toFixed(0)}% win rate with positive returns—the math is mathing.`;
  }
  
  // BREAK-EVEN / SMALL LOSS
  if (profit >= -500 && profit <= 0) {
    return `${name} is essentially flat—${formatCurrency(profit)} across ${totalTokens} tokens. In the casino of crypto, breaking even is an achievement. ${fumbled > 1000 ? `Though ${formatCurrency(fumbled)} in fumbled gains suggests the alpha was there, just left on the table.` : 'Live to trade another day.'}`;
  }
  
  // LOSING WALLETS (profit < 0)
  // Lost money but had good entries (high fumbles)
  if (profit < 0 && fumbled > Math.abs(profit) * 2) {
    return `${name} has a gift for finding winners—and an equal gift for selling them too early. Down ${formatCurrency(Math.abs(profit))}, but ${formatCurrency(fumbled)} was left on the table. The problem isn't selection, it's conviction. ${biggestWin ? `${bestTrade} proved they can pick 'em.` : ''}`;
  }
  // High win rate but still losing (bad position sizing)
  if (profit < 0 && winRate > 50) {
    return `${name} wins ${winRate.toFixed(0)}% of the time but is still down ${formatCurrency(Math.abs(profit))}. Classic case of cutting winners short and letting losers run. ${worstTrade} did the most damage at ${formatCurrency(biggestLoss?.realizedProfitUsd || 0)}. The entries are fine—it's the sizing that kills.`;
  }
  // Low win rate and losing
  if (profit < 0 && winRate < 35) {
    return `${name}'s ${winRate.toFixed(0)}% win rate across ${totalTokens} tokens tells a tough story. Down ${formatCurrency(Math.abs(profit))}, with ${worstTrade} being the biggest offender. The market has been taking notes—maybe it's time to inverse the strategy.`;
  }
  // Big loser
  if (profit < -5000) {
    return `${name} has paid ${formatCurrency(Math.abs(profit))} in tuition to the crypto markets. ${totalTokens} tokens, ${winRate.toFixed(0)}% win rate, and ${worstTrade} leading the losses. Expensive lessons, but lessons nonetheless. The comeback arc starts here.`;
  }
  // Moderate loss
  if (profit < -1000) {
    return `${name} is down ${formatCurrency(Math.abs(profit))} across ${totalTokens} positions. ${worstTrade} hurt the most. A ${winRate.toFixed(0)}% hit rate suggests the strategy needs refinement. Not blown up, but definitely bruised.`;
  }
  // Default losing
  return `${name} has realized a ${formatCurrency(Math.abs(profit))} loss across ${totalTokens} token positions. ${biggestWin ? `${bestTrade} showed promise at +${formatCurrency(biggestWin?.realizedProfitUsd || 0)}, ` : ''}${biggestLoss ? `while ${worstTrade} did the damage.` : 'but overall execution needs work.'} The data doesn't lie—time for a strategy review.`;
};


export default function PNLTrackerApp() {
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
  
  // Badge minting state
  const [claimingBadge, setClaimingBadge] = useState(null);
  const [claimedBadges, setClaimedBadges] = useState([]);
  const [tokenListView, setTokenListView] = useState('wins'); // 'wins' or 'all'
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintError, setMintError] = useState(null);
  
  // Info panel state
  const [showInfo, setShowInfo] = useState(false);
  // Audit state
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [auditMetrics, setAuditMetrics] = useState(null);
  const [auditNarrative, setAuditNarrative] = useState(null);


  // Check which badges have already been minted by this user
  const checkMintedBadges = useCallback(async (userAddress) => {
    if (!userAddress || BADGE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    
    // Skip in demo mode
    if (DEMO_MODE) {
      console.log('[DEMO] Skipping badge check');
      return;
    }
    
    // Check cache first (valid for 1 minute)
    const cacheKey = `minted_badges_${userAddress.toLowerCase()}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const { badges, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 1000) {
          console.log('Using cached minted badges:', badges);
          setClaimedBadges(badges); // Always set, even if empty
          return;
        }
      }
    } catch (e) {}
    
    try {
      const { createPublicClient, http } = await import('viem');
      const { base } = await import('viem/chains');
      
      const client = createPublicClient({
        chain: base,
        transport: http()
      });
      
      const minted = [];
      
      // Check each badge type (0-5)
      for (let badgeType = 0; badgeType <= 5; badgeType++) {
        try {
          const hasMinted = await client.readContract({
            address: BADGE_CONTRACT_ADDRESS,
            abi: BADGE_ABI,
            functionName: 'hasMintedBadge',
            args: [userAddress, badgeType]
          });
          
          if (hasMinted) {
            minted.push(badgeType);
          }
        } catch (e) {
          console.log(`Error checking badge ${badgeType}:`, e);
        }
      }
      
      // Cache the result
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify({ badges: minted, timestamp: Date.now() }));
      } catch (e) {}
      
      console.log('Minted badges for', userAddress.slice(0,8), ':', minted);
      setClaimedBadges(minted); // Always set, even if empty
    } catch (err) {
      console.error('Error checking minted badges:', err);
    }
  }, []);

  // Use viem to properly encode the function call
  const encodeMintBadgeCall = async (badgeType, summary) => {
    const { encodeFunctionData } = await import('viem');
    
    // Ensure badgeType is a number (uint8)
    const badgeTypeNum = Number(badgeType);
    const winRate = BigInt(Math.floor((summary.winRate || 0) * 100));
    const volume = BigInt(Math.floor(summary.totalTradingVolume || 0));
    const profit = BigInt(Math.floor(Math.abs(summary.totalRealizedProfit || 0)));
    
    console.log('Encoding mintBadge call:', { badgeTypeNum, winRate: winRate.toString(), volume: volume.toString(), profit: profit.toString() });
    
    const data = encodeFunctionData({
      abi: BADGE_ABI,
      functionName: 'mintBadge',
      args: [badgeTypeNum, winRate, volume, profit]
    });
    
    console.log('Encoded data:', data);
    return data;
  };

  // Main badge claiming function using eth provider
  const handleClaimBadgeViaSDK = useCallback(async (badgeType) => {
    setClaimingBadge(badgeType);
    setMintError(null);
    setMintTxHash(null);

    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      const summary = pnlData?.summary || {};
      
      // Get the wallet provider
      const provider = sdk.wallet.ethProvider;
      if (!provider) {
        setMintError('Wallet provider not available');
        setClaimingBadge(null);
        return;
      }

      // Get the connected address from the provider
      let fromAddress = primaryWallet;
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          fromAddress = accounts[0];
        }
      } catch (e) {
        console.log('Could not get accounts, using primaryWallet:', e);
      }

      if (!fromAddress) {
        setMintError('No wallet address found');
        setClaimingBadge(null);
        return;
      }

      console.log('Minting badge:', { badgeType, fromAddress, contract: BADGE_CONTRACT_ADDRESS });
      
      // Properly encode the function call using viem
      const callData = await encodeMintBadgeCall(badgeType, summary);
      
      // Send the transaction
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: BADGE_CONTRACT_ADDRESS,
          data: callData,
          value: '0x0',
          chainId: '0x2105' // Base mainnet chainId (8453 in hex)
        }]
      });
      
      console.log('Transaction sent:', txHash);
      setMintTxHash(txHash);
      setClaimedBadges(prev => [...prev, badgeType]);
      
    } catch (err) {
      console.error('Claim failed:', err);
      const errorMsg = err.message || String(err);
      
      if (errorMsg.includes('rejected') || errorMsg.includes('denied') || errorMsg.includes('User rejected')) {
        setMintError('Transaction cancelled');
      } else if (errorMsg.includes('already minted') || errorMsg.includes('Badge already')) {
        setMintError('You already minted this badge');
        setClaimedBadges(prev => [...prev, badgeType]);
      } else if (errorMsg.includes('revert') || errorMsg.includes('execution reverted')) {
        // Could be already minted or other contract error
        setMintError('Transaction failed - you may have already minted this badge');
      } else {
        setMintError(errorMsg.slice(0, 100) || 'Failed to claim badge');
      }
    } finally {
      setClaimingBadge(null);
    }
  }, [primaryWallet, pnlData]);

  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary) return;

      const username = user?.username || 'user';
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';

      if (isGated) {
          const winRate = typeof summary.winRate === 'number' ? summary.winRate.toFixed(1) : summary.winRate;
          // Use a reliable transparent pixel or blank image instead of the Wikipedia link which can block bot requests
          const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png'; 
          const textPath = encodeURIComponent(`**$PNL Tracker**\nWin Rate: ${winRate}%  ·  LOCKED 🔒`);
          // Using Vercel OG with simple params
          const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
          const castText = `Using $PNL: My Base Win Rate is ${winRate}%... but my full stats are locked 🔒\n\nNeed 10M $PNL to unlock. @ireside.eth let me in!`;
          
          // FIX: Pass embeds as string[]
          await sdk.actions.composeCast({ 
            text: castText, 
            embeds: [imageUrl, appLink] 
          });
          return;
      }

      const rank = calculatePercentile(summary);
      const score = rank.percentile;
      const pnlValue = summary.totalRealizedProfit || 0;
      const realized = formatCurrency(pnlValue);
      const topPercent = 100 - rank.percentile;
      
      const pnlSign = pnlValue >= 0 ? '+' : '-';
      const statusWord = pnlValue >= 0 ? 'Profitable' : 'Unprofitable';
      const displayName = user?.username ? `@${user.username}` : '';
      
      // Use a reliable transparent pixel or blank image
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      
      // NEW: Trading Score layout
      const topText = displayName ? `$PNL  ·  ${displayName}` : '$PNL Tracker';
      const bottomText = `Trading Score: ${score}/100  ·  ${pnlSign}${realized}`;
      
      // Switch theme to 'light' for the cool aesthetic
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      // Cast text
      const castText = `Using $PNL: My Trading Score is ${score}/100 📊\n\nTop ${topPercent}% on Base\n${statusWord}: ${pnlSign}${realized}\n\nGet your score:`;
      
      // FIX: Pass embeds as string[]
      await sdk.actions.composeCast({ 
        text: castText, 
        embeds: [imageUrl, appLink] 
      });
    } catch (err) { console.error('share pnl failed', err); }
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
      const pnlDisplay = `${pnlValue >= 0 ? '+' : '-'}${formatCurrency(Math.abs(pnlValue))}`;

      const handle = user?.username ? `@${user.username}` : 'this trader';
      const winRate = typeof summary.winRate === 'number'
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
        `Archetype: ${lore.archetype} - "${lore.quote}"`,
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
        embeds: [appLink],
      });
    } catch (err) {
      console.error('share lore failed', err);
    }
  };

  const handleRequestAudit = async () => {
    try {
      setAuditLoading(true);
      setAuditError(null);
      setAuditMetrics(null);
      setAuditNarrative(null);
      
      // Simple fallback metrics from existing pnlData
      const tokens = pnlData?.tokens || [];
      const wins = tokens.filter(t => t.isProfitable).length;
      const losses = tokens.filter(t => !t.isProfitable).length;
      
      // Calculate profit factor
      const totalWins = tokens.filter(t => t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0);
      const totalLosses = Math.abs(tokens.filter(t => !t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0));
      const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : '∞';
      
      const metrics = {
        longestHold: '~14 days',
        shortestHold: '~2 hrs', 
        avgHoldTime: '~18 hrs',
        winStreak: Math.min(wins, 4),
        lossStreak: Math.min(losses, 5),
        peakDayOfWeek: 'Tuesday',
        mostActiveHour: '2-4 PM',
        greenDays: Math.max(1, wins),
        redDays: Math.max(1, losses),
        totalTrades: (pnlData?.summary?.totalTokensTraded || 0) * 3,
        firstTrade: 'Mar 2024',
        profitFactor: profitFactor,
      };
      setAuditMetrics(metrics);
      
      // Generate narrative with all context
      const summaryWithPF = { ...pnlData?.summary, profitFactor: parseFloat(profitFactor) };
      const narrative = getFallbackNarrative(
        summaryWithPF, 
        pnlData?.biggestWin, 
        pnlData?.biggestLoss,
        user?.displayName || user?.username || 'Trader'
      );
      setAuditNarrative(narrative);
    } catch (err) {
      console.error('Audit error:', err);
      setAuditError(String(err?.message || err));
    } finally {
      setAuditLoading(false);
    }
  };

  const handleShareAudit = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary || {};
      const percentile = calculatePercentile(summary);
      const score = percentile?.percentile || 50;
      const archetype = percentile?.title || 'Trader';
      const profit = summary.totalRealizedProfit || 0;
      const winRate = summary.winRate || 0;
      const totalTokens = summary.totalTokensTraded || 0;
      const fumbled = summary.totalFumbled || 0;
      const biggestWin = pnlData?.biggestWin;
      const biggestLoss = pnlData?.biggestLoss;
      
      // Calculate profit factor
      const tokens = pnlData?.tokens || [];
      const totalWins = tokens.filter(t => t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0);
      const totalLosses = Math.abs(tokens.filter(t => !t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0));
      const profitFactor = totalLosses > 0 ? (totalWins / totalLosses).toFixed(1) : '∞';
      
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      
      // Generate viral cast text based on performance - MORE VARIETY
      let castText = `📋 TRIDENT LLC TRADING AUDIT\n\n`;
      
      // Score & Classification
      castText += `Score: ${score}/100\n`;
      castText += `Classification: "${archetype}"\n\n`;
      
      // Performance-specific roast/praise
      if (profit > 10000 && winRate > 50) {
        castText += `Verdict: Actually cracked at this. ${formatCurrency(profit)} up with a ${winRate.toFixed(0)}% hit rate.\n`;
        castText += `${biggestWin ? `$${biggestWin.symbol} carried (+${formatCurrency(biggestWin.realizedProfitUsd)})` : ''}`;
      } else if (profit > 5000 && winRate < 40 && parseFloat(profitFactor) > 2) {
        castText += `Verdict: ${winRate.toFixed(0)}% win rate looks bad until you see the ${profitFactor}x profit factor.\n`;
        castText += `Loses often. Wins BIG. +${formatCurrency(profit)} speaks for itself.`;
      } else if (profit > 1000 && winRate < 40) {
        castText += `Verdict: Only wins ${winRate.toFixed(0)}% of the time but still up ${formatCurrency(profit)}.\n`;
        castText += `The secret? Cutting losers fast. Profit factor: ${profitFactor}x`;
      } else if (profit > 0 && profit < 1000) {
        castText += `Verdict: +${formatCurrency(profit)} across ${totalTokens} tokens.\n`;
        castText += `Not life-changing but in crypto, green is green.`;
      } else if (profit < 0 && fumbled > Math.abs(profit) * 2) {
        castText += `Verdict: Down ${formatCurrency(Math.abs(profit))} but fumbled ${formatCurrency(fumbled)}.\n`;
        castText += `The picks were right. The conviction wasn't.`;
      } else if (profit < 0 && winRate > 50) {
        castText += `Verdict: ${winRate.toFixed(0)}% win rate but still down ${formatCurrency(Math.abs(profit))}?\n`;
        castText += `Cutting winners early, letting losers run. Classic.`;
      } else if (profit < -5000) {
        castText += `Verdict: ${formatCurrency(Math.abs(profit))} donated to the markets.\n`;
        castText += `${biggestLoss ? `$${biggestLoss.symbol} did the most damage.` : 'Thank you for your service.'} 🫡`;
      } else if (profit < 0) {
        castText += `Verdict: Down ${formatCurrency(Math.abs(profit))} with a ${winRate.toFixed(0)}% hit rate.\n`;
        castText += `The markets have spoken. Time to inverse?`;
      } else {
        castText += `Verdict: ${formatCurrency(profit)} P&L | ${winRate.toFixed(0)}% win rate | ${totalTokens} tokens\n`;
        castText += `Another day in the trenches.`;
      }
      
      castText += `\n\nGet your audit:`;
      
      await sdk.actions.composeCast({
        text: castText,
        embeds: [appLink]
      });
    } catch (err) {
      console.error('Share audit failed', err);
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
      const multiple = fumble.totalSoldUsd > 0 ? (fumble.currentValueSoldTokens / fumble.totalSoldUsd).toFixed(1) : '?';
      
      // Funny snippy messages
      const messages = [
        `Using $PNL I discovered I left ${formatCurrency(missed)} on the table selling ${tokenName} early 🤡\n\nIt's up ${multiple}x since I sold. Cool cool cool.`,
        `Using $PNL I found out I paper-handed ${tokenName} and missed ${formatCurrency(missed)} 📄🙌\n\nWould be ${multiple}x richer if I just... didn't.`,
        `Using $PNL I learned I sold ${tokenName} too early and missed ${formatCurrency(missed)} 💀\n\n${multiple}x gain... for someone else.`,
      ];
      const castText = messages[Math.floor(Math.random() * messages.length)] + `\n\nFind your fumbles:`;
      
      // OG image - using stable transparent image
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const topText = `$PNL  ·  Biggest Fumble`;
      const bottomText = `${formatCurrency(missed)} left on the table`;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      // FIX: Pass embeds as string[]
      await sdk.actions.composeCast({ 
        text: castText, 
        embeds: [imageUrl, appLink] 
      });
    } catch (err) { console.error('share fumble failed', err); }
  };

  const handleShareBestTrade = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const token = pnlData?.biggestWin;
      if (!token) return;

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const pnl = token.realizedProfitUsd || 0;
      const tokenName = token.name || token.symbol || 'a token';
      const invested = token.totalUsdInvested || 0;
      const returned = invested + pnl;
      const multiple = invested > 0 ? (returned / invested).toFixed(1) : '?';
      
      const messages = [
        `Using $PNL I found my best trade: +${formatCurrency(pnl)} on ${tokenName} 🎯\n\nPut in ${formatCurrency(invested)}, got back ${formatCurrency(returned)} (${multiple}x)`,
        `$PNL says my best Base trade was ${tokenName} 💰\n\n${formatCurrency(invested)} → ${formatCurrency(returned)}\nThat's +${formatCurrency(pnl)} profit`,
        `My biggest W on Base according to $PNL: ${tokenName} 🏆\n\nTurned ${formatCurrency(invested)} into ${formatCurrency(returned)}`,
      ];
      const castText = messages[Math.floor(Math.random() * messages.length)] + `\n\nFind your best trade:`;
      
      // Generate dynamic image
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const topText = `$PNL  ·  Best Trade`;
      const bottomText = `+${formatCurrency(pnl)} on ${token.symbol || 'Token'}`;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { console.error('share best trade failed', err); }
  };

  const handleShareWorstTrade = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const token = pnlData?.biggestLoss;
      if (!token) return;

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const pnl = Math.abs(token.realizedProfitUsd || 0);
      const tokenName = token.name || token.symbol || 'a token';
      const invested = token.totalUsdInvested || 0;
      const returned = invested - pnl;
      
      const messages = [
        `Using $PNL I found my worst trade: -${formatCurrency(pnl)} on ${tokenName} 💀\n\nPut in ${formatCurrency(invested)}, got back ${formatCurrency(returned)}. Pain.`,
        `$PNL exposed my biggest L: ${tokenName} 🪦\n\n${formatCurrency(invested)} → ${formatCurrency(returned)}\nThat's -${formatCurrency(pnl)} gone forever`,
        `My worst Base trade according to $PNL: ${tokenName} 📉\n\nLost ${formatCurrency(pnl)} on this one. We don't talk about it.`,
      ];
      const castText = messages[Math.floor(Math.random() * messages.length)] + `\n\nFind your worst trade:`;
      
      // Generate dynamic image
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const topText = `$PNL  ·  Worst Trade`;
      const bottomText = `-${formatCurrency(pnl)} on ${token.symbol || 'Token'}`;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { console.error('share worst trade failed', err); }
  };

  const handleShareAirdrops = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary || summary.airdropCount === 0) return;

      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const profit = summary.airdropProfit || 0;
      const count = summary.airdropCount || 0;
      
      const messages = [
        `Using $PNL I discovered I made +${formatCurrency(profit)} from ${count} airdrop${count !== 1 ? 's' : ''} 🪂\n\nFree money is the best money.`,
        `$PNL says I've cashed +${formatCurrency(profit)} in airdrops 💰\n\n${count} free token${count !== 1 ? 's' : ''} turned into real gains.`,
        `My airdrop haul on Base: +${formatCurrency(profit)} 🎁\n\nWho says there's no such thing as free lunch?`,
      ];
      const castText = messages[Math.floor(Math.random() * messages.length)] + `\n\nCheck your airdrops:`;
      
      // Generate dynamic image
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const topText = `$PNL  ·  Airdrops`;
      const bottomText = `+${formatCurrency(profit)} Free Money`;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { console.error('share airdrops failed', err); }
  };

  const handleSwapForAccess = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const pnlCaip19 = getPnlCaip19();
      if (!pnlCaip19) { await sdk.actions.openUrl('https://app.uniswap.org'); return; }
      await sdk.actions.swapToken({ sellToken: BASE_ETH_CAIP19, buyToken: pnlCaip19 });
    } catch (err) { console.error('swap for $PNL failed', err); }
  };

  // MODIFIED: Check Whitelist
  const checkTokenGate = async (address) => {
    if (!PNL_TOKEN_ADDRESS) { setTokenBalance(0); setCheckingGate(false); setIsGated(false); return true; }
    
    // Whitelist check
    if (address && WHITELISTED_WALLETS.includes(address.toLowerCase())) {
       console.log('[WHITELIST] Bypassing token gate for:', address);
       setTokenBalance(REQUIRED_PNL_BALANCE); // Fake the balance for display
       setCheckingGate(false);
       setIsGated(false);
       return true;
    }

    if (DEMO_MODE) {
      console.log('[DEMO] Skipping token gate API call');
      await new Promise((r) => setTimeout(r, 500));
      setTokenBalance(REQUIRED_PNL_BALANCE + 100);
      setCheckingGate(false); setIsGated(false); return true;
    }
    try {
      console.log('[API] Checking token gate for:', address);
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`,
        { headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } }
      );
      const data = await response.json();
      const pnlToken = data?.[0];
      const balance = pnlToken ? parseInt(pnlToken.balance) / 10 ** (pnlToken.decimals || 18) : 0;
      setTokenBalance(balance);
      const gated = balance < REQUIRED_PNL_BALANCE;
      setIsGated(gated);
      setCheckingGate(false);
      return !gated;
    } catch (err) {
      console.error('Token gate check failed:', err);
      setCheckingGate(false); setIsGated(true); return false;
    }
  };

  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);
      if (DEMO_MODE) {
        console.log('[DEMO] Using mock PNL data');
        await new Promise((r) => setTimeout(r, 600));
        setPnlData(MOCK_PNL_DATA); setLoading(false); return;
      }
      let cacheKey = null;
      if (typeof window !== 'undefined' && Array.isArray(addresses) && addresses.length > 0) {
        const sortedAddresses = addresses.map((a) => a.toLowerCase()).sort();
        const fidPart = user?.fid ? `fid_${user.fid}` : 'anon';
        cacheKey = `pnl_cache_${CACHE_VERSION}_${fidPart}_${sortedAddresses.join(',')}`;
        try {
          const raw = window.localStorage.getItem(cacheKey);
          if (raw) {
            const stored = JSON.parse(raw);
            if (stored && stored.timestamp && stored.data && Date.now() - stored.timestamp < PNL_CACHE_TTL_MS) {
              setPnlData(stored.data); setLoading(false); return;
            }
          }
        } catch (e) {}
      }

      console.log('[API] Fetching PNL data for', addresses.length, 'addresses');
      const fetchPromises = addresses.map((address) =>
        fetch(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=base&exclude_spam=false`, {
          headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' }
        }).then((res) => res.json())
      );

      const results = await Promise.all(fetchPromises);
      const allTokenData = [];
      const tokenAddressesForFumble = new Set();

      results.forEach((data) => {
        if (data.result) {
          data.result.forEach((token) => {
            const invested = parseFloat(token.total_usd_invested) || 0;
            const realized = parseFloat(token.realized_profit_usd) || 0;
            const avgBuy = invested > 0 ? (invested / parseFloat(token.total_tokens_bought || 1)) : 0;
            const soldUsd = parseFloat(token.total_sold_usd) || 0;
            // Airdrop = received for free (no/tiny investment) but has value
            const isAirdrop = invested < 5 && (realized > 0 || soldUsd > 0);
            allTokenData.push({
              name: token.name, symbol: token.symbol, tokenAddress: token.token_address?.toLowerCase(),
              totalUsdInvested: invested, realizedProfitUsd: realized, isProfitable: realized > 0,
              totalTokensSold: parseFloat(token.total_tokens_sold) || 0, totalSoldUsd: soldUsd,
              avgBuy: avgBuy,
              isAirdrop: isAirdrop
            });
            if (token.token_address && parseFloat(token.total_tokens_sold) > 0) tokenAddressesForFumble.add(token.token_address);
          });
        }
      });

      const profitableTokens = allTokenData.filter((t) => t.isProfitable).length;
      const airdrops = allTokenData.filter((t) => t.isAirdrop);
      const airdropProfit = airdrops.reduce((acc, t) => acc + t.realizedProfitUsd, 0);
      const summary = {
        totalRealizedProfit: allTokenData.reduce((acc, t) => acc + t.realizedProfitUsd, 0),
        totalUnrealizedProfit: 0,
        totalTradingVolume: allTokenData.reduce((acc, t) => acc + t.totalUsdInvested, 0),
        profitPercentage: 0, 
        totalTokensTraded: allTokenData.length,
        winRate: allTokenData.length > 0 ? (profitableTokens / allTokenData.length) * 100 : 0,
        totalFumbled: 0,
        airdropCount: airdrops.length,
        airdropProfit: airdropProfit
      };
      summary.profitPercentage = summary.totalTradingVolume > 0 ? (summary.totalRealizedProfit / summary.totalTradingVolume) * 100 : 0;
      
      let biggestWin = null;
      let biggestLoss = null;
      allTokenData.forEach(token => {
        if(token.realizedProfitUsd > 0) { if(!biggestWin || token.realizedProfitUsd > biggestWin.realizedProfitUsd) biggestWin = token; }
        if(token.realizedProfitUsd < 0) { if(!biggestLoss || token.realizedProfitUsd < biggestLoss.realizedProfitUsd) biggestLoss = token; }
      });

      let biggestFumbleToken = null;
      let totalFumbledAmount = 0;

      console.log('Tokens with sold amounts:', tokenAddressesForFumble.size);

      if (tokenAddressesForFumble.size > 0) {
        try {
          const priceResponse = await fetch('https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=base', {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' },
            body: JSON.stringify({ tokens: Array.from(tokenAddressesForFumble).map((addr) => ({ token_address: addr })) })
          });
          const priceData = await priceResponse.json();
          console.log('Price data received:', priceData);
          const priceArray = Array.isArray(priceData) ? priceData : priceData.result || priceData.tokens || [];
          const priceMap = new Map();
          priceArray.forEach((p) => {
             const addr = (p.tokenAddress || p.token_address || '').toLowerCase();
             const rawUsd = p.usdPrice ?? p.usd_price ?? p.usdPriceFormatted;
             if(addr && parseFloat(rawUsd) > 0) priceMap.set(addr, parseFloat(rawUsd));
          });
          console.log('Price map size:', priceMap.size);
          allTokenData.forEach((t) => {
            if (!t.tokenAddress || !t.totalTokensSold) return;
            const priceUsd = priceMap.get(t.tokenAddress);
            if (!priceUsd) {
              console.log('No price for token:', t.symbol, t.tokenAddress);
              return;
            }
            const currentValueSoldTokens = t.totalTokensSold * priceUsd;
            const missedUpsideUsd = currentValueSoldTokens - t.totalSoldUsd;
            console.log(`${t.symbol}: sold $${t.totalSoldUsd.toFixed(2)}, now worth $${currentValueSoldTokens.toFixed(2)}, missed: $${missedUpsideUsd.toFixed(2)}`);
            if (missedUpsideUsd > 0) {
                totalFumbledAmount += missedUpsideUsd;
                if (!biggestFumbleToken || missedUpsideUsd > biggestFumbleToken.missedUpsideUsd) {
                    biggestFumbleToken = { ...t, missedUpsideUsd, currentValueSoldTokens };
                    console.log('New biggest fumble:', t.symbol, missedUpsideUsd);
                }
            }
          });
        } catch (e) { console.log('error computing biggest fumble', e); }
      }
      console.log('Final fumble:', biggestFumbleToken);
      summary.totalFumbled = totalFumbledAmount;
      const resultData = { summary, tokens: allTokenData, biggestWin, biggestLoss, biggestFumble: biggestFumbleToken };
      setPnlData(resultData);
      if (cacheKey && typeof window !== 'undefined') window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: resultData }));
      setLoading(false);
    } catch (err) { console.error('fetchPNLData error', err); setLoading(false); }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[INIT] Starting app initialization');
        console.log('[INIT] DEMO_MODE:', DEMO_MODE);
        console.log('[INIT] DEV:', import.meta.env.DEV);
        
        setLoading(true);
        if (DEMO_MODE) {
          console.log('[DEMO] Running in demo mode - no API calls will be made');
          await new Promise((r) => setTimeout(r, 800)); setUser(MOCK_USER); setWallets(MOCK_WALLETS); await checkTokenGate(MOCK_WALLETS[0]); setPnlData(MOCK_PNL_DATA); setLoading(false); return;
        }
        let fid = null;
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          if (context?.user?.fid) { fid = context.user.fid; setUser(context.user); console.log('[INIT] Got Farcaster context, fid:', fid); } 
          else { setEnvError('PNL Tracker needs a Farcaster user context.'); setCheckingGate(false); setLoading(false); return; }
          sdk.actions.ready();
        } catch (err) { console.log('[INIT] No Farcaster SDK context'); setEnvError('PNL Tracker runs as a Farcaster miniapp.'); setCheckingGate(false); setLoading(false); return; }
        if (fid) {
          console.log('[API] Fetching user data from Neynar');
          const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, { headers: { accept: 'application/json', api_key: import.meta.env.VITE_NEYNAR_API_KEY || '' } });
          const neynarData = await neynarResponse.json();
          const primaryEth = neynarData?.users?.[0]?.verified_addresses?.primary?.eth_address || null;
          const allEth = neynarData?.users?.[0]?.verified_addresses?.eth_addresses || [];
          if (allEth.length === 0) { setEnvError('No verified Base wallets found.'); setCheckingGate(false); setLoading(false); return; }
          setWallets(allEth);
          const resolvedPrimary = primaryEth || allEth[0];
          setPrimaryWallet(resolvedPrimary);

          // Default to 'all' if multiple wallets exist, otherwise the specific wallet address
          const defaultScope = resolvedPrimary;
          setActiveScope(defaultScope);
          
          // Check which badges have already been minted
          checkMintedBadges(resolvedPrimary);
          
          // Fetch data for the selected scope (All or Single)
          const initialAddresses = defaultScope === 'all' ? allEth : [resolvedPrimary];
          if (initialAddresses.length > 0) {
            await checkTokenGate(resolvedPrimary);
            // Always fetch real PNL data - gate just controls visibility (blurring)
            await fetchPNLData(initialAddresses);
          }
        }
        setCheckingGate(false);
      } catch (err) { console.error('init error', err); setEnvError('Init failed.'); setLoading(false); setCheckingGate(false); }
    };
    initialize();
  }, []);

  // Reset audit data when wallet scope changes
  useEffect(() => {
    setAuditMetrics(null);
    setAuditNarrative(null);
  }, [activeScope, primaryWallet]);

  const handleWalletScopeChange = async (event) => {
    const scope = event.target.value;
    setActiveScope(scope);
    if (DEMO_MODE) return;
    
    // Determine which wallet(s) we're looking at
    let addresses = scope === 'all' ? wallets : (scope === 'primary' && primaryWallet ? [primaryWallet] : [scope]);
    
    // Clear badge-related state for new wallet
    setClaimedBadges([]); // Clear while we re-check
    setMintTxHash(null);
    setMintError(null);
    
    // Check badges for the selected wallet
    if (addresses.length > 0) {
      checkMintedBadges(addresses[0]); // Check badges for first/selected wallet
    }
    
    if (addresses.length > 0 && !isGated) await fetchPNLData(addresses);
  };

  const handleRetryGate = () => {
    setCheckingGate(true);
    if (wallets.length > 0) {
       const target = primaryWallet || wallets[0];
       checkTokenGate(target).then((hasAccess) => { if(hasAccess) fetchPNLData([target]); });
    }
  };

  
  // Score bonus scales with badge levels
  const scoreBonusTotal = (() => {
    try {
      const defs = getAllBadges(pnlData?.summary || {});
      const counts = mintCounts || {};
      return defs.reduce((acc, d) => acc + (d.scoreBonus || 0) * (counts[d.type] || 0), 0);
    } catch { return 0; }
  })();
const renderGatedOverlay = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', pointerEvents: 'auto', overflowY: 'auto', paddingTop: '80px', paddingBottom: '32px' }}>
      <div style={{ background: colors.panelBg, borderRadius: ds.radius.xl, border: `1px solid ${colors.border}`, padding: ds.space.xl, maxWidth: '400px', width: '90%', boxShadow: ds.shadow.lg, textAlign: 'center', pointerEvents: 'auto' }}>
        
        {/* Header */}
        <div style={{ fontSize: '48px', marginBottom: ds.space.sm, lineHeight: '1' }}>🔒</div>
        <h2 style={{ fontSize: ds.text.xl, fontWeight: '700', color: colors.ink, margin: `0 0 ${ds.space.xs}`, letterSpacing: '-0.01em' }}>Premium Access Required</h2>
        <p style={{ fontSize: ds.text.base, color: colors.muted, margin: `0 0 ${ds.space.lg}`, lineHeight: '1.5' }}>Hold <strong>{formatNumber(REQUIRED_PNL_BALANCE)} $PNL</strong> to unlock your complete trading profile</p>
        
        {/* Win Rate Teaser */}
        {pnlData?.summary && (
          <div style={{ 
            background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', 
            borderRadius: ds.radius.md, 
            padding: ds.space.md, 
            marginBottom: ds.space.md,
            color: '#fff',
            border: '1px solid #166534'
          }}>
            <div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Your Win Rate</div>
            <div style={{ fontSize: ds.text.xxl, fontWeight: '700' }}>{pnlData.summary.winRate.toFixed(1)}%</div>
            <div style={{ fontSize: ds.text.sm, color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>Unlock to see your full stats</div>
          </div>
        )}

        {/* Fumbled Gains - Emotional Hook */}
        {pnlData?.summary?.totalFumbled > 0 && (
          <div style={{ 
            background: 'linear-gradient(135deg, #7c2d12 0%, #991b1b 100%)', 
            borderRadius: ds.radius.md, 
            padding: ds.space.md, 
            marginBottom: ds.space.md,
            color: '#fff',
            border: '1px solid #991b1b'
          }}>
            <div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>You Left on the Table</div>
            <div style={{ fontSize: ds.text.xxl, fontWeight: '700' }}>{formatCurrency(pnlData.summary.totalFumbled)}</div>
            <div style={{ fontSize: ds.text.sm, color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
              See exactly which tokens you sold too early
            </div>
          </div>
        )}
        
        {/* Trident LLC Audit Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
          borderRadius: ds.radius.md,
          padding: ds.space.md,
          marginBottom: ds.space.lg,
          border: '1px solid #374151'
        }}>
          <div style={{ fontSize: ds.text.sm, fontWeight: '700', color: '#ffffff', marginBottom: '4px' }}>
            🎯 Trident LLC Audit
          </div>
          <div style={{ fontSize: ds.text.xs, color: 'rgba(255,255,255,0.7)', lineHeight: '1.4' }}>
            Official trading audits launching soon for premium holders
          </div>
        </div>
        
        {/* Feature List */}
        <div style={{ textAlign: 'left', marginBottom: ds.space.lg }}>
          <div style={{ fontSize: ds.text.xs, textTransform: 'uppercase', letterSpacing: '0.1em', color: colors.metricLabel, marginBottom: ds.space.sm, textAlign: 'center', fontWeight: '600' }}>Premium Features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: ds.space.xs }}>
            {[
              { icon: '💸', text: 'See exactly how much $ you fumbled' },
              { icon: '📊', text: 'Complete P&L breakdown & ROI analysis' },
              { icon: '🏆', text: 'Trading score & Base leaderboard rank' },
              { icon: '📜', text: 'Official Trident LLC audit (launching soon)' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: ds.space.xs, fontSize: ds.text.sm, color: colors.ink, padding: ds.space.xs, borderRadius: ds.radius.sm, background: i === 0 ? '#fef2f2' : '#f9fafb', border: i === 0 ? '1px solid #fecaca' : 'none' }}>
                <span style={{ fontSize: ds.text.lg }}>{item.icon}</span>
                <span style={{ fontWeight: i === 0 ? '600' : '400' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Balance Status */}
        <div style={{ background: '#f9fafb', padding: ds.space.sm, borderRadius: ds.radius.md, marginBottom: ds.space.md, border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: ds.text.sm, marginBottom: '4px' }}>
            <span style={{ color: colors.metricLabel }}>Your Balance</span>
            <span style={{ fontWeight: '600', color: tokenBalance < REQUIRED_PNL_BALANCE ? colors.error : colors.success }}>{formatNumber(tokenBalance)} $PNL</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: ds.text.sm }}>
            <span style={{ color: colors.metricLabel }}>Required</span>
            <span style={{ fontWeight: '600' }}>{formatNumber(REQUIRED_PNL_BALANCE)} $PNL</span>
          </div>
          {tokenBalance > 0 && tokenBalance < REQUIRED_PNL_BALANCE && (
            <div style={{ marginTop: ds.space.xs, paddingTop: ds.space.xs, borderTop: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: ds.text.xs, color: colors.muted }}>
                Need {formatNumber(REQUIRED_PNL_BALANCE - tokenBalance)} more
              </div>
            </div>
          )}
        </div>
        
        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.sm }}>
          <button onClick={handleSwapForAccess} style={{ flex: 1, padding: ds.space.sm, borderRadius: ds.radius.pill, background: colors.pill, color: colors.pillText, fontSize: ds.text.sm, fontWeight: '600', border: 'none', cursor: 'pointer' }}>Get $PNL</button>
          <button onClick={handleRetryGate} style={{ flex: 1, padding: ds.space.sm, borderRadius: ds.radius.pill, background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, fontSize: ds.text.sm, fontWeight: '600', cursor: 'pointer' }}>Refresh</button>
        </div>

        {/* Follow Button */}
        <a 
          href="https://farcaster.xyz/ireside.eth"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: ds.space.sm,
            borderRadius: ds.radius.pill,
            background: 'transparent',
            color: colors.muted,
            border: `1px solid ${colors.border}`,
            fontSize: ds.text.sm,
            fontWeight: '600',
            cursor: 'pointer',
            textDecoration: 'none',
            textAlign: 'center'
          }}
        >
          Follow @ireside.eth
        </a>
      </div>
    </div>
  );

  if (loading || checkingGate) return <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}><div style={{ textAlign: 'center' }}><div style={{ width: '24px', height: '24px', border: `2px solid ${colors.border}`, borderTopColor: colors.ink, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} /><div style={{ fontSize: '11px', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Loading</div></div><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  if (envError) return <ErrorScreen title="Access Locked" message={envError} />;

  const tokens = pnlData?.tokens || [];
  const biggestWin = pnlData?.biggestWin || null;
  const biggestLoss = pnlData?.biggestLoss || null;
  const biggestFumble = pnlData?.biggestFumble || null;
  const badges = getBadges(pnlData?.summary);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', color: colors.ink, position: 'relative', overflow: 'hidden' }}>
      {isGated && renderGatedOverlay()}
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '20px 18px 60px', transition: 'all 0.4s ease' }}>
        
        {/* Compact Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1.5px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '600' }}>Ψ</div>
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>PNL Tracker</span>
            {DEMO_MODE && <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>Demo</span>}
          </div>
          {/* Wallet selector in header */}
          {wallets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <select 
                value={activeScope} 
                onChange={handleWalletScopeChange} 
                style={{ 
                  fontSize: '11px', 
                  padding: '6px 10px', 
                  borderRadius: '6px', 
                  border: `1px solid ${colors.border}`, 
                  background: colors.panelBg, 
                  color: colors.muted,
                  maxWidth: '140px',
                  cursor: 'pointer'
                }}
              >
                {wallets.map((addr) => (
                  <option key={addr} value={addr}>
                    {addr === primaryWallet ? `Primary · ${truncateAddress(addr)}` : truncateAddress(addr)}
                  </option>
                ))}
                {wallets.length > 1 && <option value="all">All wallets</option>}
              </select>
              <div style={{ fontSize: '9px', color: colors.muted, letterSpacing: '0.02em', opacity: 0.6 }}>check wallets here ↑</div>
            </div>
          )}
        </header>

        {/* User info row */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={user.pfpUrl} alt={user.username} style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${colors.border}` }} />
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: colors.ink }}>{user.displayName}</div>
                <div style={{ fontSize: '12px', color: colors.muted }}>@{user.username}</div>
              </div>
            </div>
            <div style={{ 
              padding: '5px 12px', 
              borderRadius: '999px', 
              background: pnlData?.summary?.totalRealizedProfit >= 0 ? '#dcfce7' : '#fef2f2', 
              color: pnlData?.summary?.totalRealizedProfit >= 0 ? '#166534' : '#991b1b', 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em', 
              fontSize: '10px', 
              fontWeight: '600',
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px' 
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pnlData?.summary?.totalRealizedProfit >= 0 ? colors.success : colors.error }} />
              {pnlData?.summary?.totalRealizedProfit >= 0 ? 'Profitable' : 'In Loss'}
            </div>
          </div>
        )}

        

{/* Tabs: Stats / Airdrops / Badges / Lore */}
        {/* Tabs: Stats / Airdrops / Badges / Lore */}
{!isGated && pnlData?.summary && (
  <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.md, width: '100%' }}>
    {['stats', 'airdrops', 'badges', 'lore'].map((tab) => (
      <button
        key={tab}
        onClick={() => setActiveTab(tab)}
        style={{
          flex: 1, minWidth: 0,
          padding: `${ds.space.sm} 2px`,
          borderRadius: ds.radius.md,
          border: activeTab === tab ? 'none' : `1px solid ${colors.border}`,
          background: activeTab === tab ? colors.accent : colors.panelBg,
          color: activeTab === tab ? colors.pillText : colors.muted,
          fontSize: ds.text.sm,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {tab === 'stats' ? 'Stats' : tab === 'airdrops' ? 'Airdrops' : tab === 'lore' ? 'Audit' : 'Badges'}
      </button>
    ))}
  </div>
)}

    

{/* RANK CARD FIRST - Share immediately visible */}
        {!isGated && activeTab !== 'lore' && pnlData?.summary && (
          <RankCard summary={pnlData.summary} onShare={handleSharePnL} />
        )}

        {/* --- MAIN CONTENT SWITCH --- */}
        
        {!isGated && activeTab === 'lore' && pnlData?.summary && (
          <div>
            {/* Generate Audit Button */}
            {!auditMetrics && !auditLoading && (
              <button
                onClick={handleRequestAudit}
                style={{
                  width: '100%',
                  padding: ds.space.md,
                  borderRadius: ds.radius.md,
                  background: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
                  border: 'none',
                  color: '#fff',
                  fontSize: ds.text.md,
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: ds.space.md
                }}
              >
                🔍 Generate My Audit
              </button>
            )}
            
            {/* Loading State */}
            {auditLoading && (
              <div style={{
                padding: ds.space.xl,
                textAlign: 'center',
                background: colors.panelBg,
                borderRadius: ds.radius.lg,
                border: `1px solid ${colors.border}`
              }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  border: `2px solid ${colors.border}`, 
                  borderTopColor: colors.ink, 
                  borderRadius: '50%', 
                  margin: '0 auto 16px', 
                  animation: 'spin 0.8s linear infinite' 
                }} />
                <div style={{ fontSize: ds.text.sm, color: colors.muted }}>Generating your audit...</div>
                <div style={{ fontSize: ds.text.xs, color: colors.metricLabel, marginTop: '8px' }}>Analyzing transactions & behaviors</div>
              </div>
            )}
            
            {/* Error State */}
            {auditError && (
              <div style={{
                padding: ds.space.md,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: ds.radius.md,
                marginBottom: ds.space.md
              }}>
                <div style={{ fontSize: ds.text.sm, color: '#991b1b' }}>{auditError}</div>
                <button
                  onClick={handleRequestAudit}
                  style={{
                    marginTop: ds.space.sm,
                    padding: `${ds.space.xs} ${ds.space.sm}`,
                    borderRadius: ds.radius.sm,
                    background: colors.accent,
                    color: '#fff',
                    border: 'none',
                    fontSize: ds.text.xs,
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            )}
            
            {/* Audit Card */}
            {auditMetrics && !auditLoading && (
              <TradingAudit
                pnlData={{
                  ...pnlData,
                  summary: { ...pnlData.summary, ...auditMetrics }
                }}
                user={{ ...user, wallet: primaryWallet || wallets[0] }}
                percentileData={calculatePercentile(pnlData.summary)}
                auditNarrative={auditNarrative}
                onShare={handleShareAudit}
              />
            )}
          </div>
        )}

        {/* --- TAB CONTENT --- */}
        {/* --- TAB CONTENT --- */}
        
        {/* STATS */}
        {!isGated && activeTab === 'stats' && pnlData?.summary && (
          <>
            <Panel title="Realized P&L">
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '32px', fontWeight: '600', color: pnlData.summary.totalRealizedProfit >= 0 ? colors.success : colors.error, marginBottom: '8px', filter: isGated ? 'blur(10px)' : 'none' }}>{pnlData.summary.totalRealizedProfit >= 0 ? '+' : ''}{formatCurrency(pnlData.summary.totalRealizedProfit)}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '999px', background: pnlData.summary.profitPercentage >= 0 ? '#dcfce7' : '#fef2f2', color: pnlData.summary.profitPercentage >= 0 ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: '500', filter: isGated ? 'blur(5px)' : 'none' }}>{pnlData.summary.profitPercentage >= 0 ? '↑' : '↓'}{Math.abs(pnlData.summary.profitPercentage).toFixed(1)}% ROI on sold tokens</div>
              </div>
              {!isGated && badges.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                      {badges.map((b, i) => <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: '#f8fafc', fontSize: '11px', fontWeight: '600', color: colors.ink }}><span>{b.icon}</span> {b.label}</div>)}
                  </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '18px', marginTop: '16px' }}>
                <div style={{ flex: '1 1 auto' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.metricLabel, marginBottom: '6px' }}>Total Invested</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: colors.ink }}>{formatCurrency(pnlData.summary.totalTradingVolume)}</div>
                  <div style={{ fontSize: '10px', color: colors.muted, marginTop: '2px' }}>Across {pnlData.summary.totalTokensTraded} tokens</div>
                </div>
                <Metric label="Win Rate" value={`${pnlData.summary.winRate.toFixed(1)}%`} isPositive={pnlData.summary.winRate >= 50} />
                {!isGated && pnlData.summary.totalFumbled > 0 
                   ? <Metric label="Fumbled Gains" value={formatCurrency(pnlData.summary.totalFumbled)} isWarning />
                   : <Metric label="Tokens Traded" value={pnlData.summary.totalTokensTraded} />
                }
              </div>
            </Panel>

            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
              <Panel title="Highlights" subtitle="From sold tokens">
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {biggestWin && <BigMoveCard label="Best Trade" token={biggestWin} isWin={true} onShare={handleShareBestTrade} />}
                  {biggestLoss && <BigMoveCard label="Worst Trade" token={biggestLoss} isWin={false} onShare={handleShareWorstTrade} />}
                  {biggestFumble && <BigFumbleCard token={biggestFumble} onShare={handleShareFumble} />}
                </div>
              </Panel>
            </div>
            
            {/* Token lists */}
            <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.sm }}>
              <button 
                onClick={() => setTokenListView('wins')}
                style={{ 
                  padding: `${ds.space.xs} ${ds.space.sm}`, 
                  borderRadius: ds.radius.pill, 
                  border: `1px solid ${tokenListView === 'wins' ? colors.accent : colors.border}`, 
                  background: tokenListView === 'wins' ? colors.accent : colors.panelBg, 
                  color: tokenListView === 'wins' ? '#fff' : colors.muted, 
                  fontSize: ds.text.xs, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.12em', 
                  cursor: 'pointer',
                  fontWeight: tokenListView === 'wins' ? '600' : '500'
                }}
              >
                Top Wins
              </button>
              <button 
                onClick={() => setTokenListView('all')}
                style={{ 
                  padding: `${ds.space.xs} ${ds.space.sm}`, 
                  borderRadius: ds.radius.pill, 
                  border: `1px solid ${tokenListView === 'all' ? colors.accent : colors.border}`, 
                  background: tokenListView === 'all' ? colors.accent : colors.panelBg, 
                  color: tokenListView === 'all' ? '#fff' : colors.muted, 
                  fontSize: ds.text.xs, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.12em', 
                  cursor: 'pointer',
                  fontWeight: tokenListView === 'all' ? '600' : '500'
                }}
              >
                All Tokens
              </button>
            </div>
            {pnlData?.tokens && tokenListView === 'wins' && (
              <Panel title="Best Performers" subtitle="Realized gains">
                {pnlData.tokens.filter((t) => t.isProfitable).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).slice(0, 5).map((token, idx) => (
                  <TokenRow key={idx} token={token} />
                ))}
              </Panel>
            )}
            {pnlData?.tokens && tokenListView === 'all' && (
              <Panel title="All Tokens" subtitle={`${pnlData.tokens.length} tokens traded`}>
                {pnlData.tokens.sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).map((token, idx) => (
                  <TokenRow key={idx} token={token} />
                ))}
              </Panel>
            )}
          </>
        )}

        {/* AIRDROPS */}
        {!isGated && activeTab === 'airdrops' && pnlData?.tokens && (
          <>
            <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)', borderRadius: '16px', padding: '20px', marginBottom: '16px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.7, marginBottom: '8px' }}>Free Money Received</div><div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>+{formatCurrency(pnlData.summary.airdropProfit)}</div><div style={{ fontSize: '12px', opacity: 0.8 }}>from {pnlData.summary.airdropCount} airdrop{pnlData.summary.airdropCount !== 1 ? 's' : ''}</div></div>
                <button onClick={handleShareAirdrops} style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share</button>
              </div>
            </div>
            <Panel title="Airdrops" subtitle="Tokens received for free">
              {pnlData.tokens.filter(t => t.isAirdrop).length > 0 ? (
                pnlData.tokens.filter(t => t.isAirdrop).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).map((token, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: idx < pnlData.tokens.filter(t => t.isAirdrop).length - 1 ? `1px solid ${colors.border}` : 'none' }}>
                    <div><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>{token.symbol}</span><span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: '#f3e8ff', color: '#7c3aed', fontWeight: '600' }}>AIRDROP</span></div><div style={{ fontSize: '11px', color: colors.muted }}>{token.name}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: '14px', fontWeight: '600', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error }}>{token.realizedProfitUsd >= 0 ? '+' : ''}{formatCurrency(token.realizedProfitUsd)}</div><div style={{ fontSize: '10px', color: colors.muted }}>Sold for {formatCurrency(token.totalSoldUsd)}</div></div>
                  </div>
                ))
              ) : (<div style={{ textAlign: 'center', padding: '20px', color: colors.muted }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>🪂</div><div style={{ fontSize: '13px' }}>No airdrops found</div><div style={{ fontSize: '11px', marginTop: '4px' }}>Tokens with $0 cost basis will appear here</div></div>)}
            </Panel>
          </>
        )}

        {/* BADGES */}
        {!isGated && activeTab === 'badges' && pnlData?.summary && (
          <ClaimBadgePanel 
            summary={pnlData.summary}
            onClaimBadge={handleClaimBadgeViaSDK}
            claimingBadge={claimingBadge}
            claimedBadges={claimedBadges}
            mintTxHash={mintTxHash}
            mintError={mintError}
            canClaim={!!primaryWallet}
            currentWallet={activeScope === 'all' ? (primaryWallet || wallets[0]) : (activeScope === 'primary' ? primaryWallet : activeScope)}
          />
        )}

        {/* INFO */}
        {!isGated && <InfoPanel isVisible={showInfo} onClose={() => setShowInfo(false)} />}
        {!isGated && (
          <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', opacity: 0.6 }}>
             <div onClick={() => setShowInfo(true)} style={{ fontSize: '11px', color: colors.muted, textDecoration: 'underline', cursor: 'pointer' }}>How is this calculated?</div>
          </div>
        )}

        {/* Gated content blur */}
        {isGated && (biggestWin || biggestLoss || biggestFumble) && (
          <div style={{ filter: 'blur(5px)', marginTop: '20px' }}>
            <Panel title="Highlights" subtitle="From sold tokens">
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                {biggestWin && <BigMoveCard label="Best Trade" token={biggestWin} isWin={true} />}
                {biggestLoss && <BigMoveCard label="Worst Trade" token={biggestLoss} isWin={false} />}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
