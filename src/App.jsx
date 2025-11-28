import React, { useState, useEffect } from 'react';

// PNL Tracker MiniApp for Farcaster
// Styled to match psycast.pages.dev aesthetic (Light Mode / Minimalist)
// Token gated: requires PNL tokens to access

const DEMO_MODE = false; // Set to true if you want mock data

// Token gate configuration
const PNL_TOKEN_ADDRESS =
  import.meta.env.VITE_PNL_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000';
const REQUIRED_PNL_BALANCE = 3000000; // starting gate, adjust after launch

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

// CSS Variables matching YOUR psycast.pages.dev aesthetic
const colors = {
  bg: '#fafafa',       // Light Grey Background
  ink: '#0b0b0b',      // Dark Ink Text
  muted: '#6b7280',    // Muted Grey
  accent: '#111827',   // Dark Accent
  border: '#e5e7eb',   // Light Border
  pill: '#111827',     // Dark Pill Background
  pillText: '#f9fafb', // Light Pill Text
  metricLabel: '#9ca3af',
  metricValue: '#111827',
  success: '#22c55e',
  error: '#b91c1c',
  panelBg: '#ffffff'   // White Panel Background
};

// Token Gate Screen Component
const TokenGateScreen = ({ balance, required, onRetry, onGetAccess }) => (
  <div
    style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: colors.ink
    }}
  >
    <div
      style={{
        background: colors.panelBg,
        borderRadius: '18px',
        border: `1px solid ${colors.border}`,
        padding: '32px 28px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 14px 35px rgba(15,23,42,0.08)',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '28px'
        }}
      >
        🔒
      </div>

      <div
        style={{
          fontSize: '10px',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: colors.metricLabel,
          marginBottom: '8px'
        }}
      >
        Token Gated Access
      </div>

      <h2
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.ink,
          margin: '0 0 12px'
        }}
      >
        Insufficient $PNL Balance
      </h2>

      <p
        style={{
          fontSize: '13px',
          color: colors.muted,
          lineHeight: '1.6',
          margin: '0 0 24px'
        }}
      >
        you need to hold at least{' '}
        <strong style={{ color: colors.ink }}>{formatNumber(required)} $PNL</strong> tokens to
        access the full PNL Tracker. tap <strong>Get $PNL</strong> to open the swap sheet, then
        hit <strong>Retry</strong> after swapping.
      </p>

      <div
        style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          border: `1px solid ${colors.border}`
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: colors.metricLabel
            }}
          >
            Your Balance
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.error,
              fontFeatureSettings: '"tnum" 1, "lnum" 1'
            }}
          >
            {formatNumber(balance)} $PNL
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              color: colors.metricLabel
            }}
          >
            Required
          </span>
          <span
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: colors.ink,
              fontFeatureSettings: '"tnum" 1, "lnum" 1'
            }}
          >
            {formatNumber(required)} $PNL
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onGetAccess}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: '999px',
            background: colors.pill,
            color: colors.pillText,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Get $PNL
        </button>
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
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// Simple error screen (no free access)
const ErrorScreen = ({ title, message }) => (
  <div
    style={{
      minHeight: '100vh',
      background: colors.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      color: colors.ink
    }}
  >
    <div
      style={{
        background: colors.panelBg,
        borderRadius: '18px',
        border: `1px solid ${colors.border}`,
        padding: '28px 24px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRad