# Syntropy Protocol - Frontend

Next.js 15 frontend with Coinbase CDP Embedded Wallets integration.

## Prerequisites

- Node.js 22+
- CDP Portal account and Project ID
- Backend API running (default: http://localhost:8080)

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` and add:
```env
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id_here
NEXT_PUBLIC_API_URL=http://localhost:8080
```

3. **Get your CDP Project ID:**
   - Go to [CDP Portal](https://portal.cdp.coinbase.com)
   - Create a new project or select an existing one
   - Copy the Project ID from the project settings
   - Add it to your `.env` file

4. **Whitelist localhost (for development):**
   - In CDP Portal, add `http://localhost:3000` to your allowed origins

5. **Run the development server:**
```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Features

- **Coinbase Wallet Connection**: Users connect their existing Coinbase wallet via CDP Embedded Wallets
- **Account Registration**: Create Syntropy account and link wallet address
- **Authentication**: JWT-based auth with wallet verification
- **Dashboard**: Role-based dashboard (Client/Freelancer)

## Authentication Flow

1. User clicks "Connect Wallet" and signs in with Coinbase CDP
2. If new user: Fill registration form (name, email, password, role)
3. System creates Syntropy account and links wallet address
4. User is redirected to role-based dashboard

## Architecture

- **Server Components**: Layout (metadata, HTML structure)
- **Client Components**: All CDP-related functionality uses `"use client"`
- **CDP Provider**: Wraps app with `CDPReactProvider` for wallet access
- **API Integration**: Axios for backend communication

## Documentation

- [Coinbase CDP Next.js Integration](https://docs.cdp.coinbase.com/embedded-wallets/nextjs)
- [CDP React Hooks](https://docs.cdp.coinbase.com/)
- [CDP React Components](https://docs.cdp.coinbase.com/)
