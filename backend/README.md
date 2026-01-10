# Syntropy Protocol - Backend Setup

## Prerequisites
- Node.js 20+
- MongoDB Atlas account

## Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your credentials:
   ```env
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=generate_a_random_secret_here
   FIREWORKS_API_KEY=your_key_here
   ```

3. Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

## Installation

```bash
npm install
```

## Running the Server

### Development (with auto-reload):
```bash
npm run dev
```

### Production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "CLIENT",
  "full_name": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

#### Verify Token
```http
GET /api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## Project Structure

```
src/
├── config/         # Database & configuration
├── models/         # MongoDB schemas
├── routes/         # API endpoints
├── middleware/     # Auth & validation
├── services/       # Business logic
├── agents/         # AI agent implementations
├── utils/          # Helper functions
└── index.ts        # Server entry point
```

## Next Steps

Phase 2 will add:
- Project creation endpoints
- Architect Agent integration
- Critic Agent integration
- Mediator Agent with Change Streams
