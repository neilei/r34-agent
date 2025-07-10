# Rule34 Agent Backend & Frontend

## Setup

1. Install dependencies:
```bash
bun install
```

2. Set up environment variables:
Create a `.env.local` file in `apps/frontend/` with:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Running the Application

### Backend (Agent)
```bash
cd apps/agent
bun run dev
```
This starts the Hono server on port 3001.

### Frontend
```bash
cd apps/frontend
bun run dev
```
This starts the Next.js frontend on port 3000.

## API Endpoints

### Backend (Hono server)
- `GET /health` - Health check endpoint
- `POST /rule34-graph` - Main text generation endpoint

### Frontend
The frontend will automatically connect to the backend using the `NEXT_PUBLIC_BACKEND_URL` environment variable.

## Development

The backend server runs on port 3001 by default. You can change this by setting the `PORT` environment variable.

```bash
PORT=3002 bun run dev
``` 