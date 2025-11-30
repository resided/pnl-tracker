import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Get parameters
    const rank = searchParams.get('rank') || '50';
    const pnl = searchParams.get('pnl') || '0';
    const username = searchParams.get('username') || 'Trader';
    const pfp = searchParams.get('pfp') || null;
    
    const pnlNum = parseFloat(pnl);
    const rankNum = parseInt(rank);
    
    // Format PNL
    const pnlSign = pnlNum >= 0 ? '+' : '-';
    const formattedPnl = `${pnlSign}$${Math.abs(pnlNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    // Dynamic gradient based on rank
    const getGradient = () => {
      if (rankNum <= 5) return 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'; // Dark elite
      if (rankNum <= 20) return 'linear-gradient(135deg, #14532d 0%, #166534 100%)'; // Green
      if (rankNum <= 40) return 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)'; // Blue
      if (rankNum <= 60) return 'linear-gradient(135deg, #374151 0%, #4b5563 100%)'; // Gray
      return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)'; // Red
    };

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: getGradient(),
            padding: '48px',
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
          }}
        >
          {/* User info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
            {pfp && (
              <img
                src={pfp}
                width="80"
                height="80"
                style={{
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: pfp ? 'flex-start' : 'center' }}>
              <div style={{ fontSize: '28px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>
                Ψ PNL Tracker
              </div>
              <div style={{ fontSize: '36px', fontWeight: '600', color: '#fff' }}>
                @{username}
              </div>
            </div>
          </div>
          
          {/* Main stats */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '72px', fontWeight: '700', color: '#fff', lineHeight: '1' }}>
              Top {rank}%
            </div>
            <div style={{ 
              fontSize: '48px', 
              fontWeight: '700', 
              color: pnlNum >= 0 ? '#4ade80' : '#f87171',
              marginTop: '8px'
            }}>
              {formattedPnl}
            </div>
          </div>
          
          {/* Footer */}
          <div style={{ 
            position: 'absolute', 
            bottom: '32px', 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em'
          }}>
            Base Chain Realized P&L
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('OG Image generation failed:', e);
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
