// Generate AI narrative for trading audit using OpenAI
// Uses extended metrics for personalized roast/praise

export async function generateAuditNarrative(pnlData, metrics, user) {
  const summary = pnlData?.summary || {};
  const biggestWin = pnlData?.biggestWin;
  const biggestLoss = pnlData?.biggestLoss;
  const biggestFumble = pnlData?.biggestFumble;
  
  const prompt = `You are a sardonic trading analyst at Trident LLC writing a brief audit note. 
Write 2-3 sentences about this trader's performance. Be witty but professional. Roast gently if deserved, praise if earned.

Trader: ${user?.displayName || user?.username || 'Anonymous'}

Core Stats:
- Realized P&L: $${summary.totalRealizedProfit?.toFixed(2) || 0}
- Win Rate: ${summary.winRate?.toFixed(1) || 0}%
- Tokens Traded: ${summary.totalTokensTraded || 0}
- Volume: $${summary.totalTradingVolume?.toFixed(2) || 0}
- Fumbled Gains: $${summary.totalFumbled?.toFixed(2) || 0}

Behavioral Metrics:
- Longest Hold: ${metrics?.longestHold || 'Unknown'}
- Shortest Hold: ${metrics?.shortestHold || 'Unknown'}
- Win Streak: ${metrics?.winStreak || 0} consecutive wins
- Loss Streak: ${metrics?.lossStreak || 0} consecutive losses
- Most Active: ${metrics?.peakDayOfWeek || 'Unknown'} at ${metrics?.mostActiveHour || 'Unknown'}
- Green Days: ${metrics?.greenDays || 0}, Red Days: ${metrics?.redDays || 0}
- Profit Factor: ${metrics?.profitFactor || 'N/A'}

Notable Trades:
- Best: $${biggestWin?.symbol || 'N/A'} (+$${biggestWin?.realizedProfitUsd?.toFixed(2) || 0})
- Worst: $${biggestLoss?.symbol || 'N/A'} ($${biggestLoss?.realizedProfitUsd?.toFixed(2) || 0})
${biggestFumble ? `- Fumble: $${biggestFumble.symbol} (sold early, missed $${biggestFumble.missedUpsideUsd?.toFixed(2)})` : ''}

Write in a dry, analytical tone with subtle humor. Reference specific behaviors. Keep it under 60 words. No greeting. Start directly.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 120,
        temperature: 0.85
      })
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || getFallbackNarrative(summary, metrics);
  } catch (error) {
    console.error('Failed to generate narrative:', error);
    return getFallbackNarrative(summary, metrics);
  }
}

// Fallback narratives based on patterns
export function getFallbackNarrative(summary, metrics) {
  const profit = summary?.totalRealizedProfit || 0;
  const winRate = summary?.winRate || 0;
  const fumbled = summary?.totalFumbled || 0;
  const lossStreak = metrics?.lossStreak || 0;
  const shortestHold = metrics?.shortestHold || '';

  // Pattern matching for personality
  if (profit > 10000 && winRate > 55) {
    return "Subject demonstrates consistent alpha generation with disciplined position management. Either genuinely skilled or running an exceptional heater. Recommend continued monitoring.";
  }
  
  if (fumbled > profit * 2 && fumbled > 5000) {
    return `Classic early-exit syndrome detected. Subject finds winners consistently, then exits before the move completes. ${fumbled > 10000 ? 'The fumbled gains exceed realized profits—a statistical tragedy.' : 'Consider therapy.'}`;
  }
  
  if (winRate < 35 && profit < 0) {
    return "A reliable counter-indicator. Subject buys local tops with conviction and sells bottoms with precision. Consider inverse-following for alpha generation.";
  }
  
  if (lossStreak > 5) {
    return `Tilt risk elevated. ${lossStreak} consecutive losses suggests emotional decision-making may be overriding strategy. Recommend touching grass before next trade.`;
  }
  
  if (shortestHold && (shortestHold.includes('sec') || shortestHold.includes('min'))) {
    return "Speed trading detected. Some positions held for mere minutes—either scalping with purpose or panic-selling with style. The line is thin.";
  }
  
  if (winRate > 60 && profit < 0) {
    return "Wins often but bleeds on losses. Position sizing asymmetry detected—small wins, large losses. The math is mathing against this subject.";
  }
  
  if (profit > 0 && profit < 1000) {
    return "Marginally profitable. Not losing money in crypto memecoin trading is a genuine achievement. The bar is underground, but subject cleared it.";
  }
  
  return "Performance within normal parameters. Neither exceptional nor catastrophic. The trading equivalent of a C+ student—present, participating, unremarkable.";
}

export default generateAuditNarrative;
