"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ReviewItemOut } from "@/src/lib/api";

export default function ReviewPage() {
  const params = useParams<{ attemptId: string }>();
  const router = useRouter();
  const attemptId = Number(params.attemptId);

  const [items, setItems] = useState<ReviewItemOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .review(attemptId)
      .then(setItems)
      .catch((e: any) => setError(e.message ?? "Failed to load review"));
  }, [attemptId]);

  return (
    <main style={{ maxWidth: 1000, margin: "30px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Review</h1>
        <button
          onClick={() => router.push(`/`)}
          style={{ padding: "8px 12px", borderRadius: 8 }}
        >
          Home
        </button>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 14 }}>{error}</p>}
      {!items && !error && <p style={{ marginTop: 14 }}>Loading...</p>}

      {items && (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {items.map((it) => {
            const ok =
              it.selected_label &&
              it.correct_label &&
              it.selected_label === it.correct_label;
            return (
              <div
                key={it.position}
                style={{
                  padding: 14,
                  border: "1px solid #ddd",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>Q{it.position}</div>
                  <div style={{ fontWeight: 700 }}>{ok ? "✅" : "❌"}</div>
                </div>

                <div style={{ marginTop: 8, fontWeight: 600 }}>{it.text}</div>

                <div style={{ marginTop: 10, opacity: 0.9 }}>
                  Your answer: <b>{it.selected_label ?? "-"}</b> &nbsp;|&nbsp;
                  Correct: <b>{it.correct_label ?? "-"}</b>
                </div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {it.choices.map((c) => {
                    const isSelected = it.selected_label === c.label;
                    const isCorrect = it.correct_label === c.label;

                    const border = isCorrect
                      ? "2px solid #2e7d32"
                      : isSelected
                      ? "2px solid #c62828"
                      : "1px solid #ddd";

                    return (
                      <div
                        key={c.label}
                        style={{ padding: 10, borderRadius: 10, border }}
                      >
                        <div style={{ fontWeight: 800 }}>{c.label}</div>
                        <div style={{ opacity: 0.9 }}>{c.text}</div>
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {isCorrect
                            ? "Correct"
                            : isSelected
                            ? "Your choice"
                            : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {it.explanation && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 12,
                      borderRadius: 10,
                      background: "#f7f7f7",
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      Explanation
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {it.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
