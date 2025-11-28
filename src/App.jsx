import React, { useState, useEffect } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic
// Token gated: requires PNL tokens to access

const DEMO_MODE = false; // Set to true if you want mock data

// Token gate configuration
const PNL_TOKEN_ADDRESS =
  import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const REQUIRED_PNL_BALANCE = 3000000; // starting gate, adjust after launch

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

// CSS Variables matching psycast
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
  panelBg: '#ffffff'
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
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
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
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
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

// Biggest Win / Loss card (FIXED: No text squashing)
const BigMoveCard = ({ label, token, isWin }) => {
  if (!token) return null;
  const invested = token.totalUsdInvested || 0;
  const pnl = token.realizedProfitUsd || 0;
  const realizedValue = invested + pnl;

  // Dynamic colors based on win/loss
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
      {/* Top Row: Label + Pill */}
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

      {/* Middle: Big Number */}
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

      {/* Bottom: Stats Footer */}
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

// Biggest fumble card (FIXED: No text squashing)
const BigFumbleCard = ({ token }) => {
  if (!token) return null;
  const sold = token.totalSoldUsd || 0;
  const missed = token.missedUpsideUsd || 0;
  const current = token.currentValueSoldTokens || 0;
  const multiple = sold > 0 ? current / sold : 0;

  // Amber/Orange theme
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
      {/* Top Row */}
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

      {/* Middle */}
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

      {/* Bottom: Stats Footer */}
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

  // Share PnL via Farcaster composeCast (FIXED: Uses Bulletproof Vercel OG Link)
  const handleSharePnL = async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');

      const summary = pnlData?.summary;
      if (!summary) return;

      const pnlValue = summary.totalRealizedProfit || 0;
      const isWin = pnlValue >= 0;
      const tokensCount = summary.totalTokensTraded || 0;
      const username = user?.username || 'user';
      
      // 1. Format Data
      const realized = formatCurrency(pnlValue);
      const direction = isWin ? 'up' : 'down';
      const emoji = isWin ? '📈' : '📉';
      
      // 2. Generate Image URL
      // We use standard URL encoding and NO external images to prevent 404s.
      // Top Text: "📈 PnL: @username"
      // Bottom Text: "$1,234.56"
      const topText = `${emoji} PnL: @${username}`;
      const bottomText = realized;
      
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      
      // We removed the &images= param to avoid the 404 error from broken external logos
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=dark&md=1&fontSize=100px`;

      // 3. Create Cast
      const appLink = 'https://farcaster.xyz/miniapps/BW_S6D-T82wa/pnl';
      const castText = `My PnL on Base is ${realized} (${direction}) across ${tokensCount} tokens.\n\nCheck yours: ${appLink}`;

      await sdk.actions.composeCast({
        text: castText,
        embeds: [imageUrl] 
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
      setCheckingGate(false);
      return true;
    }

    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`,
        {
          headers: {
            accept: 'application/json',
            'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || ''
          }
        }
      );

      const data = await response.json();
      const pnlToken = data?.[0];
      const balance =
        pnlToken ? parseInt(pnlToken.balance) / 10 ** (pnlToken.decimals || 18) : 0;

      setTokenBalance(balance);
      setCheckingGate(false);

      if (balance < REQUIRED_PNL_BALANCE) {
        setIsGated(true);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Token gate check failed:', err);
      setCheckingGate(false);
      if (DEMO_MODE) return true;
      setIsGated(true);
      return false;
    }
  };

  // Fetch PNL data - now also computing biggest fumble
  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);

      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 600));
        setPnlData(MOCK_PNL_DATA);
        setLoading(false);
        return;
      }

      // Fetch all addresses in parallel
      const fetchPromises = addresses.map((address) =>
        fetch(
          `https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=base`,
          {
            headers: {
              accept: 'application/json',
              'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || ''
            }
          }
        ).then((res) => res.json())
      );

      const results = await Promise.all(fetchPromises);

      const allTokenData = [];
      let totalRealized = 0;
      let totalVolume = 0;
      const tokenAddressesForFumble = new Set();

      results.forEach((data) => {
        if (data.result) {
          data.result.forEach((token) => {
            const invested = parseFloat(token.total_usd_invested) || 0;
            const realized = parseFloat(token.realized_profit_usd) || 0;
            const tokenAddress = token.token_address ? token.token_address.toLowerCase() : null;
            const totalTokensSold = parseFloat(token.total_tokens_sold) || 0;
            const totalSoldUsd = parseFloat(token.total_sold_usd) || 0;

            allTokenData.push({
              name: token.name,
              symbol: token.symbol,
              tokenAddress,
              totalUsdInvested: invested,
              realizedProfitUsd: realized,
              isProfitable: realized > 0,
              totalTokensSold,
              totalSoldUsd
            });

            totalRealized += realized;
            totalVolume += invested;

            if (tokenAddress && totalTokensSold > 0 && totalSoldUsd > 0) {
              tokenAddressesForFumble.add(tokenAddress);
            }
          });
        }
      });

      const profitableTokens = allTokenData.filter((t) => t.isProfitable).length;
      const summary = {
        totalRealizedProfit: totalRealized,
        totalUnrealizedProfit: 0,
        totalTradingVolume: totalVolume,
        profitPercentage: totalVolume > 0 ? (totalRealized / totalVolume) * 100 : 0,
        totalTokensTraded: allTokenData.length,
        winRate: allTokenData.length > 0 ? (profitableTokens / allTokenData.length) * 100 : 0
      };

      // Biggest fumble: sold tokens that would be worth more now
      let biggestFumbleToken = null;

      if (tokenAddressesForFumble.size > 0) {
        try {
          const priceResponse = await fetch(
            'https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=base',
            {
              method: 'POST',
              headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || ''
              },
              body: JSON.stringify({
                tokens: Array.from(tokenAddressesForFumble).map((addr) => ({
                  token_address: addr
                }))
              })
            }
          );

          const priceData = await priceResponse.json();
          const priceArray = Array.isArray(priceData)
            ? priceData
            : priceData.result || priceData.tokens || [];

          const priceMap = new Map();
          priceArray.forEach((p) => {
            const addr = (p.tokenAddress || p.token_address || '').toLowerCase();
            const rawUsd =
              p.usdPrice !== undefined
                ? p.usdPrice
                : p.usd_price !== undefined
                ? p.usd_price
                : p.usdPriceFormatted;
            const usdPrice = parseFloat(rawUsd) || 0;
            if (addr && usdPrice > 0) {
              priceMap.set(addr, usdPrice);
            }
          });

          allTokenData.forEach((t) => {
            if (!t.tokenAddress || !t.totalTokensSold || !t.totalSoldUsd) return;
            const priceUsd = priceMap.get(t.tokenAddress);
            if (!priceUsd) return;

            const currentValueSoldTokens = t.totalTokensSold * priceUsd;
            const missedUpsideUsd = currentValueSoldTokens - t.totalSoldUsd;
            if (missedUpsideUsd <= 0) return;

            if (!biggestFumbleToken || missedUpsideUsd > biggestFumbleToken.missedUpsideUsd) {
              biggestFumbleToken = {
                ...t,
                missedUpsideUsd,
                currentValueSoldTokens,
                currentPriceUsd: priceUsd
              };
            }
          });
        } catch (err) {
          console.log('error computing biggest fumble', err);
        }
      }

      setPnlData({ summary, tokens: allTokenData, biggestFumble: biggestFumbleToken });
      setLoading(false);
    } catch (err) {
      console.error('fetchPNLData error', err);
      setLoading(false);
    }
  };

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);

        if (DEMO_MODE) {
          await new Promise((r) => setTimeout(r, 800));
          setUser(MOCK_USER);
          setWallets(MOCK_WALLETS);
          await checkTokenGate(MOCK_WALLETS[0]);
          setPnlData(MOCK_PNL_DATA);
          setLoading(false);
          return;
        }

        let fid = null;
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          if (context?.user?.fid) {
            fid = context.user.fid;
            setUser(context.user);
          } else {
            setEnvError('PNL Tracker needs a Farcaster user context. Open this miniapp from Warpcast.');
            setCheckingGate(false);
            setLoading(false);
            return;
          }
          sdk.actions.ready();
        } catch (err) {
          console.log('Not in Farcaster context');
          setEnvError('PNL Tracker runs as a Farcaster miniapp. Open it from Warpcast to use it.');
          setCheckingGate(false);
          setLoading(false);
          return;
        }

        if (fid) {
          const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
            {
              headers: {
                accept: 'application/json',
                api_key: import.meta.env.VITE_NEYNAR_API_KEY || ''
              }
            }
          );
          const neynarData = await neynarResponse.json();
          const primaryEth =
            neynarData?.users?.[0]?.verified_addresses?.primary?.eth_address || null;
          const allEth = neynarData?.users?.[0]?.verified_addresses?.eth_addresses || [];

          if (allEth.length === 0) {
            setEnvError('No verified Base wallets found for your Farcaster account.');
            setCheckingGate(false);
            setLoading(false);
            return;
          }

          setWallets(allEth);
          if (primaryEth) {
            setPrimaryWallet(primaryEth);
            setActiveScope('primary');
          } else {
            setPrimaryWallet(allEth[0] || null);
            setActiveScope(allEth.length > 1 ? 'all' : 'primary');
          }

          const initialAddresses = primaryEth ? [primaryEth] : allEth;

          if (initialAddresses.length > 0) {
            const hasAccess = await checkTokenGate(initialAddresses[0]);
            if (hasAccess) {
              await fetchPNLData(initialAddresses);
            }
          }
        }

        setCheckingGate(false);
        setLoading(false);
      } catch (err) {
        console.error('initialize error', err);
        setEnvError('Something went wrong initialising PNL Tracker.');
        setLoading(false);
        setCheckingGate(false);
      }
    };

    initialize();
  }, []);

  const handleWalletScopeChange = async (event) => {
    const scope = event.target.value;
    setActiveScope(scope);

    if (DEMO_MODE) return;

    let addresses = [];
    if (scope === 'all') {
      addresses = wallets;
    } else if (scope === 'primary') {
      addresses = primaryWallet ? [primaryWallet] : wallets.slice(0, 1);
    } else {
      addresses = [scope];
    }

    if (addresses.length > 0) {
      const hasAccess = await checkTokenGate(addresses[0]);
      if (hasAccess) {
        await fetchPNLData(addresses);
      }
    }
  };

  const handleRetryGate = () => {
    setCheckingGate(true);
    setIsGated(false);
    if (wallets.length > 0) {
      checkTokenGate(wallets[0]);
    }
  };

  // Loading state
  if (loading || checkingGate) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              border: '2px solid #e5e7eb',
              borderTopColor: '#111827',
              borderRadius: '50%',
              margin: '0 auto 16px',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <div
            style={{
              fontSize: '12px',
              color: colors.muted,
              textTransform: 'lowercase',
              letterSpacing: '0.12em'
            }}
          >
            {checkingGate ? 'checking $pnl balance' : 'loading pnl data'}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Environment errors: no Farcaster context, no wallets, etc
  if (envError) {
    return (
      <ErrorScreen
        title="Access Locked"
        message={envError}
      />
    );
  }

  // Show token gate screen
  if (isGated && !DEMO_MODE) {
    return (
      <TokenGateScreen
        balance={tokenBalance}
        required={REQUIRED_PNL_BALANCE}
        onRetry={handleRetryGate}
        onGetAccess={handleSwapForAccess}
      />
    );
  }

  // derive biggest win / loss / fumble from tokens
  const tokens = pnlData?.tokens || [];
  const winningTokens = tokens.filter((t) => (t.realizedProfitUsd || 0) > 0);
  const losingTokens = tokens.filter((t) => (t.realizedProfitUsd || 0) < 0);

  const biggestWin =
    winningTokens.length > 0
      ? winningTokens.reduce((best, t) =>
          !best || (t.realizedProfitUsd || 0) > (best.realizedProfitUsd || 0) ? t : best
        )
      : null;

  const biggestLoss =
    losingTokens.length > 0
      ? losingTokens.reduce((worst, t) =>
          !worst || (t.realizedProfitUsd || 0) < (worst.realizedProfitUsd || 0) ? t : worst
        )
      : null;

  const biggestFumble = pnlData?.biggestFumble || null;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
        WebkitFontSmoothing: 'antialiased'
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '28px 18px 60px' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '32px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `1px solid ${colors.accent}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px'
              }}
            >
              📊
            </div>
            <span
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              PNL Tracker
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleSharePnL}
              disabled={!pnlData?.summary}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: `1px solid ${colors.accent}`,
                background: colors.panelBg,
                color: colors.accent,
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: pnlData?.summary ? 'pointer' : 'default',
                opacity: pnlData?.summary ? 1 : 0.6
              }}
            >
              <span>Share PnL</span>
            </button>

            <div
              style={{
                padding: '4px 10px',
                borderRadius: '999px',
                background:
                  pnlData?.summary?.totalRealizedProfit >= 0 ? '#dcfce7' : '#fef2f2',
      