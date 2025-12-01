// Hook to fetch all audit data for TradingAudit component
import { useState, useEffect, useCallback } from 'react';
import { fetchAuditMetrics } from './fetchAuditMetrics';
import { generateAuditNarrative } from './generateAuditNarrative';

export function useAuditData(wallets, pnlData, user) {
  const [auditMetrics, setAuditMetrics] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAudit = useCallback(async () => {
    if (!wallets?.length || !pnlData) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch extended metrics from Moralis
      const metrics = await fetchAuditMetrics(wallets, pnlData);
      setAuditMetrics(metrics);
      
      // Generate AI narrative (optional - can skip if no OpenAI key)
      if (import.meta.env.VITE_OPENAI_API_KEY) {
        const story = await generateAuditNarrative(pnlData, metrics, user);
        setNarrative(story);
      }
    } catch (err) {
      console.error('Audit fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wallets, pnlData, user]);

  return {
    auditMetrics,
    narrative,
    loading,
    error,
    fetchAudit,
    // Merged data ready for TradingAudit component
    auditProps: {
      pnlData: pnlData ? {
        ...pnlData,
        summary: {
          ...pnlData.summary,
          ...auditMetrics // Merge extended metrics into summary
        }
      } : null,
      user,
      auditNarrative: narrative
    }
  };
}

export default useAuditData;
