/**
 * Background service worker (Manifest V3).
 * Handles install events and cross-tab messaging.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log("[CareerOS] Extension installed.");
});

// Keep service worker alive during long operations
chrome.runtime.onMessage.addListener(() => {
  // Intentionally left empty — message handlers are in content scripts.
  return false;
});

export {};
