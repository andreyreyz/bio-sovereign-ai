# 🛡️ Bio-Sovereign AI (BSA)

> **Autonomous health monitoring platform with AI-driven Solana rewards**  
> Solana Hackathon MVP · Gemini 2.5 Flash · Devnet

---

## 🌐 Описание | Overview

**Bio-Sovereign AI** — автономная платформа мониторинга здоровья, которая использует искусственный интеллект (Google Gemini 2.5 Flash) для анализа биометрических данных и автоматически выплачивает вознаграждение в SOL (Solana Devnet) гражданам, соответствующим критериям здоровья.

**Bio-Sovereign AI** is an autonomous health monitoring platform that uses Google Gemini 2.5 Flash AI to analyze biometric data and autonomously distributes 0.1 SOL rewards on Solana Devnet to citizens meeting health standards.

---

## ✨ Возможности | Features

| Функция | Описание |
|---|---|
| 📡 **Live Telemetry** | Биометрические данные в реальном времени (пульс, шаги, сон) |
| 🧠 **AI Oracle** | Gemini 2.5 Flash анализирует витальные показатели и выносит вердикт |
| ⛓️ **Solana Rewards** | Автономная выплата 0.1 SOL на Devnet при положительном вердикте |
| 🌍 **Multilingual** | Интерфейс на русском, казахском и английском языках |
| 📋 **Decision Registry** | Неизменяемый реестр всех транзакций с хешами Solana |
| 🔍 **Explainable AI** | Прозрачное объяснение каждого решения ИИ |

---

## 🖥️ Скриншоты | Screenshots

### Биометрический центр управления
```
БИОМЕТРИЧЕСКИЙ ЦЕНТР УПРАВЛЕНИЯ
Национальный стандарт мониторинга здоровья

ПУЛЬС          ШАГИ ЗА ДЕНЬ     КАЧЕСТВО СНА
  75 BPM         10,104 STEPS       94.9/100
```

### Автономный вердикт
После нажатия **"АНАЛИЗИРОВАТЬ ВИТАЛЬНЫЕ ПОКАЗАТЕЛИ"** — ИИ-Оракул оценивает данные и при балле ≥ 60 активирует кнопку получения 0.1 SOL награды.

---

## 🏗️ Технологии | Tech Stack

```
Frontend         Backend          Blockchain       AI
──────────────   ──────────────   ──────────────   ──────────────
React + Vite     Express 5        Solana Web3.js   Gemini 2.5 Flash
Tailwind v4      PostgreSQL       Devnet           Google GenAI SDK
shadcn/ui        Drizzle ORM      0.1 SOL reward
TypeScript       Zod validation
```

**Monorepo:** pnpm workspaces  
**Database:** PostgreSQL + Drizzle ORM  
**API:** OpenAPI spec → generated React Query hooks

---

## 🚀 Запуск | Getting Started

### Требования | Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- Google API Key (Gemini)
- Solana wallet keypair (Devnet)

### Установка | Installation

```bash
# Clone
git clone https://github.com/andreyreyz/bio-sovereign-ai.git
cd bio-sovereign-ai

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
```

### Переменные окружения | Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# AI
GOOGLE_API_KEY=your_gemini_api_key

# Solana (base58 or JSON array)
POOL_WALLET_PRIVATE_KEY=your_solana_private_key

# Session
SESSION_SECRET=your_session_secret
```

### Запуск | Run

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend (separate terminal)
pnpm --filter @workspace/bsa-app run dev
```

---

## 📁 Структура проекта | Project Structure

```
bio-sovereign-ai/
├── artifacts/
│   ├── bsa-app/          # React + Vite frontend
│   │   └── src/
│   │       ├── pages/    # Dashboard, Registry
│   │       ├── components/
│   │       └── hooks/    # useWallet, useLang
│   └── api-server/       # Express API
│       └── src/routes/
│           ├── ai.ts         # Gemini AI analysis
│           ├── rewards.ts    # Solana transactions
│           └── vitals.ts     # Biometric data
├── lib/
│   ├── db/               # PostgreSQL schema (Drizzle)
│   └── api-spec/         # OpenAPI specification
└── README.md
```

---

## 🔗 API Endpoints

| Method | Endpoint | Описание |
|---|---|---|
| `GET` | `/api/vitals/current` | Текущие биометрические данные |
| `POST` | `/api/ai/analyze` | Анализ ИИ-Оракула |
| `POST` | `/api/rewards/claim` | Выплата 0.1 SOL |
| `GET` | `/api/rewards/history` | История транзакций |
| `GET` | `/api/rewards/stats` | Агрегированная статистика |

---

## 🌍 Мультиязычность | Multilingual

Интерфейс поддерживает три языка с переключателем в шапке:

- 🇷🇺 **Русский** (по умолчанию)
- 🇰🇿 **Қазақша**
- 🇬🇧 **English**

---

## ⛓️ Blockchain

- **Network:** Solana Devnet
- **Reward:** 0.1 SOL per eligible health assessment
- **Explorer:** [explorer.solana.com](https://explorer.solana.com/?cluster=devnet)
- **Recipient:** `C3ut3tRxbUiitGxHWXxNJrUvYkUTaioXFnaCyAMs6nmN`

---

## 🏆 Hackathon

Built for **Solana Hackathon** — demonstrating autonomous AI-to-blockchain reward distribution for health incentivization at national standard level.

**Design philosophy:** Obsidian Futuristic — dark glassmorphism, neon green accents, monospace typography — the aesthetic of a national health authority meets a cutting-edge crypto protocol.

---

## 📄 License

MIT © 2025 andreyreyz
