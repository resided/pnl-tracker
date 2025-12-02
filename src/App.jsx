import React, { useState, useEffect, useCallback } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires 10M PNL tokens to access full app
// NOW WITH: Badge Claiming & Audits (free mint, gas only)

// Auto-detect demo mode: true in development, false in production
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' ? true : 
                  import.meta.env.VITE_DEMO_MODE === 'false' ? false :
                  import.meta.env.DEV || false; 
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_VERSION = 'v2'; 

// Token gate configuration
const PNL_TOKEN_ADDRESS = import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x36FA7687bbA52d3C513497b69BcaD07f4919bB07';
const REQUIRED_PNL_BALANCE = 10000000; 

// Badge Contract Configuration
const BADGE_CONTRACT_ADDRESS = import.meta.env.VITE_BADGE_CONTRACT_ADDRESS || '0xCA3FD5824151e478d02515b59Eda3E62d4E238fe';

// Badge Contract ABI (minimal for minting)
const BADGE_ABI = [
  { name: 'mintBadge', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'badgeType', type: 'uint8' }, { name: 'winRate', type: 'uint256' }, { name: 'volume', type: 'uint256' }, { name: 'profit', type: 'uint256' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'hasMintedBadge', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badgeType', type: 'uint8' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }
];

// Badge type enum matching contract
const BADGE_TYPES = { SNIPER: 0, EXIT_LIQUIDITY: 1, VOLUME_WHALE: 2, TOILET_PAPER_HANDS: 3, DIAMOND: 4, TRADER: 5 };

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

// Percentile calculation
const calculatePercentile = (summary) => {
  if (!summary) return { percentile: 50, title: 'Trader', emoji: '📊' };
  
  const profit = summary.totalRealizedProfit || 0;
  const winRate = summary.winRate || 0;
  const volume = summary.totalTradingVolume || 0;
  
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
  
  let winRateBonus = 0;
  if (winRate >= 70) winRateBonus = 5;
  else if (winRate >= 60) winRateBonus = 3;
  else if (winRate >= 50) winRateBonus = 1;
  else if (winRate < 30) winRateBonus = -3;
  
  let volumeBonus = 0;
  if (volume >= 100000) volumeBonus = 2;
  else if (volume >= 50000) volumeBonus = 1;
  
  const rawPercentile = Math.min(99, Math.max(1, profitPercentile + winRateBonus + volumeBonus));
  const percentile = rawPercentile >= 99 ? 99 : Math.round(rawPercentile);
  
  return { percentile, ...getRankTitle(percentile, profit, winRate) };
};

const getRankTitle = (percentile, profit, winRate) => {
  if (percentile >= 99) return { title: 'Top 1%', emoji: '👑', vibe: 'Elite performer', insight: 'You belong in a hedge fund', callout: 'One of the best on Base' };
  if (percentile >= 95) return { title: 'Elite', emoji: '💎', vibe: 'Outperforming 95% of traders', insight: 'Your entries are surgical', callout: 'Top 5% of all traders' };
  if (percentile >= 90) return { title: 'Expert', emoji: '🏆', vibe: 'Consistently profitable', insight: 'You understand the game', callout: 'Beating 90% of traders' };
  if (percentile >= 80) return { title: 'Skilled', emoji: '📈', vibe: 'Well above average', insight: 'More wins than losses', callout: 'Top 20% on Base' };
  if (percentile >= 70) return { title: 'Profitable', emoji: '✓', vibe: 'Solid track record', insight: 'You know when to exit', callout: 'Better than most' };
  if (percentile >= 60) return { title: 'Above Average', emoji: '↗', vibe: 'Beating the majority', insight: 'Still in the green', callout: 'Top 40%' };
  if (percentile >= 50) return { title: 'Holding Steady', emoji: '―', vibe: 'Middle of the pack', insight: 'Breaking even is an achievement', callout: 'Surviving the chaos' };
  if (percentile >= 40) return { title: 'Below Average', emoji: '↘', vibe: 'Room to improve', insight: 'Learning expensive lessons', callout: 'Most traders are here' };
  if (percentile >= 30) return { title: 'Down Bad', emoji: '📉', vibe: 'Tough stretch', insight: 'Maybe try holding longer?', callout: 'It gets better' };
  if (percentile >= 20) return { title: 'Struggling', emoji: '😅', vibe: 'Finding your footing', insight: 'Buy high, sell low specialist', callout: 'At least you are trying' };
  if (percentile >= 10) return { title: 'Rekt', emoji: '💸', vibe: 'It happens', insight: 'Everyone has a rough patch', callout: 'Rock bottom builds character' };
  return { title: 'Wrecked', emoji: '🪦', vibe: 'Nowhere to go but up', insight: 'At least you are self-aware', callout: 'Legend in the making' };
};

// --- TRIDENT LLC VERDICT ENGINE ---
// Generates stylized, roleplay-heavy audit narratives
const generateAuditVerdict = (summary, biggestWin, biggestLoss) => {
  if (!summary) return "CLASSIFIED: Insufficient data to clear security clearance.";

  const profit = summary.totalRealizedProfit || 0;
  const winRate = summary.winRate || 0;
  const fumbled = summary.totalFumbled || 0;
  const volume = summary.totalTradingVolume || 0;
  
  const winSymbol = biggestWin ? `$${biggestWin.symbol}` : "unknown assets";
  const lossSymbol = biggestLoss ? `$${biggestLoss.symbol}` : "unknown assets";

  // 1. THE WHALE (High Profit)
  if (profit > 25000) {
    return `Subject demonstrates institutional-grade capital deployment. The extraction of value from ${winSymbol} suggests asymmetric information or exceptional execution. You aren't just participating in the market; you are the market. Trident LLC recommends immediate classification as 'Tier 1 Operator'.`;
  }

  // 2. THE SNIPER (High Win Rate + Profit)
  if (profit > 0 && winRate > 60) {
    return `Surgical precision detected. Subject displays exceptional discipline, ignoring noise to strike ${winSymbol} with lethal accuracy. This is not gambling; this is a system executing at peak efficiency. Trident LLC approves this wallet for unrestricted operational status.`;
  }

  // 3. THE HOMERUN HITTER (Low Win Rate + High Profit)
  if (profit > 0 && winRate < 40) {
    return `The 'Venture Capitalist' profile. Subject endures frequent tactical losses to secure strategic 100x victories like ${winSymbol}. Your win rate is abysmal, yet your P&L is enviable. You are the chaos engine that Trident LLC warns interns about. Proceed with caution.`;
  }

  // 4. THE PAPER HANDS (Profitable but High Fumble)
  if (profit > 0 && fumbled > profit * 3) {
    return `Subject suffers from acute 'Take Profit Early' syndrome. While profitable, the decision to exit ${winSymbol} prematurely cost an estimated $${(fumbled/1000).toFixed(1)}k in unrealized gains. You are effectively selling a Ferrari to buy a Civic. Psychological conditioning recommended.`;
  }

  // 5. THE SURVIVOR (Small Profit)
  if (profit >= 0 && profit <= 1000) {
    return `Vital signs are stable. In a theatre where 90% of combatants face liquidation, breaking even is a statistical anomaly. You are surviving the PVP arena, likely by avoiding exposure to assets like ${lossSymbol}. Maintain holding pattern.`;
  }

  // 6. THE COUNTER-INDICATOR (Loss + Low Win Rate)
  if (profit < 0 && winRate < 35) {
    return `Subject exhibits 'Inverse Midas Touch'. Capital allocation into ${lossSymbol} coincided perfectly with local tops. Trident LLC analysts suggest doing the exact opposite of your instincts. If you feel bullish, short it. If you feel fear, buy.`;
  }

  // 7. THE BLEEDER (Loss + High Win Rate)
  if (profit < 0 && winRate > 55) {
    return `Catastrophic risk management detected. Subject wins the majority of skirmishes but allows a single nuclear event on ${lossSymbol} to wipe out the war chest. Stop-losses are not suggestions, soldier; they are requirements. Immediate remedial training ordered.`;
  }

  // 8. THE GAMBLER (High Volume + Big Loss)
  if (profit < -5000 && volume > 50000) {
    return `High-velocity capital destruction. Subject treats the blockchain like a slot machine, and the house is winning. Heavy volume on ${lossSymbol} with negative expectancy is simply expensive entertainment. Trident LLC has flagged this wallet for 'Degen Rehabilitation'.`;
  }

  // Fallback
  return "Performance within standard deviation for retail personnel. Volatility exposure is confirmed. Continue operations under observation.";
};

// Styles
const colors = {
  bg: '#fafafa', ink: '#0b0b0b', muted: '#6b7280', accent: '#111827', border: '#e5e7eb',
  pill: '#111827', pillText: '#f9fafb', metricLabel: '#9ca3af', metricValue: '#111827',
  success: '#22c55e', error: '#b91c1c', panelBg: '#ffffff',
  gold: '#b45309', goldBg: '#fffbeb', goldBorder: '#fde68a',
  mint: '#059669', mintBg: '#ecfdf5', mintBorder: '#6ee7b7'
};

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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', padding: `${ds.space.xs} ${ds.space.sm}`, borderRadius: ds.radius.md, border: `1px solid ${isClaimed ? colors.mintBorder : isLocked ? '#e5e7eb' : colors.border}`, background: isClaimed ? colors.mintBg : isLocked ? '#f9fafb' : '#fff', fontSize: ds.text.sm, fontWeight: '600', color: isClaimed ? colors.mint : isLocked ? colors.muted : colors.ink, opacity: isLocked ? 0.7 : 1, minWidth: '140px', flex: '1 1 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: ds.text.md }}>{icon}</span> <span>{label}</span>
        </div>
        {isClaimed && <span style={{ fontSize: ds.text.xs, color: colors.mint }}>✓ Minted</span>}
        {isLocked && <span style={{ fontSize: ds.text.xs }}>🔒</span>}
      </div>
      <div style={{ fontSize: ds.text.xs, color: colors.muted, fontWeight: '400' }}>{isLocked ? (<span>Need: {requirement}</span>) : (<span>You: {current}</span>)}</div>
      {canClaim && !isLocked && !isClaimed && (
        <button onClick={() => onClaim(badgeType)} disabled={isClaiming} style={{ marginTop: '4px', padding: `6px ${ds.space.xs}`, borderRadius: ds.radius.sm, border: 'none', background: colors.mint, color: '#fff', fontSize: ds.text.xs, fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isClaiming ? 'Minting...' : `Mint NFT +${scoreBonus}`}</button>
      )}
      {isClaimed && (<div style={{ marginTop: '4px', padding: `6px ${ds.space.xs}`, borderRadius: ds.radius.sm, background: 'rgba(34, 197, 94, 0.1)', color: colors.mint, fontSize: ds.text.xs, fontWeight: '600', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Collected</div>)}
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
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid ${colors.border}`, fontSize: '10px', color: colors.metricLabel, textAlign: 'center' }}>Data from the API. Excludes unrealized gains, bridged tokens, and LP positions.</div>
      </div>
    </Panel>
  );
};

const RankCard = ({ summary, onShare }) => {
  const rank = calculatePercentile(summary);
  const profit = summary?.totalRealizedProfit || 0;
  const topPercent = 100 - rank.percentile;
  const score = rank.percentile; 
  
  const getBgGradient = () => {
    if (rank.percentile >= 95) return 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'; 
    if (rank.percentile >= 80) return 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)'; 
    if (rank.percentile >= 60) return 'linear-gradient(135deg, #14532d 0%, #166534 100%)'; 
    if (rank.percentile >= 40) return 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'; 
    return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'; 
  };
  
  const getBadgeStyle = () => {
    if (rank.percentile >= 95) return { background: 'linear-gradient(135deg, #FDE68A 0%, #D97706 100%)', color: '#451a03', shadow: '0 4px 15px rgba(217, 119, 6, 0.4)' };
    if (rank.percentile >= 60) return { background: 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', color: '#052e16', shadow: '0 4px 15px rgba(22, 163, 74, 0.4)' };
    if (rank.percentile >= 40) return { background: 'linear-gradient(135deg, #94a3b8 0%, #475569 100%)', color: '#f8fafc', shadow: '0 4px 15px rgba(71, 85, 105, 0.3)' };
    return { background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', color: '#450a0a', shadow: '0 4px 15px rgba(220, 38, 38, 0.4)' };
  };

  const badgeStyle = getBadgeStyle();
  
  return (
    <div style={{ background: getBgGradient(), borderRadius: '16px', padding: '20px', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: '500' }}>Trading Score</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', textShadow: '0 0 20px rgba(255,255,255,0.3)', lineHeight: '1' }}>{score}<span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>/100</span></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)', fontWeight: '500', marginBottom: '4px' }}>Your Ranking</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{rank.callout || 'Base Chain'}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', background: badgeStyle.background, boxShadow: badgeStyle.shadow, color: badgeStyle.color, fontWeight: '800', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <span>{rank.emoji}</span><span>{rank.title}</span>
            </div>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#fff', lineHeight: '1', letterSpacing: '-0.03em' }}>Top {topPercent}%</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '8px' }}>{rank.vibe}</div>
        </div>
        {rank.insight && (<div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.2)' }}>"{rank.insight}"</div>)}
        <div style={{ display: 'flex', gap: '20px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Realized P&L</div><div style={{ fontSize: '14px', fontWeight: '600', color: profit >= 0 ? '#4ade80' : '#f87171' }}>{profit >= 0 ? '+' : ''}{formatCurrency(profit)}</div></div>
          <div><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Win Rate</div><div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{(summary?.winRate || 0).toFixed(1)}%</div></div>
          <div><div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Tokens</div><div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{summary?.totalTokensTraded || 0}</div></div>
        </div>
        <button onClick={onShare} style={{ marginTop: '16px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', backdropFilter: 'blur(10px)' }}>Share My Rank</button>
      </div>
    </div>
  );
};

const TokenRow = ({ token }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${ds.space.sm} 0`, borderBottom: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: ds.space.sm }}>
      <div style={{ width: '36px', height: '36px', borderRadius: ds.radius.full, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: ds.text.md, fontWeight: '600', color: colors.accent, border: `1px solid ${colors.border}` }}>{token.symbol?.charAt(0)}</div>
      <div><div style={{ fontSize: ds.text.md, fontWeight: '500', color: colors.ink }}>{token.symbol}</div><div style={{ fontSize: ds.text.sm, color: colors.muted }}>Bought: {formatCurrency(token.totalUsdInvested)}</div></div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: ds.text.md, fontWeight: '500', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error }}>{token.realizedProfitUsd >= 0 ? '+' : '-'}{formatCurrency(token.realizedProfitUsd)}</div>
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
        <button onClick={onShare} style={{ marginTop: '4px', padding: ds.space.xs, borderRadius: ds.radius.sm, border: `1px solid ${border}`, background: isWin ? 'rgba(22, 101, 52, 0.1)' : 'rgba(153, 27, 27, 0.1)', color: text, fontSize: ds.text.xs, fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isWin ? 'Share Win' : 'Share L'}</button>
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
        <div><div style={{ fontSize: ds.text.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold }}>Biggest Fumble</div><div style={{ fontSize: ds.text.sm, fontWeight: '600', color: colors.gold, marginTop: '2px' }}>{token.name || token.symbol}</div></div>
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
        <button onClick={onShare} style={{ marginTop: '4px', padding: ds.space.xs, borderRadius: ds.radius.sm, border: `1px solid ${colors.goldBorder}`, background: 'rgba(180, 83, 9, 0.1)', color: colors.gold, fontSize: ds.text.xs, fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share Fumble</button>
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
    { icon: '🎯', label: 'Sniper', type: BADGE_TYPES.SNIPER, scoreBonus: 10, qualified: winRate >= 60, requirement: 'Win Rate ≥ 60%', current: `${winRate.toFixed(1)}%` },
    { icon: '💧', label: 'Exit Liquidity', type: BADGE_TYPES.EXIT_LIQUIDITY, scoreBonus: 10, qualified: winRate < 40 && tokens > 5, requirement: 'Win Rate < 40% & 5+ tokens', current: `${winRate.toFixed(1)}%, ${tokens} tokens` },
    { icon: '🐋', label: 'Volume Whale', type: BADGE_TYPES.VOLUME_WHALE, scoreBonus: 20, qualified: volume > 50000, requirement: 'Volume > $50k', current: `$${(volume/1000).toFixed(1)}k` },
    { icon: '🧻', label: 'Paper Hands', type: BADGE_TYPES.TOILET_PAPER_HANDS, scoreBonus: 10, qualified: fumbled > 10000, requirement: 'Fumbled > $10k', current: `$${(fumbled/1000).toFixed(1)}k` },
    { icon: '💎', label: 'Diamond', type: BADGE_TYPES.DIAMOND, scoreBonus: 20, qualified: profit > 10000, requirement: 'Profit > $10k', current: `$${(profit/1000).toFixed(1)}k` },
    { icon: '💰', label: 'Profitable', type: BADGE_TYPES.TRADER, scoreBonus: 5, qualified: profit > 0, requirement: 'Any profit > $0', current: profit > 0 ? `+$${profit.toFixed(0)}` : `-$${Math.abs(profit).toFixed(0)}` }
  ];
};

const getBadges = (summary) => getAllBadges(summary).filter(b => b.qualified);

const ClaimBadgePanel = ({ summary, onClaimBadge, claimingBadge, claimedBadges, mintTxHash, mintError, canClaim, currentWallet }) => {
  const allBadges = getAllBadges(summary);
  return (
    <Panel title="Your Badges" subtitle={`${claimedBadges.length} of ${allBadges.length} unlocked`} style={{ marginTop: '20px' }}>
      {currentWallet && <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '12px' }}>Badges for {currentWallet.slice(0, 6)}...{currentWallet.slice(-4)}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: mintTxHash || mintError ? '12px' : '0' }}>
        {allBadges.map((b, i) => (
          <Badge key={i} icon={b.icon} label={b.label} badgeType={b.type} onClaim={onClaimBadge} isClaiming={claimingBadge === b.type} isClaimed={claimedBadges.includes(b.type)} canClaim={canClaim} qualified={b.qualified} requirement={b.requirement} current={b.current} scoreBonus={b.scoreBonus} />
        ))}
      </div>
      {mintTxHash && <div style={{ padding: '10px 12px', borderRadius: '8px', background: colors.mintBg, border: `1px solid ${colors.mintBorder}`, fontSize: '11px', color: colors.mint }}>✓ Badge minted! <a href={`https://basescan.org/tx/${mintTxHash}`} target="_blank" rel="noopener noreferrer" style={{ color: colors.mint, textDecoration: 'underline' }}>View tx</a></div>}
      {mintError && <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '11px', color: colors.error }}>{mintError}</div>}
      <div style={{ marginTop: '12px', padding: '8px 10px', borderRadius: '6px', background: '#f8fafc', border: `1px solid ${colors.border}`, fontSize: '10px', color: colors.muted, textAlign: 'center' }}>Free to mint (gas only ~$0.001) • One-time mint per badge • Collect all to boost score</div>
    </Panel>
  );
};

// --- TRIDENT LLC AUDIT COMPONENT (The LARP Focal Point) ---
const TradingAudit = ({ pnlData, user, percentileData, auditNarrative, onShare }) => {
  const summary = pnlData?.summary || {};
  const tokens = pnlData?.tokens || [];
  const score = percentileData?.percentile || 50;
  const archetype = percentileData?.title || 'Trader';
  const userName = user?.displayName || 'Unknown Subject';
  const walletAddress = user?.wallet ? `${user.wallet.slice(0,6)}...${user.wallet.slice(-4)}` : 'UNKNOWN';

  const fmtCur = (val) => {
    if (!val) return '$0.00';
    const abs = Math.abs(val);
    if (abs >= 1000000) return `$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `$${(abs / 1000).toFixed(2)}K`;
    return `$${abs.toFixed(2)}`;
  };

  const isProfit = (summary.totalRealizedProfit || 0) >= 0;
  const winRate = summary.winRate || 0;
  const auditNumber = `TRD-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
  
  // Stamp Color logic
  const stampColor = score >= 80 ? '#15803d' : score >= 50 ? '#b45309' : '#b91c1c';
  const stampBorder = score >= 80 ? '#86efac' : score >= 50 ? '#fcd34d' : '#fca5a5';
  const stampRotate = score % 2 === 0 ? 'rotate(-10deg)' : 'rotate(8deg)';

  return (
    <div style={{ 
      background: '#f5f5f4', 
      backgroundImage: 'radial-gradient(#e5e4dc 1px, transparent 1px)',
      backgroundSize: '20px 20px',
      borderRadius: '2px', 
      overflow: 'hidden', 
      fontFamily: "'Courier Prime', 'Courier New', monospace", 
      color: '#1c1917', 
      border: '1px solid #a8a29e', 
      boxShadow: '0 10px 30px -5px rgba(0,0,0,0.2)',
      position: 'relative',
      marginBottom: '24px'
    }}>
      
      {/* Watermark */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '60px', fontWeight: '900', color: 'rgba(0,0,0,0.03)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>CONFIDENTIAL</div>

      {/* Header */}
      <div style={{ padding: '24px 24px 16px', borderBottom: '2px solid #292524', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fff' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', background: '#292524', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', borderRadius: '2px' }}>T</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#292524', letterSpacing: '-0.05em' }}>TRIDENT LLC</div>
          </div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px', color: '#57534e' }}>Department of On-Chain Corrections</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#78716c' }}>REF: {auditNumber}</div>
          <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: '700', marginTop: '2px' }}>EYES ONLY</div>
        </div>
      </div>

      {/* Subject Section */}
      <div style={{ padding: '20px 24px', borderBottom: '1px dashed #a8a29e' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#78716c', marginBottom: '2px' }}>SUBJECT</div>
            <div style={{ fontSize: '16px', fontWeight: '700' }}>{userName}</div>
            <div style={{ fontSize: '10px', fontFamily: 'monospace' }}>{walletAddress}</div>
          </div>
          {/* THE STAMP */}
          <div style={{ 
            border: `3px solid ${stampColor}`, 
            padding: '4px 12px', 
            borderRadius: '4px', 
            transform: stampRotate,
            color: stampColor,
            textAlign: 'center',
            opacity: 0.9,
            maskImage: 'url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/8399/grunge.png)',
            WebkitMaskImage: 'url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/8399/grunge.png)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Trading Score</div>
            <div style={{ fontSize: '28px', fontWeight: '900', lineHeight: '1' }}>{score}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.5)' }}>
        <div style={{ fontSize: '10px', color: '#78716c', marginBottom: '8px', letterSpacing: '0.1em' }}>PERFORMANCE METRICS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ border: '1px solid #d6d3d1', padding: '8px', background: '#fff' }}>
            <div style={{ fontSize: '9px', color: '#78716c' }}>NET P&L</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: isProfit ? '#16a34a' : '#dc2626' }}>{isProfit ? '+' : ''}{fmtCur(summary.totalRealizedProfit)}</div>
          </div>
          <div style={{ border: '1px solid #d6d3d1', padding: '8px', background: '#fff' }}>
            <div style={{ fontSize: '9px', color: '#78716c' }}>WIN RATE</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>{winRate.toFixed(1)}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', borderTop: '1px solid #e5e5e5', paddingTop: '8px' }}>
          <div>Volume: <strong>{fmtCur(summary.totalTradingVolume)}</strong></div>
          <div>Trades: <strong>{summary.totalTokensTraded}</strong></div>
          <div>Class: <strong>{archetype.toUpperCase()}</strong></div>
        </div>
      </div>

      {/* Narrative Section */}
      <div style={{ padding: '20px 24px', borderTop: '2px solid #292524', background: '#fff' }}>
        <div style={{ fontSize: '10px', color: '#78716c', marginBottom: '8px', letterSpacing: '0.1em' }}>ANALYST NOTES</div>
        <div style={{ fontSize: '12px', lineHeight: '1.6', fontFamily: "'Courier Prime', monospace" }}>
          "{auditNarrative || "Generating assessment..."}"
        </div>
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
           <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png" style={{ height: '24px', opacity: 0.4, transform: 'rotate(-5deg)' }} alt="signature" />
           <div style={{ fontSize: '9px', color: '#78716c' }}>CHIEF AUDITOR</div>
        </div>
      </div>

      {/* Share Button */}
      {onShare && (
        <div style={{ background: '#292524', padding: '12px 24px' }}>
          <button 
            onClick={onShare}
            style={{ 
              width: '100%', 
              background: '#f5f5f4', 
              color: '#1c1917', 
              border: 'none', 
              padding: '10px', 
              fontFamily: "'Courier Prime', monospace",
              fontWeight: '700',
              textTransform: 'uppercase',
              cursor: 'pointer',
              letterSpacing: '0.05em'
            }}
          >
            Leak to Public
          </button>
        </div>
      )}
    </div>
  );
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
  
  const [claimingBadge, setClaimingBadge] = useState(null);
  const [claimedBadges, setClaimedBadges] = useState([]);
  const [tokenListView, setTokenListView] = useState('wins'); 
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintError, setMintError] = useState(null);
  
  const [showInfo, setShowInfo] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [auditMetrics, setAuditMetrics] = useState(null);
  const [auditNarrative, setAuditNarrative] = useState(null);

  const checkMintedBadges = useCallback(async (userAddress) => {
    if (!userAddress || BADGE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return;
    if (DEMO_MODE) return;
    
    const cacheKey = `minted_badges_${userAddress.toLowerCase()}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const { badges, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 1000) {
          setClaimedBadges(badges);
          return;
        }
      }
    } catch (e) {}
    
    try {
      const { createPublicClient, http } = await import('viem');
      const { base } = await import('viem/chains');
      const client = createPublicClient({ chain: base, transport: http() });
      const minted = [];
      for (let badgeType = 0; badgeType <= 5; badgeType++) {
        try {
          const hasMinted = await client.readContract({
            address: BADGE_CONTRACT_ADDRESS,
            abi: BADGE_ABI,
            functionName: 'hasMintedBadge',
            args: [userAddress, badgeType]
          });
          if (hasMinted) minted.push(badgeType);
        } catch (e) {}
      }
      try { window.localStorage.setItem(cacheKey, JSON.stringify({ badges: minted, timestamp: Date.now() })); } catch (e) {}
      setClaimedBadges(minted); 
    } catch (err) { console.error('Error checking badges:', err); }
  }, []);

  const encodeMintBadgeCall = async (badgeType, summary) => {
    const { encodeFunctionData } = await import('viem');
    const badgeTypeNum = Number(badgeType);
    const winRate = BigInt(Math.floor((summary.winRate || 0) * 100));
    const volume = BigInt(Math.floor(summary.totalTradingVolume || 0));
    const profit = BigInt(Math.floor(Math.abs(summary.totalRealizedProfit || 0)));
    return encodeFunctionData({ abi: BADGE_ABI, functionName: 'mintBadge', args: [badgeTypeNum, winRate, volume, profit] });
  };

  const handleClaimBadgeViaSDK = useCallback(async (badgeType) => {
    setClaimingBadge(badgeType); setMintError(null); setMintTxHash(null);
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary || {};
      const provider = sdk.wallet.ethProvider;
      if (!provider) throw new Error('Wallet provider not available');
      let fromAddress = primaryWallet;
      try {
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) fromAddress = accounts[0];
      } catch (e) {}
      const callData = await encodeMintBadgeCall(badgeType, summary);
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: BADGE_CONTRACT_ADDRESS, data: callData, value: '0x0', chainId: '0x2105' }]
      });
      setMintTxHash(txHash);
      setClaimedBadges(prev => [...prev, badgeType]);
    } catch (err) {
      setMintError(String(err).includes('rejected') ? 'Transaction cancelled' : 'Failed to claim badge');
    } finally { setClaimingBadge(null); }
  }, [primaryWallet, pnlData]);

  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary) return;

      const username = user?.username || 'user';
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const rank = calculatePercentile(summary);
      const score = rank.percentile;
      const realized = formatCurrency(summary.totalRealizedProfit || 0);
      const topPercent = 100 - rank.percentile;
      const pnlSign = summary.totalRealizedProfit >= 0 ? '+' : '-';
      
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const topText = `$PNL  ·  @${username}`;
      const bottomText = `Trading Score: ${score}/100  ·  ${pnlSign}${realized}`;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
      
      const castText = `Using $PNL: My Trading Score is ${score}/100 📊\n\nTop ${topPercent}% on Base\n${realized >= 0 ? 'Profit' : 'Loss'}: ${pnlSign}${realized}\n\nGet your score:`;
      
      await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { console.error('share pnl failed', err); }
  };

  const handleRequestAudit = async () => {
    try {
      setAuditLoading(true); setAuditError(null);
      const narrative = generateAuditVerdict(pnlData?.summary, pnlData?.biggestWin, pnlData?.biggestLoss);
      setAuditNarrative(narrative);
      setAuditMetrics({}); 
    } catch (err) { setAuditError(String(err?.message || err)); } 
    finally { setAuditLoading(false); }
  };

  const handleShareAudit = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary || {};
      const percentile = calculatePercentile(summary);
      const score = percentile?.percentile || 50;
      const archetype = percentile?.title || 'Trader';
      const profit = summary.totalRealizedProfit || 0;
      const username = user?.username || 'user';
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      
      // GENERATE A LARP-HEAVY DOCUMENT IMAGE
      const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
      const line1 = `TRIDENT LLC // AUDIT FILE`;
      const line2 = `SUBJECT: @${username.toUpperCase()}`;
      const line3 = `RATING: ${score}/100 // ${archetype.toUpperCase()}`;
      
      // Using monospaced aesthetic for the OG image text
      const textPath = encodeURIComponent(`**${line1}**\n${line2}\n${line3}`);
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=40px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;

      const castText = `CASE FILE: ${username}\nCLASSIFICATION: ${archetype.toUpperCase()}\n\nMy official trading audit from Trident LLC is in. The results are... concerning.\n\nRead full report ⬇️`;
      
      await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { console.error('Share audit failed', err); }
  };

  const handleShareFumble = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const fumble = pnlData?.biggestFumble;
        if (!fumble) return;
        const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
        const missed = fumble.missedUpsideUsd || 0;
        const tokenName = fumble.name || fumble.symbol || 'a token';
        const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
        const topText = `$PNL  ·  Biggest Fumble`;
        const bottomText = `${formatCurrency(missed)} left on the table`;
        const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
        const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
        const castText = `I paper-handed ${tokenName} and missed ${formatCurrency(missed)} 💀\n\nFind your fumbles:`;
        await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
      } catch (err) { }
  };

  const handleShareBestTrade = async () => {
    try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const token = pnlData?.biggestWin;
        if (!token) return;
        const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
        const pnl = token.realizedProfitUsd || 0;
        const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
        const topText = `$PNL  ·  Best Trade`;
        const bottomText = `+${formatCurrency(pnl)} on ${token.symbol || 'Token'}`;
        const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
        const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
        const castText = `My biggest W on Base: +${formatCurrency(pnl)} on ${token.symbol} 🏆\n\nFind your best trade:`;
        await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { }
  };

  const handleShareWorstTrade = async () => {
    try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const token = pnlData?.biggestLoss;
        if (!token) return;
        const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
        const pnl = Math.abs(token.realizedProfitUsd || 0);
        const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
        const topText = `$PNL  ·  Worst Trade`;
        const bottomText = `-${formatCurrency(pnl)} on ${token.symbol || 'Token'}`;
        const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
        const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
        const castText = `My biggest L on Base: -${formatCurrency(pnl)} on ${token.symbol} 🪦\n\nFind your worst trade:`;
        await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { }
  };

  const handleShareAirdrops = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const summary = pnlData?.summary;
        if (!summary) return;
        const profit = summary.airdropProfit || 0;
        const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
        const invisibleLogo = 'https://res.cloudinary.com/demo/image/upload/v1/transparent.png';
        const topText = `$PNL  ·  Airdrops`;
        const bottomText = `+${formatCurrency(profit)} Free Money`;
        const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
        const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=60px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;
        const castText = `Found +${formatCurrency(profit)} in airdrops on my wallet 🪂\n\nCheck your airdrops:`;
        await sdk.actions.composeCast({ text: castText, embeds: [imageUrl, appLink] });
    } catch (err) { }
  };

  const handleSwapForAccess = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const pnlCaip19 = getPnlCaip19();
      if (!pnlCaip19) { await sdk.actions.openUrl('https://app.uniswap.org'); return; }
      await sdk.actions.swapToken({ sellToken: BASE_ETH_CAIP19, buyToken: pnlCaip19 });
    } catch (err) { console.error('swap for $PNL failed', err); }
  };

  const checkTokenGate = async (address) => {
    if (!PNL_TOKEN_ADDRESS) { setTokenBalance(0); setCheckingGate(false); setIsGated(false); return true; }
    if (address && WHITELISTED_WALLETS.includes(address.toLowerCase())) { setTokenBalance(REQUIRED_PNL_BALANCE); setCheckingGate(false); setIsGated(false); return true; }
    if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 500)); setTokenBalance(REQUIRED_PNL_BALANCE + 100); setCheckingGate(false); setIsGated(false); return true; }
    try {
      const response = await fetch(`https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`, { headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } });
      const data = await response.json();
      const pnlToken = data?.[0];
      const balance = pnlToken ? parseInt(pnlToken.balance) / 10 ** (pnlToken.decimals || 18) : 0;
      setTokenBalance(balance);
      setIsGated(balance < REQUIRED_PNL_BALANCE);
      setCheckingGate(false);
      return balance >= REQUIRED_PNL_BALANCE;
    } catch (err) { setCheckingGate(false); setIsGated(true); return false; }
  };

  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);
      if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 600)); setPnlData(MOCK_PNL_DATA); setLoading(false); return; }
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

      const fetchPromises = addresses.map((address) => fetch(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=base&exclude_spam=false`, { headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } }).then((res) => res.json()));
      const results = await Promise.all(fetchPromises);
      const allTokenData = [];
      const tokenAddressesForFumble = new Set();

      results.forEach((data) => {
        if (data.result) {
          data.result.forEach((token) => {
            const invested = parseFloat(token.total_usd_invested) || 0;
            const realized = parseFloat(token.realized_profit_usd) || 0;
            const soldUsd = parseFloat(token.total_sold_usd) || 0;
            const isAirdrop = invested < 1 && (realized > 0 || soldUsd > 0);
            allTokenData.push({ name: token.name, symbol: token.symbol, tokenAddress: token.token_address?.toLowerCase(), totalUsdInvested: invested, realizedProfitUsd: realized, isProfitable: realized > 0, totalTokensSold: parseFloat(token.total_tokens_sold) || 0, totalSoldUsd: soldUsd, isAirdrop: isAirdrop });
            if (token.token_address && parseFloat(token.total_tokens_sold) > 0) tokenAddressesForFumble.add(token.token_address);
          });
        }
      });

      const profitableTokens = allTokenData.filter((t) => t.isProfitable).length;
      const airdrops = allTokenData.filter((t) => t.isAirdrop);
      const summary = {
        totalRealizedProfit: allTokenData.reduce((acc, t) => acc + t.realizedProfitUsd, 0),
        totalTradingVolume: allTokenData.reduce((acc, t) => acc + t.totalUsdInvested, 0),
        profitPercentage: 0, 
        totalTokensTraded: allTokenData.length,
        winRate: allTokenData.length > 0 ? (profitableTokens / allTokenData.length) * 100 : 0,
        totalFumbled: 0,
        airdropCount: airdrops.length,
        airdropProfit: airdrops.reduce((acc, t) => acc + t.realizedProfitUsd, 0)
      };
      summary.profitPercentage = summary.totalTradingVolume > 0 ? (summary.totalRealizedProfit / summary.totalTradingVolume) * 100 : 0;
      
      let biggestWin = null, biggestLoss = null;
      allTokenData.forEach(token => {
        if(token.realizedProfitUsd > 0) { if(!biggestWin || token.realizedProfitUsd > biggestWin.realizedProfitUsd) biggestWin = token; }
        if(token.realizedProfitUsd < 0) { if(!biggestLoss || token.realizedProfitUsd < biggestLoss.realizedProfitUsd) biggestLoss = token; }
      });

      let biggestFumbleToken = null;
      if (tokenAddressesForFumble.size > 0) {
        try {
          const priceResponse = await fetch('https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=base', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' }, body: JSON.stringify({ tokens: Array.from(tokenAddressesForFumble).map((addr) => ({ token_address: addr })) }) });
          const priceData = await priceResponse.json();
          const priceArray = Array.isArray(priceData) ? priceData : priceData.result || priceData.tokens || [];
          const priceMap = new Map();
          priceArray.forEach((p) => { const addr = (p.tokenAddress || p.token_address || '').toLowerCase(); if(addr && parseFloat(p.usdPrice ?? p.usd_price ?? 0) > 0) priceMap.set(addr, parseFloat(p.usdPrice ?? p.usd_price)); });
          allTokenData.forEach((t) => {
            if (!t.tokenAddress || !t.totalTokensSold) return;
            const priceUsd = priceMap.get(t.tokenAddress);
            if (!priceUsd) return;
            const currentValueSoldTokens = t.totalTokensSold * priceUsd;
            const missedUpsideUsd = currentValueSoldTokens - t.totalSoldUsd;
            if (missedUpsideUsd > 0) {
                summary.totalFumbled += missedUpsideUsd;
                if (!biggestFumbleToken || missedUpsideUsd > biggestFumbleToken.missedUpsideUsd) biggestFumbleToken = { ...t, missedUpsideUsd, currentValueSoldTokens };
            }
          });
        } catch (e) {}
      }
      const resultData = { summary, tokens: allTokenData, biggestWin, biggestLoss, biggestFumble: biggestFumbleToken };
      setPnlData(resultData);
      if (cacheKey && typeof window !== 'undefined') window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: resultData }));
      setLoading(false);
    } catch (err) { setLoading(false); }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 800)); setUser(MOCK_USER); setWallets(MOCK_WALLETS); await checkTokenGate(MOCK_WALLETS[0]); setPnlData(MOCK_PNL_DATA); setLoading(false); return; }
        let fid = null;
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          if (context?.user?.fid) { fid = context.user.fid; setUser(context.user); } 
          else { setEnvError('PNL Tracker needs a Farcaster user context.'); setLoading(false); return; }
          sdk.actions.ready();
        } catch (err) { setEnvError('PNL Tracker runs as a Farcaster miniapp.'); setLoading(false); return; }
        if (fid) {
          const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, { headers: { accept: 'application/json', api_key: import.meta.env.VITE_NEYNAR_API_KEY || '' } });
          const neynarData = await neynarResponse.json();
          const primaryEth = neynarData?.users?.[0]?.verified_addresses?.primary?.eth_address || null;
          const allEth = neynarData?.users?.[0]?.verified_addresses?.eth_addresses || [];
          if (allEth.length === 0) { setEnvError('No verified Base wallets found.'); setLoading(false); return; }
          setWallets(allEth);
          const resolvedPrimary = primaryEth || allEth[0];
          setPrimaryWallet(resolvedPrimary);
          setActiveScope(resolvedPrimary);
          checkMintedBadges(resolvedPrimary);
          await checkTokenGate(resolvedPrimary);
          await fetchPNLData([resolvedPrimary]);
        }
      } catch (err) { setEnvError('Init failed.'); setLoading(false); }
    };
    initialize();
  }, []);

  const handleWalletScopeChange = async (event) => {
    const scope = event.target.value;
    setActiveScope(scope);
    if (DEMO_MODE) return;
    let addresses = scope === 'all' ? wallets : (scope === 'primary' && primaryWallet ? [primaryWallet] : [scope]);
    setClaimedBadges([]); setMintTxHash(null); setMintError(null);
    if (addresses.length > 0) checkMintedBadges(addresses[0]);
    if (addresses.length > 0) await fetchPNLData(addresses);
  };

  const renderGatedOverlay = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)', pointerEvents: 'auto', overflowY: 'auto', paddingTop: '80px', paddingBottom: '32px' }}>
      <div style={{ background: colors.panelBg, borderRadius: ds.radius.xl, border: `1px solid ${colors.border}`, padding: ds.space.xl, maxWidth: '400px', width: '90%', boxShadow: ds.shadow.lg, textAlign: 'center', pointerEvents: 'auto' }}>
        <div style={{ fontSize: '48px', marginBottom: ds.space.sm, lineHeight: '1' }}>🔒</div>
        <h2 style={{ fontSize: ds.text.xl, fontWeight: '700', color: colors.ink, margin: `0 0 ${ds.space.xs}`, letterSpacing: '-0.01em' }}>Premium Access Required</h2>
        <p style={{ fontSize: ds.text.base, color: colors.muted, margin: `0 0 ${ds.space.lg}`, lineHeight: '1.5' }}>Hold <strong>{formatNumber(REQUIRED_PNL_BALANCE)} $PNL</strong> to unlock your complete trading profile</p>
        <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.sm }}>
          <button onClick={handleSwapForAccess} style={{ flex: 1, padding: ds.space.sm, borderRadius: ds.radius.pill, background: colors.pill, color: colors.pillText, fontSize: ds.text.sm, fontWeight: '600', border: 'none', cursor: 'pointer' }}>Get $PNL</button>
          <button onClick={() => window.location.reload()} style={{ flex: 1, padding: ds.space.sm, borderRadius: ds.radius.pill, background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, fontSize: ds.text.sm, fontWeight: '600', cursor: 'pointer' }}>Refresh</button>
        </div>
      </div>
    </div>
  );

  if (loading || checkingGate) return <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}>Loading...</div></div>;
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
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1.5px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '600' }}>Ψ</div>
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>PNL Tracker</span>
          </div>
          {wallets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <select value={activeScope} onChange={handleWalletScopeChange} style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.panelBg, color: colors.muted, maxWidth: '140px', cursor: 'pointer' }}>
                {wallets.map((addr) => (<option key={addr} value={addr}>{addr === primaryWallet ? `Primary · ${truncateAddress(addr)}` : truncateAddress(addr)}</option>))}
                {wallets.length > 1 && <option value="all">All wallets</option>}
              </select>
            </div>
          )}
        </header>

        {!isGated && pnlData?.summary && (
          <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.md, width: '100%' }}>
            {['stats', 'airdrops', 'badges', 'lore'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, minWidth: 0, padding: `${ds.space.sm} 2px`, borderRadius: ds.radius.md, border: activeTab === tab ? 'none' : `1px solid ${colors.border}`, background: activeTab === tab ? colors.accent : colors.panelBg, color: activeTab === tab ? colors.pillText : colors.muted, fontSize: ds.text.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {tab === 'stats' ? 'Stats' : tab === 'airdrops' ? 'Airdrops' : tab === 'lore' ? 'Audit' : 'Badges'}
              </button>
            ))}
          </div>
        )}

        {!isGated && activeTab !== 'lore' && pnlData?.summary && <RankCard summary={pnlData.summary} onShare={handleSharePnL} />}

        {!isGated && activeTab === 'lore' && pnlData?.summary && (
          <div>
            {!auditMetrics && !auditLoading && (
              <button onClick={handleRequestAudit} style={{ width: '100%', padding: ds.space.md, borderRadius: ds.radius.md, background: 'linear-gradient(135deg, #111827 0%, #374151 100%)', border: 'none', color: '#fff', fontSize: ds.text.md, fontWeight: '600', cursor: 'pointer', marginBottom: ds.space.md }}>🔍 Generate My Audit</button>
            )}
            {auditLoading && <div style={{ textAlign: 'center', padding: ds.space.xl }}>Generating...</div>}
            {auditMetrics && !auditLoading && (
              <TradingAudit pnlData={{ ...pnlData, summary: { ...pnlData.summary, ...auditMetrics } }} user={{ ...user, wallet: primaryWallet || wallets[0] }} percentileData={calculatePercentile(pnlData.summary)} auditNarrative={auditNarrative} onShare={handleShareAudit} />
            )}
          </div>
        )}

        {!isGated && activeTab === 'stats' && pnlData?.summary && (
          <>
            <Panel title="Realized P&L">
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '32px', fontWeight: '600', color: pnlData.summary.totalRealizedProfit >= 0 ? colors.success : colors.error, marginBottom: '8px' }}>{pnlData.summary.totalRealizedProfit >= 0 ? '+' : ''}{formatCurrency(pnlData.summary.totalRealizedProfit)}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '999px', background: pnlData.summary.profitPercentage >= 0 ? '#dcfce7' : '#fef2f2', color: pnlData.summary.profitPercentage >= 0 ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: '500' }}>{pnlData.summary.profitPercentage >= 0 ? '↑' : '↓'}{Math.abs(pnlData.summary.profitPercentage).toFixed(1)}% ROI</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '18px', marginTop: '16px' }}>
                <div style={{ flex: '1 1 auto' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.metricLabel, marginBottom: '6px' }}>Total Invested</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: colors.ink }}>{formatCurrency(pnlData.summary.totalTradingVolume)}</div>
                </div>
                <Metric label="Win Rate" value={`${pnlData.summary.winRate.toFixed(1)}%`} isPositive={pnlData.summary.winRate >= 50} />
                <Metric label="Tokens" value={pnlData.summary.totalTokensTraded} />
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
            <div style={{ display: 'flex', gap: ds.space.xs, marginBottom: ds.space.sm }}>
              <button onClick={() => setTokenListView('wins')} style={{ padding: `${ds.space.xs} ${ds.space.sm}`, borderRadius: ds.radius.pill, border: `1px solid ${tokenListView === 'wins' ? colors.accent : colors.border}`, background: tokenListView === 'wins' ? colors.accent : colors.panelBg, color: tokenListView === 'wins' ? '#fff' : colors.muted, fontSize: ds.text.xs, textTransform: 'uppercase', cursor: 'pointer' }}>Top Wins</button>
              <button onClick={() => setTokenListView('all')} style={{ padding: `${ds.space.xs} ${ds.space.sm}`, borderRadius: ds.radius.pill, border: `1px solid ${tokenListView === 'all' ? colors.accent : colors.border}`, background: tokenListView === 'all' ? colors.accent : colors.panelBg, color: tokenListView === 'all' ? '#fff' : colors.muted, fontSize: ds.text.xs, textTransform: 'uppercase', cursor: 'pointer' }}>All Tokens</button>
            </div>
            {pnlData?.tokens && (
              <Panel title={tokenListView === 'wins' ? "Best Performers" : "All Tokens"}>
                {(tokenListView === 'wins' ? pnlData.tokens.filter(t => t.isProfitable).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).slice(0, 5) : pnlData.tokens.sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd)).map((token, idx) => (
                  <TokenRow key={token.tokenAddress || token.symbol || idx} token={token} />
                ))}
              </Panel>
            )}
          </>
        )}

        {!isGated && activeTab === 'airdrops' && pnlData?.tokens && (
          <Panel title="Airdrops" subtitle="Tokens received for free">
            {pnlData.tokens.filter(t => t.isAirdrop).length > 0 ? (
              pnlData.tokens.filter(t => t.isAirdrop).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).map((token, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
                  <div><div style={{ fontSize: '13px', fontWeight: '600' }}>{token.symbol}</div><div style={{ fontSize: '11px', color: colors.muted }}>{token.name}</div></div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.success }}>+{formatCurrency(token.realizedProfitUsd)}</div>
                </div>
              ))
            ) : (<div style={{ textAlign: 'center', padding: '20px', color: colors.muted }}>No airdrops found</div>)}
            <button onClick={handleShareAirdrops} style={{ marginTop: '12px', width: '100%', padding: '10px', background: colors.accent, color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Share Airdrops</button>
          </Panel>
        )}

        {!isGated && activeTab === 'badges' && pnlData?.summary && (
          <ClaimBadgePanel summary={pnlData.summary} onClaimBadge={handleClaimBadgeViaSDK} claimingBadge={claimingBadge} claimedBadges={claimedBadges} mintTxHash={mintTxHash} mintError={mintError} canClaim={!!primaryWallet} currentWallet={activeScope === 'all' ? (primaryWallet || wallets[0]) : (activeScope === 'primary' ? primaryWallet : activeScope)} />
        )}

        {!isGated && <InfoPanel isVisible={showInfo} onClose={() => setShowInfo(false)} />}
        {!isGated && <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', opacity: 0.6 }}><div onClick={() => setShowInfo(true)} style={{ fontSize: '11px', color: colors.muted, textDecoration: 'underline', cursor: 'pointer' }}>How is this calculated?</div></div>}
      </div>
    </div>
  );
}