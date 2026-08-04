export type ReminderType =
  | "FOLLOW_UP"
  | "INTERVIEW"
  | "DEADLINE"
  | "OTHER";

export type ReminderJob = {
  id: number;
  company: string;
  title: string;
};

export type Reminder = {
  id: number;
  jobId: number;
  type: ReminderType;
  title: string;
  dueAt: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  job: ReminderJob;
};