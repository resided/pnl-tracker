# PNL Tracker - Farcaster MiniApp

A Farcaster MiniApp that tracks wallet trading profit and loss (PNL) on the Base blockchain. Token-gated access requires users to hold 1,000,000 $PNL tokens.

**Design**: Inspired by [psycast.pages.dev](https://psycast.pages.dev) with a clean, minimal light-mode aesthetic.

![PNL Tracker Preview](./preview.png)

## Features

- **Token Gating**: Requires 1,000,000 $PNL tokens to access the tracker
- **Automatic Wallet Detection**: Uses Farcaster SDK to identify the user and fetch their verified Ethereum addresses via Neynar API
- **Base Chain PNL Tracking**: Calculates realized profit/loss using Moralis API
- **Token-by-Token Breakdown**: See performance for each token traded
- **Win Rate Calculation**: Track your success rate across all trades
- **Manual Wallet Input**: Also supports entering any wallet address manually
- **Psycast-Inspired Design**: Clean, minimal, light-mode aesthetic

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Farcaster Integration**: @farcaster/miniapp-sdk
- **APIs**: 
  - [Neynar](https://neynar.com) - Farcaster user data & verified addresses
  - [Moralis](https://moralis.com) - Wallet PNL data on Base chain

## Getting Started

### Prerequisites

- Node.js 22.11.0 or higher (LTS recommended)
- npm, pnpm, or yarn
- API keys from Neynar and Moralis

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd pnl-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment file and add your API keys:
```bash
cp .env.example .env
```

4. Edit `.env` with your API keys:
```
VITE_NEYNAR_API_KEY=your_neynar_key
VITE_MORALIS_API_KEY=your_moralis_key
VITE_APP_URL=http://localhost:3000
```

5. Start the development server:
```bash
npm run dev
```

### Testing in Farcaster

1. Install cloudflared for tunneling (since Farcaster can't access localhost):
```bash
# macOS
brew install cloudflared

# Linux
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

2. Start your tunnel:
```bash
cloudflared tunnel --url http://localhost:3000
```

3. Use the generated URL in the [Farcaster Mini App Preview Tool](https://farcaster.xyz/~/developers/mini-app-embed)

## Deployment

### 1. Generate Account Association

Before deploying, you need to generate Farcaster account association credentials:

```bash
npx create-onchain --manifest
```

This will generate `FARCASTER_HEADER`, `FARCASTER_PAYLOAD`, and `FARCASTER_SIGNATURE` values.

### 2. Update Configuration

Update these files with your production domain:

**`public/.well-known/farcaster.json`**:
```json
{
  "accountAssociation": {
    "header": "YOUR_GENERATED_HEADER",
    "payload": "YOUR_GENERATED_PAYLOAD",
    "signature": "YOUR_GENERATED_SIGNATURE"
  },
  "frame": {
    "version": "1",
    "name": "PNL Tracker",
    "iconUrl": "https://your-domain.com/icon.png",
    "splashImageUrl": "https://your-domain.com/splash.png",
    "splashBackgroundColor": "#0f172a",
    "homeUrl": "https://your-domain.com"
  }
}
```

**`index.html`**: Update all `your-domain.com` references with your actual domain.

### 3. Build and Deploy

```bash
npm run build
```

Deploy the `dist` folder to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.)

### Recommended Hosting: Vercel

```bash
npm i -g vercel
vercel
```

## API Configuration

### Neynar API

Used to fetch Farcaster user data and their verified Ethereum addresses.

1. Sign up at [neynar.com](https://neynar.com)
2. Get your API key from the dashboard
3. Add to `.env` as `VITE_NEYNAR_API_KEY`

### Moralis API

Used to fetch wallet profitability data on Base chain.

1. Sign up at [moralis.com](https://moralis.com)
2. Get your API key from the dashboard
3. Add to `.env` as `VITE_MORALIS_API_KEY`

**Note**: Moralis PNL is currently supported on Ethereum, Polygon, and Base. This app focuses on Base chain.

## Architecture

```
User opens MiniApp in Farcaster client
          ↓
sdk.context provides user FID
          ↓
Neynar API: Fetch verified_addresses by FID
          ↓
Check $PNL token balance (token gate)
          ↓
If balance >= 1,000,000: Show PNL data
If balance < 1,000,000: Show gate screen
          ↓
Moralis API: Get wallet PNL for each address on Base
          ↓
Display aggregated PNL data
```

## Token Gate Configuration

The app requires users to hold a minimum amount of $PNL tokens to access the PNL tracker.

In `src/App.jsx`, configure these constants:

```javascript
// Token gate configuration
const PNL_TOKEN_ADDRESS = '0xYOUR_PNL_TOKEN_ADDRESS'; // Your $PNL token contract on Base
const REQUIRED_PNL_BALANCE = 1000000; // 1 million tokens required
```

The token gate check:
1. Fetches the user's $PNL token balance using Moralis API
2. If balance >= required amount, grants access to the tracker
3. If balance < required amount, shows a gate screen with a "Buy $PNL" button

To customize the buy link, update the `TokenGateScreen` component's buy button href.

## Customization

### Changing the Demo Mode

In `src/App.jsx`, set `DEMO_MODE` to `false` for production:

```javascript
const DEMO_MODE = false; // Set to false for production
```

### Updating API Endpoints

Replace the placeholder API keys in the fetch calls:

```javascript
// Neynar API call
headers: {
  'api_key': import.meta.env.VITE_NEYNAR_API_KEY
}

// Moralis API call  
headers: {
  'X-API-Key': import.meta.env.VITE_MORALIS_API_KEY
}
```

### Adding More Chains

Moralis supports multiple chains. Modify the `fetchPNLData` function to include additional chains:

```javascript
const chains = ['base', 'eth', 'polygon'];
for (const chain of chains) {
  const response = await fetch(
    `https://deep-index.moralis.io/api/v2.2/wallets/${address}/profitability?chain=${chain}`,
    // ...
  );
}
```

## Troubleshooting

### "Not in Farcaster context" Error

This happens when running outside of a Farcaster client. The app will automatically fall back to manual wallet input mode.

### API Rate Limits

- Neynar: Check your plan's rate limits
- Moralis: Free tier has limited requests per minute

### PNL Data Not Showing

- Ensure the wallet has trading activity on Base chain
- Moralis only tracks realized PNL (actual swaps, not unrealized gains)
- Stablecoins are excluded from PNL calculations

## Resources

- [Farcaster Mini Apps Documentation](https://miniapps.farcaster.xyz/)
- [Neynar API Documentation](https://docs.neynar.com/)
- [Moralis Wallet API](https://docs.moralis.com/web3-data-api/evm/reference/wallet-api)
- [Farcaster SDK GitHub](https://github.com/farcasterxyz/miniapps)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
