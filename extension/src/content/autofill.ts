import { detectFormFields } from "./form-detector";
import type { UserProfile } from "../shared/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function simulateInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string
): Promise<void> {
  el.focus();
  await delay(80 + Math.random() * 120);
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
  await delay(50 + Math.random() * 80);
}

export async function autofill(
  profile: UserProfile
): Promise<{ filled: number; skipped: string[] }> {
  const fields = detectFormFields();
  let filled = 0;
  const skipped: string[] = [];

  const valueMap: Partial<Record<string, string>> = {
    first_name: profile.firstName,
    last_name: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    linkedin: profile.linkedin,
    github: profile.github,
    portfolio: profile.portfolio,
    city: profile.location,
    current_role: profile.currentRole,
  };

  for (const field of fields) {
    // Never autofill cover letters (too personal) or file inputs (security restriction)
    if (field.fieldType === "resume_file") {
      skipped.push("Resume file: upload manually");
      continue;
    }
    if (field.fieldType === "cover_letter") {
      skipped.push("Cover letter: write manually");
      continue;
    }

    const value = valueMap[field.fieldType];
    if (!value) {
      skipped.push(field.label || field.fieldType);
      continue;
    }

    await simulateInput(field.element as HTMLInputElement, value);
    filled++;
  }

  return { filled, skipped };
}
