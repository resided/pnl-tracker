// @ts-nocheck
import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default function handler(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get data from URL
    const pnl = parseFloat(searchParams.get('pnl') || '0');
    const winRate = searchParams.get('win') || '0';
    const tokens = searchParams.get('tokens') || '0';
    const username = searchParams.get('user') || 'user';

    // Formatting
    const isWin = pnl >= 0;
    const color = isWin ? '#166534' : '#991b1b'; 
    const bgColor = isWin ? '#f0fdf4' : '#fef2f2';
    const borderColor = isWin ? '#bbf7d0' : '#fecaca';
    
    const absVal = Math.abs(pnl);
    let formattedPnl = '$' + absVal.toFixed(2);
    if (absVal >= 1000) formattedPnl = '$' + (absVal / 1000).toFixed(1) + 'k';
    if (absVal >= 1000000) formattedPnl = '$' + (absVal / 1000000).toFixed(1) + 'm';
    
    const sign = isWin ? '+' : '-';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Card Container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '24px',
              padding: '40px 60px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
              width: '80%',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ fontSize: 32 }}>📊</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#0b0b0b', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                PNL Tracker
              </div>
            </div>

            <div style={{ fontSize: 18, color: '#6b7280', marginBottom: '30px' }}>
              @{username} on Base
            </div>

            {/* PNL Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bgColor,
                border: `2px solid ${borderColor}`,
                borderRadius: '99px',
                padding: '20px 50px',
                marginBottom: '40px',
              }}
            >
              <div style={{ fontSize: 72, fontWeight: 800, color: color, lineHeight: 1 }}>
                {sign}{formattedPnl}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>Win Rate</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>{winRate}%</div>
              </div>
              <div style={{ width: 1, height: '100%', backgroundColor: '#e5e7eb' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{ fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af' }}>Tokens</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>{tokens}</div>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}