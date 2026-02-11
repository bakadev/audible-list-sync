#!/bin/bash

# Test script for import endpoint
# Usage: ./test-import.sh YOUR_JWT_TOKEN

if [ -z "$1" ]; then
  echo "Usage: ./test-import.sh YOUR_JWT_TOKEN"
  echo ""
  echo "To get a token:"
  echo "1. Go to http://localhost:3003/dashboard"
  echo "2. Open DevTools (F12) -> Network tab"
  echo "3. Click 'Connect Extension' button"
  echo "4. Find the /api/sync/token request"
  echo "5. Copy the 'token' value from the response"
  echo ""
  exit 1
fi

TOKEN="$1"

echo "Testing import endpoint with token: ${TOKEN:0:20}..."
echo ""

curl -X POST http://localhost:3003/api/sync/import \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-import-payload.json \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "If successful, check:"
echo "- Prisma Studio: http://localhost:5556"
echo "- Dashboard: http://localhost:3003/dashboard"
