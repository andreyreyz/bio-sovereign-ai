# Bio-Sovereign AI (BSA)

## Overview

Hackathon MVP for Solana — an autonomous health monitoring platform that uses AI to determine if a citizen deserves a Solana reward based on biometric data. National-standard health authority aesthetic crossed with cutting-edge crypto protocol.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind v4 + shadcn/ui (artifacts/bsa-app)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Gemini 2.5 Flash via Replit AI Integrations (lib/integrations-gemini-ai)
- **Blockchain**: Solana Web3.js (@solana/web3.js) — Devnet
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Architecture

```
artifacts/
  bsa-app/         # React+Vite frontend (port 25837, served at /)
  api-server/      # Express backend (port 8080, served at /api)
lib/
  db/              # Drizzle ORM + PostgreSQL schema
  api-spec/        # OpenAPI spec (source of truth)
  api-client-react/# Generated React Query hooks
  api-zod/         # Generated Zod schemas
  integrations-gemini-ai/  # Gemini AI SDK client
```

## Features

- **Dashboard**: Live biometric vitals (Steps, Heart Rate, Sleep Quality) polled every 3s
- **Simulated Wallet**: Connect Wallet button with simulated Solana wallet state
- **AI Oracle**: Gemini 2.5 Flash analyzes vitals and issues eligibility verdict with detailed explainability
- **Autonomous Reward**: Sends 0.1 SOL on Solana Devnet to connected wallet when AI verdict is positive
- **Decision Registry**: Immutable ledger of past reward transactions with AI explanations and Solana Explorer links

## Secrets Required

- `POOL_WALLET_PRIVATE_KEY`: Private key of the pool wallet for SOL rewards (base58 or JSON array)
- `SESSION_SECRET`: Session secret
- Auto-configured by Replit AI Integrations:
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`
  - `AI_INTEGRATIONS_GEMINI_API_KEY`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

- `rewards` table: id, walletAddress, signature, amount, healthScore, aiExplanation, explorerUrl, createdAt

## API Endpoints

- `GET /api/vitals/current` — simulated live vitals
- `GET /api/vitals/history` — 24h vitals history
- `POST /api/ai/analyze` — Gemini AI health verdict
- `POST /api/rewards/claim` — send SOL via Solana Devnet
- `GET /api/rewards/history` — past reward records
- `GET /api/rewards/stats` — aggregate statistics
