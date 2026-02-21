# audioshlf

A platform for Audible listeners to share, organize, and showcase their audiobook collections. Users sync their library via a browser extension, then build curated lists and tier rankings on the web.

## Project Structure

```
packages/
  ui/           - Next.js web app (frontend + API)
  extension/    - Chrome extension (Audible scraper + sync)
  audnexus/     - Audiobook metadata API (git subtree)
  db/           - Shared database schemas (placeholder)
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Quick Start

### 1. Start Docker services

This starts PostgreSQL (for the web app), MongoDB and Redis (for audnexus):

```bash
docker compose up -d
```

Verify everything is healthy:

```bash
docker compose ps
```

### 2. Configure environment

```bash
cp packages/ui/.env.example packages/ui/.env
```

Edit `packages/ui/.env` and fill in the required values:

```env
# Database (works out of the box with Docker defaults)
DATABASE_URL="postgresql://audible:audible_dev_password@localhost:5432/audible_lists?schema=public"

# Auth - generate secrets with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate>"
JWT_SECRET="<generate>"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Admin
ADMIN_EMAIL=""
```

### 3. Set up the database

```bash
cd packages/ui
pnpm install
pnpm dlx prisma migrate dev --name init
pnpm dlx prisma generate
```

### 4. Start the web app

```bash
# From packages/ui
pnpm dev
```

The web app runs at **http://localhost:3000**.

### 5. Verify audnexus

The audnexus API starts automatically with Docker:

```bash
# Health check
curl http://localhost:3001/health

# Fetch a book by ASIN
curl http://localhost:3001/books/B08C6YJ1LS
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Web App (Next.js) | 3000 | Main frontend and API |
| Audnexus API | 3001 | Audiobook metadata aggregation |
| PostgreSQL | 5432 | Web app database |
| MongoDB | 27017 (localhost only) | Audnexus database |
| Redis | 6379 (localhost only) | Audnexus cache |

## Docker Commands

```bash
# Start all services
docker compose up -d

# Stop services (keeps data)
docker compose stop

# Stop and remove containers (keeps data volumes)
docker compose down

# Stop and remove everything including data
docker compose down -v

# View logs
docker compose logs -f              # All services
docker compose logs -f audnexus     # Audnexus only
docker compose logs -f postgres     # PostgreSQL only

# Restart a single service
docker compose restart audnexus
```

## Audnexus (Git Subtree)

The `packages/audnexus` directory is managed as a [git subtree](https://www.atlassian.com/git/tutorials/git-subtree) from [laxamentumtech/audnexus](https://github.com/laxamentumtech/audnexus). This makes it easy to pull upstream updates without maintaining a fork.

### Pull latest updates

```bash
# One-time: add a remote alias
git remote add audnexus https://github.com/laxamentumtech/audnexus.git

# Pull updates
git subtree pull --prefix=packages/audnexus audnexus main --squash
```

### Audnexus API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/books/{ASIN}` | Book metadata by ASIN |
| GET | `/authors/{ASIN}` | Author metadata by ASIN |
| GET | `/chapters/{ASIN}` | Chapter data by ASIN |
| GET | `/authors?name={query}` | Search authors by name |
| GET | `/health` | Health check |

All endpoints accept an optional `?region=` query parameter (e.g., `us`, `uk`, `de`).

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project or select an existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `packages/ui/.env`

## Further Reading

- [Database Setup Guide](DATABASE_SETUP.md) - Detailed PostgreSQL setup, Prisma commands, backups, and troubleshooting
- [Design Direction](DESIGN_DIRECTION.md) - UI design system and component conventions
- [Project Summary](PROJECT_SUMMARY.md) - Architecture overview and core concepts
