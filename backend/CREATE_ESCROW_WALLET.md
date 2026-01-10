# Create Escrow Wallet Guide

## Quick Setup

### Step 1: Install Coinbase SDK (Optional)

If you want to create the wallet programmatically:

```bash
npm install @coinbase/coinbase-sdk
```

### Step 2: Get CDP API Credentials

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Navigate to **API Keys** section
3. Create a new API key
4. Copy the **API Key ID** and **API Key Secret**

### Step 3: Add to `.env`

Add to `backend/.env`:

```env
CDP_API_KEY_ID=your-api-key-id
CDP_API_KEY_SECRET=your-api-key-secret
```

### Step 4: Run the Script

```bash
npm run create-wallet
```

This will:

- Create a new Coinbase wallet for escrow
- Display the wallet address
- Show you what to add to your `.env` file

## Alternative: Manual Creation

If you don't want to use the SDK:

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Navigate to **Server Wallet** → **Accounts**
3. Click **Create Account** or **Create Wallet**
4. Copy the wallet address
5. Add to `backend/.env`:

```env
ESCROW_WALLET_ADDRESS=0xYourWalletAddressHere
```

## Security Notes

- ✅ The wallet address (public) is safe to put in `.env`
- ❌ Never put the wallet secret/private key in code
- ✅ Keep your `.env` file in `.gitignore`
- ✅ Store API keys securely

## What Happens Next

Once you have the escrow wallet address in your `.env`, your payment system will:

1. Receive deposits from clients into this escrow wallet
2. Hold funds until work is approved
3. Release payments to freelancers when milestones are met

The escrow wallet acts as a secure holding account for all project payments.
