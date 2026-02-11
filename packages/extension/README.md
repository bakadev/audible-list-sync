# Audible Library Extension

A Chrome Manifest V3 extension for exporting your Audible library data with comprehensive metadata.

## Features

- 📚 **Library Scraping**: Extract all titles from your Audible library with full metadata
- 🎯 **Wishlist Support**: Scrape your wishlist titles with proper source tagging
- 🎛️ **Rate Limiting**: Configurable request throttling (1-20 req/sec, default 10/sec)
- 💾 **JSON Export**: Download complete library data as structured JSON
- 🔄 **Pause/Resume**: Interrupt and resume scraping sessions
- ⚠️ **Error Handling**: Graceful handling of network failures, auth errors, and CAPTCHA

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

## Usage

1. **Log in to Audible**: Visit [audible.com](https://www.audible.com) and ensure you're logged in

2. **Navigate to Library**: Go to [audible.com/library](https://www.audible.com/library)

3. **Start Sync**: Click the "Start Sync" button in the extension overlay (bottom-right corner)

4. **Monitor Progress**: Watch the progress indicator as titles are scraped

5. **Download JSON**: When complete, click "Download JSON" to save your library data

## Output Format

The extension generates a JSON file with:

- **syncedAt**: ISO 8601 timestamp
- **summary**: Total counts and scraping duration
- **titleCatalog**: Array of audiobook metadata (ASIN, title, authors, narrators, duration, ratings, etc.)
- **userLibrary**: Array of user-specific entries (source, personal rating, listening progress)

See `contracts/extension-output.schema.json` for the complete schema.

## Configuration

### Rate Limiting

Default: 10 requests/second

Adjust in extension overlay settings (1-20 req/sec range)

### Storage

Extension uses `chrome.storage.local` for:
- Scraping progress (enables pause/resume)
- Sync session history
- Configuration settings

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
├── overlay-ui.js              # React overlay component
├── scraper/
│   ├── library-scraper.js     # Library page pagination
│   ├── store-scraper.js       # Store page metadata
│   ├── wishlist-scraper.js    # Wishlist scraping
│   └── metadata-extractor.js  # JSON-LD parsing
├── utils/
│   ├── rate-limiter.js        # Request throttling
│   ├── retry-handler.js       # Exponential backoff
│   ├── storage-manager.js     # chrome.storage wrapper
│   ├── json-normalizer.js     # Data normalization
│   └── token-detector.js      # JWT token detection
├── icons/                     # Extension icons
└── styles/
    └── overlay.css            # Overlay styling
```

### Technical Details

- **Language**: JavaScript ES6+ (no TypeScript, no build tools)
- **UI Framework**: React 19 (loaded from CDN)
- **Storage**: chrome.storage.local API
- **Rate Limiting**: Promise queue with configurable delay
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)

### Testing

Manual testing guide: See `specs/002-audible-extension/quickstart.md`

Key test scenarios:
- Small library (10-50 titles)
- Large library with pagination (100+ titles)
- Wishlist scraping
- Rate limiting validation
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
