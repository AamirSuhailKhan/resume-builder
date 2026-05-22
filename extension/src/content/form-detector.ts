import type { FormField, FieldType } from "../shared/types";

function findLabel(el: HTMLElement): string {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent?.trim() ?? "";
  }
  const ariaLabel = el.getAttribute("aria-label") ?? "";
  if (ariaLabel) return ariaLabel;
  const closestLabel = el.closest("label");
  if (closestLabel) return closestLabel.textContent?.trim() ?? "";
  const prev = el.previousElementSibling;
  if (prev?.tagName === "LABEL") return prev.textContent?.trim() ?? "";
  const placeholder = (el as HTMLInputElement).placeholder ?? "";
  return placeholder;
}

function classifyField(combined: string, inputType: string): FieldType {
  const c = combined.toLowerCase();
  if (/first.?name|fname|given.?name/i.test(c)) return "first_name";
  if (/last.?name|lname|surname|family.?name/i.test(c)) return "last_name";
  if (/email|e-mail/i.test(c) || inputType === "email") return "email";
  if (/phone|mobile|contact.?no|tel/i.test(c) || inputType === "tel") return "phone";
  if (/linkedin/i.test(c)) return "linkedin";
  if (/github/i.test(c)) return "github";
  if (/portfolio|website|personal.?url/i.test(c)) return "portfolio";
  if (/city|location|current.?city/i.test(c)) return "city";
  if (/current.?role|current.?position|designation/i.test(c)) return "current_role";
  if (/experience|years/i.test(c)) return "years_experience";
  if (inputType === "file") return "resume_file";
  if (/cover.?letter|why.*apply|motivation/i.test(c)) return "cover_letter";
  return "unknown";
}

export function detectFormFields(): FormField[] {
  const selectors =
    "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=checkbox]):not([type=radio]), textarea, select";
  const elements = Array.from(document.querySelectorAll(selectors)) as HTMLElement[];

  return elements
    .map((el) => {
      const label = findLabel(el);
      const inputType = (el as HTMLInputElement).type ?? "text";
      const name = (el as HTMLInputElement).name ?? "";
      const combined = [label, name, (el as HTMLInputElement).placeholder ?? ""].join(" ");
      const fieldType = classifyField(combined, inputType);
      return { element: el as HTMLInputElement, fieldType, label };
    })
    .filter((f) => f.fieldType !== "unknown");
}
