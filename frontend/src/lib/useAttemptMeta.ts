"use client";

import { useEffect, useState } from "react";

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

export function useAttemptMeta(attemptId: string | number) {
  const [meta, setMeta] = useState<AttemptMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const API = process.env.NEXT_PUBLIC_API_URL;
        if (!API) throw new Error("NEXT_PUBLIC_API_URL is not set");

        const res = await fetch(`${API}/attempts/${attemptId}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to load attempt meta (${res.status})`);
        }

        const data = (await res.json()) as AttemptMeta;
        if (!cancelled) setMeta(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load attempt meta");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [attemptId]);

  return { meta, loading, error };
}
