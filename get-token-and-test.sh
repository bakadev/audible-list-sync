#!/bin/bash

# Get session cookie and generate token, then test import
# This assumes you're signed in on localhost:3003

echo "Step 1: Fetching session cookie..."

# Get cookies from the browser (this might not work - you may need to provide the cookie manually)
COOKIE_FILE="/tmp/audible-lists-cookies.txt"

# Try to get the session token from your browser's cookie store
# This is a placeholder - you'll need to manually get the cookie
echo ""
echo "Please get your session cookie:"
echo "1. Go to http://localhost:3003/dashboard in your browser"
echo "2. Open DevTools (F12) → Application tab → Cookies"
echo "3. Find the cookie named 'authjs.session-token'"
echo "4. Copy its value"
echo ""
read -p "Paste your session cookie here: " SESSION_COOKIE

if [ -z "$SESSION_COOKIE" ]; then
  echo "Error: No session cookie provided"
  exit 1
fi

echo ""
echo "Step 2: Generating sync token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3003/api/sync/token \
  -H "Cookie: authjs.session-token=$SESSION_COOKIE")

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "Error getting token. Response:"
  echo "$TOKEN_RESPONSE" | jq '.'
  exit 1
fi

echo "Token generated: ${TOKEN:0:30}..."
echo ""
echo "Step 3: Testing import endpoint..."
echo ""

curl -X POST http://localhost:3003/api/sync/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-import-payload.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "Check results at:"
echo "- Prisma Studio: http://localhost:5556"
echo "- Dashboard: http://localhost:3003/dashboard"
