import { getStorage, setStorage, clearStorage, isProfileStale } from "../shared/storage";
import { fetchProfile } from "../shared/api";
import type { MessageType, MessageResponse } from "../shared/types";

const BASE_URL = "https://careeros.in";

const app = document.getElementById("app")!;

function renderHeader(): string {
  return `
    <div class="header">
      <div class="logo">C</div>
      <div>
        <h1>CareerOS</h1>
        <span>Job Autofill & Match Score</span>
      </div>
    </div>
  `;
}

function renderNotLoggedIn(): void {
  app.innerHTML = `
    ${renderHeader()}
    <div class="content">
      <div class="state">
        <h2>Connect your CareerOS account</h2>
        <p>Sign in to autofill job applications across Naukri, LinkedIn, Greenhouse, and more.</p>
        <button class="btn btn-primary" id="signin-btn">
          Sign in to CareerOS →
        </button>
      </div>
    </div>
    <div class="footer">
      <a href="${BASE_URL}" target="_blank">careeros.in</a>
    </div>
  `;

  document.getElementById("signin-btn")?.addEventListener("click", () => {
    chrome.tabs.create({ url: `${BASE_URL}/login` });
    window.close();
  });
}

function renderLoggedInNoForm(email: string, name: string): void {
  const initial = (name || email)[0]?.toUpperCase() ?? "U";
  app.innerHTML = `
    ${renderHeader()}
    <div class="content">
      <div class="user-strip">
        <div class="avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name">${name || "Signed in"}</div>
          <div class="user-email">${email}</div>
        </div>
      </div>
      <div class="state">
        <p>Navigate to a job application page, then click the extension to autofill your details.</p>
        <a href="${BASE_URL}/dashboard" target="_blank" class="btn btn-secondary" style="text-decoration:none;">
          Open CareerOS Dashboard →
        </a>
        <button class="btn btn-danger" id="signout-btn">Sign out</button>
      </div>
    </div>
  `;

  document.getElementById("signout-btn")?.addEventListener("click", async () => {
    await clearStorage();
    await init();
  });
}

function renderAutofillReady(email: string, name: string, fieldCount: number): void {
  const initial = (name || email)[0]?.toUpperCase() ?? "U";
  app.innerHTML = `
    ${renderHeader()}
    <div class="content">
      <div class="user-strip">
        <div class="avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name">${name || "Signed in"}</div>
          <div class="user-email">${email}</div>
        </div>
      </div>
      <span class="badge">✓ ${fieldCount} fields detected</span>
      <button class="btn btn-primary" id="autofill-btn">
        Autofill ${fieldCount} field${fieldCount !== 1 ? "s" : ""} →
      </button>
      <button class="btn btn-danger" id="signout-btn" style="font-size:11px;padding:7px;">Sign out</button>
    </div>
  `;

  document.getElementById("signout-btn")?.addEventListener("click", async () => {
    await clearStorage();
    await init();
  });

  document.getElementById("autofill-btn")?.addEventListener("click", async () => {
    const btn = document.getElementById("autofill-btn") as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "Filling...";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "AUTOFILL",
    } as MessageType) as MessageResponse;

    if ("filled" in response) {
      renderAutofillResult(email, name, response.filled, response.skipped);
    }
  });
}

function renderAutofillResult(
  email: string,
  name: string,
  filled: number,
  skipped: string[]
): void {
  const initial = (name || email)[0]?.toUpperCase() ?? "U";
  app.innerHTML = `
    ${renderHeader()}
    <div class="content">
      <div class="user-strip">
        <div class="avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name">${name || "Signed in"}</div>
          <div class="user-email">${email}</div>
        </div>
      </div>
      <div class="result">
        <div class="filled">✓ Filled ${filled} field${filled !== 1 ? "s" : ""}</div>
        ${skipped.length > 0 ? `<div class="skipped">Needs attention: ${skipped.slice(0, 3).join(", ")}${skipped.length > 3 ? ` +${skipped.length - 3} more` : ""}</div>` : ""}
        <p style="font-size:11px;color:#64748b;margin-top:4px;">Review all fields before submitting.</p>
      </div>
    </div>
  `;
}

async function sendMessageToActiveTab(message: MessageType): Promise<MessageResponse | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return null;
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    return null;
  }
}

async function init(): Promise<void> {
  const storage = await getStorage();

  if (!storage.auth_token) {
    renderNotLoggedIn();
    return;
  }

  // Refresh profile if stale
  let profile = storage.user_profile;
  if (isProfileStale(storage.profile_cached_at)) {
    profile = await fetchProfile(storage.auth_token);
    if (profile) {
      await setStorage({ user_profile: profile, profile_cached_at: Date.now() });
    } else {
      // Token is invalid — clear and prompt re-login
      await clearStorage();
      renderNotLoggedIn();
      return;
    }
  }

  if (!profile) {
    renderNotLoggedIn();
    return;
  }

  const email = profile.email ?? "";
  const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();

  // Check if current page has detectable form fields
  const response = await sendMessageToActiveTab({ type: "CHECK_FIELDS" });
  const fieldCount = response && "fieldCount" in response ? response.fieldCount : 0;

  if (fieldCount > 0) {
    renderAutofillReady(email, name, fieldCount);
  } else {
    renderLoggedInNoForm(email, name);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
