import "server-only";
import { createHash } from "node:crypto";
import type { Page } from "playwright";
import { CacheService } from "@/lib/cache/cache.service";
import { logger } from "@/lib/logger";

export type FormFieldType =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "resume_upload"
  | "cover_letter"
  | "linkedin"
  | "github"
  | "portfolio"
  | "work_auth"
  | "salary"
  | "start_date"
  | "unknown";

export type FormInputType = "text" | "textarea" | "select" | "checkbox" | "file" | "radio";

export type FormField = {
  selector: string;
  fieldType: FormFieldType;
  label: string;
  required: boolean;
  inputType: FormInputType;
};

type RawField = {
  selector: string;
  label: string;
  name: string;
  placeholder: string;
  ariaLabel: string;
  type: string;
  tagName: string;
  required: boolean;
};

const FIELD_TYPES: FormFieldType[] = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "resume_upload",
  "cover_letter",
  "linkedin",
  "github",
  "portfolio",
  "work_auth",
  "salary",
  "start_date",
  "unknown",
];

export async function detectFormFields(page: Page): Promise<FormField[]> {
  const rawFields = await page.evaluate<RawField[]>(() => {
    function escapeCss(value: string) {
      return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/"/g, '\\"');
    }

    function selectorFor(element: Element) {
      const id = element.getAttribute("id");
      if (id) return `#${escapeCss(id)}`;

      const name = element.getAttribute("name");
      const tag = element.tagName.toLowerCase();
      if (name) return `${tag}[name="${escapeCss(name)}"]`;

      const ariaLabel = element.getAttribute("aria-label");
      if (ariaLabel) return `${tag}[aria-label="${escapeCss(ariaLabel)}"]`;

      const all = Array.from(document.querySelectorAll(tag));
      const index = all.indexOf(element) + 1;
      return `${tag}:nth-of-type(${Math.max(index, 1)})`;
    }

    function nearbyLabel(element: Element) {
      const id = element.getAttribute("id");
      if (id) {
        const direct = document.querySelector(`label[for="${escapeCss(id)}"]`);
        if (direct?.textContent) return direct.textContent.trim();
      }

      const labelParent = element.closest("label");
      if (labelParent?.textContent) return labelParent.textContent.trim();

      const container = element.closest("div, section, fieldset, p");
      if (container?.textContent) return container.textContent.trim().slice(0, 160);

      return "";
    }

    return Array.from(document.querySelectorAll("input, textarea, select")).map((element) => {
      const input = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      return {
        selector: selectorFor(element),
        label: nearbyLabel(element),
        name: input.getAttribute("name") ?? "",
        placeholder: input.getAttribute("placeholder") ?? "",
        ariaLabel: input.getAttribute("aria-label") ?? "",
        type: input.getAttribute("type") ?? "",
        tagName: input.tagName.toLowerCase(),
        required: input.required || input.getAttribute("aria-required") === "true",
      };
    });
  });

  const fields: FormField[] = [];

  for (const raw of rawFields) {
    const fieldType = await classifyField(raw);
    fields.push({
      selector: raw.selector,
      fieldType,
      label: raw.label || raw.placeholder || raw.name || fieldType,
      required: raw.required,
      inputType: normalizeInputType(raw),
    });
  }

  return fields;
}

async function classifyField(raw: RawField): Promise<FormFieldType> {
  const haystack = `${raw.label} ${raw.name} ${raw.placeholder} ${raw.ariaLabel} ${raw.type}`.toLowerCase();
  const ruleBased = classifyByRules(haystack, raw.type);
  if (ruleBased !== "unknown") return ruleBased;

  const cacheKey = `form-field:${hash(`${raw.label}|${raw.name}|${raw.placeholder}|${raw.ariaLabel}`)}`;
  return CacheService.remember(cacheKey, () => classifyWithAI(raw), 60 * 60 * 24 * 30);
}

function classifyByRules(text: string, inputType: string): FormFieldType {
  if ((text.includes("first") || text.includes("given")) && text.includes("name")) return "first_name";
  if ((text.includes("last") || text.includes("family") || text.includes("surname")) && text.includes("name")) return "last_name";
  if (inputType === "email" || text.includes("email")) return "email";
  if (inputType === "tel" || text.includes("phone") || text.includes("mobile")) return "phone";
  if (inputType === "file" || text.includes("resume") || text.includes("cv upload")) return "resume_upload";
  if (text.includes("cover letter")) return "cover_letter";
  if (text.includes("linkedin")) return "linkedin";
  if (text.includes("github")) return "github";
  if (text.includes("portfolio") || text.includes("website")) return "portfolio";
  if (text.includes("work authorization") || text.includes("authorized to work") || text.includes("visa")) return "work_auth";
  if (text.includes("salary") || text.includes("compensation")) return "salary";
  if (text.includes("start date") || text.includes("available to start")) return "start_date";
  return "unknown";
}

async function classifyWithAI(raw: RawField): Promise<FormFieldType> {
  if (!process.env.ANTHROPIC_API_KEY) return "unknown";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-3-5-20251001",
        max_tokens: 20,
        system: "Classify application form fields. Return only one enum value.",
        messages: [
          {
            role: "user",
            content: `Classify this form field: label='${raw.label}', name='${raw.name}', placeholder='${raw.placeholder}', ariaLabel='${raw.ariaLabel}', type='${raw.type}'. Return one of: ${FIELD_TYPES.join("|")}`,
          },
        ],
      }),
    });

    if (!response.ok) return "unknown";
    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const answer = data.content?.find((block) => block.type === "text")?.text?.trim() as FormFieldType | undefined;
    return answer && FIELD_TYPES.includes(answer) ? answer : "unknown";
  } catch (err) {
    logger.warn({ err }, "[FormDetector] AI field classification failed");
    return "unknown";
  }
}

function normalizeInputType(raw: RawField): FormInputType {
  if (raw.tagName === "textarea") return "textarea";
  if (raw.tagName === "select") return "select";
  if (raw.type === "checkbox") return "checkbox";
  if (raw.type === "file") return "file";
  if (raw.type === "radio") return "radio";
  return "text";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
