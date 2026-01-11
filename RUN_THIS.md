# How to Run OverHeadAI

## Step-by-Step Setup

### Prerequisites

- Node.js 22+ installed
- MongoDB Atlas account (or local MongoDB)
- Coinbase CDP Portal account (for wallet integration)

---

## 1. Backend Setup

### Step 1.1: Install Backend Dependencies

```bash
cd CVMongoDBHackathon/backend
npm install
```

### Step 1.2: Create Environment File

Create a `.env` file in the `backend/` directory:

```bash
cd CVMongoDBHackathon/backend
cat > .env << 'EOF'
# MongoDB Connection
MONGODB_URI=your_mongodb_atlas_connection_string_here

# JWT Secret (generate a random string)
JWT_SECRET=your_super_secret_jwt_key_here

# Fireworks AI (if using AI agents)
FIREWORKS_API_KEY=your_fireworks_api_key_here

# Server Port (optional, defaults to 8080)
PORT=8080
EOF
```

**Generate JWT Secret:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and paste it as your `JWT_SECRET`.

**Get MongoDB URI:**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster (free tier is fine)
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database password

### Step 1.3: Run Backend

```bash
cd CVMongoDBHackathon/backend
npm run dev
```

The backend will run on `http://localhost:8080`

---

## 2. Frontend Setup

### Step 2.1: Get CDP Package Versions

Since the CDP packages might not be published yet, we'll use the CDP starter template to get the correct versions:

```bash
# Create a temporary CDP app to get package versions
cd /tmp
npm create @coinbase/cdp-app@latest temp-cdp-check

# Check what packages it uses
cat temp-cdp-check/package.json | grep -A 10 "dependencies"
```

**OR** try installing directly:

```bash
cd CVMongoDBHackathon/frontend
npm install @coinbase/cdp-react @coinbase/cdp-hooks --save
```

If that fails, the packages might not be publicly available yet. See **Alternative Setup** below.

### Step 2.2: Install Frontend Dependencies

```bash
cd CVMongoDBHackathon/frontend
npm install
```

### Step 2.3: Create Environment File

Create a `.env.local` file in the `frontend/` directory:

```bash
cd CVMongoDBHackathon/frontend
cat > .env.local << 'EOF'
# Coinbase CDP Project ID
# Get this from: https://portal.cdp.coinbase.com
NEXT_PUBLIC_CDP_PROJECT_ID=your_cdp_project_id_here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8080
EOF
```

**Get CDP Project ID:**

1. Go to [CDP Portal](https://portal.cdp.coinbase.com)
2. Sign in/up
3. Create a new project or select existing
4. Copy the Project ID from settings
5. Add `http://localhost:3000` to allowed origins in CDP Portal settings

### Step 2.4: Run Frontend

```bash
cd CVMongoDBHackathon/frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

---

## 3. Alternative Setup (If CDP Packages Not Available)

If `@coinbase/cdp-react` and `@coinbase/cdp-hooks` aren't available, you can:

### Option A: Use CDP Starter Template

1. Create a new CDP app using their template:
   ```bash
   npm create @coinbase/cdp-app@latest overheadai-cdp
   cd overheadai-cdp
   ```
2. Copy the `package.json` dependencies to your frontend
3. Adapt the template's components to your needs

### Option B: Temporary Mock (For Development)

Comment out CDP imports and create simple mocks to test the rest of your app:

```typescript
// Mock CDP hooks for development
export const useEvmAddress = () => ({ evmAddress: "0x..." });
export const useIsSignedIn = () => ({ isSignedIn: false, isLoading: false });
```

---

## 4. Running Both Servers

You need **two terminal windows**:

### Terminal 1 - Backend:

```bash
cd CVMongoDBHackathon/backend
npm run dev
```

Should see:

```
✅ MongoDB Atlas connected successfully
🚀 Server running on port 8080
```

### Terminal 2 - Frontend:

```bash
cd CVMongoDBHackathon/frontend
npm run dev
```

Should see:

```
- ready started server on 0.0.0.0:3000
```

---

## 5. Test the Application

1. Open browser: `http://localhost:3000`
2. You should see the Sign In screen
3. Click "Connect Wallet" (requires CDP packages to work)
4. After connecting, fill out registration form
5. Account will be created and wallet linked

---

## Troubleshooting

### Backend won't start

- Check MongoDB URI is correct
- Make sure MongoDB cluster allows connections from your IP
- Check `.env` file exists and has correct values

### Frontend CDP packages error

- Try: `npm install @coinbase/cdp-react @coinbase/cdp-hooks --save --legacy-peer-deps`
- Or use the CDP starter template approach
- Check if packages are available: `npm view @coinbase/cdp-react`

### Port already in use

- Backend: Change `PORT` in `.env` file
- Frontend: `npm run dev -- -p 3001`

### CORS errors

- Make sure backend has `cors()` middleware enabled (already in code)
- Check frontend `.env.local` has correct `NEXT_PUBLIC_API_URL`

---

## Quick Start (TL;DR)

```bash
# Backend
cd backend
npm install
# Create .env file with MONGODB_URI and JWT_SECRET
npm run dev

# Frontend (in new terminal)
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_CDP_PROJECT_ID
npm run dev

# Open http://localhost:3000
```
