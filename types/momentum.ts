export type TaskPriority = "urgent" | "normal";

export type MoodState = "focused" | "calm" | "anxious" | "tired" | null;

export type MomentumTaskType =
  | "interview"
  | "followup"
  | "apply"
  | "resume"
  | "offer"
  | "salary"
  | "skill_gap"
  | "fallback";

export interface MomentumTask {
  id: string;
  text: string;
  priority: TaskPriority;
  link: string;
  icon: string;
  type: MomentumTaskType;
}
