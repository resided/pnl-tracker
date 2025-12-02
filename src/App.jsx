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

// --- ADVANCED METRICS ENGINE (RESTORED FROM PREVIOUS VERSION) ---
const calculateAdvancedStats = (summary, tokens) => {
  if (!summary) return null;
  const { totalRealizedProfit, totalFumbled, totalTradingVolume, totalTokensTraded, winRate } = summary;
  
  const profit = totalRealizedProfit || 0;
  const fumbled = totalFumbled || 0;
  const volume = totalTradingVolume || 0;
  const tradeCount = totalTokensTraded || 1;
  const winR = winRate || 0;
  
  // Calculate win/loss counts roughly from rate/total
  const winCount = Math.round((winR / 100) * tradeCount);
  const lossCount = tradeCount - winCount;

  // 1. Degen Index (0-100)
  // Higher volume + more trades + lower win rate = Higher Degen
  let degenScore = Math.min(100, Math.round((tradeCount / 1.5) + (volume > 20000 ? 20 : 0) + (winR < 40 ? 20 : 0)));
  
  // 2. Paper Hands Score (0-100)
  // High fumbled relative to profit = Paper Hands
  const paperHandsScore = fumbled > 0 ? Math.min(100, Math.round((fumbled / (Math.abs(profit) + fumbled + 1)) * 100)) : 0;
  
  // 3. Diamond Hands (0-100) - Inverse of Paper Hands
  let diamondHands = 100 - paperHandsScore;
  
  // 4. Luck Factor (0-100)
  // Low win rate but profitable = High Luck (or homerun hitter)
  let luckFactor = 50;
  if (winR < 40 && profit > 0) luckFactor = Math.min(95, 50 + (50 - winR)); 
  if (winR > 60 && profit < 0) luckFactor = Math.max(5, 50 - (winR - 50)); 

  // 5. Consistency (0-100)
  // Penalize for unbalanced win/loss counts (though this is tricky, simple heuristic here)
  const consistencyScore = winCount > 0 && lossCount > 0 
    ? Math.round(100 - (Math.abs(winCount - lossCount) / Math.max(winCount, lossCount) * 50)) 
    : 50;

  // 6. Risk Level
  let riskLevel = 'HIGH';
  if (winR > 55 && profit > 5000) riskLevel = 'LOW';
  else if (winR > 45 && profit > 0) riskLevel = 'MODERATE';
  else if (fumbled > profit * 2) riskLevel = 'ELEVATED';

  // 7. Average Bet
  const avgBetSize = volume / tradeCount;

  return {
    degenScore,
    paperHandsScore,
    diamondHands,
    luckFactor,
    consistencyScore,
    riskLevel,
    avgBetSize,
    winCount,
    lossCount
  };
};

// --- TRIDENT LLC VERDICT ENGINE ---
// Generates stylized, roleplay-heavy audit narratives
const generateAuditVerdict = (summary, stats, biggestWin, biggestLoss) => {
  if (!summary) return "CLASSIFIED: Insufficient data to clear security clearance.";

  const profit = summary.totalRealizedProfit || 0;
  const winRate = summary.winRate || 0;
  const fumbled = summary.totalFumbled || 0;
  const volume = summary.totalTradingVolume || 0;
  
  const winSymbol = biggestWin ? `$${biggestWin.symbol}` : "unknown assets";
  const lossSymbol = biggestLoss ? `$${biggestLoss.symbol}` : "unknown assets";
  
  const { degenScore, diamondHands, luckFactor } = stats || { degenScore: 50, diamondHands: 50, luckFactor: 50 };

  // 1. THE WHALE (High Profit)
  if (profit > 25000) {
    return `Subject demonstrates institutional-grade capital deployment. Value extraction from ${winSymbol} suggests asymmetric information. With a Degen Score of ${degenScore}/100, you are operating with lethal efficiency. Trident LLC recommends immediate classification as 'Tier 1 Operator'.`;
  }

  // 2. THE SNIPER (High Win Rate + Profit)
  if (profit > 0 && winRate > 60) {
    return `Surgical precision detected. Subject displays exceptional discipline, striking ${winSymbol} with ${winRate.toFixed(0)}% accuracy. Diamond Hands rating of ${diamondHands}/100 confirms you hold winners. This is not gambling; this is a system. Approved for unrestricted ops.`;
  }

  // 3. THE HOMERUN HITTER (Low Win Rate + High Profit)
  if (profit > 0 && winRate < 40) {
    return `The 'Venture Capitalist' profile. Subject endures frequent tactical losses to secure strategic 100x victories like ${winSymbol}. Your ${winRate.toFixed(0)}% win rate is deceptive; Luck Factor of ${luckFactor}/100 suggests this is a deliberate strategy, not a fluke. Proceed with caution.`;
  }

  // 4. THE PAPER HANDS (Profitable but High Fumble)
  if (profit > 0 && fumbled > profit * 2) {
    return `Subject suffers from acute 'Take Profit Early' syndrome. While profitable, the Diamond Hands score of ${diamondHands}/100 is critical. Exiting ${winSymbol} prematurely cost ~$${(fumbled/1000).toFixed(1)}k. You are effectively selling a Ferrari to buy a Civic. Psychological conditioning recommended.`;
  }

  // 5. THE SURVIVOR (Small Profit)
  if (profit >= 0 && profit <= 1000) {
    return `Vital signs are stable. In a theatre where 90% of combatants face liquidation, breaking even is a statistical anomaly. You are surviving the PVP arena, likely by avoiding full exposure to assets like ${lossSymbol}. Maintain holding pattern.`;
  }

  // 6. THE COUNTER-INDICATOR (Loss + Low Win Rate)
  if (profit < 0 && winRate < 35) {
    return `Subject exhibits 'Inverse Midas Touch'. Capital allocation into ${lossSymbol} coincided perfectly with local tops. With a Degen Score of ${degenScore}, you are effectively donating liquidity to the ecosystem. Analysts suggest inverting your own instincts immediately.`;
  }

  // 7. THE BLEEDER (Loss + High Win Rate)
  if (profit < 0 && winRate > 55) {
    return `Catastrophic risk management detected. Subject wins the majority of skirmishes (${winRate.toFixed(0)}% win rate) but allowed a nuclear event on ${lossSymbol} to wipe the war chest. Stop-losses are not suggestions, soldier. Immediate remedial training ordered.`;
  }

  // 8. THE GAMBLER (High Volume + Big Loss)
  if (profit < -5000 && volume > 50000) {
    return `High-velocity capital destruction. Subject treats the blockchain like a slot machine (Degen Score: ${degenScore}). Heavy volume on ${lossSymbol} with negative expectancy is simply expensive entertainment. Trident LLC has flagged this wallet for 'Degen Rehabilitation'.`;
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
    { icon: '🧻', label: 'Paper Hands', type: BADG