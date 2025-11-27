# PNL Tracker - Farcaster MiniApp

A Farcaster MiniApp that tracks wallet trading profit and loss (PNL) on the Base blockchain. Token-gated access requires users to hold 3,000,000 $PNL tokens.

**Design**: Inspired by [psycast.pages.dev](https://psycast.pages.dev) with a clean, minimal light-mode aesthetic.


## Features

- **Token Gating**: Requires 3,000,000 $PNL tokens to access the tracker
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

