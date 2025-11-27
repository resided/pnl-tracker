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
  username: "dwr.eth",
  displayName: "Dan Romero",
  pfpUrl: "https://i.pravatar.cc/150?u=dwr"
};

const MOCK_WALLETS = [
  "0xd7029bdea1c17493893aafe29aad69ef892b8ff2",
  "0xa14b4c95b5247199d74c5578531b4887ca5e4909"
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
      boxShadow: '0 14px 35px rgba(15,23,42,0.08)',
      textAlign: 'center'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: '#fef2f2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '28px'
      }}>🔒</div>
      
      <div style={{
        fontSize: '10px',
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: colors.metricLabel,
        marginBottom: '8px'
      }}>Token Gated Access</div>
      
      <h2 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: colors.ink,
        margin: '0 0 12px'
      }}>Insufficient $PNL Balance</h2>
      
      <p style={{
        fontSize: '13px',
        color: colors.muted,
        lineHeight: '1.6',
        margin: '0 0 24px'
      }}>
        you need to hold at least <strong style={{ color: colors.ink }}>{formatNumber(required)} $PNL</strong> tokens to access the PNL Tracker.
      </p>
      
      <div style={{
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        border: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: colors.metricLabel
          }}>Your Balance</span>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: colors.error,
            fontFeatureSettings: '"tnum" 1, "lnum" 1'
          }}>{formatNumber(balance)} $PNL</span>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: colors.metricLabel
          }}>Required</span>
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: colors.ink,
            fontFeatureSettings: '"tnum" 1, "lnum" 1'
          }}>{formatNumber(required)} $PNL</span>
        </div>
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
            border: `1px solid ${colors.accent}`,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >Retry</button>
      </div>
    </div>
  </div>
);

// Metric Component
const Metric = ({ label, value, isPositive }) => (
  <div style={{ minWidth: '100px' }}>
    <div style={{
      fontSize: '11px',
      textTransform: 'uppercase',
      letterSpacing: '0.16em',
      color: colors.metricLabel,
      marginBottom: '6px'
    }}>{label}</div>
    <div style={{
      fontSize: '18px',
      fontWeight: '500',
      fontFeatureSettings: '"tnum" 1, "lnum" 1',
      color: isPositive === undefined ? colors.metricValue : (isPositive ? colors.success : colors.error)
    }}>{value}</div>
  </div>
);

// Panel Component
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
          <div style={{
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontSize: '10px',
            color: colors.metricLabel
          }}>{title}</div>
        )}
        {subtitle && (
          <div style={{ fontSize: '11px', color: colors.muted }}>{subtitle}</div>
        )}
      </div>
    )}
    {children}
  </div>
);

// Token Row Component
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
            padding: '9px 16px',
            borderRadius: '999px',
            border: `1px solid ${colors.accent}`,
            background: colors.accent,
            color: colors.pillText,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >Track</button>
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
  const [pnlData, setPnlData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [manualMode, setManualMode] = useState(false);
  
  const handleSharePnl = async () => {
    try {
      if (!pnlData || !pnlData.summary) return;
      const { sdk } = await import('@farcaster/miniapp-sdk');

      const realized = pnlData.summary.totalRealizedProfit ?? 0;
      const winRate = pnlData.summary.winRate ?? 0;

      const realizedLabel = formatCurrency(realized);
      const winRateLabel =
        typeof winRate === 'number' ? `${winRate.toFixed(1)}%` : `${winRate || ''}`;

      const appUrl = (import.meta.env.VITE_APP_URL || window.location.href).replace(/\/$/, '');

      await sdk.actions.composeCast({
        text: `My Base PnL: ${realizedLabel} realized (${winRateLabel} win rate) using the PNL Tracker mini app.`,
        embeds: [appUrl]
      });
    } catch (err) {
      console.error('Failed to share PnL (likely not in Mini App context):', err);
    }
  };

  // Token gate state
  const [isGated, setIsGated] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [checkingGate, setCheckingGate] = useState(true);

  // Check token balance for gating
  const checkTokenGate = async (address) => {
    // Temporary: skip token gate while no real PNL token is configured
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
      await new Promise(r => setTimeout(r, 500));
      setTokenBalance(2500000);
      setCheckingGate(false);
      return true;
    }

    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=base&token_addresses[]=${PNL_TOKEN_ADDRESS}`,
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

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        if (DEMO_MODE) {
          await new Promise(r => setTimeout(r, 800));
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
          const userAddresses = neynarData?.users?.[0]?.verified_addresses?.eth_addresses || [];
          setWallets(userAddresses);

          if (userAddresses.length > 0) {
            const hasAccess = await checkTokenGate(userAddresses[0]);
            if (hasAccess) {
              await fetchPNLData(userAddresses);
            }
          }
        }

        setLoading(false);
      } catch (err) {
        setLoading(false);
        setCheckingGate(false);
      }
    };

    initialize();
  }, []);

  // Fetch PNL data
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
          data.result.forEach(token => {
            allTokenData.push({
              name: token.name,
              symbol: token.symbol,
              totalUsdInvested: parseFloat(token.total_usd_invested) || 0,
              realizedProfitUsd: parseFloat(token.realized_profit_usd) || 0,
              isProfitable: parseFloat(token.realized_profit_usd) > 0
            });
            totalRealized += parseFloat(token.realized_profit_usd) || 0;
            totalVolume += parseFloat(token.total_usd_invested) || 0;
          });
        }
      }

      const profitableTokens = allTokenData.filter(t => t.isProfitable).length;
      const summary = {
        totalRealizedProfit: totalRealized,
        totalUnrealizedProfit: 0,
        totalTradingVolume: totalVolume,
        profitPercentage: totalVolume > 0 ? (totalRealized / totalVolume) * 100 : 0,
        totalTokensTraded: allTokenData.length,
        winRate: allTokenData.length > 0 ? (profitableTokens / allTokenData.length) * 100 : 0
      };

      setPnlData({ summary, tokens: allTokenData });
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleManualWallet = async (address) => {
    const hasAccess = await checkTokenGate(address);
    if (hasAccess) {
      setWallets([address]);
      fetchPNLData([address]);
      setManualMode(false);
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

  // Loading state
  if (loading || checkingGate) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #e5e7eb',
            borderTopColor: '#111827',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 0.8s linear infinite'
          }} />
          <div style={{
            fontSize: '12px',
            color: colors.muted,
            textTransform: 'lowercase',
            letterSpacing: '0.12em'
          }}>
            {checkingGate ? 'checking $pnl balance' : 'loading pnl data'}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Manual input mode
  if (manualMode || (!user && !DEMO_MODE)) {
    return (
      <div style={{
        minHeight: '100vh',
        background: colors.bg,
        padding: '28px 18px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
      }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: `1px solid ${colors.accent}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '20px'
            }}>📊</div>
            <div style={{
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: colors.ink,
              marginBottom: '8px'
            }}>PNL Tracker</div>
            <p style={{
              fontSize: '13px',
              color: colors.muted,
              lineHeight: '1.6',
              margin: 0
            }}>
              enter a wallet address to track trading performance on base. requires {formatNumber(REQUIRED_PNL_BALANCE)} $PNL tokens.
            </p>
          </div>
          <Panel>
            <WalletInput onSubmit={handleManualWallet} />
          </Panel>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.bg,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }}>
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
          <div>
            <div
              style={{
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              PNL Tracker
            </div>
            <div
              style={{
                fontSize: '11px',
                color: colors.muted
              }}
            >
              Base PnL dashboard
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleSharePnl}
            disabled={!pnlData || !pnlData.summary}
            style={{
              padding: '7px 16px',
              borderRadius: '999px',
              border: `1px solid ${colors.border}`,
              background: colors.pill,
              color: colors.pillText,
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: !pnlData || !pnlData.summary ? 'default' : 'pointer',
              opacity: !pnlData || !pnlData.summary ? 0.4 : 1
            }}
          >
            <span style={{ fontSize: '13px' }}>📤</span>
            <span>Share PnL</span>
          </button>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '999px',
              background:
                pnlData?.summary?.totalRealizedProfit >= 0 ? '#dcfce7' : '#fef2f2',
              color:
                pnlData?.summary?.totalRealizedProfit >= 0 ? '#166534' : '#991b1b',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <div
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background:
                  pnlData?.summary?.totalRealizedProfit >= 0
                    ? colors.success
                    : colors.error
              }}
            />
            {pnlData?.summary?.totalRealizedProfit >= 0 ? 'Profitable' : 'Loss'}
          </div>
        </div>
      </header>

        {/* User Info */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {user.pfpUrl && (
              <img
                src={user.pfpUrl}
                alt={user.username}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: `1px solid ${colors.border}`
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: colors.ink }}>{user.displayName}</div>
              <div style={{ fontSize: '12px', color: colors.muted }}>@{user.username}</div>
            </div>
          </div>
        )}

        {/* Wallet Badge */}
        {wallets.length > 0 && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            color: colors.accent,
            background: '#f3f4f6',
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            marginBottom: '24px'
          }}>
            <span style={{ color: colors.muted }}>wallet</span>
            <span style={{ fontWeight: '600' }}>{truncateAddress(wallets[0])}</span>
          </div>
        )}

        {/* Main PNL Display */}
        {pnlData?.summary && (
          <Panel title="Total Realized P&L" subtitle="Base Chain">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{
                fontSize: '32px',
                fontWeight: '600',
                color: pnlData.summary.totalRealizedProfit >= 0 ? colors.success : colors.error,
                fontFeatureSettings: '"tnum" 1, "lnum" 1',
                marginBottom: '8px'
              }}>
                {pnlData.summary.totalRealizedProfit >= 0 ? '+' : ''}
                {formatCurrency(pnlData.summary.totalRealizedProfit)}
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                borderRadius: '999px',
                background: pnlData.summary.profitPercentage >= 0 ? '#dcfce7' : '#fef2f2',
                color: pnlData.summary.profitPercentage >= 0 ? '#166534' : '#991b1b',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {pnlData.summary.profitPercentage >= 0 ? '↑' : '↓'}
                {Math.abs(pnlData.summary.profitPercentage).toFixed(1)}% ROI
              </div>
            </div>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '24px',
              borderTop: `1px solid ${colors.border}`,
              paddingTop: '18px',
              marginTop: '16px'
            }}>
              <Metric label="Volume" value={formatCurrency(pnlData.summary.totalTradingVolume)} />
              <Metric label="Win Rate" value={`${pnlData.summary.winRate.toFixed(1)}%`} isPositive={pnlData.summary.winRate >= 50} />
              <Metric label="Tokens" value={pnlData.summary.totalTokensTraded} />
            </div>
          </Panel>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', margin: '24px 0 16px' }}>
          {['overview', 'tokens'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
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
          <Panel title="Top Performers">
            {pnlData.tokens
              .filter(t => t.isProfitable)
              .sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd)
              .slice(0, 3)
              .map((token, idx) => (
                <TokenRow key={idx} token={token} />
              ))}
            {pnlData.tokens.filter(t => t.isProfitable).length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: colors.muted, fontSize: '13px' }}>
                no profitable trades yet
              </div>
            )}
          </Panel>
        )}

        {/* Tokens Tab */}
        {activeTab === 'tokens' && pnlData?.tokens && (
          <Panel 
            title="All Tokens" 
            subtitle={`${pnlData.tokens.filter(t => t.isProfitable).length}/${pnlData.tokens.length} profitable`}
          >
            {pnlData.tokens
              .sort((a, b) => b.realizedProfitUsd - a.realizedProfitUsd)
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
            fontSize: '11px',
            color: '#854d0e',
            textAlign: 'center'
          }}>
            <strong style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Demo Mode</strong>
            <span style={{ margin: '0 8px' }}>·</span>
            sample data shown. deploy with api keys for real tracking.
          </div>
        )}

        {/* Token Gate Badge */}
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            color: colors.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.12em'
          }}>
            <span>🔐</span>
            <span>Token Gated · {formatNumber(REQUIRED_PNL_BALANCE)} $PNL Required</span>
          </div>
        </div>
      </div>
    </div>
  );
}
