# UI Package - Next.js Web Application

## Purpose

The core web application that serves as the platform's frontend and backend. This is where users manage their accounts, view their synced libraries, generate sync tokens for the extension, and browse their audiobook collections.

## Responsibilities

### Authentication & User Management
- Google OAuth authentication via Auth.js (NextAuth)
- User session management
- Account creation and profile display

### Sync Token Generation
- Generate short-lived JWT tokens for extension connection
- Track token usage and expiration in database
- Provide "Connect extension" flow that opens Audible with token in URL

### Library Import API
- Accept JSON payloads from browser extension
- Validate sync tokens (JWT authentication)
- Process audiobook metadata into normalized database
- Full-replace import strategy: delete old entries, insert new data
- Log sync events for audit trail

### Library Browsing
- Display user's synced audiobook library
- Real-time search by title, author, or narrator
- Show cover art, metadata, listening progress
- Empty state for users without synced data

### Dashboard
- Display sync history (last 5 events)
- Show library statistics (total count, library vs wishlist breakdown)
- Provide re-sync functionality

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Authentication**: Auth.js (NextAuth) with Google OAuth
- **Database**: PostgreSQL via Prisma ORM
- **API**: Next.js API Routes (REST)

## Package Structure

```
packages/ui/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # Auth pages (signin)
│   │   ├── dashboard/       # Dashboard pages
│   │   ├── library/         # Library browse page
│   │   ├── api/             # API routes
│   │   │   ├── auth/        # NextAuth
│   │   │   ├── sync/        # Token + import endpoints
│   │   │   └── library/     # Library query endpoints
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   ├── components/          # React components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── library/         # Library-specific components
│   └── lib/                 # Utilities
│       ├── prisma.ts        # Prisma client singleton
│       ├── auth.ts          # NextAuth configuration
│       └── jwt.ts           # JWT utilities
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Prisma migrations
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── next.config.ts           # Next.js configuration
├── tailwind.config.ts       # Tailwind configuration
└── tsconfig.json            # TypeScript configuration
```

## Key Interactions

| Action | Direction | Description |
|--------|-----------|-------------|
| OAuth Login | User → Website | Google OAuth authentication flow |
| Generate Token | Dashboard → API | POST /api/sync/token creates JWT |
| Import Data | Extension → API | POST /api/sync/import with JWT + payload |
| Browse Library | User → Website | View synced titles, search/filter |
| View History | Dashboard → API | GET /api/sync/history shows sync events |

## Data Flow

```
User signs in with Google
  ↓
Dashboard loads (protected route)
  ↓
User clicks "Connect extension"
  ↓
POST /api/sync/token generates JWT
  ↓
Audible.com opens with token in URL fragment
  ↓
Extension uploads library data
  ↓
POST /api/sync/import validates JWT, processes payload
  ↓
Database updated (TitleCatalog + UserLibrary entries)
  ↓
Dashboard shows updated stats and sync history
  ↓
User browses library on /library page
```

## Security Principles

- **No credential storage**: Never store Amazon/Audible credentials
- **JWT authentication**: Sync tokens are short-lived (15min), single-use, signed
- **Session management**: Database-backed sessions via NextAuth
- **Protected routes**: Middleware enforces authentication on /dashboard and /library
- **Input validation**: All API endpoints validate payload structure and size
- **Private by default**: User libraries are not publicly accessible (MVP)

## What This Package Does NOT Do

- **No scraping**: Extension handles Audible scraping, not this package
- **No Docker setup**: Database container managed by packages/db
- **No shared types package**: Types defined inline for MVP (future extraction)
- **No automated testing**: Deferred for MVP, architecture supports future addition
- **No deployment config**: Self-hosted deployment handled separately

## Development Workflow

1. **Prerequisites**: PostgreSQL running, environment variables configured
2. **Install dependencies**: `pnpm install`
3. **Generate Prisma Client**: `pnpm prisma generate`
4. **Run migrations**: `pnpm prisma migrate dev`
5. **Start dev server**: `pnpm dev`
6. **Access app**: http://localhost:3000

## API Endpoints

### Authentication
- `POST /api/auth/[...nextauth]` - NextAuth OAuth flow (managed by Auth.js)

### Sync Operations
- `POST /api/sync/token` - Generate sync token (requires auth)
- `POST /api/sync/import` - Import library data (requires JWT)
- `GET /api/sync/history` - Fetch sync history (requires auth)

### Library Queries
- `GET /api/library` - Query user library (requires auth, supports search param)
- `GET /api/library/stats` - Library statistics (requires auth)

## Future Enhancements (Post-MVP)

- Recommendation lists (user-curated themed lists)
- Tier lists (S/A/B/C/D ranking system)
- Sharing controls (public/unlisted/friends-only visibility)
- Social features (view-only, no likes/comments)
- Additional OAuth providers (GitHub, email/password)
- Multi-region Audible support (UK, Canada, etc.)
