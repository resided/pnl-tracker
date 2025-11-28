import React, { useState, useEffect } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires PNL tokens to access

const DEMO_MODE = false; // Set to true if you want mock data

// Cache TTL (10 minutes)
const PNL_CACHE_TTL_MS = 10 * 60 * 1000;

// Token gate configuration
const PNL_TOKEN_ADDRESS =
  import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x36FA7687bbA52d3C513497b69BcaD07f4919bB07';

// Requirement: 10 Million $PNL
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

// Juicy mock data to make people want to unlock
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
  ],
  biggestWin: { name: 'BRETT', symbol: 'BRETT', totalUsdInvested: 5000, realizedProfitUsd: 8420.5, isProfitable: true },
  biggestLoss: { name: 'NORMIE', symbol: 'NORMIE', totalUsdInvested: 3000, realizedProfitUsd: -1245.32, isProfitable: false },
  biggestFumble: { name: 'KEYCAT', symbol: 'KEYCAT', totalSoldUsd: 400, missedUpsideUsd: 12500, currentValueSoldTokens: 12900 }
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

// Metric Component
const Metric = ({ label, value, isPositive }) => (
  <div style={{ minWidth: '100px' }}>
    <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: colors.metricLabel, marginBottom: '6px' }}>
      {label}
    </div>
    <div style={{ fontSize: '18px', fontWeight: '500', fontFeatureSettings: '"tnum" 1, "lnum" 1', color: isPositive === undefined ? colors.metricValue : isPositive ? colors.success : colors.error }}>
      {value}
    </div>
  </div>
);

// Panel Component
const Panel = ({ title, subtitle, children }) => (
  <div style={{ background: colors.panelBg, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '20px 18px 16px', boxShadow: '0 14px 35px rgba(15,23,42,0.08)' }}>
    {(title || subtitle) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        {title && <div style={{ textTransform: 'uppercase', letterSpacing: '0.16em', fontSize: '10px', color: colors.metricLabel }}>{title}</div>}
        {subtitle && <div style={{ fontSize: '11px', color: colors.muted }}>{subtitle}</div>}
      </div>
    )}
    {children}
  </div>
);

// Token Row Component
const TokenRow = ({ token }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '600', color: colors.accent, border: `1px solid ${colors.border}` }}>
        {token.symbol?.charAt(0)}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{token.symbol}</div>
        <div style={{ fontSize: '11px', color: colors.muted }}>{token.name}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontSize: '14px', fontWeight: '500', color: token.realizedProfitUsd >= 0 ? colors.success : colors.error, fontFeatureSettings: '"tnum" 1, "lnum" 1' }}>
        {token.realizedProfitUsd >= 0 ? '+' : ''}{formatCurrency(token.realizedProfitUsd)}
      </div>
      <div style={{ fontSize: '11px', color: colors.muted }}>{formatCurrency(token.totalUsdInvested)} invested</div>
    </div>
  </div>
);

// Biggest Win / Loss card
const BigMoveCard = ({ label, token, isWin }) => {
  if (!token) return null;
  const invested = token.totalUsdInvested || 0;
  const pnl = token.realizedProfitUsd || 0;
  const realizedValue = invested + pnl;
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
        <div style={{ fontSize: '20px', fontWeight: '700', color: text, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>
          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
        </div>
        <div style={{ fontSize: '11px', color: colors.muted }}>{token.name}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${isWin ? '#bbf7d0' : '#fecaca'}` }}>
        <div><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>Invested</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>{formatCurrency(invested)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '9px', textTransform: 'uppercase', color: colors.metricLabel, marginBottom: '2px' }}>Realized</div><div style={{ fontSize: '11px', fontWeight: '600', color: colors.ink }}>{formatCurrency(realizedValue)}</div></div>
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
  const bg = '#fffbeb';
  const border = '#fde68a';
  const text = '#92400e';
  const pillBg = '#fef3c7';

  return (
    <div style={{ flex: '1 1 140px', padding: '12px', borderRadius: '16px', border: `1px solid ${border}`, background: bg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#b45309' }}>Biggest Fumble</div>
        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: pillBg, color: text }}>Missed</div>
      </div>
      <div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: text, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>
          {missed >= 0 ? '+' : ''}{formatCurrency(missed)}
        </div>
        <div style={{ fontSize: '11px', color: '#b45309' }}>{token.name || token.symbol}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: `1px dashed ${border}` }}>
        <div><div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#b45309', marginBottom: '2px' }}>Sold For</div><div style={{ fontSize: '11px', fontWeight: '600', color: text }}>{formatCurrency(sold)}</div></div>
        <div style={{ textAlign: 'right' }}><div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#b45309', marginBottom: '2px' }}>Worth Now</div><div style={{ fontSize: '11px', fontWeight: '600', color: text }}>{formatCurrency(current)} {multiple > 0 && <span style={{ opacity: 0.7, marginLeft: '2px' }}>({multiple.toFixed(1)}x)</span>}</div></div>
      </div>
    </div>
  );
};

// Simple error screen (no free access)
const ErrorScreen = ({ title, message }) => (
  <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
    <div style={{ background: colors.panelBg, borderRadius: '18px', border: `1px solid ${colors.border}`, padding: '28px 24px', maxWidth: '380px', width: '100%', textAlign: 'center' }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '50%', border: `1px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: '18px' }}>⚠️</div>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.16em', color: colors.metricLabel, marginBottom: '8px' }}>{title}</div>
      <p style={{ fontSize: '13px', color: colors.muted, lineHeight: 1.6, margin: 0 }}>{message}</p>
    </div>
  </div>
);

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

  // Environment error
  const [envError, setEnvError] = useState(null);

  // Share PnL via Farcaster
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
      
      const realized = formatCurrency(pnlValue);
      const direction = isWin ? 'up' : 'down';
      
      const topText = `( Ψ ) PnL: @${username}`;
      const bottomText = realized;
      const textPath = encodeURIComponent(`**${topText}**\n${bottomText}`);
      const invisibleLogo = 'https://assets.vercel.com/image/upload/front/assets/design/vercel-triangle-white.svg';
      const imageUrl = `https://og-image.vercel.app/${textPath}.png?theme=light&md=1&fontSize=100px&images=${encodeURIComponent(invisibleLogo)}&widths=1&heights=1`;

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
    if (!PNL_TOKEN_ADDRESS) {
      setTokenBalance(0);
      setCheckingGate(false);
      setIsGated(false);
      return true;
    }

    if (DEMO_MODE) {
      await new Promise((r) => setTimeout(r, 500));
      setTokenBalance(REQUIRED_PNL_BALANCE + 100);
      setCheckingGate(false);
      setIsGated(false);
      return true;
    }

    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`,
        { headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' } }
      );

      const data = await response.json();
      const pnlToken = data?.[0];
      const balance = pnlToken ? parseInt(pnlToken.balance) / 10 ** (pnlToken.decimals || 18) : 0;

      setTokenBalance(balance);
      
      // IMPORTANT: We determine gate status here
      const gated = balance < REQUIRED_PNL_BALANCE;
      setIsGated(gated);
      setCheckingGate(false);

      return !gated;
    } catch (err) {
      console.error('Token gate check failed:', err);
      setCheckingGate(false);
      // On error, default to gated to be safe
      setIsGated(true);
      return false;
    }
  };

  // Fetch PNL data
  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);

      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 600));
        setPnlData(MOCK_PNL_DATA);
        setLoading(false);
        return;
      }

      // CACHE CHECK
      let cacheKey = null;
      if (typeof window !== 'undefined' && Array.isArray(addresses) && addresses.length > 0) {
        const sortedAddresses = addresses.map((a) => a.toLowerCase()).sort();
        const fidPart = user?.fid ? `fid_${user.fid}` : 'anon';
        cacheKey = `pnl_cache_${fidPart}_${sortedAddresses.join(',')}`;

        try {
          const raw = window.localStorage.getItem(cacheKey);
          if (raw) {
            const stored = JSON.parse(raw);
            if (stored && stored.timestamp && stored.data && Date.now() - stored.timestamp < PNL_CACHE_TTL_MS) {
              setPnlData(stored.data);
              setLoading(false);
              return;
            }
          }
        } catch (storageErr) {
          console.log('localStorage read failed', storageErr);
        }
      }

      // DATA FETCH
      const fetchPromises = addresses.map((address) =>
        fetch(`https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=base`, {
          headers: { accept: 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' }
        }).then((res) => res.json())
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

      let biggestFumbleToken = null;
      if (tokenAddressesForFumble.size > 0) {
        try {
          const priceResponse = await fetch('https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=base', {
            method: 'POST',
            headers: { accept: 'application/json', 'content-type': 'application/json', 'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || '' },
            body: JSON.stringify({ tokens: Array.from(tokenAddressesForFumble).map((addr) => ({ token_address: addr })) })
          });
          const priceData = await priceResponse.json();
          const priceArray = Array.isArray(priceData) ? priceData : priceData.result || priceData.tokens || [];
          const priceMap = new Map();
          priceArray.forEach((p) => {
            const addr = (p.tokenAddress || p.token_address || '').toLowerCase();
            const rawUsd = p.usdPrice !== undefined ? p.usdPrice : p.usd_price !== undefined ? p.usd_price : p.usdPriceFormatted;
            const usdPrice = parseFloat(rawUsd) || 0;
            if (addr && usdPrice > 0) priceMap.set(addr, usdPrice);
          });
          allTokenData.forEach((t) => {
            if (!t.tokenAddress || !t.totalTokensSold || !t.totalSoldUsd) return;
            const priceUsd = priceMap.get(t.tokenAddress);
            if (!priceUsd) return;
            const currentValueSoldTokens = t.totalTokensSold * priceUsd;
            const missedUpsideUsd = currentValueSoldTokens - t.totalSoldUsd;
            if (missedUpsideUsd <= 0) return;
            if (!biggestFumbleToken || missedUpsideUsd > biggestFumbleToken.missedUpsideUsd) {
              biggestFumbleToken = { ...t, missedUpsideUsd, currentValueSoldTokens, currentPriceUsd: priceUsd };
            }
          });
        } catch (err) { console.log('error computing biggest fumble', err); }
      }

      const resultData = { summary, tokens: allTokenData, biggestFumble: biggestFumbleToken };
      setPnlData(resultData);
      
      if (cacheKey && typeof window !== 'undefined') {
        try { window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: resultData })); } 
        catch (storageErr) { console.log('localStorage write failed', storageErr); }
      }
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
          const neynarResponse = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, { headers: { accept: 'application/json', api_key: import.meta.env.VITE_NEYNAR_API_KEY || '' } });
          const neynarData = await neynarResponse.json();
          const primaryEth = neynarData?.users?.[0]?.verified_addresses?.primary?.eth_address || null;
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
            // If gated, we load Mock Data so the background isn't empty.
            if (hasAccess) {
               await fetchPNLData(initialAddresses);
            } else {
               setPnlData(MOCK_PNL_DATA);
               setLoading(false);
            }
          }
        }
        setCheckingGate(false);
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
      // If we are already gated, we don't fetch real data, we just stay in blurred mode.
      // If we are unlocked, we fetch real data.
      if (!isGated) {
        await fetchPNLData(addresses);
      }
    }
  };

  const handleRetryGate = () => {
    setCheckingGate(true);
    if (wallets.length > 0) {
       const target = primaryWallet || wallets[0];
       checkTokenGate(target).then((hasAccess) => {
          if(hasAccess) {
             // If unlock successful, fetch real data immediately
             fetchPNLData([target]);
          }
       });
    }
  };

  // RENDER HELPERS
  const renderGatedOverlay = () => (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 50,
      display: 'flex',
      // CHANGED: Center alignment
      alignItems: 'center',
      justifyContent: 'center',
      // CHANGED: Removed paddingBottom
      paddingBottom: '0', 
      background: 'rgba(255, 255, 255, 0.05)' // Very subtle tint
    }}>
      <div style={{
        background: colors.panelBg,
        borderRadius: '24px',
        border: `1px solid ${colors.border}`,
        padding: '32px 28px',
        maxWidth: '340px',
        width: '90%',
        // CHANGED: Adjusted negative margin to nudge it slightly up for better optical balance
        marginTop: '-10%', 
        boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.2)', 
        textAlign: 'center'
      }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>🔒</div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', color: colors.ink, margin: '0 0 8px' }}>Unlock PnL Tracker</h2>
        <p style={{ fontSize: '13px', color: colors.muted, lineHeight: '1.5', margin: '0 0 20px' }}>
          You need <strong>{formatNumber(REQUIRED_PNL_BALANCE)} $PNL</strong> to see your real performance.
        </p>
        
        {/* Display User Balance if available */}
        <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
            <span style={{ color: colors.metricLabel }}>Your Balance</span>
            <span style={{ fontWeight: '600', color: tokenBalance < REQUIRED_PNL_BALANCE ? colors.error : colors.success }}>{formatNumber(tokenBalance)}</span>
          </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: colors.metricLabel }}>Required</span>
            <span style={{ fontWeight: '600' }}>{formatNumber(REQUIRED_PNL_BALANCE)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleSwapForAccess} style={{ flex: 1, padding: '11px', borderRadius: '99px', background: colors.pill, color: colors.pillText, fontSize: '12px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>Get $PNL</button>
          <button onClick={handleRetryGate} style={{ flex: 1, padding: '11px', borderRadius: '99px', background: 'transparent', color: colors.ink, border: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>Check Again</button>
        </div>
      </div>
    </div>
  );

  // Loading State
  if (loading || checkingGate) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '24px', height: '24px', border: `2px solid ${colors.border}`, borderTopColor: colors.ink, borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontSize: '12px', color: colors.muted, letterSpacing: '0.05em' }}>syncing onchain data...</div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (envError) {
    return <ErrorScreen title="Access Locked" message={envError} />;
  }

  // derive tokens for UI
  const tokens = pnlData?.tokens || [];
  const winningTokens = tokens.filter((t) => (t.realizedProfitUsd || 0) > 0);
  const losingTokens = tokens.filter((t) => (t.realizedProfitUsd || 0) < 0);
  
  // Use real calculated best/worst if available, otherwise fallback to mock struct for preview
  const biggestWin = pnlData?.biggestWin || (winningTokens.length > 0 ? winningTokens.reduce((best, t) => (!best || t.realizedProfitUsd > best.realizedProfitUsd ? t : best), null) : null);
  const biggestLoss = pnlData?.biggestLoss || (losingTokens.length > 0 ? losingTokens.reduce((worst, t) => (!worst || t.realizedProfitUsd < worst.realizedProfitUsd ? t : worst), null) : null);
  const biggestFumble = pnlData?.biggestFumble || null;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', color: colors.ink, position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      {/* GATED OVERLAY */}
      {isGated && renderGatedOverlay()}

      {/* MAIN CONTENT (Blurred if Gated) */}
      <div style={{ 
        maxWidth: '540px', 
        margin: '0 auto', 
        padding: '28px 18px 60px', 
        filter: isGated ? 'blur(3px)' : 'none', // CHANGED: Reduced blur from 8px to 3px
        pointerEvents: isGated ? 'none' : 'auto',
        opacity: 1, // CHANGED: Kept full opacity for max visibility
        transition: 'all 0.4s ease'
      }}>
        {/* Header */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: `1px solid ${colors.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}>📊</div>
            <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '12px', fontWeight: '500' }}>PNL Tracker</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={handleSharePnL} disabled={!pnlData?.summary} style={{ padding: '6px 12px', borderRadius: '999px', border: `1px solid ${colors.accent}`, background: colors.panelBg, color: colors.accent, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <span>Share PnL</span>
            </button>
            <div style={{ padding: '4px 10px', borderRadius: '999px', background: pnlData?.summary?.totalRealizedProfit >= 0 ? '#dcfce7' : '#fef2f2', color: pnlData?.summary?.totalRealizedProfit >= 0 ? '#166534' : '#991b1b', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: pnlData?.summary?.totalRealizedProfit >= 0 ? colors.success : colors.error }} />
              {pnlData?.summary?.totalRealizedProfit >= 0 ? 'Profitable' : 'Loss'}
            </div>
          </div>
        </header>

        {/* Wallet Selector */}
        {wallets.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '11px', color: colors.accent, background: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.muted }}>wallet</span>
              <span style={{ fontWeight: '600' }}>{activeScope === 'all' ? 'All wallets' : activeScope === 'primary' && primaryWallet ? truncateAddress(primaryWallet) : truncateAddress(wallets[0])}</span>
            </div>
            {wallets.length > 1 && (
              <div style={{ marginTop: '10px' }}>
                 <select value={activeScope} onChange={handleWalletScopeChange} style={{ width: '100%', fontSize: '12px', padding: '8px 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: colors.panelBg, color: colors.ink }}>
                  {primaryWallet && <option value="primary">Primary · {truncateAddress(primaryWallet)}</option>}
                  <option value="all">All verified wallets combined</option>
                  {wallets.map((addr) => <option key={addr} value={addr}>{truncateAddress(addr)}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Main PNL Display */}
        {pnlData?.summary && (
          <Panel title="Total Realized P&L" subtitle="Base Chain">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '32px', fontWeight: '600', color: pnlData.summary.totalRealizedProfit >= 0 ? colors.success : colors.error, marginBottom: '8px' }}>
                {pnlData.summary.totalRealizedProfit >= 0 ? '+' : ''}{formatCurrency(pnlData.summary.totalRealizedProfit)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '999px', background: pnlData.summary.profitPercentage >= 0 ? '#dcfce7' : '#fef2f2', color: pnlData.summary.profitPercentage >= 0 ? '#166534' : '#991b1b', fontSize: '12px', fontWeight: '500' }}>
                {pnlData.summary.profitPercentage >= 0 ? '↑' : '↓'}{Math.abs(pnlData.summary.profitPercentage).toFixed(1)}% ROI
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderTop: `1px solid ${colors.border}`, paddingTop: '18px', marginTop: '16px' }}>
              <Metric label="Volume" value={formatCurrency(pnlData.summary.totalTradingVolume)} />
              <Metric label="Win Rate" value={`${pnlData.summary.winRate.toFixed(1)}%`} isPositive={pnlData.summary.winRate >= 50} />
              <Metric label="Tokens" value={pnlData.summary.totalTokensTraded} />
            </div>
          </Panel>
        )}

        {/* Highlights */}
        {tokens.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <Panel title="Highlights">
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'stretch' }}>
                {biggestWin && <BigMoveCard label="Biggest win" token={biggestWin} isWin={true} />}
                {biggestLoss && <BigMoveCard label="Biggest loss" token={biggestLoss} isWin={false} />}
                {biggestFumble && <BigFumbleCard token={biggestFumble} />}
              </div>
            </Panel>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', margin: '24px 0 16px' }}>
          {['overview', 'tokens'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '9px 16px', borderRadius: '999px', border: activeTab === tab ? 'none' : `1px solid ${colors.border}`, background: activeTab === tab ? colors.accent : colors.panelBg, color: activeTab === tab ? colors.pillText : colors.muted, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', cursor: 'pointer' }}>{tab}</button>
          ))}
        </div>

        {/* Lists */}
        {activeTab === 'overview' && pnlData?.tokens && (
          <Panel title="Top Performers">
            {pnlData.tokens.filter((t) => t.isProfitable).sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).slice(0, 3).map((token, idx) => <TokenRow key={idx} token={token} />)}
          </Panel>
        )}

        {activeTab === 'tokens' && pnlData?.tokens && (
          <Panel title="All Tokens">
            {pnlData.tokens.slice().sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd).map((token, idx) => <TokenRow key={idx} token={token} />)}
          </Panel>
        )}
      </div>
    </div>
  );
}