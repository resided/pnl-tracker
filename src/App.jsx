import React, { useState, useEffect } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic
// Token gated: requires 3,000,000 $PNL tokens to access

const DEMO_MODE = false; // Set to false when deployed with real APIs

// Token gate configuration
const PNL_TOKEN_ADDRESS =
  import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const REQUIRED_PNL_BALANCE = 3000000; // 3 million tokens required

// Mock data for demo/preview mode
const MOCK_USER = {
  fid: 3,
  username: 'demo',
  displayName: 'Demo User'
};

const MOCK_WALLETS = [
  '0x1234567890abcdef1234567890abcdef12345678',
  '0xabcdef1234567890abcdef1234567890abcdef12'
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
    { name: "BRETT", symbol: "BRETT", totalUsdInvested: 5000, realizedProfitUsd: 8420.50, isProfitable: true },
    { name: "DEGEN", symbol: "DEGEN", totalUsdInvested: 2500, realizedProfitUsd: 3127.25, isProfitable: true },
    { name: "TOSHI", symbol: "TOSHI", totalUsdInvested: 1800, realizedProfitUsd: 1299.81, isProfitable: true },
    { name: "NORMIE", symbol: "NORMIE", totalUsdInvested: 3000, realizedProfitUsd: -1245.32, isProfitable: false },
    { name: "HIGHER", symbol: "HIGHER", totalUsdInvested: 1200, realizedProfitUsd: 1245.32, isProfitable: true },
    { name: "ENJOY", symbol: "ENJOY", totalUsdInvested: 800, realizedProfitUsd: -234.12, isProfitable: false }
  ]
};

// Utility functions
const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0.00';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}K`;
  }
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
  bg: '#020617',
  card: '#020617',
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
const TokenGateScreen = ({ balance, required, onRetry }) => (
  <div style={{
    minHeight: '100vh',
    background: colors.bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
  }}>
    <div style={{
      background: colors.panelBg,
      borderRadius: '18px',
      border: `1px solid ${colors.border}`,
      padding: '32px 28px',
      maxWidth: '400px',
      width: '100%',
      boxShadow: '0 18px 45px rgba(15,23,42,0.25)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px',
            height: '30px',
            borderRadius: '999px',
            background: '#eef2ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px'
          }}>📊</div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>PNL Tracker</div>
            <div style={{ fontSize: '12px', color: colors.muted }}>
              Access requires 3,000,000 $PNL
            </div>
          </div>
        </div>
      </div>

      <div style={{
        padding: '12px 14px',
        borderRadius: '12px',
        background: '#f9fafb',
        border: `1px solid ${colors.border}`,
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '4px' }}>
          Your $PNL balance
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>
            {formatNumber(balance || 0)}
          </div>
          <div style={{ fontSize: '12px', color: colors.muted }}>
            Required: {formatNumber(required)}
          </div>
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#b91c1c',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{
            width: '18px',
            height: '18px',
            borderRadius: '999px',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px'
          }}>!</span>
          You need at least 3,000,000 $PNL in your wallet to use this app.
        </div>
      </div>

      <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '14px' }}>
        Buy or bridge $PNL into your Warpcast wallet, then tap refresh once the
        transaction confirms.
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <a
          href="https://app.uniswap.org"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: '999px',
            background: colors.pill,
            color: colors.pillText,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontWeight: '500'
          }}
        >Buy $PNL</a>
        <button
          onClick={onRetry}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: '999px',
            background: colors.panelBg,
            color: colors.accent,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            border: `1px solid ${colors.border}`
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  </div>
);

// Summary Metric Component
const SummaryMetric = ({ label, value, suffix, tone }) => {
  let color = colors.metricValue;
  if (tone === 'good') color = colors.success;
  if (tone === 'bad') color = colors.error;

  return (
    <div style={{ flex: 1, minWidth: '0' }}>
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: colors.metricLabel,
        marginBottom: '4px'
      }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 600, color }}>
        {value}{suffix && <span style={{ fontSize: '13px', marginLeft: '3px', color: colors.muted }}>{suffix}</span>}
      </div>
    </div>
  );
};

const Panel = ({ title, subtitle, children }) => (
  <div style={{
    background: colors.panelBg,
    borderRadius: '18px',
    border: `1px solid ${colors.border}`,
    padding: '20px 18px 16px',
    boxShadow: '0 14px 35px rgba(15,23,42,0.08)'
  }}>
    {(title || subtitle) && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px'
      }}>
        {title && (
          <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {title}
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: '11px', color: colors.muted }}>
            {subtitle}
          </div>
        )}
      </div>
    )}
    <div>
      {children}
    </div>
  </div>
);

const TokenRow = ({ token }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{
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
      }}>{token.symbol?.charAt(0)}</div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{token.symbol}</div>
        <div style={{ fontSize: '11px', color: colors.muted }}>{token.name}</div>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '500',
        color: token.isProfitable ? colors.success : colors.error,
        fontFeatureSettings: '"tnum" 1, "lnum" 1'
      }}>
        {token.realizedProfitUsd >= 0 ? '+' : ''}{formatCurrency(token.realizedProfitUsd)}
      </div>
      <div style={{ fontSize: '11px', color: colors.muted }}>
        {formatCurrency(token.totalUsdInvested)} invested
      </div>
    </div>
  </div>
);

const TradeHighlightCard = ({ label, token, mode }) => {
  const baseStyle = {
    flex: 1,
    minWidth: '0',
    padding: '12px 12px',
    borderRadius: '14px',
    border: `1px solid ${colors.border}`,
    background: colors.panelBg,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  };

  const labelStyle = {
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    color: colors.metricLabel
  };

  if (!token) {
    return (
      <div style={baseStyle}>
        <div style={labelStyle}>{label}</div>
        <div style={{ fontSize: '13px', color: colors.muted }}>
          not enough data yet
        </div>
      </div>
    );
  }

  let headline = '';
  let chipText = '';
  let accentColor = colors.accent;
  let caption = '';
  const title = token.symbol || token.name || '';

  if (mode === 'win' || mode === 'loss') {
    const invested = token.totalUsdInvested || 0;
    const realized = token.realizedProfitUsd || 0;
    const pct = invested > 0 ? (realized / invested) * 100 : 0;
    headline = formatCurrency(realized);
    chipText = mode === 'win' ? 'realized profit' : 'realized loss';
    accentColor = mode === 'win' ? '#16a34a' : '#b91c1c';
    caption = `Invested ${formatCurrency(invested)} · ${pct.toFixed(1)}%`;
  } else if (mode === 'fumble') {
    const missed = token.missedUpsideUsd || 0;
    const sold = token.totalSoldUsd || 0;
    const worthNow = token.currentValueSoldTokens || 0;
    const multiple = sold > 0 ? worthNow / sold : 0;
    headline = formatCurrency(missed);
    chipText = 'missed upside';
    accentColor = '#854d0e';
    if (sold > 0 && worthNow > 0) {
      const multipleText = multiple > 0 ? ` (${multiple.toFixed(1)}×)` : '';
      caption = `Sold ~${formatCurrency(sold)} · would be ${formatCurrency(worthNow)} now${multipleText}`;
    } else {
      caption = 'closed positions that would now be worth more if held';
    }
  }

  return (
    <div style={baseStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 500, color: colors.ink }}>
        {title}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '4px'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 600, color: accentColor }}>
          {headline}
        </div>
        {chipText && (
          <span style={{
            padding: '4px 8px',
            borderRadius: '999px',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            border: `1px solid ${accentColor}`,
            color: accentColor
          }}>
            {chipText}
          </span>
        )}
      </div>
      {caption && (
        <div style={{
          marginTop: '4px',
          fontSize: '11px',
          color: colors.muted
        }}>
          {caption}
        </div>
      )}
    </div>
  );
};

// Wallet Input Component
const WalletInput = ({ onSubmit }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('enter a valid ethereum address');
      return;
    }
    setError('');
    onSubmit(address);
  };

  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: colors.metricLabel,
        marginBottom: '6px'
      }}>Wallet Address</label>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="0x..."
          style={{
            flex: 1,
            padding: '9px 11px',
            borderRadius: '999px',
            border: `1px solid ${colors.border}`,
            fontSize: '13px',
            background: '#f9fafb',
            outline: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace'
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            padding: '9px 14px',
            borderRadius: '999px',
            background: colors.accent,
            color: colors.pillText,
            border: 'none',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em'
          }}
        >
          Load
        </button>
      </div>
      {error && (
        <div style={{ fontSize: '11px', color: colors.error, marginTop: '8px' }}>{error}</div>
      )}
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
  const [manualMode, setManualMode] = useState(false);
  const [checkingGate, setCheckingGate] = useState(true);
  const [isGated, setIsGated] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Check token balance for gating
  const checkTokenGate = async (address) => {
    // Temporary: skip token gate while PNL token is not configured
    if (
      !PNL_TOKEN_ADDRESS ||
      PNL_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000'
    ) {
      setTokenBalance(0);
      setCheckingGate(false);
      setIsGated(false);
      return true;
    }

    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 300));
      setTokenBalance(REQUIRED_PNL_BALANCE);
      setCheckingGate(false);
      setIsGated(false);
      return true;
    }

    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=base`,
        {
          headers: {
            'accept': 'application/json',
            'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || ''
          }
        }
      );
      const data = await response.json();
      const pnlToken = data?.[0];
      const balance = pnlToken ? parseInt(pnlToken.balance) / (10 ** (pnlToken.decimals || 18)) : 0;
      
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

  const fetchPNLData = async (addresses) => {
    try {
      setLoading(true);
      
      if (DEMO_MODE) {
        await new Promise(r => setTimeout(r, 600));
        setPnlData(MOCK_PNL_DATA);
        setLoading(false);
        return;
      }

      const allTokenData = [];
      let totalRealized = 0;
      let totalVolume = 0;
      const tokenAddressesForFumble = new Set();

      for (const address of addresses) {
        const response = await fetch(
          `https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=base`,
          {
            headers: {
              'accept': 'application/json',
              'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY || ''
            }
          }
        );
        
        const data = await response.json();
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
      }

      const profitableTokens = allTokenData.filter((t) => t.isProfitable).length;
      const summary = {
        totalRealizedProfit: totalRealized,
        totalUnrealizedProfit: 0,
        totalTradingVolume: totalVolume,
        profitPercentage: totalVolume > 0 ? (totalRealized / totalVolume) * 100 : 0,
        totalTokensTraded: allTokenData.length,
        winRate: allTokenData.length > 0 ? (profitableTokens / allTokenData.length) * 100 : 0
      };

      // Biggest win and loss by realized PnL
      let biggestWin = null;
      let biggestLoss = null;

      allTokenData.forEach((token) => {
        if (token.realizedProfitUsd > 0) {
          if (!biggestWin || token.realizedProfitUsd > biggestWin.realizedProfitUsd) {
            biggestWin = token;
          }
        }
        if (token.realizedProfitUsd < 0) {
          if (!biggestLoss || token.realizedProfitUsd < biggestLoss.realizedProfitUsd) {
            biggestLoss = token;
          }
        }
      });

      // Biggest fumble: tokens you sold that would be worth more today if you had just held
      let biggestFumble = null;
      if (tokenAddressesForFumble.size > 0) {
        try {
          const priceResponse = await fetch(
            `https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=base`,
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
          const pricePayload = await priceResponse.json();
          const priceArray = Array.isArray(pricePayload)
            ? pricePayload
            : pricePayload.result || pricePayload.tokens || [];

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

          allTokenData.forEach((token) => {
            if (!token.tokenAddress || !token.totalTokensSold || !token.totalSoldUsd) return;
            const priceUsd = priceMap.get(token.tokenAddress);
            if (!priceUsd) return;

            const currentValueSoldTokens = token.totalTokensSold * priceUsd;
            const missedUpsideUsd = currentValueSoldTokens - token.totalSoldUsd;
            if (missedUpsideUsd <= 0) return;

            if (!biggestFumble || missedUpsideUsd > biggestFumble.missedUpsideUsd) {
              biggestFumble = {
                ...token,
                missedUpsideUsd,
                currentValueSoldTokens,
                currentPriceUsd: priceUsd
              };
            }
          });
        } catch (priceErr) {
          console.log('error while computing fumble metric', priceErr);
        }
      }

      setPnlData({ summary, tokens: allTokenData, biggestWin, biggestLoss, biggestFumble });
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleManualWallet = async (address) => {
    const hasAccess = await checkTokenGate(address);
    if (hasAccess) {
      await fetchPNLData([address]);
      setManualMode(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (DEMO_MODE) {
        setUser(MOCK_USER);
        setWallets(MOCK_WALLETS);
        setPrimaryWallet(MOCK_WALLETS[0]);
        setActiveScope('primary');
        setCheckingGate(false);
        setIsGated(false);
        setTokenBalance(REQUIRED_PNL_BALANCE);
        await fetchPNLData([MOCK_WALLETS[0]]);
        setLoading(false);
        return;
      }

      try {
        let fid = null;
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          const context = await sdk.context;
          if (context?.user?.fid) {
            fid = context.user.fid;
            setUser(context.user);
          }
          sdk.actions.ready();
        } catch (err) {
          console.log('Not in Farcaster context, using manual mode');
          setManualMode(true);
          setCheckingGate(false);
          setLoading(false);
          return;
        }

        if (fid) {
          const neynarResponse = await fetch(
            `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
            {
              headers: {
                'accept': 'application/json',
                'api_key': import.meta.env.VITE_NEYNAR_API_KEY || ''
              }
            }
          );
          const neynarData = await neynarResponse.json();
          const primaryEth =
            neynarData?.users?.[0]?.verified_addresses?.primary?.eth_address || null;
          const allEth =
            neynarData?.users?.[0]?.verified_addresses?.eth_addresses || [];

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

          setLoading(false);
        } else {
          setManualMode(true);
          setCheckingGate(false);
          setLoading(false);
        }
      } catch (err) {
        console.error('init error', err);
        setManualMode(true);
        setCheckingGate(false);
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleScopeChange = async (scope) => {
    setActiveScope(scope);
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

  // Show token gate screen
  if (isGated && !DEMO_MODE) {
    return (
      <TokenGateScreen 
        balance={tokenBalance}
        required={REQUIRED_PNL_BALANCE}
        onRetry={handleRetryGate}
      />
    );
  }

  // Splash while loading context / gate
  if (checkingGate || loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      }}>
        <div style={{
          background: colors.panelBg,
          borderRadius: '18px',
          border: `1px solid ${colors.border}`,
          padding: '26px 24px',
          width: '86%',
          maxWidth: '420px',
          boxShadow: '0 18px 45px rgba(15,23,42,0.25)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '999px',
              background: '#eef2ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px'
            }}>📊</div>
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>PNL Tracker</div>
              <div style={{ fontSize: '12px', color: colors.muted }}>
                analysing your wallet
              </div>
            </div>
          </div>
          <div style={{
            height: '4px',
            borderRadius: '999px',
            background: '#e5e7eb',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '40%',
              borderRadius: '999px',
              background: '#111827',
              animation: 'pnl-loading 1.4s infinite ease-in-out'
            }} />
          </div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: colors.muted }}>
            pulling trade history and computing realized pnl
          </div>
        </div>
      </div>
    );
  }

  // Manual mode input if Farcaster SDK not available
  if (manualMode && !isGated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      }}>
        <div style={{
          background: colors.panelBg,
          borderRadius: '18px',
          border: `1px solid ${colors.border}`,
          padding: '24px 20px',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 18px 45px rgba(15,23,42,0.25)'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>PNL Tracker</div>
            <div style={{ fontSize: '12px', color: colors.muted }}>
              enter an ethereum address to inspect realized pnl and win rate
            </div>
          </div>
          <WalletInput onSubmit={handleManualWallet} />
        </div>
      </div>
    );
  }

  const summary = pnlData?.summary;

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      justifyContent: 'center',
      padding: '18px 0 36px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        padding: '0 16px'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '999px',
                background: '#eef2ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>📊</div>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>PNL Tracker</div>
                {user && (
                  <div style={{ fontSize: '12px', color: colors.muted }}>
                    for @{user.username}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary row */}
          {summary && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '8px'
            }}>
              <SummaryMetric
                label="Realized pnl"
                value={formatCurrency(summary.totalRealizedProfit)}
                tone={summary.totalRealizedProfit >= 0 ? 'good' : 'bad'}
              />
              <SummaryMetric
                label="Volume traded"
                value={formatCurrency(summary.totalTradingVolume)}
              />
              <SummaryMetric
                label="Win rate"
                value={summary.winRate.toFixed(1)}
                suffix="%"
                tone={summary.winRate >= 50 ? 'good' : 'bad'}
              />
            </div>
          )}

          {/* Wallet scope selector */}
          <div style={{
            marginTop: '8px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
            background: colors.panelBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ fontSize: '12px', color: colors.muted }}>
              Wallet scope
            </div>
            <select
              value={activeScope}
              onChange={(e) => handleScopeChange(e.target.value)}
              style={{
                flex: 1,
                fontSize: '12px',
                padding: '6px 8px',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                background: '#f9fafb'
              }}
            >
              {primaryWallet && (
                <option value="primary">
                  Primary ({truncateAddress(primaryWallet)})
                </option>
              )}
              {wallets.length > 1 && (
                <option value="all">
                  All connected ({wallets.length})
                </option>
              )}
              {wallets.map((w) => (
                <option key={w} value={w}>
                  {truncateAddress(w)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '14px'
        }}>
          {['overview', 'tokens'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '9px 16px',
                borderRadius: '999px',
                border: activeTab === tab ? 'none' : `1px solid ${colors.border}`,
                background: activeTab === tab ? colors.accent : colors.panelBg,
                color: activeTab === tab ? colors.pillText : colors.muted,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                cursor: 'pointer'
              }}
            >{tab}</button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && pnlData?.tokens && (
          <>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '16px'
            }}>
              <TradeHighlightCard
                label="Biggest win"
                token={pnlData.biggestWin}
                mode="win"
              />
              <TradeHighlightCard
                label="Biggest loss"
                token={pnlData.biggestLoss}
                mode="loss"
              />
              <TradeHighlightCard
                label="Biggest fumble"
                token={pnlData.biggestFumble}
                mode="fumble"
              />
            </div>

            <Panel title="Top performers">
              {pnlData.tokens
                .filter((t) => t.isProfitable)
                .sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd)
                .slice(0, 3)
                .map((token, idx) => (
                  <TokenRow key={idx} token={token} />
                ))}
              {pnlData.tokens.filter((t) => t.isProfitable).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px', color: colors.muted, fontSize: '13px' }}>
                  no profitable trades yet
                </div>
              )}
            </Panel>
          </>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && pnlData?.tokens && (
          <Panel title="All tokens">
            {pnlData.tokens
              .sort((a, b) => Math.abs(b.realizedProfitUsd) - Math.abs(a.realizedProfitUsd))
              .map((token, idx) => (
                <TokenRow key={idx} token={token} />
              ))}
          </Panel>
        )}

        {/* Demo Notice */}
        {DEMO_MODE && (
          <div style={{
            marginTop: '24px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#fefce8',
            border: '1px solid #fef08a',
            fontSize: '12px',
            color: '#854d0e',
            textAlign: 'center'
          }}>
            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Demo Mode</strong>
            <span style={{ margin: '0 8px' }}>·</span>
            sample data shown. deploy with api keys for real tracking.
          </div>
        )}
      </div>
    </div>
  );
}
