import React, { useState, useEffect, useCallback } from 'react';

// ==========================================
// PNL TRACKER MINIAPP (ULTIMATE VERSION)
// ==========================================
// Vibe: Light Mode / Minimalist / Dark Slate Accents
// Features: Realized PnL, Fumbles, Badges, and TRADING LORE

// Auto-detect demo mode
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true' ? true : 
                  import.meta.env.VITE_DEMO_MODE === 'false' ? false :
                  import.meta.env.DEV || false; 
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;

// Configuration
const PNL_TOKEN_ADDRESS = import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x36FA7687bbA52d3C513497b69BcaD07f4919bB07';
const REQUIRED_PNL_BALANCE = 10000000; 
const BADGE_CONTRACT_ADDRESS = import.meta.env.VITE_BADGE_CONTRACT_ADDRESS || '0xCA3FD5824151e478d02515b59Eda3E62d4E238fe';

// Badge Contract ABI
const BADGE_ABI = [
  { name: 'mintBadge', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'badgeType', type: 'uint8' }, { name: 'winRate', type: 'uint256' }, { name: 'volume', type: 'uint256' }, { name: 'profit', type: 'uint256' }], outputs: [{ name: 'tokenId', type: 'uint256' }] },
  { name: 'hasMintedBadge', type: 'function', stateMutability: 'view', inputs: [{ name: 'user', type: 'address' }, { name: 'badgeType', type: 'uint8' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] }
];

const BADGE_TYPES = { SNIPER: 0, EXIT_LIQUIDITY: 1, VOLUME_WHALE: 2, TOILET_PAPER_HANDS: 3, DIAMOND: 4, TRADER: 5 };

// Whitelist
const WHITELISTED_WALLETS = [
  '0x187c7B0393eBE86378128f2653D0930E33218899',
  '0xb24cF3BD931c720f99F6c927aEE7733054De4Cab',
  '0x85c0BA9e1456Bc755a6ce69E1a85ccaA1FAa9E41'
].map(addr => addr.toLowerCase());

const BASE_ETH_CAIP19 = 'eip155:8453/native';
const getPnlCaip19 = () => PNL_TOKEN_ADDRESS && PNL_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000' ? `eip155:8453/erc20:${PNL_TOKEN_ADDRESS.toLowerCase()}` : null;

// Mock Data
const MOCK_USER = { fid: 3, username: 'dwr.eth', displayName: 'Dan Romero', pfpUrl: 'https://i.pravatar.cc/150?u=dwr' };
const MOCK_WALLETS = ['0xd7029bdea1c17493893aafe29aad69ef892b8ff2'];
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

const formatCurrency = (val) => val === undefined || val === null ? '$0.00' : `$${Math.abs(val).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
const formatNumber = (num) => num >= 1000000 ? (num / 1000000).toFixed(1) + 'M' : num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num.toLocaleString();
const truncateAddress = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';

// --- LOGIC: PERCENTILES & LORE ---
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
  const percentile = Math.round(rawPercentile);
  
  return { percentile, ...getRankTitle(percentile, profit, winRate) };
};

const getRankTitle = (percentile) => {
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

const generateLore = (summary, tokens, biggestWin, biggestLoss) => {
  if (!summary) return null;
  const { winRate, totalRealizedProfit, totalFumbled, totalTradingVolume } = summary;
  
  let archetype = "The NPC";
  let quote = "I trade, therefore I am.";
  let color = "#64748b"; 
  
  if (totalRealizedProfit > 50000) { archetype = "The Based God"; quote = "I don't chase pumps, I create them."; color = "#EAB308"; } 
  else if (totalRealizedProfit > 10000) { archetype = "The Alpha Hunter"; quote = "Up only. Everything else is noise."; color = "#22c55e"; } 
  else if (winRate > 70) { archetype = "The Sniper"; quote = "One shot, one kill. No wasted gas."; color = "#06b6d4"; } 
  else if (totalFumbled > 20000) { archetype = "The Paper Handed King"; quote = "I sell the bottom so you can buy."; color = "#f97316"; } 
  else if (totalRealizedProfit < -5000) { archetype = "The Exit Liquidity"; quote = "I'm doing it for the culture (and the tax loss)."; color = "#ef4444"; } 
  else if (totalTradingVolume > 100000) { archetype = "The Volume Farmer"; quote = "Sleep is for people who don't trade 24/7."; color = "#8b5cf6"; } 
  else { archetype = "The Grinder"; quote = "Slow and steady loses the race, but I'm still running."; color = "#94a3b8"; }

  const habits = [
    biggestWin ? `Legendary entry on $${biggestWin.symbol}` : "Still looking for a big win",
    biggestLoss ? `Donated heavily to the $${biggestLoss.symbol} community` : "Risk management expert",
    totalFumbled > 1000 ? `Allergic to holding winners (Missed $${formatNumber(totalFumbled)})` : "Diamond hands activated",
    `Win Rate: ${winRate.toFixed(1)}% (${winRate > 50 ? 'Better than a coin flip' : 'Inverse me'})`
  ];

  const topBags = [...tokens].sort((a,b) => (b.totalUsdInvested || 0) - (a.totalUsdInvested || 0)).slice(0, 4);
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

// --- COMPONENTS ---

const Metric = ({ label, value, isPositive, isWarning }) => (
  <div style={{ minWidth: '90px' }}>
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: isWarning ? colors.gold : colors.metricLabel, marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '16px', fontWeight: '600', color: isWarning ? colors.gold : (isPositive === undefined ? colors.metricValue : isPositive ? colors.success : colors.error) }}>{value}</div>
  </div>
);

const Badge = ({ icon, label, badgeType, onClaim, isClaiming, isClaimed, canClaim, qualified, requirement, current }) => {
  const isLocked = !qualified;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '4px', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${isClaimed ? colors.mintBorder : isLocked ? '#e5e7eb' : colors.border}`, background: isClaimed ? colors.mintBg : isLocked ? '#f9fafb' : '#fff', fontSize: '11px', fontWeight: '600', color: isClaimed ? colors.mint : isLocked ? colors.muted : colors.ink, opacity: isLocked ? 0.7 : 1, minWidth: '140px', flex: '1 1 140px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ fontSize: '14px' }}>{icon}</span> <span>{label}</span></div>
        {isClaimed && <span style={{ fontSize: '10px', color: colors.mint }}>✓ Minted</span>}
        {isLocked && <span style={{ fontSize: '10px' }}>🔒</span>}
      </div>
      <div style={{ fontSize: '9px', color: colors.muted, fontWeight: '400' }}>{isLocked ? <span>Need: {requirement}</span> : <span>You: {current}</span>}</div>
      {canClaim && !isClaimed && !isLocked && (
        <button onClick={() => onClaim(badgeType)} disabled={isClaiming} style={{ marginTop: '4px', padding: '6px 10px', borderRadius: '6px', border: 'none', background: isClaiming ? colors.muted : colors.mint, color: '#fff', fontSize: '10px', fontWeight: '600', cursor: isClaiming ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{isClaiming ? 'Minting...' : 'Mint NFT'}</button>
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
    { title: 'Realized P&L', desc: 'Profit or loss from tokens you\'ve sold.' },
    { title: 'Airdrops', desc: 'Tokens received for free show as 100% profit.' },
    { title: 'Win Rate', desc: 'Percentage of sold tokens that were profitable.' },
    { title: 'Fumbled', desc: 'Potential gains missed by selling early.' },
    { title: 'Base Only', desc: 'Currently tracking Base chain only.' },
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
        {rank.insight && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '2px solid rgba(255,255,255,0.2)' }}>"{rank.insight}"</div>}
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

const LoreCard = ({ summary, tokens, user, biggestWin, biggestLoss, onShare }) => {
  const lore = generateLore(summary, tokens, biggestWin, biggestLoss);
  if (!lore) return null;

  return (
    <div style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', borderRadius: '24px', padding: '24px', color: '#fff', border: `1px solid ${lore.color}`, boxShadow: `0 0 20px -5px ${lore.color}40`, fontFamily: 'monospace', position: 'relative', overflow: 'hidden', marginBottom: '24px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'radial-gradient(#ffffff10 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3, pointerEvents: 'none' }}></div>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <img src={user?.pfpUrl} style={{ width: '48px', height: '48px', borderRadius: '50%', border: `2px solid ${lore.color}` }} />
          <div><div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.02em', fontFamily: 'system-ui' }}>{user?.displayName}</div><div style={{ fontSize: '12px', color: lore.color, opacity: 0.9 }}>@{user?.username}</div></div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', margin: '0 auto 16px', background: `${lore.color}20`, borderRadius: '16px', border: `1px solid ${lore.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', boxShadow: `0 0 15px ${lore.color}60` }}>{summary.winRate > 60 ? '🏆' : summary.totalRealizedProfit > 0 ? '📈' : '💀'}</div>
          <div style={{ fontSize: '22px', fontWeight: '800', textTransform: 'uppercase', color: lore.color, textShadow: `0 0 10px ${lore.color}40`, letterSpacing: '0.05em', lineHeight: '1.1' }}>{lore.archetype}</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '8px', opacity: 0.8, maxWidth: '260px', margin: '8px auto 0' }}>"{lore.quote}"</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '24px', background: '#ffffff05', padding: '16px', borderRadius: '16px', border: '1px solid #ffffff10' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '16px', fontWeight: '700', color: summary.totalRealizedProfit >= 0 ? '#4ade80' : '#f87171' }}>{summary.totalRealizedProfit >= 0 ? '+' : ''}{formatNumber(summary.totalRealizedProfit)}</div><div style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>Realized</div></div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #ffffff10', borderRight: '1px solid #ffffff10' }}><div style={{ fontSize: '16px', fontWeight: '700' }}>{summary.winRate.toFixed(0)}%</div><div style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>Win Rate</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '16px', fontWeight: '700' }}>{summary.totalTokensTraded}</div><div style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.5, letterSpacing: '0.1em' }}>Tokens</div></div>
        </div>
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '12px', opacity: 0.6 }}>Top Bags</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {lore.topBags.map((t, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '10px', border: `2px solid ${lore.color}` }}>{t.symbol.slice(0,4)}</div>
                <div style={{ fontSize: '10px', fontWeight: '600' }}>{t.symbol}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', textAlign: 'center', marginBottom: '4px', opacity: 0.6 }}>Trading Style</div>
          {lore.habits.map((habit, i) => (<div key={i} style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${lore.color}40`, background: `${lore.color}10`, fontSize: '11px', textAlign: 'center' }}>{habit}</div>))}
        </div>
        <button onClick={onShare} style={{ marginTop: '24px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: lore.color, color: '#000', fontSize: '12px', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: `0 4px 15px ${lore.color}60` }}>Share My Lore</button>
      </div>
    </div>
  );
};

const TokenRow = ({ token }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: colors.accent, border: `1px solid ${colors.border}` }}>{token.symbol?.charAt(0)}</div>
      <div><div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{token.symbol}</div><div style={{ fontSize: '11px', color: colors.muted }}>Bought: {formatCurrency(token.totalUsdInvested)}</div></div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '500', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error }}>{token.realizedProfitUsd >= 0 ? '+' : '-'}{formatCurrency(token.realizedProfitUsd)}</div>
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
      {onShare && <button onClick={onShare} style={{ marginTop: '4px', padding: '8px', borderRadius: '8px', border: `1px solid ${border}`, background: isWin ? 'rgba(22, 101, 52, 0.1)' : 'rgba(153, 27, 27, 0.1)', color: text, fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{isWin ? 'Share Win' : 'Share L'}</button>}
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
        <div><div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.gold }}>Biggest Fumble</div><div style={{ fontSize: '12px', fontWeight: '600', color: colors.gold, marginTop: '2px' }}>{token.name || token.symbol}</div></div>
        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#fef3c7', color: colors.gold }}>Sold Early</div>
      </div>
      <div><div style={{ fontSize: '20px', fontWeight: '700', color: colors.gold, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>{formatCurrency(missed)}</div><div style={{ fontSize: '11px', color: colors.gold }}>left on the table</div></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${colors.goldBorder}` }}>
        <div><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>You Sold</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.gold }}>{formatCurrency(sold)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.gold, marginBottom: '2px' }}>Worth Now</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.gold }}>{formatCurrency(current)} {multiple > 0 && <span style={{ opacity: 0.7 }}>({multiple.toFixed(1)}x)</span>}</div></div>
      </div>
      {onShare && <button onClick={onShare} style={{ marginTop: '4px', padding: '8px', borderRadius: '8px', border: `1px solid ${colors.goldBorder}`, background: 'rgba(180, 83, 9, 0.1)', color: colors.gold, fontSize: '10px', fontWeight: '600', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Share My Pain</button>}
    </div>
  );
};

const ErrorScreen = ({ title, message }) => (
  <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
    <div style={{ background: colors.panelBg, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '28px 24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
      <div style={{ fontSize: '18px', marginBottom: '8px' }}>⚠️</div>
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
    { icon: '🎯', label: 'Sniper', type: BADGE_TYPES.SNIPER, qualified: winRate >= 60, requirement: 'Win Rate ≥ 60%', current: `${winRate.toFixed(1)}%` },
    { icon: '💧', label: 'Exit Liquidity', type: BADGE_TYPES.EXIT_LIQUIDITY, qualified: winRate < 40 && tokens > 5, requirement: 'Win Rate < 40%', current: `${winRate.toFixed(1)}%` },
    { icon: '🐋', label: 'Volume Whale', type: BADGE_TYPES.VOLUME_WHALE, qualified: volume > 50000, requirement: 'Volume > $50k', current: `$${(volume/1000).toFixed(1)}k` },
    { icon: '🧻', label: 'Paper Hands', type: BADGE_TYPES.TOILET_PAPER_HANDS, qualified: fumbled > 10000, requirement: 'Fumbled > $10k', current: `$${(fumbled/1000).toFixed(1)}k` },
    { icon: '💎', label: 'Diamond', type: BADGE_TYPES.DIAMOND, qualified: profit > 10000, requirement: 'Profit > $10k', current: `$${(profit/1000).toFixed(1)}k` },
    { icon: '💰', label: 'Profitable', type: BADGE_TYPES.TRADER, qualified: profit > 0, requirement: 'Profit > $0', current: `$${profit.toFixed(0)}` }
  ];
};
const getBadges = (summary) => getAllBadges(summary).filter(b => b.qualified);

// Claim Badge Panel Component
const ClaimBadgePanel = ({ summary, onClaimBadge, claimingBadge, claimedBadges, mintTxHash, mintError, canClaim, currentWallet }) => {
  const allBadges = getAllBadges(summary);
  const qualifiedCount = allBadges.filter(b => b.qualified).length;
  
  return (
    <Panel title="Your Badges" subtitle={`${qualifiedCount} of ${allBadges.length} unlocked`} style={{ marginTop: '20px' }}>
      {currentWallet && <div style={{ fontSize: '10px', color: colors.muted, marginBottom: '12px' }}>Badges for {truncateAddress(currentWallet)}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '10px', marginBottom: mintTxHash || mintError ? '12px' : '0' }}>
        {allBadges.map((b, i) => (
          <Badge key={i} {...b} badgeType={b.type} onClaim={onClaimBadge} isClaiming={claimingBadge === b.type} isClaimed={claimedBadges.includes(b.type)} canClaim={canClaim} />
        ))}
      </div>
      {mintTxHash && <div style={{ padding: '10px 12px', borderRadius: '8px', background: colors.mintBg, border: `1px solid ${colors.mintBorder}`, fontSize: '11px', color: colors.mint }}>✓ Badge minted!</div>}
      {mintError && <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '11px', color: colors.error }}>{mintError}</div>}
    </Panel>
  );
};

// --- MAIN APP ---
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
  const [mintTxHash, setMintTxHash] = useState(null);
  const [mintError, setMintError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  // Minted Badge Check
  const checkMintedBadges = useCallback(async (userAddress) => {
    if (!userAddress || BADGE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000' || DEMO_MODE) return;
    const cacheKey = `minted_badges_${userAddress.toLowerCase()}`;
    try {
      const cached = window.localStorage.getItem(cacheKey);
      if (cached) {
        const { badges, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 1000) { setClaimedBadges(badges); return; }
      }
    } catch (e) {}
    
    try {
      const { createPublicClient, http } = await import('viem');
      const { base } = await import('viem/chains');
      const client = createPublicClient({ chain: base, transport: http() });
      const minted = [];
      for (let badgeType = 0; badgeType <= 5; badgeType++) {
        try {
          const hasMinted = await client.readContract({ address: BADGE_CONTRACT_ADDRESS, abi: BADGE_ABI, functionName: 'hasMintedBadge', args: [userAddress, badgeType] });
          if (hasMinted) minted.push(badgeType);
        } catch (e) {}
      }
      window.localStorage.setItem(cacheKey, JSON.stringify({ badges: minted, timestamp: Date.now() }));
      setClaimedBadges(minted);
    } catch (err) {}
  }, []);

  // Claim Logic
  const handleClaimBadgeViaSDK = useCallback(async (badgeType) => {
    setClaimingBadge(badgeType); setMintError(null); setMintTxHash(null);
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary || {};
      const provider = sdk.wallet.ethProvider;
      if (!provider) throw new Error('No provider');
      const accounts = await provider.request({ method: 'eth_accounts' });
      const fromAddress = accounts[0] || primaryWallet;
      
      const { encodeFunctionData } = await import('viem');
      const data = encodeFunctionData({
        abi: BADGE_ABI, functionName: 'mintBadge',
        args: [Number(badgeType), BigInt(Math.floor((summary.winRate||0)*100)), BigInt(Math.floor(summary.totalTradingVolume||0)), BigInt(Math.floor(Math.abs(summary.totalRealizedProfit||0)))]
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: fromAddress, to: BADGE_CONTRACT_ADDRESS, data, value: '0x0', chainId: '0x2105' }]
      });
      setMintTxHash(txHash); setClaimedBadges(prev => [...prev, badgeType]);
    } catch (err) { setMintError(err.message?.slice(0,50)); } finally { setClaimingBadge(null); }
  }, [primaryWallet, pnlData]);

  // Share Handlers
  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const summary = pnlData?.summary;
      if (!summary) return;
      if (isGated) { await sdk.actions.composeCast({ text: "I'm checking my PnL stats on Base..." }); return; }
      const rank = calculatePercentile(summary);
      const text = `Using $PNL: My Trading Score is ${rank.percentile}/100 📊\n\nTop ${100-rank.percentile}% on Base\n${rank.title}`;
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      await sdk.actions.composeCast({ text, embeds: [appLink] });
    } catch (err) {}
  };
  const handleShareFumble = async () => {}; const handleShareBestTrade = async () => {}; const handleShareWorstTrade = async () => {}; const handleShareAirdrops = async () => {}; const handleSwapForAccess = async () => {};

  // Gate Check
  const checkTokenGate = async (address) => {
    if (!PNL_TOKEN_ADDRESS) { setTokenBalance(0); setCheckingGate(false); setIsGated(false); return true; }
    if (address && WHITELISTED_WALLETS.includes(address.toLowerCase())) { setTokenBalance(REQUIRED_PNL_BALANCE); setCheckingGate(false); setIsGated(false); return true; }
    if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 500)); setTokenBalance(REQUIRED_PNL_BALANCE + 100); setCheckingGate(false); setIsGated(false); return true; }
    try {
      const response = await fetch(`https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`, { headers: { 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } });
      const data = await response.json();
      const bal = data?.[0] ? parseInt(data[0].balance) / 10 ** (data[0].decimals || 18) : 0;
      setTokenBalance(bal); setIsGated(bal < REQUIRED_PNL_BALANCE); setCheckingGate(false); return bal >= REQUIRED_PNL_BALANCE;
    } catch (err) { setCheckingGate(false); setIsGated(true); return false; }
  };

  // Fetch Data
  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);
      if (DEMO_MODE) { await new Promise((r) => setTimeout(r, 600)); setPnlData(MOCK_PNL_DATA); setLoading(false); return; }
      const results = await Promise.all(addresses.map(a => fetch(`https://deep-index.moralis.io/api/v2.2/wallets/${a}/profitability?chain=base&exclude_spam=false`, { headers: { 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } }).then(r => r.json())));
      const allTokens = []; const fumbles = new Set();
      results.forEach(d => { if (d.result) d.result.forEach(t => { 
        allTokens.push({
          name: t.name, symbol: t.symbol, tokenAddress: t.token_address?.toLowerCase(),
          totalUsdInvested: parseFloat(t.total_usd_invested)||0, realizedProfitUsd: parseFloat(t.realized_profit_usd)||0,
          isProfitable: (parseFloat(t.realized_profit_usd)||0)>0, totalTokensSold: parseFloat(t.total_tokens_sold)||0, totalSoldUsd: parseFloat(t.total_sold_usd)||0,
          isAirdrop: (parseFloat(t.total_usd_invested)||0)<5 && (parseFloat(t.realized_profit_usd)||0)>0
        });
        if(t.token_address) fumbles.add(t.token_address);
      })});
      
      const summary = {
        totalRealizedProfit: allTokens.reduce((a, t) => a + t.realizedProfitUsd, 0),
        totalTradingVolume: allTokens.reduce((a, t) => a + t.totalUsdInvested, 0),
        totalTokensTraded: allTokens.length,
        winRate: allTokens.length > 0 ? (allTokens.filter(t=>t.isProfitable).length / allTokens.length) * 100 : 0,
        totalFumbled: 0, airdropCount: allTokens.filter(t=>t.isAirdrop).length, airdropProfit: allTokens.filter(t=>t.isAirdrop).reduce((a,t)=>a+t.realizedProfitUsd,0)
      };
      
      let biggestWin, biggestLoss, biggestFumble;
      allTokens.forEach(t => {
        if(t.realizedProfitUsd > 0 && (!biggestWin || t.realizedProfitUsd > biggestWin.realizedProfitUsd)) biggestWin = t;
        if(t.realizedProfitUsd < 0 && (!biggestLoss || t.realizedProfitUsd < biggestLoss.realizedProfitUsd)) biggestLoss = t;
      });
      setPnlData({ summary, tokens: allTokens, biggestWin, biggestLoss, biggestFumble }); setLoading(false);
    } catch (err) { setLoading(false); }
  };

  // Init
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (DEMO_MODE) { setUser(MOCK_USER); setWallets(MOCK_WALLETS); await checkTokenGate(MOCK_WALLETS[0]); setPnlData(MOCK_PNL_DATA); setLoading(false); return; }
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        const context = await sdk.context;
        if (context?.user?.fid) {
          setUser(context.user);
          const neynar = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${context.user.fid}`, { headers: { api_key: import.meta.env.VITE_NEYNAR_API_KEY || '' } }).then(r=>r.json());
          const addrs = neynar?.users?.[0]?.verified_addresses?.eth_addresses || [];
          if(addrs.length) { setWallets(addrs); setPrimaryWallet(addrs[0]); checkMintedBadges(addrs[0]); await checkTokenGate(addrs[0]); await fetchPNLData(addrs); }
        }
        sdk.actions.ready();
      } catch (err) { setEnvError('Init failed'); } finally { setCheckingGate(false); setLoading(false); }
    };
    init();
  }, []);

  const handleWalletScopeChange = (e) => { setActiveScope(e.target.value); if(!DEMO_MODE) fetchPNLData(e.target.value==='all'?wallets:[e.target.value]); };
  const handleRetryGate = () => { setCheckingGate(true); if(wallets.length) checkTokenGate(wallets[0]).then(ok=>ok&&fetchPNLData(wallets)); };
  
  const renderGatedOverlay = () => (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '0', background: 'rgba(255, 255, 255, 0.05)', pointerEvents: 'none' }}>
      <div style={{ background: colors.panelBg, borderRadius: '24px', border: `1px solid ${colors.border}`, padding: '28px 24px', maxWidth: '360px', width: '90%', marginTop: '180px', boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.2)', textAlign: 'center', pointerEvents: 'auto' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>Ψ</div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.ink, margin: '0 0 6px' }}>Unlock Full Access</h2>
        <p style={{ fontSize: '12px', color: colors.muted, margin: '0 0 20px' }}>Hold <strong>{formatNumber(REQUIRED_PNL_BALANCE)} $PNL</strong> to unlock</p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSwapForAccess} style={{ flex: 1, padding: '12px', borderRadius: '99px', background: colors.pill, color: colors.pillText, fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Get $PNL</button>
          <button onClick={handleRetryGate} style={{ flex: 1, padding: '12px', borderRadius: '99px', background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Refresh</button>
        </div>
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
        
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: `1.5px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '600' }}>Ψ</div>
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '600' }}>PNL Tracker</span>
            {DEMO_MODE && <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontSize: '9px', fontWeight: '600', textTransform: 'uppercase' }}>Demo</span>}
          </div>
          {wallets.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
              <select value={activeScope} onChange={handleWalletScopeChange} style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${colors.border}`, background: colors.panelBg, color: colors.muted, maxWidth: '140px', cursor: 'pointer' }}>
                {wallets.map((addr) => <option key={addr} value={addr}>{addr === primaryWallet ? `Primary · ${truncateAddress(addr)}` : truncateAddress(addr)}</option>)}
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
            <div style={{ padding: '5px 12px', borderRadius: '999px', background: pnlData?.summary?.totalRealizedProfit >= 0 ? '#dcfce7' : '#fef2f2', color: pnlData?.summary?.totalRealizedProfit >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '10px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: pnlData?.summary?.totalRealizedProfit >= 0 ? colors.success : colors.error }} />
              {pnlData?.summary?.totalRealizedProfit >= 0 ? 'Profitable' : 'In Loss'}
            </div>
          </div>
        )}

        {/* MAIN CONTENT SWITCH: Lore vs Rank Card */}
        {!isGated && activeTab === 'lore' && pnlData?.summary ? (
          <LoreCard summary={pnlData.summary} tokens={tokens} user={user} biggestWin={biggestWin} biggestLoss={biggestLoss} onShare={handleSharePnL} />
        ) : (
          <>
            {!isGated && pnlData?.summary && <RankCard summary={pnlData.summary} onShare={handleSharePnL} />}
          </>
        )}

        {/* Navigation Tabs */}
        {!isGated && pnlData?.summary && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {['stats', 'airdrops', 'badges', 'lore'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: activeTab === tab ? 'none' : `1px solid ${colors.border}`, background: activeTab === tab ? colors.accent : colors.panelBg, color: activeTab === tab ? colors.pillText : colors.muted, fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {tab === 'stats' ? 'Stats' : tab === 'airdrops' ? `Airdrops${pnlData.summary.airdropCount > 0 ? ` (${pnlData.summary.airdropCount})` : ''}` : tab === 'lore' ? '✨ Lore' : 'Badges'}
              </button>
            ))}
          </div>
        )}

        {/* STATS CONTENT */}
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
                <Metric label="Total Bought" value={formatCurrency(pnlData.summary.totalTradingVolume)} />
                <Metric label="Win Rate" value={`${pnlData.summary.winRate.toFixed(1)}%`} isPositive={pnlData.summary.winRate >= 50} />
                {!isGated && pnlData.summary.totalFumbled > 0 ? <Metric label="Fumbled Gains" value={formatCurrency(pnlData.summary.totalFumbled)} isWarning /> : <Metric label="Tokens Sold" value={pnlData.summary.totalTokensTraded} />}
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
            
            <Panel title="Best Performers" subtitle="Realized gains">
              {pnlData.tokens.filter((t) => t.isProfitable).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).slice(0, 5).map((token, idx) => (
                <TokenRow key={idx} token={token} />
              ))}
            </Panel>
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
              ) : (<div style={{ textAlign: 'center', padding: '24px', color: colors.muted }}><div style={{ fontSize: '24px', marginBottom: '8px' }}>🪂</div><div style={{ fontSize: '13px' }}>No airdrops found</div><div style={{ fontSize: '11px', marginTop: '4px' }}>Tokens with $0 cost basis will appear here</div></div>)}
            </Panel>
          </>
        )}

        {/* BADGES */}
        {!isGated && activeTab === 'badges' && pnlData?.summary && (
          <ClaimBadgePanel summary={pnlData.summary} onClaimBadge={handleClaimBadgeViaSDK} claimingBadge={claimingBadge} claimedBadges={claimedBadges} mintTxHash={mintTxHash} mintError={mintError} canClaim={!!primaryWallet} currentWallet={activeScope === 'all' ? (primaryWallet || wallets[0]) : (activeScope === 'primary' ? primaryWallet : activeScope)} />
        )}

        {/* INFO */}
        {!isGated && <InfoPanel isVisible={showInfo} onClose={() => setShowInfo(false)} />}
        {!isGated && (
          <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', opacity: 0.6 }}>
             <div onClick={() => setShowInfo(true)} style={{ fontSize: '11px', color: colors.muted, textDecoration: 'underline', cursor: 'pointer' }}>How is this calculated?</div>
          </div>
        )}

        {/* GATED BLUR */}
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