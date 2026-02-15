# audioshlf - Web Application (packages/ui)

Next.js web application for syncing and organizing your Audible library.

## Features

- **Google OAuth Authentication** - Secure sign-in with Auth.js (NextAuth)
- **Library Sync** - Generate secure JWT tokens for browser extension sync
- **Library Browsing** - Search and filter your audiobook collection
- **Dashboard** - View sync history, library stats, and manage connections
- **Responsive Design** - Mobile-friendly UI with Tailwind CSS
- **Type-Safe** - Full TypeScript support with Prisma ORM

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Auth.js (NextAuth) with Google OAuth
- **Notifications**: Sonner toast library

## Prerequisites

- Node.js 18+ and pnpm
- PostgreSQL 16+ (running via Docker or locally)
- Google OAuth credentials (Client ID and Secret)

## Environment Variables

Create a `.env` file in `packages/ui/` with the following variables:

```bash
# Database
DATABASE_URL="postgresql://audible:audible_dev_password@localhost:5432/audible_lists?schema=public"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3003"
NEXTAUTH_SECRET="your-nextauth-secret-here-generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# JWT for Sync Tokens
JWT_SECRET="your-jwt-secret-here-generate-with-openssl-rand-base64-32"
```

### Generating Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate JWT_SECRET
openssl rand -base64 32
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `http://localhost:3003/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env`

## Database Setup

### Option 1: Using Docker (Recommended)

From the repository root:

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify database is running
docker-compose ps

# View logs
docker-compose logs postgres
```

### Option 2: Local PostgreSQL

Install PostgreSQL 16+ and update `DATABASE_URL` in `.env` with your credentials.

### Run Migrations

```bash
cd packages/ui

# Run Prisma migrations
pnpm db:migrate

# Generate Prisma Client
pnpm db:generate
```

## Installation

From the repository root:

```bash
# Install dependencies
pnpm install

# Navigate to UI package
cd packages/ui

# Run migrations
pnpm db:migrate

# Start development server
pnpm dev
```

The application will be available at [http://localhost:3003](http://localhost:3003)

## Available Scripts

### Development

- `pnpm dev` - Start Next.js development server (with Turbopack)
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Database

- `pnpm db:studio` - Open Prisma Studio (visual database browser)
- `pnpm db:migrate` - Run database migrations
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:push` - Push schema changes without migration
- `pnpm db:seed` - Seed database (if configured)

## Project Structure

```
packages/ui/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Migration history
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # Auth pages (signin)
│   │   ├── api/              # API routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   ├── sync/         # Sync token & import
│   │   │   └── library/      # Library queries
│   │   ├── dashboard/        # Dashboard page
│   │   ├── library/          # Library browse page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   ├── not-found.tsx     # 404 error page
│   │   └── error.tsx         # 500 error page
│   ├── components/
│   │   ├── dashboard/        # Dashboard components
│   │   ├── library/          # Library components
│   │   └── ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts           # Auth.js configuration
│   │   ├── jwt.ts            # JWT utilities
│   │   └── prisma.ts         # Prisma client singleton
│   └── middleware.ts         # Route protection
├── .env                      # Environment variables (not committed)
├── .env.example             # Environment template
├── next.config.ts           # Next.js configuration
└── package.json             # Dependencies and scripts
```

## Database Schema

Key tables:

- **User** - User accounts (linked to Google OAuth)
- **TitleCatalog** - Audiobook metadata (keyed by ASIN)
- **UserLibrary** - User's library entries with personal data
- **SyncToken** - JWT tokens for extension sync (single-use)
- **SyncHistory** - Log of sync events with statistics

See `prisma/schema.prisma` for full schema definition.

## Development Workflow

### 1. Authentication Flow

- User signs in with Google OAuth
- Session stored as JWT (Edge Runtime compatible)
- Protected routes redirect to `/signin` if unauthenticated

### 2. Sync Flow

- User clicks "Connect Extension" on dashboard
- Server generates JWT token (15min TTL, single-use)
- Token passed to Audible via URL fragment
- Browser extension (not included in MVP) reads token
- Extension POSTs library data to `/api/sync/import`
- Server validates JWT, imports titles, updates database

### 3. Library Browsing

- Server-side rendering for optimal performance
- Client-side search with debounced input
- Real-time filtering by title, author, narrator

## Testing

### Manual Testing

See `DATABASE_SETUP.md` and `test-import.sh` for testing the import endpoint:

```bash
# Generate token via dashboard UI or API
curl -X POST http://localhost:3003/api/sync/token \
  -H "Cookie: your-session-cookie"

# Test import with sample payload
./test-import.sh <jwt-token>
```

### Import Test Payload

A sample payload is available in `test-import-payload.json` with 4 audiobooks.

## Deployment

This application is designed for self-hosted deployment (Docker/VPS), not Vercel.

### Build for Production

```bash
cd packages/ui
pnpm build
pnpm start
```

### Docker Deployment

The `next.config.ts` is configured with `output: 'standalone'` for Docker deployment.

See root `docker-compose.yml` for PostgreSQL setup.

## Troubleshooting

### Database Connection Errors

- Verify PostgreSQL is running: `docker-compose ps`
- Check `DATABASE_URL` in `.env`
- Ensure database exists: `psql -h localhost -U audible -d audible_lists`

### Auth Errors

- Verify Google OAuth credentials in `.env`
- Check redirect URI in Google Console matches `NEXTAUTH_URL`
- Ensure `NEXTAUTH_SECRET` is set

### Migration Errors

- If using Prisma 7, downgrade to v6: `pnpm add @prisma/client@^6.0.0 prisma@^6.0.0 -D`
- Delete `prisma/migrations` and re-run `pnpm db:migrate` if needed

### Next.js 16 Changes

- `searchParams` in page components is now async: `await searchParams`
- Use `const params = await searchParams` before accessing values

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Auth.js Documentation](https://authjs.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

## Contributing

This is an MVP implementation. Testing, CI/CD, and additional features are planned for future iterations.

## License

Private project - not licensed for public use.
