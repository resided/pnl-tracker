import React, { useState, useEffect, useCallback } from 'react';
// nothing

/* === GatedAccessPanel (mobile-first) === */
const GatedAccessPanel = ({
  tokenBalance,
  REQUIRED_PNL_BALANCE,
  handleSwapForAccess,
  handleRetryGate,
  colors,
  ds,
  upcomingTease = 'Trading Report',
}) => {
  const numericBalance = Number(tokenBalance) || 0;
  const shortfall = Math.max(0, REQUIRED_PNL_BALANCE - numericBalance);
  const pct = Math.min(
    100,
    Math.round((numericBalance / REQUIRED_PNL_BALANCE) * 100),
  );

  const formatPnLAmount = (v) =>
    (v || 0).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

  const FeatureRow = ({ title, desc }) => (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: 10,
        background: colors.panelBg,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 11, color: colors.muted }}>{desc}</div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.ink,
        padding: '16px 16px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          borderRadius: 20,
          background: colors.panelBg,
          boxShadow: '0 16px 40px rgba(15,23,42,0.18)',
          padding: 18,
          boxSizing: 'border-box',
        }}
      >
        {/* Brand row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 11, color: colors.muted }}>PNL Tracker</div>
          <div
            style={{
              fontSize: 11,
              color: colors.muted,
            }}
          >
            Gate: {formatPnLAmount(REQUIRED_PNL_BALANCE)} $PNL
          </div>
        </div>

        {/* Lock + title */}
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              margin: '0 auto 8px',
              background: '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🔒
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            Premium access required
          </div>
          <div style={{ fontSize: 12, color: colors.muted }}>
            Hold {formatPnLAmount(REQUIRED_PNL_BALANCE)} $PNL in your Farcaster
            primary wallet to unlock your full{' '}
            <strong>{upcomingTease}</strong> profile.
          </div>
        </div>

        {/* Progress */}
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 11,
              color: colors.muted,
              marginBottom: 6,
            }}
          >
            <span>Gate progress</span>
            <span>{pct}%</span>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: '#e5e7eb',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                borderRadius: 999,
                background:
                  'linear-gradient(90deg,#22c55e,#16a34a,#22c55e)',
                transition: 'width 180ms ease-out',
              }}
            />
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: colors.muted,
            }}
          >
            You are short{' '}
            <strong>{formatPnLAmount(shortfall)} $PNL</strong> for premium
            access.
          </div>
        </div>

        {/* PRIMARY CTA – moved to middle */}
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={handleSwapForAccess}
            style={{
              width: '100%',
              borderRadius: 999,
              border: 'none',
              padding: '11px 14px',
              fontSize: 14,
              fontWeight: 600,
              background:
                'linear-gradient(135deg,#22c55e,#16a34a,#22c55e)',
              color: '#f9fafb',
              boxShadow: '0 8px 18px rgba(22,163,74,0.35)',
              cursor: 'pointer',
            }}
          >
            Swap 10M $PNL · Unlock
          </button>
        </div>

        {/* Secondary CTA */}
        <div style={{ marginBottom: 14 }}>
          <button
            onClick={handleRetryGate}
            style={{
              width: '100%',
              borderRadius: 999,
              border: `1px solid ${colors.border}`,
              padding: '9px 12px',
              fontSize: 12,
              background: 'transparent',
              color: colors.muted,
              cursor: 'pointer',
            }}
          >
            I already hold 10M · Recheck gate
          </button>
        </div>

        {/* What you unlock */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Unlock your full trading profile
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <FeatureRow
              title="See exactly what you fumbled"
              desc="Realised vs unrealised, bags you sold early, and what they ran to."
            />
            <FeatureRow
              title="Complete PNL breakdown"
              desc="Per-token profit, ROI and trade-by-trade stats."
            />
            <FeatureRow
              title="Trident LLC audit"
              desc="Official trading report card with spicy habits and leaks."
            />
            <FeatureRow
              title="Score vs Base"
              desc="Trader score and leaderboard position across Base traders."
            />
          </div>
        </div>

        {/* Balance row */}
        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: `1px solid ${colors.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: colors.muted,
          }}
        >
          <span>Your balance</span>
          <span>
            {formatPnLAmount(numericBalance)} /{' '}
            {formatPnLAmount(REQUIRED_PNL_BALANCE)} $PNL
          </span>
        </div>
      </div>
    </div>
  );
};
/* === End GatedAccessPanel === */


// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires 10M PNL tokens to access full analytics & audit
// 2025 pass

const PNL_TOKEN_ADDRESS = '0x729b650e54b6a77b7346ba2e1177820e77f0bc8b'; // base

// Updated ABI with balanceOf and decimals
const PNL_TOKEN_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
];

// Example ABI for the checklist NFT (replace with your real ABI)
const CHECKLIST_NFT_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'hasMintedBadge',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'badgeType', type: 'uint8' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

const ds = {
  font: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, sans-serif',
  radiusLg: 24,
};

// Color palette
const colors = {
  bg: '#f5f5f7',
  card: '#ffffff',
  cardSoft: '#f9fafb',
  border: '#e5e7eb',
  ink: '#020617',
  inkSoft: '#111827',
  muted: '#6b7280',
  accent: '#0891b2',
  accentSoft: '#e0f2fe',
  pnlPositive: '#16a34a',
  pnlNegative: '#b91c1c',
  amber: '#f97316',
  // Additional for gating panel
  panelBg: '#ffffff',
};

const App = ({
  sdk,
  address: propAddress,
  warpcastWallet,
  farcasterUser,
  envConfig,
}) => {
  const [address, setAddress] = useState(propAddress || null);
  const [loading, setLoading] = useState(false);
  const [pnlData, setPnlData] = useState(null);
  const [auditNarrative, setAuditNarrative] = useState('');
  const [percentileData, setPercentileData] = useState(null);
  const [primaryWallet, setPrimaryWallet] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState('primary');
  const [allWallets, setAllWallets] = useState([]);
  const [activeYear, setActiveYear] = useState('2025');
  const [error, setError] = useState(null);
  const [isGated, setIsGated] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingGate, setCheckingGate] = useState(true);
  const [gateTokenBalance, setGateTokenBalance] = useState(0);
  const [gateDecimals, setGateDecimals] = useState(18); // default
  const [envError, setEnvError] = useState(null);
  const [activePeriod, setActivePeriod] = useState('year'); // 'year' or 'lifetime'
  const [lifetimeData, setLifetimeData] = useState(null);
  const [lifetimePercentile, setLifetimePercentile] = useState(null);
  const [lifetimeNarrative, setLifetimeNarrative] = useState('');
  const [hasChecklistNFT, setHasChecklistNFT] = useState(false);
  const [hasMinterBadge, setHasMinterBadge] = useState(false);
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState('base'); // 'base' | 'friends'
  const [friendsLeaderboard, setFriendsLeaderboard] = useState([]);
  const [baseLeaderboard, setBaseLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [tokenGatingMode, setTokenGatingMode] = useState('pnlgate');
  const [pnlGateBalance, setPnlGateBalance] = useState(0);
  const [pnlGateDecimals, setPnlGateDecimals] = useState(18);
  const [hasUnlockedLifetime, setHasUnlockedLifetime] = useState(false);
  const [recentHighlights, setRecentHighlights] = useState([]);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [bottomSheetType, setBottomSheetType] = useState(null);
  const [swapBaseUrl] = useState('https://app.uniswap.org/#/swap');

  const REQUIRED_PNL_BALANCE = 10_000_000;

  const swapUrl =
    'https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=0x729b650e54b6a77b7346ba2e1177820e77f0bc8b&chain=base';

  const baseHttpProvider = envConfig?.rpcUrl;

  useEffect(() => {
    if (envConfig?.error) {
      setEnvError(envConfig.error);
    }
  }, [envConfig]);

  const parseUserFromSDK = useCallback(() => {
    try {
      if (farcasterUser) {
        return farcasterUser;
      }
      if (sdk?.context?.user) {
        return sdk.context.user;
      }
      return null;
    } catch (err) {
      console.error('Error parsing user from SDK', err);
      return null;
    }
  }, [sdk, farcasterUser]);

  const parseWalletsFromSDK = useCallback(() => {
    try {
      const wallets = [];

      if (warpcastWallet?.address) {
        wallets.push({
          label: 'Warpcast',
          address: warpcastWallet.address,
          type: 'warpcast',
        });
      }

      if (sdk?.wallet?.address) {
        wallets.push({
          label: 'Connected',
          address: sdk.wallet.address,
          type: 'connected',
        });
      }

      const userFromSDK = parseUserFromSDK();
      if (userFromSDK?.custody_address) {
        wallets.push({
          label: 'Primary',
          address: userFromSDK.custody_address,
          type: 'primary',
        });
      }

      const deduped = [];
      const seen = new Set();
      for (const w of wallets) {
        const lower = w.address.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          deduped.push(w);
        }
      }

      return deduped;
    } catch (err) {
      console.error('Error parsing wallets from SDK', err);
      return [];
    }
  }, [sdk, warpcastWallet, parseUserFromSDK]);

  useEffect(() => {
    const userFromSDK = parseUserFromSDK();
    setUser(userFromSDK || null);

    const wallets = parseWalletsFromSDK();
    setAllWallets(wallets);

    const primary = wallets.find((w) => w.type === 'primary') || wallets[0];

    if (primary?.address) {
      setPrimaryWallet(primary.address);
      setAddress(primary.address);
    }

    const firstNonPrimary = wallets.find((w) => w.type === 'connected');
    if (firstNonPrimary) {
      setSelectedWallet(firstNonPrimary.type);
    }
  }, [parseUserFromSDK, parseWalletsFromSDK]);

  const handleWalletChange = (value) => {
    setSelectedWallet(value);
    const wallets = parseWalletsFromSDK();

    if (value === 'combined') {
      const primary = wallets.find((w) => w.type === 'primary');
      setAddress(primary?.address || null);
      return;
    }

    const wallet = wallets.find((w) => w.type === value);
    if (wallet?.address) {
      setAddress(wallet.address);
    }
  };

  const fetchGateBalance = useCallback(
    async (walletAddress) => {
      if (!walletAddress || !baseHttpProvider) return;

      try {
        const provider = new (window.ethers.providers.JsonRpcProvider)(
          baseHttpProvider,
        );
        const contract = new window.ethers.Contract(
          PNL_TOKEN_ADDRESS,
          PNL_TOKEN_ABI,
          provider,
        );

        const [balanceRaw, decimalsVal] = await Promise.all([
          contract.balanceOf(walletAddress),
          contract.decimals(),
        ]);

        const balanceFormatted = Number(
          window.ethers.utils.formatUnits(balanceRaw, decimalsVal),
        );

        setGateTokenBalance(balanceFormatted);
        setGateDecimals(decimalsVal);

        if (balanceFormatted >= REQUIRED_PNL_BALANCE) {
          setIsGated(false);
        } else {
          setIsGated(true);
        }

        setCheckingGate(false);
      } catch (error) {
        console.error('Error checking gate balance', error);
        setCheckingGate(false);
      }
    },
    [baseHttpProvider, REQUIRED_PNL_BALANCE],
  );

  useEffect(() => {
    if (primaryWallet && baseHttpProvider) {
      fetchGateBalance(primaryWallet);
    } else {
      setCheckingGate(false);
      setIsGated(true);
    }
  }, [primaryWallet, baseHttpProvider, fetchGateBalance]);

  const handleSwapForAccess = () => {
    const url = `${swapBaseUrl}?inputCurrency=ETH&outputCurrency=${PNL_TOKEN_ADDRESS}&chain=base`;
    window.open(url, '_blank');
  };

  const handleRetryGate = () => {
    if (primaryWallet) {
      setCheckingGate(true);
      fetchGateBalance(primaryWallet);
    }
  };

  const getActiveData = () => {
    if (activePeriod === 'lifetime' && hasUnlockedLifetime) {
      return {
        pnl: lifetimeData || pnlData,
        narrative: lifetimeNarrative || auditNarrative,
        percentile: lifetimePercentile || percentileData,
      };
    }
    return { pnl: pnlData, narrative: auditNarrative, percentile: percentileData };
  };

  const Panel = ({ title, subtitle, children }) => (
    <div
      style={{
        backgroundColor: colors.card,
        borderRadius: ds.radiusLg,
        border: `1px solid ${colors.border}`,
        padding: '16px 16px 14px',
        marginBottom: '14px',
      }}
    >
      <div
        style={{
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 700,
              color: colors.ink,
              letterSpacing: '0.03em',
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: '11px',
                color: colors.muted,
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );

  const SkeletonBlock = ({ height = 16, width = '100%', radius = 999 }) => (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 40%, #e5e7eb 80%)',
        backgroundSize: '200% 100%',
        animation: 'pulseShimmer 1.2s ease-in-out infinite',
      }}
    />
  );

  const StatCard = ({
    label,
    value,
    sublabel,
    tone,
    align = 'left',
    compact = false,
  }) => {
    let color = colors.ink;
    if (tone === 'good') color = colors.pnlPositive;
    if (tone === 'bad') color = colors.pnlNegative;
    if (tone === 'amber') color = colors.amber;

    return (
      <div
        style={{
          flex: compact ? '0 0 auto' : 1,
          minWidth: compact ? 92 : 0,
          padding: '10px 11px',
          borderRadius: 16,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.cardSoft,
          textAlign: align,
        }}
      >
        <div
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: colors.muted,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {value}
        </div>
        {sublabel && (
          <div
            style={{
              marginTop: 2,
              fontSize: '11px',
              color: colors.muted,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    );
  };

  const ErrorScreen = ({ title, message }) => (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: '100%',
          background: colors.card,
          borderRadius: 24,
          border: `1px solid ${colors.border}`,
          padding: 20,
          boxShadow: '0 18px 40px rgba(15,23,42,0.16)',
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 8,
            color: colors.ink,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
          {message}
        </div>
        <div
          style={{
            fontSize: 11,
            color: colors.muted,
          }}
        >
          Check your ENV configuration in the dashboard and redeploy the mini
          app.
        </div>
      </div>
    </div>
  );

  const formatUsd = (value) => {
    if (value == null) return '$0';
    const n = Number(value);
    if (Number.isNaN(n)) return '$0';
    if (Math.abs(n) >= 1_000_000) {
      return `$${(n / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(n) >= 1_000) {
      return `$${(n / 1_000).toFixed(1)}K`;
    }
    return `$${n.toFixed(2)}`;
  };

  const formatSignedUsd = (value) => {
    const n = Number(value || 0);
    const sign = n > 0 ? '+' : n < 0 ? '−' : '';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    return `${sign}$${abs.toFixed(2)}`;
  };

  const formatWinRate = (value) => {
    if (value == null) return '0%';
    const n = Number(value);
    return `${n.toFixed(1)}%`;
  };

  const scoreToColor = (score) => {
    if (score >= 80) return colors.pnlPositive;
    if (score >= 60) return '#15803d';
    if (score >= 40) return colors.amber;
    return colors.pnlNegative;
  };

  const TradingAuditCard = ({ data, percentile }) => {
    if (!data || !data.summary) return null;

    const summary = data.summary;
    const score = percentile?.percentile || 50;
    const grade =
      score >= 85
        ? 'A'
        : score >= 70
        ? 'B'
        : score >= 55
        ? 'C'
        : score >= 40
        ? 'D'
        : 'F';

    const longestHold = summary.longestHold || '~14 days';
    const avgHold = summary.avgHoldTime || '~18 hrs';
    const shortestHold = summary.shortestHold || '~2 hrs';

    return (
      <div
        style={{
          borderRadius: 24,
          border: `1px solid ${colors.border}`,
          background:
            'radial-gradient(circle at 0% 0%, #dcfce7 0, transparent 55%), #020617',
          color: '#f9fafb',
          padding: 16,
          fontFamily: ds.font,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#bbf7d0',
              }}
            >
              Trident
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Trading audit</div>
          </div>
          <div
            style={{
              fontSize: 11,
              color: '#9ca3af',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            Scorecard preview
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 10,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 18,
              border: '1px solid rgba(148,163,184,0.5)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'radial-gradient(circle at 0 0, rgba(248,250,252,0.15), transparent 55%)',
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {grade}
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
                color: '#9ca3af',
              }}
            >
              {score.toFixed(0)}/100
            </div>
            <div
              style={{
                marginTop: 4,
                width: '76%',
                height: 4,
                borderRadius: 999,
                background: 'rgba(31,41,55,1)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, score)}%`,
                  height: '100%',
                  background: scoreToColor(score),
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Your Trident LLC profile
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#e5e7eb',
              }}
            >
              A snapshot of your Base trading: win rate, realised PNL, gate
              leaks, and how you stack up to other Farcaster traders.
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <StatCard
            label="Realised PNL"
            value={formatSignedUsd(summary.totalRealizedProfit || 0)}
            tone={
              summary.totalRealizedProfit > 0
                ? 'good'
                : summary.totalRealizedProfit < 0
                ? 'bad'
                : undefined
            }
            align="center"
            compact
          />
          <StatCard
            label="Win rate"
            value={formatWinRate(summary.winRate || 0)}
            align="center"
            compact
          />
          <StatCard
            label="Tokens"
            value={(summary.totalTokensTraded || 0).toString()}
            align="center"
            compact
          />
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              borderRadius: 12,
              border: '1px solid rgba(55,65,81,1)',
              padding: '6px 8px',
              fontSize: 11,
            }}
          >
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: '#9ca3af',
                marginBottom: 2,
                fontSize: 9,
              }}
            >
              Longest hold
            </div>
            <div>{longestHold}</div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 12,
              border: '1px solid rgba(55,65,81,1)',
              padding: '6px 8px',
              fontSize: 11,
            }}
          >
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: '#9ca3af',
                marginBottom: 2,
                fontSize: 9,
              }}
            >
              Average
            </div>
            <div>{avgHold}</div>
          </div>
          <div
            style={{
              flex: 1,
              borderRadius: 12,
              border: '1px solid rgba(55,65,81,1)',
              padding: '6px 8px',
              fontSize: 11,
            }}
          >
            <div
              style={{
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: '#9ca3af',
                marginBottom: 2,
                fontSize: 9,
              }}
            >
              Shortest
            </div>
            <div>{shortestHold}</div>
          </div>
        </div>

        <div
          style={{
            marginTop: 6,
            borderTop: '1px solid rgba(31,41,55,1)',
            paddingTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            color: '#9ca3af',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
          }}
        >
          <span>Trident LLC audit preview</span>
          <span>Coming soon to $PNL holders</span>
        </div>
      </div>
    );
  };

  const useAuditData = (address, year, isLifetime = false) => {
    const [data, setData] = useState(null);
    const [narrative, setNarrative] = useState('');
    const [percentile, setPercentile] = useState(null);
    const [loadingAudit, setLoadingAudit] = useState(false);
    const [auditError, setAuditError] = useState(null);

    useEffect(() => {
      if (!address) return;
      const fetchAudit = async () => {
        setLoadingAudit(true);
        setAuditError(null);
        try {
          const params = new URLSearchParams();
          params.set('address', address);
          if (!isLifetime) {
            params.set('year', year || '2025');
          } else {
            params.set('lifetime', 'true');
          }

          const auditUrl = `/api/trading-audit?${params.toString()}`;
          const res = await fetch(auditUrl);
          if (!res.ok) {
            throw new Error(`Audit fetch failed: ${res.statusText}`);
          }
          const json = await res.json();
          setData(json.pnlData || null);
          setNarrative(json.auditNarrative || '');
          setPercentile(json.percentileData || null);
        } catch (err) {
          console.error('Error fetching audit', err);
          setAuditError(err.message || 'Failed to load audit');
        } finally {
          setLoadingAudit(false);
        }
      };
      fetchAudit();
    }, [address, year, isLifetime]);

    return { data, narrative, percentile, loadingAudit, auditError };
  };

  const {
    data: yearData,
    narrative: yearNarrative,
    percentile: yearPercentile,
    loadingAudit: loadingYearAudit,
    auditError: yearAuditError,
  } = useAuditData(address, activeYear, false);

  const {
    data: lifetimeAuditData,
    narrative: lifetimeAuditNarrative,
    percentile: lifetimeAuditPercentile,
    loadingAudit: loadingLifetimeAudit,
    auditError: lifetimeAuditError,
  } = useAuditData(
    hasUnlockedLifetime ? address : null,
    null,
    hasUnlockedLifetime,
  );

  useEffect(() => {
    if (yearData) {
      setPnlData(yearData);
    }
  }, [yearData]);

  useEffect(() => {
    if (yearNarrative) {
      setAuditNarrative(yearNarrative);
    }
  }, [yearNarrative]);

  useEffect(() => {
    if (yearPercentile) {
      setPercentileData(yearPercentile);
    }
  }, [yearPercentile]);

  useEffect(() => {
    if (lifetimeAuditData) {
      setLifetimeData(lifetimeAuditData);
    }
  }, [lifetimeAuditData]);

  useEffect(() => {
    if (lifetimeAuditNarrative) {
      setLifetimeNarrative(lifetimeAuditNarrative);
    }
  }, [lifetimeAuditNarrative]);

  useEffect(() => {
    if (lifetimeAuditPercentile) {
      setLifetimePercentile(lifetimeAuditPercentile);
    }
  }, [lifetimeAuditPercentile]);

  useEffect(() => {
    const highlights = [];

    if (pnlData?.biggestWin) {
      highlights.push({
        type: 'win',
        token: pnlData.biggestWin.symbol || pnlData.biggestWin.name,
        profit: pnlData.biggestWin.realizedProfitUsd,
      });
    }
    if (pnlData?.biggestLoss) {
      highlights.push({
        type: 'loss',
        token: pnlData.biggestLoss.symbol || pnlData.biggestLoss.name,
        profit: pnlData.biggestLoss.realizedProfitUsd,
      });
    }
    if (pnlData?.biggestFumble) {
      highlights.push({
        type: 'fumble',
        token: pnlData.biggestFumble.symbol || pnlData.biggestFumble.name,
        profit: pnlData.biggestFumble.missedProfitUsd,
      });
    }

    setRecentHighlights(highlights);
  }, [pnlData]);

  useEffect(() => {
    let active = true;
    const checkChecklist = async () => {
      if (!address || !envConfig?.checklistNftAddress || !baseHttpProvider) {
        return;
      }

      try {
        const provider = new window.ethers.providers.JsonRpcProvider(
          baseHttpProvider,
        );
        const contract = new window.ethers.Contract(
          envConfig.checklistNftAddress,
          CHECKLIST_NFT_ABI,
          provider,
        );

        const [balanceRaw, hasMinted] = await Promise.all([
          contract.balanceOf(address),
          contract.hasMintedBadge(address, 1),
        ]);

        if (!active) return;

        setHasChecklistNFT(balanceRaw.gt(0));
        setHasMinterBadge(hasMinted);
      } catch (error) {
        console.error('Error checking checklist NFT / badge', error);
      }
    };

    checkChecklist();

    return () => {
      active = false;
    };
  }, [address, envConfig?.checklistNftAddress, baseHttpProvider]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!address) return;

      try {
        const urlBase = '/api/trading-leaderboard';
        const paramsBase = new URLSearchParams({ scope: 'base' });
        const paramsFriends = new URLSearchParams({
          scope: 'friends',
          address,
        });

        const [resBase, resFriends] = await Promise.all([
          fetch(`${urlBase}?${paramsBase.toString()}`),
          fetch(`${urlBase}?${paramsFriends.toString()}`),
        ]);

        if (!resBase.ok) {
          throw new Error('Failed to load leaderboard');
        }

        const baseJson = await resBase.json();
        const friendsJson = resFriends.ok ? await resFriends.json() : null;

        setBaseLeaderboard(baseJson.entries || []);
        setFriendsLeaderboard(friendsJson?.entries || []);
        setLeaderboardError(null);
      } catch (error) {
        console.error('Leaderboard error', error);
        setLeaderboardError('Could not load leaderboard');
      }
    };

    fetchLeaderboard();
  }, [address]);

  useEffect(() => {
    let active = true;
    const fetchGateBalanceForUnlocked = async () => {
      if (!address || !baseHttpProvider) {
        return;
      }

      try {
        const provider = new window.ethers.providers.JsonRpcProvider(
          baseHttpProvider,
        );
        const contract = new window.ethers.Contract(
          PNL_TOKEN_ADDRESS,
          PNL_TOKEN_ABI,
          provider,
        );

        const [balanceRaw, decimalsVal] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
        ]);

        if (!active) return;

        const balanceFormatted = Number(
          window.ethers.utils.formatUnits(balanceRaw, decimalsVal),
        );
        setPnlGateBalance(balanceFormatted);
        setPnlGateDecimals(decimalsVal);

        if (balanceFormatted >= REQUIRED_PNL_BALANCE) {
          setHasUnlockedLifetime(true);
        }
      } catch (error) {
        console.error('Error checking unlocked lifetime gate', error);
      }
    };

    fetchGateBalanceForUnlocked();

    return () => {
      active = false;
    };
  }, [address, baseHttpProvider]);

  const handleOpenBottomSheet = (type) => {
    setBottomSheetType(type);
    setBottomSheetOpen(true);
  };

  const handleCloseBottomSheet = () => {
    setBottomSheetOpen(false);
    setBottomSheetType(null);
  };

  const BottomSheet = ({ isOpen, onClose, type }) => {
    if (!isOpen) return null;

    let title = '';
    let content = null;

    if (type === 'fumbling') {
      title = 'How fumbles are calculated';
      content = (
        <div style={{ fontSize: 12, color: colors.muted }}>
          <p>
            We look at tokens you sold or reduced heavily and compare your exit
            price to the highest price the token reached within a window after
            you sold. The unrealised profit you left on the table is your
            fumbled amount.
          </p>
          <p>
            It is not financial advice and it does not factor in your personal
            risk tolerance or opportunity cost, it is just a fun way to see how
            often you sold before the real top.
          </p>
        </div>
      );
    } else if (type === 'winrate') {
      title = 'What win rate means here';
      content = (
        <div style={{ fontSize: 12, color: colors.muted }}>
          <p>
            A &quot;win&quot; is any closed position where your realised PNL is
            positive after gas. A &quot;loss&quot; is any closed position where
            you exited at a net loss.
          </p>
          <p>
            We ignore dust-sized coins and some stablecoin churn so the win rate
            is based on trades that actually moved the needle.
          </p>
        </div>
      );
    } else if (type === 'score') {
      title = 'Your Trident score';
      content = (
        <div style={{ fontSize: 12, color: colors.muted }}>
          <p>
            The score blends realised PNL, win rate, average R on wins vs
            losses, and a few &quot;degen factors&quot; like how often you
            round trip pumps or chase candles.
          </p>
          <p>
            It is designed to be fun and a bit spicy rather than a strict
            risk-adjusted performance metric.
          </p>
        </div>
      );
    }

    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          zIndex: 50,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 480,
            background: colors.card,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            padding: 16,
            boxShadow: '0 -16px 40px rgba(15,23,42,0.4)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: '#e5e7eb',
              margin: '0 auto 10px',
            }}
          />
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 6,
              textAlign: 'center',
              color: colors.ink,
            }}
          >
            {title}
          </div>
          {content}
          <button
            onClick={onClose}
            style={{
              marginTop: 12,
              width: '100%',
              borderRadius: 999,
              border: 'none',
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 500,
              background: '#020617',
              color: '#f9fafb',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  };

  if (loading || checkingGate)
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: ds.font,
        }}
      >
        <div
          style={{
            backgroundColor: colors.card,
            borderRadius: ds.radiusLg,
            border: `1px solid ${colors.border}`,
            padding: '16px 16px 14px',
            maxWidth: 420,
            width: '100%',
            boxShadow: '0 18px 40px rgba(15,23,42,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 12,
              alignItems: 'center',
            }}
          >
            <div>
              <SkeletonBlock height={14} width={120} radius={10} />
              <div style={{ height: 4 }} />
              <SkeletonBlock height={11} width={80} radius={10} />
            </div>
            <div>
              <SkeletonBlock height={24} width={72} radius={999} />
            </div>
          </div>
          <SkeletonBlock height={48} width="100%" radius={14} />
          <div style={{ height: 10 }} />
          <SkeletonBlock height={18} width="60%" radius={8} />
          <div style={{ height: 10 }} />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 8,
            }}
          >
            <SkeletonBlock height={46} radius={14} />
            <SkeletonBlock height={46} radius={14} />
            <SkeletonBlock height={46} radius={14} />
          </div>
          <div style={{ height: 10 }} />
          <SkeletonBlock height={36} radius={999} />
          <style>{`@keyframes pulseShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }`}</style>
        </div>
      </div>
    );
  if (envError)
    return (
      <ErrorScreen
        title="Access Locked"
        message={envError}
      />
    );

  const tokens = pnlData?.tokens || [];
  const biggestWin = pnlData?.biggestWin || null;
  const biggestLoss = pnlData?.biggestLoss || null;
  const biggestFumble = pnlData?.biggestFumble || null;

  const active = getActiveData();
  const activeSummary = active.pnl?.summary || {};
  const activePercentile = active.percentile || {};

  const totalRealizedProfit = activeSummary.totalRealizedProfit || 0;
  const totalUnrealizedProfit = activeSummary.totalUnrealizedProfit || 0;
  const totalTradingVolume = activeSummary.totalTradingVolume || 0;
  const winRate = activeSummary.winRate || 0;
  const totalTokensTraded = activeSummary.totalTokensTraded || tokens.length;
  const totalFumbled = activeSummary.totalFumbled || 0;
  const totalTrades = activeSummary.totalTrades || 0;

  const handleShare = () => {
    if (sdk?.actions?.openUrl) {
      const url = `https://warpcast.com/~/compose?text=Just%20checked%20my%20PNL%20tracker%20stats%20and%20got%20a%20${Math.round(
        activePercentile.percentile || 50,
      )}/100%20Trident%20score%20on%20Base%20via%20%40reside.eth%E2%80%99s%20miniapp%20%24PNL&embeds[]=https://pnl-tracker.reside.eth.limo`;
      sdk.actions.openUrl(url);
    } else {
      window.open(
        'https://warpcast.com/~/compose?text=Checking%20my%20PNL%20on%20Base%20via%20@reside.eth%27s%20PNL%20tracker%20miniapp',
        '_blank',
      );
    }
  };

  const hasPremiumAccess = !isGated;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        padding: '14px 14px 20px',
        fontFamily: ds.font,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                color: colors.muted,
              }}
            >
              PNL Tracker
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: colors.ink,
              }}
            >
              International House of $PNL
            </div>
          </div>
          <button
            onClick={handleShare}
            style={{
              borderRadius: 999,
              border: 'none',
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 500,
              background:
                'linear-gradient(135deg, #22c55e, #0f766e, #22c55e)',
              color: '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Share</span>
            <span>↗</span>
          </button>
        </div>

        {/* Wallet selector */}
        <Panel
          title="Wallet"
          subtitle="Primary Farcaster wallet and connected wallets"
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() => handleWalletChange('primary')}
              style={{
                borderRadius: 999,
                border:
                  selectedWallet === 'primary'
                    ? '1px solid #0f766e'
                    : `1px solid ${colors.border}`,
                padding: '6px 10px',
                fontSize: 11,
                backgroundColor:
                  selectedWallet === 'primary' ? colors.accentSoft : '#ffffff',
                color:
                  selectedWallet === 'primary'
                    ? colors.accent
                    : colors.inkSoft,
              }}
            >
              Primary
            </button>
            <button
              onClick={() => handleWalletChange('connected')}
              style={{
                borderRadius: 999,
                border:
                  selectedWallet === 'connected'
                    ? '1px solid #0f766e'
                    : `1px solid ${colors.border}`,
                padding: '6px 10px',
                fontSize: 11,
                backgroundColor:
                  selectedWallet === 'connected'
                    ? colors.accentSoft
                    : '#ffffff',
                color:
                  selectedWallet === 'connected'
                    ? colors.accent
                    : colors.inkSoft,
              }}
            >
              Connected
            </button>
            <button
              onClick={() => handleWalletChange('combined')}
              style={{
                borderRadius: 999,
                border:
                  selectedWallet === 'combined'
                    ? '1px solid #0f766e'
                    : `1px solid ${colors.border}`,
                padding: '6px 10px',
                fontSize: 11,
                backgroundColor:
                  selectedWallet === 'combined'
                    ? colors.accentSoft
                    : '#ffffff',
                color:
                  selectedWallet === 'combined'
                    ? colors.accent
                    : colors.inkSoft,
              }}
            >
              All wallets (combined)
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: colors.muted,
            }}
          >
            Viewing analytics for{' '}
            <span
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco',
              }}
            >
              {address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : 'No address detected'}
            </span>
          </div>
        </Panel>

        {/* Gate */}
        {isGated && (
          <GatedAccessPanel
            tokenBalance={gateTokenBalance}
            REQUIRED_PNL_BALANCE={REQUIRED_PNL_BALANCE}
            handleSwapForAccess={handleSwapForAccess}
            handleRetryGate={handleRetryGate}
            colors={colors}
            ds={ds}
            upcomingTease="Trident LLC audit"
          />
        )}

        {/* If not gated, show analytics */}
        {!isGated && (
          <>
            {/* Score / PNL */}
            <Panel
              title="Overview"
              subtitle={
                activePeriod === 'year'
                  ? `Year ${activeYear} on Base`
                  : 'Lifetime on Base'
              }
            >
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 10,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.14em',
                      color: colors.muted,
                      marginBottom: 2,
                    }}
                  >
                    Score
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 24,
                        fontWeight: 800,
                        color: scoreToColor(
                          activePercentile?.percentile || 50,
                        ),
                      }}
                    >
                      {Math.round(activePercentile?.percentile || 50)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: colors.muted,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      /100
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: colors.muted,
                    }}
                  >
                    {activePercentile?.title || 'Base degen in progress'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    minWidth: 140,
                  }}
                >
                  <StatCard
                    label="Realised PNL"
                    value={formatSignedUsd(totalRealizedProfit)}
                    tone={
                      totalRealizedProfit > 0
                        ? 'good'
                        : totalRealizedProfit < 0
                        ? 'bad'
                        : undefined
                    }
                  />
                  <StatCard
                    label="Unrealised"
                    value={formatSignedUsd(totalUnrealizedProfit)}
                    tone={
                      totalUnrealizedProfit > 0
                        ? 'good'
                        : totalUnrealizedProfit < 0
                        ? 'bad'
                        : undefined
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 6,
                  flexWrap: 'wrap',
                }}
              >
                <StatCard
                  label="Win rate"
                  value={formatWinRate(winRate)}
                  sublabel="Closed trades that finished green"
                  align="left"
                />
                <StatCard
                  label="Volume"
                  value={formatUsd(totalTradingVolume)}
                  sublabel="Total swap size across all trades"
                  align="left"
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                  marginTop: 6,
                }}
              >
                <StatCard
                  label="Tokens touched"
                  value={String(totalTokensTraded || 0)}
                  align="left"
                />
                <StatCard
                  label="Fumbled"
                  value={formatUsd(totalFumbled || 0)}
                  sublabel="What your early exits ran to"
                  tone={totalFumbled > 0 ? 'amber' : undefined}
                  align="left"
                />
                <StatCard
                  label="Trades"
                  value={String(totalTrades || 0)}
                  sublabel="Closed positions that counted"
                  align="left"
                />
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    fontSize: 11,
                    color: colors.muted,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() => handleOpenBottomSheet('score')}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      margin: 0,
                      color: colors.muted,
                      textDecoration: 'underline',
                      fontSize: 11,
                    }}
                  >
                    How is this score calculated?
                  </button>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    fontSize: 11,
                    backgroundColor: colors.cardSoft,
                    borderRadius: 999,
                    padding: '3px',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <button
                    onClick={() => setActivePeriod('year')}
                    style={{
                      borderRadius: 999,
                      border: 'none',
                      padding: '4px 8px',
                      fontSize: 11,
                      backgroundColor:
                        activePeriod === 'year' ? colors.inkSoft : 'transparent',
                      color:
                        activePeriod === 'year' ? '#f9fafb' : colors.muted,
                    }}
                  >
                    {activeYear}
                  </button>
                  <button
                    onClick={() => setActivePeriod('lifetime')}
                    disabled={!hasUnlockedLifetime}
                    style={{
                      borderRadius: 999,
                      border: 'none',
                      padding: '4px 8px',
                      fontSize: 11,
                      backgroundColor:
                        activePeriod === 'lifetime'
                          ? colors.inkSoft
                          : 'transparent',
                      color:
                        activePeriod === 'lifetime'
                          ? '#f9fafb'
                          : hasUnlockedLifetime
                          ? colors.muted
                          : '#d4d4d8',
                      opacity: hasUnlockedLifetime ? 1 : 0.7,
                    }}
                  >
                    Lifetime
                  </button>
                </div>
              </div>
            </Panel>

            {/* Recent highlights */}
            {recentHighlights.length > 0 && (
              <Panel
                title="Highlights"
                subtitle="A few trades that defined your curve"
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {recentHighlights.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${colors.border}`,
                        padding: '8px 10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.ink,
                          }}
                        >
                          {h.type === 'win'
                            ? 'Big win'
                            : h.type === 'loss'
                            ? 'Pain trade'
                            : 'Fumble'}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.muted,
                          }}
                        >
                          {h.token}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color:
                            h.type === 'loss'
                              ? colors.pnlNegative
                              : h.type === 'win'
                              ? colors.pnlPositive
                              : colors.amber,
                        }}
                      >
                        {formatSignedUsd(h.profit || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Tokens */}
            <Panel
              title="Tokens"
              subtitle="Where you actually spun the wheel"
            >
              {tokens.length === 0 ? (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  We do not see closed trades yet for this wallet. Try switching
                  to another wallet or come back after a few rotations.
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {tokens.slice(0, 8).map((token, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: 14,
                        border: `1px solid ${colors.border}`,
                        padding: '8px 10px',
                        backgroundColor: colors.cardSoft,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: colors.ink,
                          }}
                        >
                          {token.symbol || token.name || 'Unknown'}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: colors.muted,
                          }}
                        >
                          Realised {formatSignedUsd(token.realizedProfitUsd)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color:
                            token.realizedProfitUsd > 0
                              ? colors.pnlPositive
                              : token.realizedProfitUsd < 0
                              ? colors.pnlNegative
                              : colors.muted,
                        }}
                      >
                        {token.trades || 0} trades
                      </div>
                    </div>
                  ))}
                  {tokens.length > 8 && (
                    <div
                      style={{
                        fontSize: 11,
                        color: colors.muted,
                      }}
                    >
                      +{tokens.length - 8} more tokens in the full report
                    </div>
                  )}
                </div>
              )}
            </Panel>

            {/* Audit narrative */}
            {active.narrative && (
              <Panel
                title="Auditor’s notes"
                subtitle="AI-generated from your trade history"
              >
                <div
                  style={{
                    fontSize: 12,
                    color: colors.inkSoft,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {active.narrative}
                </div>
              </Panel>
            )}

            {/* Trident card preview */}
            <Panel
              title="Trident LLC audit"
              subtitle="Scorecard preview for $PNL holders"
            >
              <TradingAuditCard
                data={active.pnl || pnlData}
                percentile={active.percentile || percentileData}
              />
            </Panel>

            {/* Leaderboard */}
            <Panel
              title="Leaderboard"
              subtitle="Where you sit vs other Base traders"
            >
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 8,
                  fontSize: 11,
                }}
              >
                <button
                  onClick={() => setActiveLeaderboardTab('base')}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border:
                      activeLeaderboardTab === 'base'
                        ? `1px solid ${colors.inkSoft}`
                        : `1px solid ${colors.border}`,
                    padding: '6px 8px',
                    backgroundColor:
                      activeLeaderboardTab === 'base'
                        ? colors.inkSoft
                        : 'transparent',
                    color:
                      activeLeaderboardTab === 'base'
                        ? '#f9fafb'
                        : colors.muted,
                  }}
                >
                  Base
                </button>
                <button
                  onClick={() => setActiveLeaderboardTab('friends')}
                  style={{
                    flex: 1,
                    borderRadius: 999,
                    border:
                      activeLeaderboardTab === 'friends'
                        ? `1px solid ${colors.inkSoft}`
                        : `1px solid ${colors.border}`,
                    padding: '6px 8px',
                    backgroundColor:
                      activeLeaderboardTab === 'friends'
                        ? colors.inkSoft
                        : 'transparent',
                    color:
                      activeLeaderboardTab === 'friends'
                        ? '#f9fafb'
                        : colors.muted,
                  }}
                >
                  Following
                </button>
              </div>

              {leaderboardError ? (
                <div
                  style={{
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  {leaderboardError}
                </div>
              ) : activeLeaderboardTab === 'base' ? (
                <LeaderboardList entries={baseLeaderboard} colors={colors} />
              ) : (
                <LeaderboardList entries={friendsLeaderboard} colors={colors} />
              )}
            </Panel>
          </>
        )}

        {/* Bottom hint */}
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            color: colors.muted,
            textAlign: 'center',
          }}
        >
          Built by{' '}
          <a
            href="https://warpcast.com/reside"
            target="_blank"
            rel="noreferrer"
            style={{ color: colors.accent }}
          >
            @reside.eth
          </a>{' '}
          · Trading is high risk, this is not advice.
        </div>
      </div>

      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={handleCloseBottomSheet}
        type={bottomSheetType}
      />
    </div>
  );
};

const LeaderboardList = ({ entries, colors }) => {
  if (!entries || entries.length === 0) {
    return (
      <div
        style={{
          fontSize: 12,
          color: colors.muted,
        }}
      >
        We will show your rank here once we have enough data.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 12,
      }}
    >
      {entries.slice(0, 8).map((entry, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            padding: '6px 8px',
            backgroundColor: '#f9fafb',
          }}
        >
          <div
            style={{
              width: 20,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
              color: colors.muted,
            }}
          >
            {index + 1}
          </div>
          <div
            style={{
              flexGrow: 1,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: colors.ink,
              }}
            >
              {entry.handle || 'Unknown'}
            </div>
            <div
              style={{
                fontSize: 11,
                color: colors.muted,
              }}
            >
              Score {entry.score || 0}/100 · Win rate{' '}
              {formatWinRate(entry.winRate || 0)}
            </div>
          </div>
          <div
            style={{
              fontSize: 11,
              color:
                entry.realizedPnl > 0
                  ? colors.pnlPositive
                  : entry.realizedPnl < 0
                  ? colors.pnlNegative
                  : colors.muted,
            }}
          >
            {formatSignedUsd(entry.realizedPnl || 0)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default App;
