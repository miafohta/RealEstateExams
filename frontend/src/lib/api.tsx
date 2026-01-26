import { AttemptSummary } from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";


class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.detail
        ? typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail)
        : msg;
    } catch { }
    throw new ApiError(res.status, msg);
  }

  return res.json() as Promise<T>;
}

/*
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      msg = data?.detail
        ? typeof data.detail === "string"
          ? data.detail
          : JSON.stringify(data.detail)
        : msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}*/

export type AttemptMode = "practice" | "timed";

export type AttemptStartIn = {
  mode: AttemptMode;
  exam_name: string | null;
  question_count?: number;
  time_limit_seconds?: number | null;
};

export type AttemptStartOut = {
  attempt_id: number;
  mode: AttemptMode;
  exam_name: string | null;
  question_count: number;
  time_limit_seconds: number | null;
  started_at: string; // ISO
};

export type ChoiceOutSimple = {
  label: string;
  text: string;
};

export type QuestionForAttemptOut = {
  attempt_id: number;
  position: number;
  question_id: number;
  text: string;
  topic: string | null;
  subtopic: string | null;
  choices: ChoiceOutSimple[];
  explanation?: string | null;
  selected_label?: string | null;
};

export type AnswerIn = {
  question_id: number;
  selected_label: "A" | "B" | "C" | "D";
};

export type SubmitOut = {
  attempt_id: number;
  score_percent: number;
  passed: boolean;
  total_questions: number;
  correct: number;
  breakdown_by_topic: Record<string, { correct: number; total: number }>;
  submitted_at: string;
};
export type ReviewChoiceOut = { label: string; text: string };

export type ReviewItemOut = {
  position: number;
  question_id: number;
  text: string;
  topic: string | null;
  subtopic: string | null;
  choices: ReviewChoiceOut[];
  selected_label: string | null;
  correct_label: string | null;
  explanation: string | null;
};

export type UserOut = {
  id: number;
  email: string;
};

export type SignupIn = {
  email: string;
  password: string;
};

export type LoginIn = {
  email: string;
  password: string;
};

export const api = {
  // --- auth ---
  signup: (payload: SignupIn) =>
    apiFetch<UserOut>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginIn) =>
    apiFetch<UserOut>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () =>
    apiFetch<{ ok: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}), // keeps Content-Type consistent
    }),

  me: () => apiFetch<UserOut>("/auth/me"),

  myAttempts: () => apiFetch<AttemptSummary[]>("/me/attempts"),

  startAttempt: (payload: AttemptStartIn) =>
    apiFetch<AttemptStartOut>("/attempts/start", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getQuestion: (attemptId: number, position: number) =>
    apiFetch<QuestionForAttemptOut>(
      `/attempts/${attemptId}/questions/${position}`
    ),

  answer: (attemptId: number, payload: AnswerIn) =>
    apiFetch<{ ok: boolean }>(`/attempts/${attemptId}/answer`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  submit: (attemptId: number) =>
    apiFetch<SubmitOut>(`/attempts/${attemptId}/submit`, { method: "POST" }),

  attemptResult: (attemptId: number) =>
    apiFetch<SubmitOut>(`/attempts/${attemptId}/result`),

  review: (attemptId: number) =>
    apiFetch<ReviewItemOut[]>(`/attempts/${attemptId}/review`),
};
