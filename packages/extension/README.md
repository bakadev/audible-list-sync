# audioshlf Extension

A Chrome Manifest V3 extension for syncing your Audible library to audioshlf with user-specific metadata (personal ratings and listening progress).

## Features

- 📚 **Library Scraping**: Extract user-specific data from your Audible library (ASIN, title, personal rating, listening status)
- 🎯 **Wishlist Support**: Scrape your wishlist titles with proper source tagging
- ⚡ **Fast Extraction**: Complete in <30 seconds for 100 titles (vs 10+ minutes with full metadata)
- 💾 **JSON Export**: Download simplified library data as structured JSON
- ⚠️ **Error Handling**: Retry/cancel buttons for network failures, auth errors, and CAPTCHA
- 🎨 **Simple UI**: No configuration needed - just "Start Sync" and "Download JSON"

## Installation

### Load Unpacked Extension (Developer Mode)

1. **Enable Developer Mode** in Chrome:
   - Navigate to `chrome://extensions`
   - Toggle "Developer mode" in the top-right corner

2. **Load Extension**:
   - Click "Load unpacked"
   - Select the `packages/extension` directory from this repository
   - Extension should appear in your extensions list

3. **Verify Installation**:
   - Extension icon should appear in Chrome toolbar
   - No errors should show on the extensions page

### Configuration

The extension needs to know where to send sync data. Configure the API endpoint:

1. **Copy the configuration template**:
   ```bash
   # For local development (default)
   cp config.production.js config.js
   # Edit config.js and use localhost:3003
   ```

   Or manually create `config.js`:
   ```javascript
   const CONFIG = {
     API_URL: 'http://localhost:3003/api/sync/import',
     APP_URL: 'http://localhost:3003',
   };
   if (typeof window !== 'undefined') {
     window.EXTENSION_CONFIG = CONFIG;
   }
   ```

2. **For production**: Use the production template as-is or update with your domain:
   ```javascript
   const CONFIG = {
     API_URL: 'https://audioshlf.app/api/sync/import',
     APP_URL: 'https://audioshlf.app',
   };
   ```

3. **Reload the extension** after changing config:
   - Go to `chrome://extensions`
   - Click the reload icon for audioshlf extension

**Note**: `config.js` is git-ignored so you can maintain your own environment-specific settings.

## Usage

1. **Log in to Audible**: Visit [audible.com](https://www.audible.com) and ensure you're logged in

2. **Navigate to Library**: Go to [audible.com/library](https://www.audible.com/library)

3. **Start Sync**: Click the "Start Sync" button in the extension overlay (bottom-right corner)

4. **Monitor Progress**: Watch the progress indicator as titles are scraped

5. **Download JSON**: When complete, click "Download JSON" to save your library data

## Output Format

The extension generates a simplified JSON file with:

- **titleCatalog**: Array of user-specific audiobook data:
  - `asin`: Audible product ID
  - `title`: Book title (for error reporting)
  - `userRating`: Personal star rating (0-5)
  - `status`: Listening progress ("Finished", "Not Started", or "15h 39m left")
  - `source`: Origin ("LIBRARY" or "WISHLIST")
- **summary**: Library count, wishlist count, scrape duration, timestamp

Detailed book metadata (authors, narrators, duration, cover art, etc.) is fetched by the platform API using the ASIN.

See `specs/003-simplify-extension/contracts/extension-output.schema.json` for the complete schema.

## Troubleshooting

### Extension overlay doesn't appear

- Verify you're on `audible.com/library` or `audible.com/wl`
- Check extension is enabled in `chrome://extensions`
- Reload the Audible page

### Scraping gets stuck

- Check network tab for timeouts
- Verify you're logged in to Audible
- Try reducing rate limit if Audible is throttling

### CAPTCHA detected

- Solve any CAPTCHA challenges on the Audible page
- Click "Start Sync" again to restart

### Missing metadata

- Some titles may have incomplete store pages
- Extension marks these with `storePageMissing: true`
- Basic metadata from library page is still captured

## Development

### Project Structure

```
packages/extension/
├── manifest.json              # Manifest V3 configuration
├── content-script.js          # Main entry point
├── overlay-ui.js              # React overlay component (simplified UI)
├── scraper/
│   ├── library-scraper.js     # Library page scraping (user data)
│   ├── wishlist-scraper.js    # Wishlist scraping (user data)
│   └── metadata-extractor.js  # User rating and status extraction
├── utils/
│   ├── rate-limiter.js        # Request throttling (library pages only)
│   ├── retry-handler.js       # Exponential backoff
│   ├── storage-manager.js     # chrome.storage wrapper
│   └── json-normalizer.js     # Simplified JSON output
├── icons/                     # Extension icons
└── styles/
    └── overlay.css            # Overlay styling
```

### Technical Details

- **Language**: JavaScript ES6+ (no TypeScript, no build tools)
- **UI Framework**: React 19 (loaded from CDN)
- **Extraction Focus**: User-specific metadata only (rating, listening status)
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)

### Testing

Manual testing guide: See `specs/003-simplify-extension/quickstart.md`

Key test scenarios:
- Small library extraction (verify user rating and listening status)
- Large library with pagination (100+ titles in <1 minute)
- Wishlist scraping (verify source: "WISHLIST" flag)
- User rating extraction (0-5 stars)
- Listening status extraction (Finished, Not Started, time remaining)
- Error handling (network failure, not logged in, CAPTCHA)

## Privacy & Ethics

This extension:
- ✅ Scrapes only your own library data within your authenticated session
- ✅ Does not collect or transmit credentials
- ✅ Respects Audible's servers with rate limiting
- ✅ Is for personal backup/archival purposes only
- ⚠️ Users are responsible for compliance with Audible's Terms of Service

## License

See repository root for license information.

## Support

For issues or questions, see the main project documentation.
