export type AttemptMode = "practice" | "timed";

// /me/attempts
export type AttemptSummary = {
  attempt_id: number;
  mode: AttemptMode;
  exam_name: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  started_at: string;
  submitted_at: string | null;
  score_percent: number | null;
  passed: boolean | null;
};

// /attempts/{id} (meta)
export type AttemptMeta = AttemptSummary & {
  is_submitted: boolean;
};
