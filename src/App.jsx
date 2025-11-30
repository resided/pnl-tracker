Warning /> : null}
            </div>
          </Panel>
        )}

        {/* Info Panel Overlay */}
        <InfoPanel isVisible={showInfo} onClose={() => setShowInfo(false)} />

        {/* Badges Panel */}
        {!isGated && pnlData?.summary && (
          <ClaimBadgePanel 
            summary={pnlData.summary}
            onClaimBadge={handleClaimBadgeViaSDK}
            claimingBadge={claimingBadge}
            claimedBadges={claimedBadges}
            mintTxHash={mintTxHash}
            mintError={mintError}
            canClaim={!isGated}
            currentWallet={activeScope === 'all' ? null : activeScope === 'primary' ? primaryWallet : activeScope}
          />
        )}

        {/* Navigation Tabs */}
        {!isGated && (
          <div style={{ display: 'flex', gap: '20px', marginTop: '24px', marginBottom: '16px', borderBottom: `1px solid ${colors.border}` }}>
            {['stats', 'tokens'].map(tab => (
              <div 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ 
                  paddingBottom: '10px', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: activeTab === tab ? colors.ink : colors.muted, 
                  borderBottom: activeTab === tab ? `2px solid ${colors.ink}` : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {tab}
              </div>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {!isGated && activeTab === 'stats' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {biggestWin && <BigMoveCard label="Biggest Win" token={biggestWin} isWin={true} onShare={handleShareBestTrade} />}
            {biggestLoss && <BigMoveCard label="Biggest Loss" token={biggestLoss} isWin={false} onShare={handleShareWorstTrade} />}
            {biggestFumble && <BigFumbleCard token={biggestFumble} onShare={handleShareFumble} />}
            {pnlData.summary.airdropCount > 0 && (
                <div style={{ flex: '1 1 140px', padding: '12px', borderRadius: '16px', border: `1px solid ${colors.mintBorder}`, background: colors.mintBg, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.mint }}>Free Money</div>
                        <div style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#dcfce7', color: colors.mint }}>Airdrops</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: colors.mint, letterSpacing: '-0.02em', lineHeight: '1', marginBottom: '4px' }}>+{formatCurrency(pnlData.summary.airdropProfit)}</div>
                        <div style={{ fontSize: '11px', color: colors.muted }}>from {pnlData.summary.airdropCount} tokens</div>
                    </div>
                     <button 
                        onClick={handleShareAirdrops}
                        style={{ 
                            marginTop: '4px',
                            padding: '8px',
                            borderRadius: '8px',
                            border: `1px solid ${colors.mintBorder}`,
                            background: 'rgba(5, 150, 105, 0.1)',
                            color: colors.mint,
                            fontSize: '10px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em'
                        }}
                        >
                        Share
                    </button>
                </div>
            )}
          </div>
        )}

        {!isGated && activeTab === 'tokens' && (
          <div style={{ background: colors.panelBg, borderRadius: '16px', border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            {tokens.length > 0 ? tokens.map((token, i) => (
              <div key={i} style={{ padding: '0 16px' }}>
                <TokenRow token={token} />
              </div>
            )) : (
              <div style={{ padding: '32px', textAlign: 'center', color: colors.muted, fontSize: '13px' }}>
                No traded tokens found on Base.
              </div>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', opacity: 0.6 }}>
             <div onClick={() => setShowInfo(true)} style={{ fontSize: '11px', color: colors.muted, textDecoration: 'underline', cursor: 'pointer' }}>
                How is this calculated?
             </div>
        </div>

      </div>
    </div>
  );
}