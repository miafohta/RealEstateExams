"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, SubmitOut } from "@/src/lib/api";

export default function ResultPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const attemptId = Number(params.attemptId);

  const [data, setData] = useState<SubmitOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .submit(attemptId)
      .then(setData)
      .catch((e: any) => setError(e.message ?? "Failed to submit attempt"));
  }, [attemptId]);

  return (
    <main style={{ maxWidth: 800, margin: "30px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Result</h1>

      {error && <p style={{ color: "crimson", marginTop: 14 }}>{error}</p>}
      {!data && !error && <p style={{ marginTop: 14 }}>Submitting...</p>}

      {data && (
        <>
          <div
            style={{
              marginTop: 14,
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 12,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              Score: {data.score_percent}% —{" "}
              {data.passed ? "PASS ✅" : "FAIL ❌"}
            </div>
            <div style={{ marginTop: 8, opacity: 0.8 }}>
              Correct: {data.correct} / {data.total_questions}
            </div>
            <div style={{ marginTop: 6, opacity: 0.8 }}>
              Submitted: {new Date(data.submitted_at).toLocaleString()}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button
                onClick={() => router.push(`/attempts/${attemptId}/review`)}
                style={{ padding: "8px 12px", borderRadius: 8 }}
              >
                Review Answers
              </button>
              <button
                onClick={() => router.push(`/`)}
                style={{ padding: "8px 12px", borderRadius: 8 }}
              >
                Start New Attempt
              </button>
            </div>
          </div>

          <h2 style={{ marginTop: 18, fontSize: 18, fontWeight: 700 }}>
            Breakdown by Topic
          </h2>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {Object.entries(data.breakdown_by_topic).map(([topic, v]) => (
              <div
                key={topic}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                }}
              >
                <div style={{ fontWeight: 700 }}>{topic}</div>
                <div style={{ opacity: 0.85 }}>
                  {v.correct} / {v.total} correct
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
