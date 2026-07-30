# Facebook Photo Scraper

Download **all public photos** from any Facebook page using Playwright browser automation — no API key required.

## Features

- Automatic scroll to load all posts
- Opens each photo individually to extract the highest resolution
- Downloads images preserving original quality
- Skip already-downloaded files (deduplication)
- Resume support via `checkpoint.json`
- Configurable parallel downloads
- Retry on network failures
- Progress bars for all phases
- Final statistics (found, downloaded, duplicate, errors, elapsed time)

## Requirements

- Node.js 18+
- A Facebook account (public photos only; the page must be viewable without logging in, or you must be logged in via the browser profile)

## Installation

```bash
cd tools/fb-scraper
npm install
npx playwright install chromium
npm run develop
npm start
```

## Configuration

Edit `config.json`:

```json
{
  "url": "https://www.facebook.com/YOUR_PAGE_NAMEgo,
  "outputDir": "./downloads",
  "headless": true,
  "parallelDownloads": 4,
  "maxRetries": 3,
  "scrollDelayMs": 2000,
  "pageLoadTimeoutMs": 30000,
  "actionTimeoutMs": 10000,
  "maxScrollAttempts": 200,
  "viewport": { "width": 1920, "height": 1080 },
  "checkpointFile": "./checkpoint.json"
}
```

| Field | Description |
|---|---|
| `url` | URL da página de fotos do Facebook. Ex: `https://www.facebook.com/nomemenosse/photos` |
| `outputDir` | Onde salvar as fotos |
| `headless` | Modo invisível do Chrome (`true` para servidor, `false` para ver o que acontece) |
| `parallelDownloads` | Quantos downloads simultâneos |
| `maxRetries` | Tentativas por imagem em caso de erro |
| `scrollDelayMs` | Pausa entre scrolls para carregar o conteúdo |
| `pageLoadTimeoutMs` | Tempo máximo para carregar uma página |
| `maxScrollAttempts` | Número máximo de scrolls |
| `checkpointFile` | Arquivo para salvar/resumir progresso |

## Usage

1. **Set your Facebook target**: In `config.json`, replace `YOUR_PAGE_NAME` with the target page's username.
2. **Run**:
   ```bash
   npm start
   ```
3. The script will crawl all posts, open each photo, extract the highest resolution URL, and download images to the `downloads` folder.
4. Check final statistics at the end of execution.

## Project Structure

```
src/
  browser.ts      - Playwright browser lifecycle
  crawler.ts      - Page scroll + post discovery
  scraper.ts      - Main orchestrator
  viewer.ts       - Open each photo, extract high-res URL
  downloader.ts   - Parallel download with retry
  checkpoint.ts   - Save/resume progress
  logger.ts        - Color logs + progress bar
  config.ts        - Load and validate config.json
  main.ts          - Entry point
```

## Resume / Checkpoint

- The script saves the found and downloaded URLs in `checkpoint.json`.
- If you interrupt the script (Ctrl+C) and run again, it reuses the discovery work of the previous session.
- To restart from scratch, delete `checkpoint.json`.

## Disclaimer

This tool was created for educational and backup purposes ONLY. Respect the Terms of Service of all platforms. The user is responsible for the use of this software. Do not use for mass data harvesting or any activity that violates the privacy rights of third parties.

## License

MIT