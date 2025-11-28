import React, { useState, useEffect } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires PNL tokens to access

const DEMO_MODE = false; // Set to true if you want mock data

// Cache TTL (10 minutes)
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;

// Token gate configuration
const PNL_TOKEN_ADDRESS =
  import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';

// Requirement increased to 10 Million
const REQUIRED_PNL_BALANCE = 10000000; 

// Chain + tokens for swap sheet (CAIP-19)
const BASE_ETH_CAIP19 = 'eip155:8453/native';
const getPnlCaip19 = () =>
  PNL_TOKEN_ADDRESS && PNL_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000'
    ? `eip155:8453/erc20:${PNL_TOKEN_ADDRESS.toLowerCase()}`
    : null;

// Mock data for demo/preview mode
const MOCK_USER = {
  fid: 3,
  username: 'dwr.eth',
  displayName: 'Dan Romero',
  pfpUrl: 'https://i.pravatar.cc/150?u=dwr'
};

const MOCK_WALLETS = [
  '0xd7029bdea1c17493893aafe29aad69ef892b8ff2',
  '0xa14b4c95b5247199d74c5578531b4887ca5e4909'
];

const MOCK_PNL_DATA = {
  summary: {
    totalRealizedProfit: 12847.56,
    totalUnrealizedProfit: 3421.89,
    totalTradingVolume: 89432.12,
    profitPercentage: 18.4,
    totalTokensTraded: 24,
    winRate: 67.3
  },
  tokens: [
    { name: 'BRETT', symbol: 'BRETT', totalUsdInvested: 5000, realizedProfitUsd: 8420.5, isProfitable: true },
    { name: 'DEGEN', symbol: 'DEGEN', totalUsdInvested: 2500, realizedProfitUsd: 3127.25, isProfitable: true },
    { name: 'TOSHI', symbol: 'TOSHI', totalUsdInvested: 1800, realizedProfitUsd: 1299.81, isProfitable: true },
    { name: 'NORMIE', symbol: 'NORMIE', totalUsdInvested: 3000, realizedProfitUsd: -1245.32, isProfitable: false },
    { name: 'HIGHER', symbol: 'HIGHER', totalUsdInvested: 1200, realizedProfitUsd: 1245.32, isProfitable: true },
    { name: 'ENJOY', symbol: 'ENJOY', totalUsdInvested: 800, realizedProfitUsd: -234.12, isProfitable: false }
  ]
};

// Utility functions
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0.00';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(2)}K`;
  return `${value < 0 ? '-' : ''}$${absValue.toFixed(2)}`;
};

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const truncateAddress = (address) => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// CSS Variables matching YOUR psycast.pages.dev aesthetic
const colors = {
  bg: '#fafafa',       // Light Grey Background
  ink: '#0b0b0b',      // Dark Ink Text
  muted: '#6b7280',    // Muted Grey
  accent: '#111827',   // Dark Accent
  border: '#e5e7eb',   // Light Border
  pill: '#111827',     // Dark Pill Background
  pillText: '#f9fafb', // Light Pill Text
  metricLabel: '#9ca3af',
  metricValue: '#111827',
  success: '#22c55e',
  error: '#b91c1c',
  panelBg: '#ffffff'   // White Panel Background
};

// Token Gate Screen Component
const TokenGateScreen = ({ balance, required, onRetry, onGetAccess }) => (
  <div
    style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: colors.ink
    }}
  >
    <div
      style={{
        background: colors.panelBg,
        borderRadius: '18px',
        border: `1px solid ${colors.border}`,
        padding: '32px 28px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 14px 35px rgba(15,23,42,0.08)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px'
        }}
      >
        🔒
      </div>

      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: colors.metricLabel,
          marginBottom: '8px'
        }}
      >
        Token Gated Access
      </div>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.ink,
          margin: '0 0 12px'
        }}
      >
        Insufficient $PNL Balance
      </h2>

      <p
        style={{
          fontSize: '13px',
          color: colors.muted,
          lineHeight: '1.6',
          margin: '0 0 24px'
        }}
      >
        you need to hold at least{' '}
        <strong style={{ color: colors.ink }}>{formatNumber(required)} $PNL</strong> tokens to
        access the full PNL Tracker. tap <strong>Get $PNL</strong> to open the swap sheet, then
        hit <strong>Retry</strong> after swapping.
      </p>

      <div
        style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: colors.metricLabel
            }}
          >
            Your Balance
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.error,
              fontFeatureSettings: '"tnum" 1, "lnum" 1'
            }}
          >
            {formatNumber(balance)} $PNL
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: colors.metricLabel
            }}
          >
            Required
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.ink,
              fontFeatureSettings: '"tnum" 1, "lnum" 1'
            }}
          >
            {formatNumber(required)} $PNL
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onGetAccess}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: '999px',
            background: colors.pill,
            color: colors.pillText,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Get $PNL
        </button>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: '999px',
            background: colors.panelBg,
            color: colors.accent,
            border: `1px solid ${colors.accent}`,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// Simple error screen (no free access)
const ErrorScreen = ({ title, message }) => (
  <div
    style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: colors.ink
    }}
  >
    <div
      style={{
        background: colors.panelBg,
        borderRadius: '18px',
        border: `1px solid ${colors.border}`,
        padding: '28px 24px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: `1px solid ${colors.accent}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 14px',
          fontSize: '18px'
        }}
      >
        ⚠️
      </div>
      <div
        style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: colors.metricLabel,
          marginBottom: '8px'
        }}
      >
        {title}
      </div>
      <p
        style={{
          fontSize: '13px',
          color: colors.muted,
          lineHeight: 1.6,
          margin: 0
        }}
      >
        {message}
      </p>
    </div>
  </div>
);

// Metric Component
const Metric = ({ label, value, isPositive }) => (
  <div style={{ minWidth: '100px' }}>
    <div
      style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: colors.metricLabel,
        marginBottom: '6px'
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '18px',
        fontWeight: '500',
        fontFeatureSettings: '"tnum" 1, "lnum" 1',
        color: isPositive === undefined ? colors.metricValue : isPositive ? colors.success : colors.error
      }}
    >
      {value}
    </div>
  </div>
);

// Panel Component
const Panel = ({ title, subtitle, children }) => (
  <div
    style={{
      background: colors.panelBg,
      borderRadius: '18px',
      border: `1px solid ${colors.border}`,
      padding: '20px 18px 16px',
      boxShadow: '0 14px 35px rgba(15,23,42,0.08)'
    }}
  >
    {(title || subtitle) && (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}
      >
        {title && (
          <div
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              fontSize: '10px',
              color: colors.metricLabel
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              fontSize: '11px',
              color: colors.muted
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    )}
    {children}
  </div>
);

// Token Row Component
const TokenRow = ({ token }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: `1px solid ${colors.border}`
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.accent,
          border: `1px solid ${colors.border}`
        }}
      >
        {token.symbol?.charAt(0)}
      </div>
      <div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: '500',
            color: colors.ink
          }}
        >
          {token.symbol}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: colors.muted
          }}
        >
          {token.name}
        </div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div
        style={{
          fontSize: '14px',
          fontWeight: '500',
          color: token.realizedProfitUsd >= 0 ? colors.success : colors.error,
          fontFeatureSettings: '"tnum" 1, "lnum" 1'
        }}
      >
        {token.realizedProfitUsd >= 0 ? '+' : ''}
        {formatCurrency(token.realizedProfitUsd)}
      </div>
      <div
        style={{
          fontSize: '11px',
          color: colors.muted
        }}
      >
        {formatCurrency(token.totalUsdInvested)} invested
      </div>
    </div>
  </div>
);

// Biggest Win / Loss card
const BigMoveCard = ({ label, token, isWin }) => {
  if (!token) return null;
  const invested = token.totalUsdInvested || 0;
  const pnl = token.realizedProfitUsd || 0;
  const realizedValue = invested + pnl;

  // Colors optimized for Light Mode (Psycast)
  const bg = isWin ? '#f0fdf4' : '#fef2f2';
  const border = isWin ? '#bbf7d0' : '#fecaca';
  const text = isWin ? '#166534' : '#991b1b';
  const pillBg = isWin ? '#dcfce7' : '#fee2e2';

  return (
    <div
      style={{
        flex: '1 1 140px', // Allow grow/shrink but keep min-width
        padding: '12px',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: colors.metricLabel
          }}
        >
          {label}
        </div>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: pillBg,
            color: text
          }}
        >
          {token.symbol}
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: text,
            letterSpacing: '-0.02em',
            lineHeight: '1',
            marginBottom: '4px'
          }}
        >
          {pnl >= 0 ? '+' : ''}
          {formatCurrency(pnl)}
        </div>
        <div style={{ fontSize: '11px', color: colors.muted }}>
          {token.name}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '10px',
          borderTop: `1px dashed ${isWin ? '#bbf7d0' : '#fecaca'}`
        }}
      >
        <div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>
            Invested
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>
            {formatCurrency(invested)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>
            Realized
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>
            {formatCurrency(realizedValue)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Biggest fumble card
const BigFumbleCard = ({ token }) => {
  if (!token) return null;
  const sold = token.totalSoldUsd || 0;
  const missed = token.missedUpsideUsd || 0;
  const current = token.currentValueSoldTokens || 0;
  const multiple = sold > 0 ? current / sold : 0;

  // Amber/Orange theme for Light Mode
  const bg = '#fffbeb';
  const border = '#fde68a';
  const text = '#92400e';
  const pillBg = '#fef3c7';

  return (
    <div
      style={{
        flex: '1 1 140px',
        padding: '12px',
        borderRadius: '16px',
        border: `1px solid ${border}`,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#b45309'
          }}
        >
          Biggest Fumble
        </div>
        <div
          style={{
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: pillBg,
            color: text
          }}
        >
          Missed
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: text,
            letterSpacing: '-0.02em',
            lineHeight: '1',
            marginBottom: '4px'
          }}
        >
          {missed >= 0 ? '+' : ''}
          {formatCurrency(missed)}
        </div>
        <div style={{ fontSize: '11px', color: '#b45309' }}>
          {token.name || token.symbol}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingTop: '10px',
          borderTop: `1px dashed ${border}`
        }}
      >
        <div>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#b45309', marginBottom: '2px' }}>
            Sold For
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: text }}>
            {formatCurrency(sold)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#b45309', marginBottom: '2px' }}>
            Worth Now
          </div>
          <div style={{ fontSize: '11px', fontWeight: '600', color: text }}>
            {formatCurrency(current)}
            {multiple > 0 && <span style={{ opacity: 0.7, marginLeft: '2px' }}>({multiple.toFixed(1)}x)</span>}
          </div>
        </div>
      </div>
    </div>
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
  const [activeTab, setActiveTab] = useState('overview');

  // Token gate state
  const [isGated, setIsGated] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [checkingGate, setCheckingGate] = useState(true);

  // Environment error (no Farcaster context, no wallets, etc)
  const [envError, setEnvError] = useState(null);

  // Share PnL via Farcaster composeCast
  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');

      const summary = pnlData?.summary;
      if (!summary) return;

      const pnlValue = summary.totalRealizedProfit || 0;
      const isWin = pnlValue >= 0;
      const winRate = typeof summary.winRate === 'number' ? summary.winRate.toFixed(1) : summary.winRate;
      const tokensCount = summary.totalTokensTraded || 0;
      const username = user?.username || 'user';
      
      // 1. Format Data
      const realized = formatCurrency(pnlValue);
      const direction = isWin ? 'up' : 'down';
      
      // 2. Generate Bulletproof Image URL (Psycast White Theme)
      // Using Vercel OG Public generator with no external images to prevent 404s.
      // We simulate the Psi Logo with the text "( Ψ )"
      
      const topText = `( Ψ ) PnL: @${username}`;
      const bottomText = realized;
      
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      
      // Theme: Light (White background, Black text)
      // "hack" to remove the triangle: pass a 1px white image (makes it invisible)
      const invisibleLogo = 'https://assets.vercel.com/image/upload/front/assets/design/vercel-triangle-white.svg';
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=100px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;

      // 3. Create Cast
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const castText = `My PnL on Base is ${realized} (${direction}) across ${tokensCount} tokens.\n\nCheck yours: ${appLink}`;

      await sdk.actions.composeCast({
        text: castText,
        embeds: [imageUrl, appLink] 
      });
    } catch (err) {
      console.error('share pnl failed', err);
    }
  };

  // Open built in swap sheet to buy $PNL
  const handleSwapForAccess = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const pnlCaip19 = getPnlCaip19();

      if (!pnlCaip19) {
        await sdk.actions.openUrl('https://app.uniswap.org');
        return;
      }

      await sdk.actions.swapToken({
        sellToken: BASE_ETH_CAIP19,
        buyToken: pnlCaip19
      });
    } catch (err) {
      console.error('swap for $PNL failed', err);
    }
  };

  // Check token balance for gating
  const checkTokenGate = async (address) => {
    // skip gate if PNL token not configured (dev only)
    if (!PNL_TOKEN_ADDRESS || PNL_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setTokenBalance(0);
      setCheckingGate(false);
      setIsGated(false);
      return true;
    }

    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      setTokenBalance(2500000);
      setChec