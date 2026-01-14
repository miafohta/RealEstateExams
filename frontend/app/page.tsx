"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, AttemptMode } from "@/src/lib/api";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<AttemptMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeAttemptId, setResumeAttemptId] = useState<number | null>(null);
  const [resumePos, setResumePos] = useState<number>(1);

  useEffect(() => {
    // find latest stored attempt meta (simple MVP: store one "last_practice_attempt")
    const raw = localStorage.getItem("last_practice_attempt");
    if (!raw) return;
    const attemptId = Number(raw);
    if (!Number.isFinite(attemptId)) return;
    setResumeAttemptId(attemptId);

    const lp = localStorage.getItem(`attempt:lastpos:${attemptId}`);
    const pos = lp ? Number(lp) : 1;
    setResumePos(Number.isFinite(pos) ? pos : 1);
  }, []);

  async function start(mode: AttemptMode) {
    setError(null);
    setLoading(mode);
    try {
      const out = await api.startAttempt({
        mode,
        exam_name: null,
        question_count: 150,
        time_limit_seconds: mode === "timed" ? 11700 : null, // dev-friendly; remove later
      });

      // store attempt meta for timer UI
      localStorage.setItem(
        `attempt:${out.attempt_id}`,
        JSON.stringify({
          mode: out.mode,
          started_at: out.started_at,
          time_limit_seconds: out.time_limit_seconds,
          question_count: out.question_count,
        })
      );

      if (out.mode === "practice") {
        localStorage.setItem("last_practice_attempt", String(out.attempt_id));
      }

      router.push(`/attempts/${out.attempt_id}/1`);
    } catch (e: any) {
      setError(e.message ?? "Failed to start attempt");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>
        Real Estate Exam Practice
      </h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Choose a mode to start a 150-question balanced set.
      </p>

      {resumeAttemptId && (
        <button
          onClick={() =>
            router.push(`/attempts/${resumeAttemptId}/${resumePos}`)
          }
          style={{ padding: "10px 14px", borderRadius: 8, marginTop: 12 }}
        >
          Resume Practice
        </button>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button
          onClick={() => start("practice")}
          disabled={loading !== null}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {loading === "practice" ? "Starting..." : "Practice Mode"}
        </button>

        <button
          onClick={() => start("timed")}
          disabled={loading !== null}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          {loading === "timed" ? "Starting..." : "Timed Exam Mode"}
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}
    </main>
  );
}
