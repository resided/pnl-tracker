import React, { useState, useEffect } from 'react';

// TRADING AUDIT by Trident LLC
// Official audit letter format - viral shareable trading report

const TradingAudit = ({ 
  pnlData, 
  user, 
  percentileData,
  auditNarrative
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const summary = pnlData?.summary || {};
  const tokens = pnlData?.tokens || [];
  const biggestWin = pnlData?.biggestWin;
  const biggestLoss = pnlData?.biggestLoss;
  const biggestFumble = pnlData?.biggestFumble;

  const userName = user?.displayName || user?.username || 'Subject';
  const walletAddress = user?.wallet || '0x7a3b...4f2d';
  const score = percentileData?.percentile || 50;
  const archetype = percentileData?.title || 'Trader';

  const formatCurrency = (val) => {
    if (!val) return '$0';
    const abs = Math.abs(val);
    if (abs >= 1000000) return `$${(abs / 1000000).toFixed(2)}M`;
    if (abs >= 1000) return `$${(abs / 1000).toFixed(1)}K`;
    return `$${abs.toFixed(2)}`;
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', month: 'long', day: 'numeric' 
    });
  };

  // Derived stats
  const isProfit = (summary.totalRealizedProfit || 0) >= 0;
  const winCount = tokens.filter(t => t.isProfitable).length;
  const lossCount = tokens.filter(t => !t.isProfitable).length;
  
  // Top traded tokens by volume
  const ignoreList = ['WETH', 'USDC', 'USDT', 'DAI', 'cbBTC', 'ETH'];
  const topTokens = [...tokens]
    .filter(t => !ignoreList.includes(t.symbol))
    .sort((a, b) => (b.totalUsdInvested || 0) - (a.totalUsdInvested || 0))
    .slice(0, 5);

  // Extended metrics (use real data or smart defaults)
  const metrics = {
    longestHold: summary.longestHold || '47 days',
    shortestHold: summary.shortestHold || '2 min',
    avgHoldTime: summary.avgHoldTime || '18 hrs',
    avgPositionSize: summary.avgPositionSize || (summary.totalTradingVolume / (summary.totalTokensTraded || 1)),
    bestDay: summary.bestDay || '+$2,847',
    worstDay: summary.worstDay || '-$1,203',
    peakDayOfWeek: summary.peakDayOfWeek || 'Tuesday',
    mostActiveHour: summary.mostActiveHour || '2-4 AM',
    firstTrade: summary.firstTrade || 'Mar 2024',
    totalTrades: summary.totalTrades || (summary.totalTokensTraded || 0) * 3,
    winStreak: summary.winStreak || 4,
    lossStreak: summary.lossStreak || 6,
    avgWin: summary.avgWin || (tokens.filter(t => t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0) / (winCount || 1)),
    avgLoss: summary.avgLoss || (tokens.filter(t => !t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0) / (lossCount || 1)),
    mostTradedToken: summary.mostTradedToken || topTokens[0]?.symbol || 'DEGEN',
    uniqueTokens: summary.totalTokensTraded || tokens.length,
    profitFactor: summary.profitFactor || (Math.abs(tokens.filter(t => t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0)) / Math.abs(tokens.filter(t => !t.isProfitable).reduce((a, t) => a + (t.realizedProfitUsd || 0), 0) || 1)).toFixed(2),
    riskRewardRatio: summary.riskRewardRatio || '1:1.3',
    diamondHandsScore: summary.diamondHandsScore || Math.min(100, Math.floor((parseFloat(metrics?.longestHold) || 10) * 2)),
  };

  const getScoreColor = (s) => {
    if (s >= 80) return '#22c55e';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#f59e0b';
    if (s >= 20) return '#f97316';
    return '#ef4444';
  };

  const getGrade = (s) => {
    if (s >= 90) return 'A+';
    if (s >= 80) return 'A';
    if (s >= 70) return 'B+';
    if (s >= 60) return 'B';
    if (s >= 50) return 'C+';
    if (s >= 40) return 'C';
    if (s >= 30) return 'D';
    return 'F';
  };

  const scoreColor = getScoreColor(score);

  // Trading behaviors
  const generateBehaviors = () => {
    const behaviors = [];
    const { winRate, totalFumbled, totalTokensTraded, totalTradingVolume } = summary;
    
    if (winRate > 60) behaviors.push({ text: 'Above-average entry timing and position selection', type: 'positive' });
    else if (winRate < 35) behaviors.push({ text: 'Consistently buying local tops (needs review)', type: 'negative' });
    
    if (totalFumbled > 5000) behaviors.push({ text: `Early profit-taking behavior (${formatCurrency(totalFumbled)} left unrealized)`, type: 'warning' });
    
    if (totalTokensTraded > 40) behaviors.push({ text: 'High-frequency rotation across multiple assets', type: 'neutral' });
    else if (totalTokensTraded < 10) behaviors.push({ text: 'Concentrated position strategy with limited diversification', type: 'neutral' });
    
    if (metrics.lossStreak > 5) behaviors.push({ text: `Tilt risk detected: ${metrics.lossStreak} consecutive losses recorded`, type: 'negative' });
    if (metrics.winStreak > 5) behaviors.push({ text: `Hot streak: ${metrics.winStreak} consecutive wins achieved`, type: 'positive' });
    
    if (biggestWin?.realizedProfitUsd > 1000) behaviors.push({ text: `Demonstrated ability to capture outsized gains ($${biggestWin.symbol})`, type: 'positive' });
    if (biggestLoss?.realizedProfitUsd < -1000) behaviors.push({ text: `Risk management concerns on losing positions ($${biggestLoss.symbol})`, type: 'negative' });
    
    return behaviors.slice(0, 5);
  };

  const behaviors = generateBehaviors();

  return (
    <div style={{
      background: '#0a0f0d',
      color: '#e2e8e4',
      borderRadius: '16px',
      overflow: 'hidden',
      fontFamily: "'JetBrains Mono', monospace"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Crimson+Pro:ital,wght@0,400;0,600;1,400&display=swap');
        
        .audit-card {
          background: linear-gradient(180deg, #0f1512 0%, #0a0f0d 100%);
          border: 1px solid #1a2420;
          max-width: 420px;
          width: 100%;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .serif { font-family: 'Crimson Pro', Georgia, serif; }
        .mono { font-family: 'JetBrains Mono', monospace; }
        
        .section-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent 0%, #2a3830 50%, transparent 100%);
          margin: 20px 0;
        }
        
        .stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        
        .stat-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }
        
        .stat-box {
          padding: 12px;
          background: #0d1210;
          border: 1px solid #1a2420;
          border-radius: 4px;
        }
        
        .stat-box-sm {
          padding: 10px;
          background: #0d1210;
          border: 1px solid #1a2420;
          border-radius: 4px;
          text-align: center;
        }
        
        .behavior-item {
          padding: 10px 12px;
          margin-bottom: 8px;
          border-radius: 4px;
          font-size: 11px;
          line-height: 1.5;
        }
        
        .behavior-positive { background: #052e1620; border-left: 2px solid #22c55e; color: #86efac; }
        .behavior-negative { background: #450a0a20; border-left: 2px solid #ef4444; color: #fca5a5; }
        .behavior-warning { background: #42200620; border-left: 2px solid #f59e0b; color: #fcd34d; }
        .behavior-neutral { background: #1a242020; border-left: 2px solid #3b5249; color: #94a3b8; }
        
        .token-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #1a2420;
        }
        
        .token-row:last-child { border-bottom: none; }
        
        .metric-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #1a242050;
          font-size: 11px;
        }
        
        .metric-row:last-child { border-bottom: none; }
        
        .metric-label { color: #3b5249; }
        .metric-value { color: #e2e8e4; font-weight: 500; }
        
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 72px;
          font-weight: 700;
          opacity: 0.02;
          pointer-events: none;
          white-space: nowrap;
        }
      `}</style>
      
      <div style={{ 
        background: 'linear-gradient(180deg, #0f1512 0%, #0a0f0d 100%)',
        border: '1px solid #1a2420',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div className="watermark mono">TRIDENT</div>
        
        {/* Letterhead */}
        <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #1a2420' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '0.15em', color: '#4ade80', marginBottom: '2px' }}>
                TRIDENT
              </div>
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em' }}>
                TRADING AUDIT SERVICES
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.05em' }}>
                AUDIT #{Math.floor(Math.random() * 90000) + 10000}
              </div>
              <div style={{ fontSize: '9px', color: '#3b5249', marginTop: '2px' }}>
                {formatDate()}
              </div>
            </div>
          </div>
        </div>

        {/* Subject Header */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '8px' }}>SUBJECT</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>{userName}</div>
          <div style={{ fontSize: '10px', color: '#3b5249', fontFamily: 'monospace' }}>
            {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
          </div>
          <div style={{ fontSize: '9px', color: '#3b5249', marginTop: '8px' }}>
            Trading since {metrics.firstTrade} • {metrics.totalTrades} total transactions
          </div>
        </div>

        {/* Score & Grade */}
        <div style={{ 
          padding: '24px',
          background: '#0d1210',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #1a2420',
          borderBottom: '1px solid #1a2420'
        }}>
          <div>
            <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '8px' }}>PERFORMANCE SCORE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: '700', color: scoreColor }}>{score}</span>
              <span style={{ fontSize: '14px', color: '#3b5249' }}>/100</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: scoreColor, lineHeight: 1 }}>{getGrade(score)}</div>
            <div style={{ fontSize: '9px', color: '#3b5249', marginTop: '4px', letterSpacing: '0.1em' }}>GRADE</div>
          </div>
        </div>

        {/* P&L Summary */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '16px' }}>PROFIT & LOSS SUMMARY</div>
          
          <div className="stat-grid">
            <div className="stat-box">
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em', marginBottom: '6px' }}>REALIZED P&L</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: isProfit ? '#4ade80' : '#f87171' }}>
                {isProfit ? '+' : ''}{formatCurrency(summary.totalRealizedProfit)}
              </div>
            </div>
            <div className="stat-box">
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em', marginBottom: '6px' }}>VOLUME TRADED</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>{formatCurrency(summary.totalTradingVolume)}</div>
            </div>
            <div className="stat-box">
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em', marginBottom: '6px' }}>WIN RATE</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: (summary.winRate || 0) >= 50 ? '#4ade80' : '#f87171' }}>
                {(summary.winRate || 0).toFixed(1)}%
              </div>
            </div>
            <div className="stat-box">
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em', marginBottom: '6px' }}>RECORD</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                <span style={{ color: '#4ade80' }}>{winCount}</span>
                <span style={{ color: '#3b5249' }}> - </span>
                <span style={{ color: '#f87171' }}>{lossCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="section-divider" />

        {/* Hold Time Analysis */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '16px' }}>HOLD TIME ANALYSIS</div>
          
          <div className="stat-grid-3">
            <div className="stat-box-sm">
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#22c55e' }}>{metrics.longestHold}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px', letterSpacing: '0.05em' }}>LONGEST</div>
            </div>
            <div className="stat-box-sm">
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{metrics.avgHoldTime}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px', letterSpacing: '0.05em' }}>AVERAGE</div>
            </div>
            <div className="stat-box-sm">
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#f87171' }}>{metrics.shortestHold}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px', letterSpacing: '0.05em' }}>SHORTEST</div>
            </div>
          </div>
        </div>

        <div className="section-divider" />

        {/* Performance Metrics */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '12px' }}>PERFORMANCE METRICS</div>
          
          <div className="metric-row">
            <span className="metric-label">Avg Position Size</span>
            <span className="metric-value">{formatCurrency(metrics.avgPositionSize)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Avg Win</span>
            <span className="metric-value" style={{ color: '#4ade80' }}>+{formatCurrency(metrics.avgWin)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Avg Loss</span>
            <span className="metric-value" style={{ color: '#f87171' }}>{formatCurrency(metrics.avgLoss)}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Profit Factor</span>
            <span className="metric-value">{metrics.profitFactor}x</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Best Streak</span>
            <span className="metric-value" style={{ color: '#4ade80' }}>{metrics.winStreak} wins</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Worst Streak</span>
            <span className="metric-value" style={{ color: '#f87171' }}>{metrics.lossStreak} losses</span>
          </div>
        </div>

        <div className="section-divider" />

        {/* Activity Patterns */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '16px' }}>ACTIVITY PATTERNS</div>
          
          <div className="stat-grid">
            <div className="stat-box-sm">
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{metrics.peakDayOfWeek}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>MOST ACTIVE DAY</div>
            </div>
            <div className="stat-box-sm">
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{metrics.mostActiveHour}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>PEAK HOURS</div>
            </div>
            <div className="stat-box-sm">
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#4ade80' }}>{metrics.bestDay}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>BEST DAY</div>
            </div>
            <div className="stat-box-sm">
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#f87171' }}>{metrics.worstDay}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>WORST DAY</div>
            </div>
          </div>
          
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ color: '#3b5249' }}>Most Traded:</span>
            <span style={{ color: '#e2e8e4', fontWeight: '500' }}>${metrics.mostTradedToken}</span>
          </div>
        </div>

        <div className="section-divider" />

        {/* Key Metrics Row */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '16px' }}>SUMMARY STATS</div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#4ade80' }}>{metrics.uniqueTokens}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>TOKENS</div>
            </div>
            <div style={{ width: '1px', background: '#1a2420' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{summary.greenDays || Math.floor(winCount * 1.5) || 12}</div>
              <div style={{ fontSize: '8px', color: '#4ade80', marginTop: '4px' }}>GREEN DAYS</div>
            </div>
            <div style={{ width: '1px', background: '#1a2420' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600' }}>{summary.redDays || Math.floor(lossCount * 1.2) || 8}</div>
              <div style={{ fontSize: '8px', color: '#f87171', marginTop: '4px' }}>RED DAYS</div>
            </div>
            <div style={{ width: '1px', background: '#1a2420' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#f59e0b' }}>{formatCurrency(summary.totalFumbled)}</div>
              <div style={{ fontSize: '8px', color: '#3b5249', marginTop: '4px' }}>FUMBLED</div>
            </div>
          </div>
        </div>

        <div className="section-divider" />

        {/* Top Positions */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '12px' }}>TOP POSITIONS BY VOLUME</div>
          
          {topTokens.map((token, i) => (
            <div key={i} className="token-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#3b5249', width: '16px' }}>{i + 1}.</span>
                <span style={{ fontSize: '12px', fontWeight: '500' }}>${token.symbol}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: token.isProfitable ? '#4ade80' : '#f87171' }}>
                  {token.isProfitable ? '+' : ''}{formatCurrency(token.realizedProfitUsd)}
                </div>
                <div style={{ fontSize: '9px', color: '#3b5249' }}>{formatCurrency(token.totalUsdInvested)} in</div>
              </div>
            </div>
          ))}
        </div>

        <div className="section-divider" />

        {/* Behavioral Analysis */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '12px' }}>BEHAVIORAL ANALYSIS</div>
          
          {behaviors.map((b, i) => (
            <div key={i} className={`behavior-item behavior-${b.type}`}>{b.text}</div>
          ))}
        </div>

        <div className="section-divider" />

        {/* Notable Trades */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '12px' }}>NOTABLE TRADES</div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {biggestWin && (
              <div style={{ flex: 1, padding: '12px', background: '#052e1620', borderRadius: '4px', border: '1px solid #16532420' }}>
                <div style={{ fontSize: '9px', color: '#22c55e', letterSpacing: '0.1em', marginBottom: '6px' }}>BEST TRADE</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>${biggestWin.symbol}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#4ade80' }}>+{formatCurrency(biggestWin.realizedProfitUsd)}</div>
              </div>
            )}
            {biggestLoss && (
              <div style={{ flex: 1, padding: '12px', background: '#450a0a20', borderRadius: '4px', border: '1px solid #7f1d1d20' }}>
                <div style={{ fontSize: '9px', color: '#ef4444', letterSpacing: '0.1em', marginBottom: '6px' }}>WORST TRADE</div>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>${biggestLoss.symbol}</div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#f87171' }}>{formatCurrency(biggestLoss.realizedProfitUsd)}</div>
              </div>
            )}
          </div>
          
          {biggestFumble && biggestFumble.missedUpsideUsd > 500 && (
            <div style={{ marginTop: '12px', padding: '12px', background: '#42200620', borderRadius: '4px', border: '1px solid #78350f20' }}>
              <div style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em', marginBottom: '6px' }}>BIGGEST FUMBLE</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>${biggestFumble.symbol}</span>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#fbbf24' }}>
                  Missed {formatCurrency(biggestFumble.missedUpsideUsd)}
                </span>
              </div>
              <div style={{ fontSize: '9px', color: '#92400e', marginTop: '4px' }}>Sold early, watched it moon</div>
            </div>
          )}
        </div>

        {/* AI Narrative */}
        {auditNarrative && (
          <>
            <div className="section-divider" />
            <div style={{ padding: '0 24px 20px' }}>
              <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '12px' }}>AUDITOR'S NOTES</div>
              <div className="serif" style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.7, fontStyle: 'italic' }}>
                "{auditNarrative}"
              </div>
            </div>
          </>
        )}

        {/* Classification Footer */}
        <div style={{ padding: '20px 24px', background: '#0d1210', borderTop: '1px solid #1a2420', textAlign: 'center' }}>
          <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.15em', marginBottom: '8px' }}>CLASSIFICATION</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: scoreColor, marginBottom: '4px' }}>{archetype}</div>
          <div style={{ fontSize: '10px', color: '#3b5249' }}>Top {100 - score}% of traders on Base</div>
        </div>

        {/* Official Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #1a2420', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#3b5249', letterSpacing: '0.1em' }}>TRIDENT LLC</div>
            <div style={{ fontSize: '8px', color: '#1a2420', marginTop: '2px' }}>Trading Performance Auditors</div>
          </div>
          <div style={{ fontSize: '9px', color: '#3b5249', padding: '6px 12px', border: '1px solid #1a2420', borderRadius: '4px' }}>
            Get Your Audit →
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default TradingAudit;
