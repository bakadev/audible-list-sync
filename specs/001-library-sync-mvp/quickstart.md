# Developer Quickstart: Audible Library Sync MVP

**Date**: 2026-02-11
**Feature**: Audible Library Sync MVP
**Estimated Setup Time**: 15-20 minutes

## Prerequisites

- **Node.js** 20.x or later ([download](https://nodejs.org/))
- **pnpm** 9.x or later: `npm install -g pnpm`
- **Docker** & Docker Compose ([download](https://www.docker.com/products/docker-desktop/))
- **Chrome browser** (for extension testing)
- **Google Cloud Project** with OAuth 2.0 credentials ([console](https://console.cloud.google.com/))
- **Git** (for version control)

## Initial Setup

### 1. Clone Repository & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd my-audible-lists

# Install all workspace dependencies (ui, extension, db, shared)
pnpm install

# Verify installation
pnpm --version  # Should be 9.x or later
node --version  # Should be 20.x or later
docker --version
```

**What this does**: pnpm installs dependencies for all packages in the monorepo workspace in a single command. Turborepo orchestrates the workspace.

---

### 2. Configure Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required environment variables**:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/audible_lists"

# NextAuth (Auth.js)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-random-secret>"  # Run: openssl rand -base64 32

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="<your-client-id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your-client-secret>"

# JWT Sync Token Secret (separate from NEXTAUTH_SECRET)
JWT_SECRET="<generate-random-secret>"  # Run: openssl rand -base64 32
```

**Generate secrets**:
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET (different from above)
openssl rand -base64 32
```

**Get Google OAuth credentials**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project (or use existing)
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env`

---

### 3. Start PostgreSQL Database

```bash
# Start PostgreSQL in Docker container
pnpm --filter db docker:up

# Verify database is running
docker ps  # Should show postgres container
```

**What this does**: Starts a PostgreSQL 15 container on port 5432 with credentials from docker-compose.yml. Data persists in Docker volume.

**Troubleshooting**:
- If port 5432 is already in use, stop other PostgreSQL instances
- Check logs: `docker logs my-audible-lists-db`

---

### 4. Run Database Migrations

```bash
# Run Prisma migrations (creates tables)
pnpm --filter db prisma:migrate

# Verify schema
pnpm --filter db prisma:studio
```

**What this does**:
- Applies Prisma migrations to create all tables (User, TitleCatalog, UserLibrary, SyncToken, SyncHistory, etc.)
- Prisma Studio opens at `http://localhost:5555` for visual database browsing

**Expected output**:
```
Applying migration `20260211_init`
✅ Migration applied successfully
```

---

### 5. Start Next.js Development Server

```bash
# Start UI package (Next.js app)
pnpm --filter ui dev

# Or use root script (starts all packages)
pnpm dev
```

**What this does**: Starts Next.js dev server on `http://localhost:3000` with hot reload.

**Expected output**:
```
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Verify**:
- Open `http://localhost:3000` in browser
- Should see landing page with "Sign in with Google" button

---

### 6. Load Chrome Extension (Development Mode)

1. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load Extension**:
   - Click "Load unpacked"
   - Select `packages/extension/` directory
   - Extension should appear in list with ID

3. **Pin Extension** (optional):
   - Click puzzle icon in Chrome toolbar
   - Pin "Audible Library Sync" for easy access

4. **Verify**:
   - Click extension icon
   - Should see "Not connected" status

---

## Development Workflow

### Running the Full Stack

**Terminal 1 - Database**:
```bash
pnpm --filter db docker:up
```

**Terminal 2 - Next.js**:
```bash
pnpm --filter ui dev
```

**Terminal 3 - Optional: Prisma Studio**:
```bash
pnpm --filter db prisma:studio
```

**Chrome**: Load extension from `packages/extension/`

---

### Testing OAuth Flow

1. Open `http://localhost:3000`
2. Click "Sign in with Google"
3. Authorize with Google account (you'll be redirected to Google)
4. Should redirect back to dashboard at `http://localhost:3000/dashboard`
5. Dashboard shows "Connect extension" button

---

### Testing Extension Connection

1. Ensure signed in to website
2. Click "Connect extension" on dashboard
3. New tab opens: `https://www.audible.com/lib#token=eyJ...`
4. Extension detects token, shows "Connected to [Your Name]"
5. Close tab, return to dashboard
6. Dashboard shows "Waiting for sync..."

---

### Testing Library Sync (Mock)

**Important**: Full Audible scraping requires a real Audible account with titles. For initial development, you can:

**Option 1: Seed Test Data**
```bash
# Create seed script (packages/db/seed.ts)
pnpm --filter db prisma:seed

# This creates:
# - Test user with Google OAuth
# - Sample titles in TitleCatalog
# - UserLibrary entries for test user
```

**Option 2: Mock Extension Upload**

Use a tool like Postman or curl to POST to import endpoint:

```bash
curl -X POST http://localhost:3000/api/sync/import \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d @test-payload.json
```

**test-payload.json** (sample):
```json
{
  "titles": [
    {
      "asin": "B08XYZABC1",
      "title": "Project Hail Mary",
      "subtitle": "A Novel",
      "authors": ["Andy Weir"],
      "narrators": ["Ray Porter"],
      "seriesName": null,
      "seriesPosition": null,
      "duration": 963,
      "coverImageUrl": "https://m.media-amazon.com/images/I/...",
      "summary": "A lone astronaut must save Earth...",
      "rating": 4.8,
      "ratingCount": 125430,
      "publisher": "Audible Studios",
      "releaseDate": "2021-05-04T00:00:00.000Z",
      "language": "en",
      "categories": ["Science Fiction", "Hard SF"],
      "source": "LIBRARY",
      "listeningProgress": 45,
      "personalRating": 5,
      "dateAdded": "2023-06-15T10:30:00.000Z"
    }
  ]
}
```

---

### Common Development Tasks

**Add npm package to workspace**:
```bash
# Add to ui package
pnpm --filter ui add <package-name>

# Add to shared package
pnpm --filter shared add <package-name>
```

**Update shared types (after editing)**:
```bash
pnpm --filter shared build
pnpm --filter ui dev  # Restart to pick up changes
```

**Reset database**:
```bash
pnpm --filter db prisma:reset
# WARNING: Deletes all data!
```

**Update Prisma schema**:
```bash
# 1. Edit packages/db/prisma/schema.prisma
# 2. Create migration
pnpm --filter db prisma migrate dev --name add_new_field
# 3. Restart Next.js to regenerate Prisma Client
```

**View database**:
```bash
pnpm --filter db prisma:studio
# Opens http://localhost:5555
```

**Check TypeScript errors**:
```bash
pnpm --filter ui tsc --noEmit
```

**Lint code**:
```bash
pnpm --filter ui lint
```

---

## Package Scripts Reference

### Root Scripts
```bash
pnpm install        # Install all workspace dependencies
pnpm dev            # Start all packages in dev mode
pnpm build          # Build all packages for production
pnpm lint           # Lint all packages
```

### UI Package (`packages/ui/`)
```bash
pnpm --filter ui dev          # Start Next.js dev server (port 3000)
pnpm --filter ui build        # Build for production
pnpm --filter ui start        # Start production server
pnpm --filter ui lint         # Run ESLint
```

### DB Package (`packages/db/`)
```bash
pnpm --filter db docker:up    # Start PostgreSQL container
pnpm --filter db docker:down  # Stop PostgreSQL container
pnpm --filter db prisma:migrate     # Run migrations (dev)
pnpm --filter db prisma:generate    # Regenerate Prisma Client
pnpm --filter db prisma:studio      # Open Prisma Studio
pnpm --filter db prisma:reset       # Reset database (deletes data)
```

### Shared Package (`packages/shared/`)
```bash
pnpm --filter shared build    # Compile TypeScript types
```

### Extension Package (`packages/extension/`)
```bash
# No build step - load unpacked in Chrome
# Edit files directly, reload extension in chrome://extensions/
```

---

## Troubleshooting

### "Cannot connect to database"
- Check Docker container is running: `docker ps`
- Verify DATABASE_URL in .env matches docker-compose.yml
- Check port 5432 not in use: `lsof -i :5432`

### "Google OAuth error: redirect_uri_mismatch"
- Verify NEXTAUTH_URL in .env: `http://localhost:3000`
- Check Google Cloud Console authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- Ensure no trailing slash

### "Extension not detecting token"
- Open extension popup, click "Inspect" to view console logs
- Check token is in URL fragment: `#token=eyJ...` (not query string `?token=`)
- Verify extension has `host_permissions` for `audible.com` in manifest.json

### "Prisma Client error"
- Regenerate client: `pnpm --filter db prisma:generate`
- Restart Next.js dev server

### "Module not found: @audible-lists/shared"
- Build shared package: `pnpm --filter shared build`
- Check pnpm-workspace.yaml includes `packages/*`

### Port conflicts
- Next.js (3000): Change in `packages/ui/package.json` → `"dev": "next dev -p 3001"`
- PostgreSQL (5432): Change in `packages/db/docker-compose.yml` → `ports: ["5433:5432"]` and update DATABASE_URL
- Prisma Studio (5555): Change with `--port` flag: `prisma studio --port 5556`

---

## Next Steps After Setup

1. **Explore Codebase**:
   - `packages/ui/src/app/` - Next.js pages (App Router)
   - `packages/ui/src/components/` - React components
   - `packages/db/prisma/schema.prisma` - Database schema
   - `packages/shared/src/` - Shared TypeScript types
   - `packages/extension/` - Chrome extension code

2. **Read Specs**:
   - [spec.md](./spec.md) - Feature requirements and user stories
   - [data-model.md](./data-model.md) - Database schema details
   - [contracts/](./contracts/) - API endpoint specifications

3. **Start Implementing** (see [tasks.md](./tasks.md) once generated):
   - Start with User Story 1: Google OAuth authentication
   - Then User Story 2: Extension connection flow
   - Then User Story 3: Library scraping and import
   - Then User Story 4: Library browsing
   - Then User Story 5: Re-sync functionality

---

## Production Deployment (Future)

**Not covered in MVP**, but high-level steps:

1. Build production artifacts:
   ```bash
   pnpm build
   ```

2. Set up production environment:
   - PostgreSQL database (managed service like RDS, or self-hosted)
   - Update environment variables (production URLs, secrets)
   - Configure Google OAuth production redirect URI

3. Deploy Next.js:
   - Docker container (self-hosted VPS)
   - Or Platform: Railway, Render, DigitalOcean App Platform

4. Package extension for Chrome Web Store:
   - Zip `packages/extension/` directory
   - Update manifest.json with production API URL
   - Submit to Chrome Web Store

---

## Getting Help

- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Auth.js Docs**: https://authjs.dev
- **Chrome Extension Docs**: https://developer.chrome.com/docs/extensions/mv3/

For project-specific questions, refer to:
- [Project Constitution](../../.specify/memory/constitution.md)
- [Project Summary](../../PROJECT_SUMMARY.md)
- Package PURPOSE.md files

---

**Setup Complete!** You're ready to start implementing the MVP. 🚀
