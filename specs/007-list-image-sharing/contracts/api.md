# API Contracts: List Image Generation & Sharing

**Date**: 2026-02-21 | **Feature**: 007-list-image-sharing

## Modified Endpoints

### `POST /api/lists` — Create List (Modified)

**Changes**: Accept optional `imageTemplateId` in request body. If provided and valid, trigger image generation after list creation.

**Request Body** (additions only):
```json
{
  "imageTemplateId": "grid-3x3"    // optional, string
}
```

**Response** (additions only):
```json
{
  "imageTemplateId": "grid-3x3",
  "imageVersion": 1,
  "imageStatus": "GENERATING",
  "imageOgKey": null,
  "imageSquareKey": null,
  "imageGeneratedAt": null
}
```

### `PUT /api/lists/[listId]` — Update List (Modified)

**Changes**: Accept optional `imageTemplateId` and `regenerateImage` flag. Detect content changes that require regeneration.

**Request Body** (additions only):
```json
{
  "imageTemplateId": "hero",        // optional, string
  "regenerateImage": true           // optional, boolean (default: false)
}
```

**Regeneration logic**:
- If `regenerateImage` is `true`, OR
- If `imageTemplateId` changed, OR
- If list items changed (order or composition), OR
- If `name` or `description` changed AND images exist
- Then: increment `imageVersion`, set `imageStatus = GENERATING`, trigger generation.

**Response**: Same shape as existing, with added image fields.

### `GET /api/lists/[listId]` — Get List (Modified)

**Changes**: Include image fields in response.

**Response** (additions only):
```json
{
  "imageTemplateId": "grid-3x3",
  "imageVersion": 2,
  "imageStatus": "READY",
  "imageOgKey": "lists/clxyz123/v2/og.png",
  "imageSquareKey": "lists/clxyz123/v2/square.png",
  "imageGeneratedAt": "2026-02-21T10:30:00.000Z",
  "imageOgUrl": "https://signed-url...",        // Presigned URL (1hr TTL)
  "imageSquareUrl": "https://signed-url..."      // Presigned URL (1hr TTL)
}
```

**Note**: `imageOgUrl` and `imageSquareUrl` are computed at response time by generating presigned URLs from S3 keys. They are NOT stored in the database.

---

## New Endpoints

### `POST /api/lists/[listId]/regenerate-images`

**Purpose**: Explicitly regenerate images for a list.

**Auth**: Required (must be list owner).

**Request Body**: None.

**Validation**:
- List must exist and belong to authenticated user.
- `imageTemplateId` must be set on the list.
- Cooldown: minimum 30 seconds since `imageGeneratedAt`.

**Response** (200):
```json
{
  "imageVersion": 3,
  "imageStatus": "GENERATING"
}
```

**Error Responses**:
- `400`: No template selected (`imageTemplateId` is null).
- `401`: Unauthorized.
- `403`: Not list owner.
- `404`: List not found.
- `429`: Cooldown not elapsed (include `retryAfter` in seconds).

```json
{
  "error": "Please wait before regenerating",
  "retryAfter": 15
}
```

### `GET /api/lists/[listId]/og-image`

**Purpose**: Serve OG image via redirect to presigned S3 URL. Used as the permanent URL in `og:image` meta tags.

**Auth**: None (public endpoint — social media crawlers must access it).

**Validation**:
- List must exist.
- `imageStatus` must be `READY` and `imageOgKey` must be set.

**Response** (302):
- `Location` header: presigned S3 URL (1-hour TTL).
- `Cache-Control: public, max-age=3600` (match signed URL TTL).

**Error Responses**:
- `404`: List not found or no image available.

**Fallback**: If no image is ready, return a default placeholder image (200 with static PNG).

### `GET /api/lists/[listId]/square-image`

**Purpose**: Serve square image via redirect to presigned S3 URL. Used for downloads.

**Auth**: None (public).

**Behavior**: Same as `/og-image` but uses `imageSquareKey`.

### `GET /api/templates`

**Purpose**: Return the list of available image templates for the UI picker.

**Auth**: Required.

**Response** (200):
```json
{
  "templates": [
    {
      "id": "grid-3x3",
      "name": "Grid",
      "description": "3x3 grid of book covers",
      "slotCount": 9,
      "supportedSizes": ["og", "square"]
    },
    {
      "id": "hero",
      "name": "Hero",
      "description": "One large cover with smaller books alongside",
      "slotCount": 4,
      "supportedSizes": ["og", "square"]
    },
    {
      "id": "minimal-banner",
      "name": "Minimal",
      "description": "Text-focused with 3 covers on the side",
      "slotCount": 3,
      "supportedSizes": ["og", "square"]
    }
  ]
}
```

---

## Modified Public Endpoints

### `GET /api/users/[username]/lists/[listId]` — Public List (Modified)

**Changes**: Include image URLs in response for public list views.

**Response** (additions only):
```json
{
  "imageStatus": "READY",
  "imageOgUrl": "/api/lists/clxyz123/og-image",
  "imageSquareUrl": "/api/lists/clxyz123/square-image"
}
```

**Note**: Public responses use the proxy route URLs (not presigned URLs) so they remain stable.

---

## Metadata Integration

### `generateMetadata()` for `[username]/lists/[listId]/page.tsx`

**Modified to include OG image**:

```typescript
// Pseudocode for metadata generation
export async function generateMetadata({ params }): Promise<Metadata> {
  const list = await getList(listId);

  const ogImageUrl = list.imageStatus === 'READY' && list.imageOgKey
    ? `${process.env.NEXTAUTH_URL}/api/lists/${list.id}/og-image`
    : undefined; // falls back to default site OG image

  return {
    title: `${list.name} by ${user.name}`,
    description: list.description || `A list by ${user.name}`,
    openGraph: {
      title: list.name,
      description: list.description,
      type: 'article',
      images: ogImageUrl ? [{ url: ogImageUrl, width: 1200, height: 630 }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: list.name,
      description: list.description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}
```

---

## Share Utilities Contract

### `generateShareUrl(platform, shareUrl, title?): string`

**Input**:
- `platform`: `'x' | 'facebook' | 'reddit' | 'linkedin'`
- `shareUrl`: string (the full URL to share)
- `title`: string (optional, used for Reddit and X)

**Output**: Platform-specific share URL string.

**URL patterns**:
| Platform | URL Pattern |
|----------|-------------|
| X | `https://twitter.com/intent/tweet?text={title}&url={shareUrl}` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u={shareUrl}` |
| Reddit | `https://www.reddit.com/submit?url={shareUrl}&title={title}` |
| LinkedIn | `https://www.linkedin.com/shareArticle?mini=true&url={shareUrl}` |

All parameters are URL-encoded.
