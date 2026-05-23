# Archived Service: Headless Browser Automation Suite

This directory contains the dormant implementation of the browser execution environment.

## Why Archived
Headless browser application submissions (Playwright-based automation, form detection, and context lease pooling) present high runtime maintenance, steep local hardware resource requirements, and high vulnerability to structural changes on job portals. 

For the pre-PMF phase, the system uses a queue-backed deterministic application packet builder instead of headless browsers, maximizing stability.

## Dependencies & Relations
*   **External Packages**: `playwright`, `playwright-core`, `playwright-extra`, and `playwright-extra-plugin-stealth` in `package.json`.
*   **Database Schema**: Models like `BrowserLease`, `BrowserSession`, `BrowserExecution`, `ExecutionScreenshot`, and `DOMAction` remain in the database schema to preserve historical metrics.
*   **Archived Files**:
    *   `archive/browser/browser-executor.ts` (Playwright controller)
    *   `archive/browser/context-pool.ts` (Tab/Session pooling)
    *   `archive/browser/execution-recorder.ts` (Video/log recording)
    *   `archive/browser/form-detector.ts` (LLM-based DOM input matching)
    *   `archive/workers/browser-worker.ts` (BullMQ browser queue consumer)

## Future Reactivation Requirements
To reactivate browser automation:
1.  **Queue Handler Integration**: Restore imports to the `BrowserExecutor` in `workers/handlers/aiPlatform.ts` for the `ai_auto_apply` job payload processor.
2.  **Worker Launch**: Spin up the background worker using the script `npm run worker:browser` (defined in `package.json` pointing to `workers/browser-worker.ts`).
3.  **Lease Pool Config**: Configure concurrency environment variables for the browser session pools on the server host.

## Removed Runtime Hooks
*   HEADLESS browser instances in the active queue workflow execution loops.
*   Browser worker service startup triggers.
