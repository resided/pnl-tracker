import React, { useState, useEffect, useCallback } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires 10M PNL tokens to access full view
// NOW WITH: Badge Claiming (free mint, gas only)

// Auto-detect demo mode: true in development, false in production
// Override with VITE_DEMO_MODE=true or VITE_DEMO_MODE=false
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' ? true : 
                  import.meta.env.VITE_DEMO_MODE === 'false' ? false :
                  import.meta.env.DEV || false; 
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;

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

// Styles
const colors = {
  bg: '#fafafa', ink: '#0b0b0b', muted: '#6b7280', accent: '#111827', border: '#e5e7eb',
  pill: '#111827', pillText: '#f9fafb', metricLabel: '#9ca3af', metricValue: '#111827',
  success: '#22c55e', error: '#b91c1c', panelBg: '#ffffff',
  gold: '#b45309', goldBg: '#fffbeb', goldBorder: '#fde68a',
  mint: '#059669', mintBg: '#ecfdf5', mintBorder: '#6ee7b7'
};

// Components
const Metric = ({ label, value, isPositive, isWarning }) => (
  <div style={{ minWidth: '90px' }}>
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: isWarning ? colors.gold : colors.metricLabel, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: '600', color: isWarning ? colors.gold : (isPositive === undefined ? colors.metricValue : isPositive ? colors.success : colors.error) }}>{value}</div>
  </div>
);

const Badge = ({ icon, label, badgeType, onClaim, isClaiming, isClaimed, canClaim, qualified, requirement, current }) => {
  const isLocked = !qualified;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: '4px', 
      padding: '10px 12px', 
      borderRadius: '10px', 
      border: `1px solid ${isClaimed ? colors.mintBorder : isLocked ? '#e5e7eb' : colors.border}`, 
      background: isClaimed ? colors.mintBg : isLocked ? '#f9fafb' : '#fff', 
      fontSize: '11px', 
      fontWeight: '600', 
      color: isClaimed ? colors.mint : isLocked ? colors.muted : colors.ink,
      opacity: isLocked ? 0.7 : 1,
      minWidth: '140px',
      flex: '1 1 140px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '14px' }}>{icon}</span> 
          <span>{label}</span>
        </div>
        {isClaimed && <span style={{ fontSize: '10px', color: colors.mint }}>✓ Minted</span>}
        {isLocked && <span style={{ fontSize: '10px' }}>🔒</span>}
      </div>
      
      {/* Show requirement and current value */}
      <div style={{ fontSize: '9px', color: colors.muted, fontWeight: '400' }}>
        {isLocked ? (
          <span>Need: {requirement}</span>
        ) : (
          <span>You: {current}</span>
        )}
      </div>
      
      {/* Mint button */}
      {canClaim && !isClaimed && !isLocked && (
        <button 
          onClick={() => onClaim(badgeType)}
          disabled={isClaiming}
          style={{
            marginTop: '4px',
            padding: '6px 10px',
            borderRadius: '6px',
            border: 'none',
            background: isClaiming ? colors.muted : colors.mint,
            color: '#fff',
            fontSize: '10px',
            fontWeight: '600',
            cursor: isClaiming ? 'not-allowed' : 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {isClaiming ? 'Minting...' : 'Mint NFT'}
        </button>
      )}
    </div>
  );
};

const Panel = ({ title, subtitle, children, style }) => (
  <div style={{ background: colors.panelBg, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '20px 18px 16px', boxShadow: '0 14px 35px rgba(15,23,42,0.08)', ...style }}>
    {(title || subtitle) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        {title && <div style={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '10px', color: colors.metricLabel }}>{title}</div>}
        {subtitle && <div style={{ fontSize: '11px', color: colors.muted }}>{subtitle}</div>}
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
          
          {/* New Sleek Rank Display (No Box) */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: '10px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.14em', 
              color: 'rgba(255,255,255,0.5)', 
              fontWeight: '500',
              marginBottom: '2px'
            }}>
              Rank
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'flex-end',
              gap: '6px' 
            }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {rank.title}
              </span>
              <span style={{ fontSize: '20px', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
                {rank.emoji}
              </span>
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

const TokenRow = ({ token }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: colors.accent, border: `1px solid ${colors.border}` }}>{token.symbol?.charAt(0)}</div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{token.symbol}</div>
        <div style={{ fontSize: '11px', color: colors.muted }}>Bought: {formatCurrency(token.totalUsdInvested)}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '500', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error }}>
        {token.realizedProfitUsd >= 0 ? '+' : '-'}{formatCurrency(token.realizedProfitUsd)}
      </div>
      <div style={{ fontSize: '11px', color: colors.muted }}>Realized P&L</div>
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
    <div style={{ flex: '1 1 140px', padding: '12px', borderRadius: '16px', border: `1px solid ${border}`, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.metricLabel }}>{label}</div>
        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: pillBg, color: text }}>{token.symbol}</div>
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: text, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>{pnl >= 0 ? '+' : '-'}{formatCurrency(pnl)}</div>
        <div style={{ fontSize: '11px', color: colors.muted }}>{token.name} · Realized</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${isWin ? '#bbf7d0' : '#fecaca'}` }}>
        <div><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>You Paid</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>{formatCurrency(invested)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>You Got</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>{formatCurrency(invested + pnl)}</div></div>
      </div>
      {onShare && (
        <button 
          onClick={onShare}
          style={{ 
            marginTop: '4px',
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${border}`,
            background: isWin ? 'rgba(22, 101, 52, 0.1)' : 'rgba(153, 27, 27, 0.1)',
            color: text,
            fontSize: '10px',
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
    <div style={{ flex: '1 1 140px', padding: '12px', borderRadius: '16px', border: `1px solid ${colors.goldBorder}`, background: colors.goldBg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold }}>Biggest Fumble</div>
          <div style={{ fontSize: '12px', fontWeight: '600', color: colors.gold, marginTop: '2px' }}>{token.name || token.symbol}</div>
        </div>
        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fef3c7', color: colors.gold }}>Sold Early</div>
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.gold, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>{formatCurrency(missed)}</div>
        <div style={{ fontSize: '11px', color: colors.gold }}>left on the table</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${colors.goldBorder}` }}>
        <div><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>You Sold</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.gold }}>{formatCurrency(sold)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>Worth Now</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.gold }}>{formatCurrency(current)} {multiple > 0 && <span style={{ opacity: 0.7 }}>({multiple.toFixed(1)}x)</span>}</div></div>
      </div>
      {onShare && (
        <button 
          onClick={onShare}
          style={{ 
            marginTop: '4px',
            padding: '8px',
            borderRadius: '8px',
            border: `1px solid ${colors.goldBorder}`,
            background: 'rgba(180, 83, 9, 0.1)',
            color: colors.gold,
            fontSize: '10px',
            fontWeight: '600',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.08em'
          }}
        >
          Share My Pain
        </button>
      )}
    </div>
  );
};

const ErrorScreen = ({ title, message }) => (
  <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
    <div style={{ background: colors.panelBg, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '28px 24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '50%', border: `1px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '18px' }}>⚠️</div>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.16em', color: colors.metricLabel, marginBottom: '8px' }}>{title}</div>
      <p style={{ fontSize: '13px', color: colors.muted, lineHeight: 1.6, margin: 0 }}>{message}</p>
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
      type: BADGE_TYPES.SNIPER,
      qualified: winRate >= 60,
      requirement: 'Win Rate ≥ 60%',
      current: `${winRate.toFixed(1)}%`
    },
    { 
      icon: '💧', 
      label: 'Exit Liquidity', 
      type: BADGE_TYPES.EXIT_LIQUIDITY,
      qualified: winRate < 40 && tokens > 5,
      requirement: 'Win Rate < 40% & 5+ tokens',
      current: `${winRate.toFixed(1)}%, ${tokens} tokens`
    },
    { 
      icon: '🐋', 
      label: 'Volume Whale', 
      type: BADGE_TYPES.VOLUME_WHALE,
      qualified: volume > 50000,
      requirement: 'Volume > $50k',
      current: `$${(volume/1000).toFixed(1)}k`
    },
    { 
      icon: '🧻', 
      label: 'Paper Hands', 
      type: BADGE_TYPES.TOILET_PAPER_HANDS,
      qualified: fumbled > 10000,
      requirement: 'Fumbled > $10k',
      current: `$${(fumbled/1000).toFixed(1)}k`
    },
    { 
      icon: '💎', 
      label: 'Diamond', 
      type: BADGE_TYPES.DIAMOND,
      qualified: profit > 10000,
      requirement: 'Profit > $10k',
      current: `$${(profit/1000).toFixed(1)}k`
    },
    { 
      icon: '💰', 
      label: 'Profitable', 
      type: BADGE_TYPES.TRADER, // Using TRADER slot for "Profitable" badge
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
    <Panel title="Your Badges" subtitle={`${qualifiedCount} of ${allBadges.length} unlocked`} style={{ marginTop: '20px' }}>
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
        Free to mint (gas only ~$0.001) • Each badge can only be minted once
      </div>
    </Panel>
  );
};

// Main App Component
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
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintError, setMintError] = useState(null);
  
  // Info panel state
  const [showInfo, setShowInfo] = useState(false);

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
        `$PNL says I've cashed +${formatCurrency(profit)} in airdrops 💰\n\n${count} free token${count !== 1 ? 's' : ''} turned