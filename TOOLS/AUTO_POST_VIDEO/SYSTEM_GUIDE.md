# TikTok & YouTube Shorts AutoPoster - System Guide

This guide is optimized for LLMs & AI Agents to quickly understand the codebase structure, design patterns, and workflows with minimal token consumption.

---

## 🛠️ Tech Stack & Key Dependencies
- **Frontend/Backend:** Next.js (App Router, React 19).
- **Automation:** Playwright (`playwright`) - controls Chromium/Edge or connects via CDP to AdsPower local API.
- **Scraper/Downloader:** `yt-dlp` (binary downloaded to `data/yt-dlp-bin.exe`).
- **Database:** MongoDB (`mongodb`) - manages collections `accounts`, `posts`, `settings`.

---

## 📁 Core Directory Structure
- `app/` - Next.js pages & API routes.
  - `page.js` - Dashboard UI (stats, active channel listings, posts queue status).
  - `api/` - Backend endpoints (`/api/accounts`, `/api/posts`, `/api/download`, etc.).
- `lib/` - System backend utilities.
  - `db.js` - Database connection and read/write queue handling.
  - `downloader.js` - Interface for `yt-dlp` downloads & MD5 hash modification.
  - `poster.js` - Playwright automation logic for TikTok/YouTube login & uploads.
- `data/` - Git-ignored local data directory.
  - `sessions/` - Playwright browser storage state JSONs named `{accountId}.json`.
  - `uploads/` - Temporary downloaded/re-encoded video files.

---

## 🔄 Core Workflows

### 1. Video Scrape & Bypass MD5 Filters (`lib/downloader.js`)
- Uses `yt-dlp` to download video streams (Shorts/Reels/etc.) as progressive MP4.
- **Anti-Duplication:** Calls `alterVideoHash()` to append `1` to `8` random bytes to the end of the video file, changing its MD5 hash value to bypass platform duplication filters.
- **Auto-Cleanup:** Deletes old files in `data/uploads/` if directory size exceeds 1GB.

### 2. Session Management & Login (`lib/poster.js`)
- **Direct Login:** Launches non-headless browser, waits for user to log in manually, monitors cookies (e.g. `sessionid`, `sid_tt`, etc.), and outputs state using Playwright's `storageState()` into `data/sessions/{accountId}.json`.
- **AdsPower Integration:** Connects to AdsPower Local API (default port `50325`) using CDP connection, opening specific profile browser instances.

### 3. Background Uploading & Scheduler (`app/api/posts/route.js`)
- GET requests to `/api/posts` (triggered by dashboard polling every 5 seconds) act as a cron:
  - Scans for any post where `status == "pending"` and `scheduledAt <= now`.
  - Marks status as `"processing"`, starts `runUploadInBackground(postId)` asynchronously, and returns response immediately.
- `runUploadInBackground()` in `lib/poster.js` logs into target platform via saved session state, uploads the video, inputs caption/hashtags, monitors uploading state, and publishes.

---

## 💡 Key Design Patterns & Guidelines
- **Database Operations:** Always use `readDb()` and `writeDb()` from [db.js](file:///d:/tiktok_agent/lib/db.js). These functions use a promise-queue (`enqueue()`) to serialize writes and prevent MongoDB concurrency/write lock conflicts.
- **Path Resolution:** Always resolve relative file paths through Node.js `path` utilities (avoid hardcoded absolute paths).
- **Anti-Detection:** When using Playwright directly, override `navigator.webdriver` to `undefined` and set `ignoreDefaultArgs: ['--enable-automation']`.
