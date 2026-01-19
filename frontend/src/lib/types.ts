export type AttemptMeta = {
  attempt_id: number;
  submitted_at: string | null;
  is_submitted: boolean;

  mode?: string;
  exam_name?: string | null;
  question_count?: number;
  time_limit_seconds?: number | null;
  started_at?: string;

  score_percent?: number | null;
  passed?: boolean | null;
};
