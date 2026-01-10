# Syntropy Protocol 🚀

An autonomous mediation layer for the freelance economy using multi-agent AI coordination and MongoDB Atlas.

## 🎯 Overview

Syntropy is a multi-agent system where specialized AI agents (Architect, Critic, Mediator) collaborate using MongoDB as a shared coordination layer. The system:

- **Eliminates management overhead** between clients and freelancers
- **Uses the "Gatekeeper" pattern** - clients only see work that passes quality verification (Level 8+)
- **Enables autonomous negotiations** through intelligent agents

## 🤖 Agents

### Architect Agent
Interviews the client through multi-turn conversation to understand requirements, then generates a comprehensive technical specification.

### Critic Agent
Evaluates freelancer submissions against requirements. Only scores ≥ 8/10 are visible to clients (the "Gatekeeper" pattern).

### Mediator Agent
Generates professional notifications for clients when verified work is ready for review.

## 🛠 Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **AI Engine:** Fireworks AI (firefunction-v2)
- **Database:** MongoDB Atlas
- **Authentication:** JWT
- **Payments:** x402 Protocol (coming soon)

## 📦 Installation

### Backend Setup

```bash
cd backend
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
FIREWORKS_API_KEY=your_fireworks_api_key
```

### Run Development Server

```bash
npm run dev
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register as Client or Freelancer
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Verify token

### Projects
- `POST /api/projects` - Create project (Client)
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Project details
- `POST /api/projects/:id/approve` - Approve work (Client)

### Chat (Conversational Architect)
- `POST /api/chat/:projectId/start` - Start conversation
- `POST /api/chat/:projectId/message` - Send message
- `POST /api/chat/:projectId/generate` - Generate requirements
- `GET /api/chat/:projectId` - Get conversation history

### Revisions
- `POST /api/revisions` - Submit work (Freelancer)
- `GET /api/revisions/:projectId` - Get revisions

## 🏆 Hackathon Theme

**Statement Two: Multi-Agent Collaboration**
- Agents discover and assign tasks via MongoDB
- Shared "whiteboard" pattern for context coordination
- Token-efficient state management

**Statement Four: Agentic Payments** (Coming Soon)
- x402 protocol integration
- Autonomous escrow and payment release

## 📄 License

MIT
