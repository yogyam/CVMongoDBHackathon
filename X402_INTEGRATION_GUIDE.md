# x402 Payment Integration Guide

## What We've Implemented

I've added minimal x402 payment integration to allow clients to send payments and freelancers to accept payments. Here's what was created:

## Backend Changes

### 1. PaymentLedger Model (`backend/src/models/PaymentLedger.ts`)
- Tracks all payment transactions
- Stores x402 stream IDs, transaction hashes, and status
- Links to projects for payment history

### 2. Coinbase x402 Service (`backend/src/services/coinbase-x402.ts`)
- Minimal implementation that simulates x402 protocol flow
- Functions for initiating payments, releasing payments, and confirming transactions
- **TODO**: Replace with actual Coinbase x402 facilitator API calls

### 3. Payment Routes (`backend/src/routes/payments.ts`)
Three new API endpoints:

#### `POST /api/payments/escrow`
- Client deposits funds to escrow when creating a project
- Requires: `project_id`, `amount_usdc`
- Validates client wallet is connected
- Creates ledger entry

#### `POST /api/payments/release/:revisionId`
- Client releases milestone payment to freelancer
- Requires: `amount_usdc` in request body
- Validates revision is approved
- Checks sufficient escrow balance
- Transfers USDC from escrow to freelancer wallet

#### `GET /api/payments/:projectId/ledger`
- View payment history for a project
- Shows all deposits, releases, and transaction status
- Available to both client and freelancer

#### `POST /api/payments/confirm/:streamId`
- Confirms x402 payment transaction (webhook endpoint)
- Updates ledger status when payment is confirmed on-chain

## How It Works

### Flow 1: Escrow Deposit (Client)

```
1. Client creates project with budget (e.g., $500 USDC)
2. Client calls POST /api/payments/escrow with project_id and amount
3. Backend:
   - Validates client wallet is connected
   - Initiates x402 payment to escrow wallet
   - Creates PaymentLedger entry with status PENDING
   - Updates project.payment_status to ESCROWED
4. Client signs transaction via Coinbase CDP
5. Backend confirms transaction and updates ledger status to CONFIRMED
```

### Flow 2: Milestone Release (Client → Freelancer)

```
1. Freelancer submits work
2. Critic agent scores work (score ≥ 0.8)
3. Client approves work
4. Client calls POST /api/payments/release/:revisionId with amount_usdc
5. Backend:
   - Validates revision is approved
   - Checks sufficient escrow balance
   - Gets freelancer wallet address from User model
   - Initiates x402 payment from escrow to freelancer
   - Creates PaymentLedger entry
   - Updates project.released_usdc
6. Freelancer receives USDC in their wallet
```

## Environment Variables Needed

Add to `backend/.env`:

```env
# Optional: x402 facilitator URL (defaults to Coinbase)
X402_FACILITATOR_URL=https://api.coinbase.com/x402

# Optional: Escrow wallet address (for receiving deposits)
ESCROW_WALLET_ADDRESS=0x...your_escrow_wallet_address...
```

## What's Missing (Next Steps)

### 1. Real x402 Integration
The current implementation simulates x402 payments. To make it real:

- Integrate with Coinbase x402 facilitator API
- Handle HTTP 402 Payment Required responses
- Implement transaction signing flow via CDP
- Poll blockchain for transaction confirmations

### 2. Frontend Integration
Add to frontend dashboard:

- Payment status display on project cards
- "Deposit to Escrow" button for clients
- "Release Payment" button when work is approved
- Payment ledger/history view
- Transaction status indicators

### 3. Automatic Release
Currently manual. Could automate:

- Auto-release when revision score ≥ 0.9
- Auto-release on milestone completion
- Configurable release schedule

### 4. Payment Agent
As mentioned in PRD, implement Payment Agent that:

- Automatically calculates milestone releases
- Detects scope changes and negotiates delta
- Handles payment flows autonomously

## Testing

### Test Escrow Deposit:
```bash
curl -X POST http://localhost:8080/api/payments/escrow \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_ID",
    "amount_usdc": 500
  }'
```

### Test Payment Release:
```bash
curl -X POST http://localhost:8080/api/payments/release/REVISION_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount_usdc": 150
  }'
```

### View Payment Ledger:
```bash
curl -X GET http://localhost:8080/api/payments/PROJECT_ID/ledger \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Current Limitations

1. **Simulated Payments**: x402 payments are simulated, not real blockchain transactions
2. **No Escrow Wallet**: Need to set up actual escrow wallet or use platform wallet
3. **Manual Confirmation**: Transactions need to be manually confirmed (no webhook/auto-confirm)
4. **No Multi-Sig**: Escrow is single-wallet based (could add multi-sig for security)

## Security Considerations

- ✅ Validates user permissions (only client can deposit/release)
- ✅ Validates wallet addresses are connected
- ✅ Checks sufficient escrow balance before release
- ✅ Requires revision approval before payment
- ⚠️ Need to add rate limiting
- ⚠️ Need to add transaction replay protection
- ⚠️ Need to validate x402 signatures

## Next: Frontend Integration

To connect this to the frontend, you'll want to:

1. Add payment status to project cards
2. Create "Deposit to Escrow" component
3. Create "Release Payment" button for approved revisions
4. Add payment history/ledger view
5. Show transaction status indicators

Would you like me to create the frontend components next?
