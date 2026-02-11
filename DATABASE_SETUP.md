# Database Setup Guide

This guide will help you set up PostgreSQL for the Audible Lists application.

## Quick Start with Docker (Recommended)

### 1. Start PostgreSQL

```bash
# From project root
docker-compose up -d

# Verify it's running
docker-compose ps

# Check logs if needed
docker-compose logs postgres
```

### 2. Run Database Migration

```bash
# Navigate to the UI package
cd packages/ui

# Run Prisma migration to create all tables
npx prisma migrate dev --name init

# Generate Prisma Client types
npx prisma generate
```

### 3. Verify Database

```bash
# Option 1: Use Prisma Studio (GUI)
npx prisma studio
# Opens at http://localhost:5555

# Option 2: Connect with psql
docker exec -it audible-lists-db psql -U audible -d audible_lists
# Then run: \dt to list tables
```

### 4. Start the Application

```bash
# From packages/ui
pnpm dev
# Opens at http://localhost:3000
```

---

## Database Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: audible_lists
- **User**: audible
- **Password**: audible_dev_password

**Connection String** (already in `.env`):
```
postgresql://audible:audible_dev_password@localhost:5432/audible_lists
```

---

## Common Commands

### Docker Commands

```bash
# Start database
docker-compose up -d

# Stop database (keeps data)
docker-compose stop

# Stop and remove containers (keeps data in volume)
docker-compose down

# Stop and remove everything including data (⚠️ DESTRUCTIVE)
docker-compose down -v

# View logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres
```

### Prisma Commands

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name description_of_change

# Apply existing migrations (production)
npx prisma migrate deploy

# Reset database (⚠️ DESTRUCTIVE - deletes all data)
npx prisma migrate reset

# Generate Prisma Client after schema changes
npx prisma generate

# Open Prisma Studio (database GUI)
npx prisma studio

# Format schema file
npx prisma format

# Validate schema file
npx prisma validate
```

### Database Backup & Restore

```bash
# Backup database
docker exec audible-lists-db pg_dump -U audible audible_lists > backup.sql

# Restore database
docker exec -i audible-lists-db psql -U audible audible_lists < backup.sql
```

---

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL already running locally:

**Option 1**: Stop local PostgreSQL
```bash
# macOS (Homebrew)
brew services stop postgresql

# Linux
sudo systemctl stop postgresql
```

**Option 2**: Change Docker port in `docker-compose.yml`
```yaml
ports:
  - "5433:5432"  # Use port 5433 on host
```

Then update `.env`:
```
DATABASE_URL="postgresql://audible:audible_dev_password@localhost:5433/audible_lists"
```

### Connection Refused

1. Check if container is running:
   ```bash
   docker-compose ps
   ```

2. Check container health:
   ```bash
   docker-compose logs postgres
   ```

3. Wait for database to be ready:
   ```bash
   # The healthcheck may take 10-20 seconds
   docker-compose ps
   # Look for "healthy" status
   ```

### Migration Errors

If you get migration errors:

1. **Check database connection**:
   ```bash
   cd packages/ui
   npx prisma db pull
   ```

2. **Reset and retry** (⚠️ deletes all data):
   ```bash
   npx prisma migrate reset
   npx prisma migrate dev --name init
   ```

3. **Check schema syntax**:
   ```bash
   npx prisma validate
   ```

---

## Optional: pgAdmin GUI

To enable the pgAdmin web interface, uncomment the `pgadmin` service in `docker-compose.yml`:

```bash
# Restart with pgAdmin enabled
docker-compose up -d

# Access pgAdmin
# URL: http://localhost:5050
# Email: admin@audible-lists.local
# Password: admin
```

Then add a new server in pgAdmin:
- **Host**: postgres (container name)
- **Port**: 5432
- **Database**: audible_lists
- **Username**: audible
- **Password**: audible_dev_password

---

## Database Schema

The database includes the following tables:

### Core Tables
- **User**: User accounts (via NextAuth)
- **TitleCatalog**: Shared catalog of Audible titles (keyed by ASIN)
- **UserLibrary**: User's personal library with progress/ratings
- **SyncToken**: JWT token tracking for sync operations
- **SyncHistory**: Log of all sync events

### Auth Tables (NextAuth)
- **Account**: OAuth account connections
- **Session**: User sessions
- **VerificationToken**: Email verification tokens

### Future Tables (Deferred)
- **RecommendationList**: User-created recommendation lists
- **ListItem**: Items within recommendation lists
- **TierList**: User-created tier rankings
- **TierAssignment**: Title assignments to tiers

To view the full schema: `packages/ui/prisma/schema.prisma`

---

## Production Considerations

For production deployment:

1. **Use strong passwords**: Replace `audible_dev_password` with a secure password
2. **Enable SSL**: Add `?sslmode=require` to DATABASE_URL
3. **Connection pooling**: Consider using PgBouncer or Prisma Data Proxy
4. **Backups**: Set up automated backups
5. **Monitoring**: Enable PostgreSQL query logging and monitoring
6. **Secrets management**: Use environment-specific secrets (never commit `.env`)

---

## Next Steps

Once your database is running:

1. ✅ Start PostgreSQL: `docker-compose up -d`
2. ✅ Run migrations: `cd packages/ui && npx prisma migrate dev --name init`
3. ✅ Start dev server: `pnpm dev`
4. 🌐 Test OAuth flow: Visit http://localhost:3000 and sign in
5. 🔍 View data: `npx prisma studio`

**Note**: You'll need to set up Google OAuth credentials in `.env` before authentication will work. See the main README for OAuth setup instructions.
