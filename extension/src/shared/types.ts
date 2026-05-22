export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  location: string;
  skills: string[];
  currentRole: string;
}

export interface FormField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  label: string;
}

export type FieldType =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "linkedin"
  | "github"
  | "portfolio"
  | "city"
  | "current_role"
  | "years_experience"
  | "resume_file"
  | "cover_letter"
  | "unknown";

export interface StorageData {
  auth_token: string | null;
  user_profile: UserProfile | null;
  profile_cached_at: number | null;
}

export type MessageType =
  | { type: "CHECK_FIELDS" }
  | { type: "AUTOFILL" }
  | { type: "SAVE_JOB"; job: { title: string; company: string; url: string; source: string } };

export type MessageResponse =
  | { fieldCount: number }
  | { filled: number; skipped: string[] }
  | { saved: boolean };
