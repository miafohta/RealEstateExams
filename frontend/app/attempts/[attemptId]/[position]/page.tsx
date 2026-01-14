"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, QuestionForAttemptOut } from "@/src/lib/api";

type AttemptMeta = {
  mode: "practice" | "timed";
  started_at: string;
  time_limit_seconds: number | null;
  question_count: number;
};

function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;

  return [
    hh > 0 ? String(hh).padStart(2, "0") : null,
    String(mm).padStart(2, "0"),
    String(ss).padStart(2, "0"),
  ]
    .filter(Boolean)
    .join(":");
}

export default function QuestionPage() {
  const params = useParams<{ attemptId: string; position: string }>();
  const router = useRouter();

  const attemptId = Number(params.attemptId);
  const position = Number(params.position);

  const [data, setData] = useState<QuestionForAttemptOut | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPrev = position > 1;
  const canNext = position < 150;

  const [meta, setMeta] = useState<AttemptMeta | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [showHint, setShowHint] = useState(false);
  const autoSubmittedRef = useRef(false);
  const [timeUp, setTimeUp] = useState(false);

  const questionCount = meta?.question_count ?? 150;

  const [answered, setAnswered] = useState<Set<number>>(new Set());
  const [showUnanswered, setShowUnanswered] = useState(false);
  const answeredKey = `attempt:answered:${attemptId}`;


  useEffect(() => {
    let mounted = true;
    setError(null);
    setData(null);

    api
      .getQuestion(attemptId, position)
      .then((q) => {
        if (!mounted) return;
        setData(q);
        setSelected(q.selected_label ?? null);
        if (q.selected_label) {
          // if backend says this question is answered, mark it
          markAnswered(position);
        }
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e.message ?? "Failed to load question");
      });

    return () => {
      mounted = false;
    };
  }, [attemptId, position]);

  useEffect(() => {
    const raw = localStorage.getItem(`attempt:${attemptId}`);
    if (raw) setMeta(JSON.parse(raw));
  }, [attemptId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => setShowHint(false), [attemptId, position]);

  const timer = useMemo(() => {
    if (!meta || meta.mode !== "timed" || !meta.time_limit_seconds) return null;
    const startedMs = new Date(meta.started_at).getTime();
    const elapsed = (now - startedMs) / 1000;
    const remaining = meta.time_limit_seconds - elapsed;
    const total = meta.time_limit_seconds;
    const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));
    return { remaining, total, pct };
  }, [meta, now]);

  const isPractice = meta?.mode === "practice" || !!data?.explanation;
  const danger = timer ? timer.remaining <= 300 : false;

  useEffect(() => {
    if (!timer || autoSubmittedRef.current) return;
    const timerValue = timer;
    if (timerValue.remaining <= 0) {
      autoSubmittedRef.current = true;
      setTimeUp(true);
      router.replace(`/attempts/${attemptId}/result`);
    }
  }, [timer, router, attemptId]);

  const topicLine = useMemo(() => {
    if (!data) return "";
    const t = data.topic ?? "Unknown";
    const s = data.subtopic ? ` • ${data.subtopic}` : "";
    return `${t}${s}`;
  }, [data]);

  useEffect(() => {
    const raw = localStorage.getItem(answeredKey);
    if (!raw) return;
    try {
      const arr = JSON.parse(raw) as number[];
      setAnswered(new Set(arr));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]); // answeredKey depends on attemptId

  async function saveAnswer(label: "A" | "B" | "C" | "D") {
    if (!data) return;
    setSelected(label);

    setSaving(true);
    setError(null);
    try {
      await api.answer(attemptId, {
        question_id: data.question_id,
        selected_label: label,
      });
      markAnswered(position);
    } catch (e: any) {
      setError(e.message ?? "Failed to save answer");
    } finally {
      setSaving(false);
    }
  }

  function persistAnswered(next: Set<number>) {
    setAnswered(next);
    localStorage.setItem(
      answeredKey,
      JSON.stringify(Array.from(next).sort((a, b) => a - b))
    );
  }

  function markAnswered(pos: number) {
    const next = new Set(answered);
    next.add(pos);
    persistAnswered(next);
  }

  useEffect(() => {
    const raw = localStorage.getItem(answeredKey);
    if (!raw) return;
    try {
      setAnswered(new Set(JSON.parse(raw)));
    } catch {}
  }, [answeredKey]);
  
  const unansweredList = useMemo(() => {
    const out: number[] = [];
    for (let i = 1; i <= questionCount; i++) {
      if (!answered.has(i)) out.push(i);
    }
    return out;
  }, [answered, questionCount]);

  function onSubmitClick() {
    if (unansweredList.length > 0) {
      setShowUnanswered(true);
      return;
    }
    router.push(`/attempts/${attemptId}/result`);
  }

  return (
    <main style={{ maxWidth: 900, margin: "30px auto", padding: 16 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>
            Question {position} / 150
          </h1>
          <div style={{ marginTop: 6, opacity: 0.8 }}>{topicLine}</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            disabled={!canPrev}
            onClick={() =>
              router.push(`/attempts/${attemptId}/${position - 1}`)
            }
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Prev
          </button>
          <button
            disabled={!canNext}
            onClick={() =>
              router.push(`/attempts/${attemptId}/${position + 1}`)
            }
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Next
          </button>

          {isPractice && (
            <button
              onClick={() => router.push("/")}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Save & Exit
            </button>
          )}

          {position === questionCount && (
            <button
              onClick={onSubmitClick}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Submit
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}
      {!data && !error && <p style={{ marginTop: 16 }}>Loading...</p>}

      {timer && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              opacity: 0.9,
            }}
          >
            <div style={{ color: danger ? "crimson" : "inherit" }}>
              <b>Time left:</b> {formatHMS(timer.remaining)}
            </div>
            <div style={{ opacity: 0.8 }}>{Math.round(timer.pct)}%</div>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              border: "1px solid #ddd",
              marginTop: 6,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${timer.pct}%`,
                borderRadius: 999,
                background: "#999",
              }}
            />
          </div>
        </div>
      )}

      {data && (
        <section
          style={{
            marginTop: 18,
            padding: 16,
            border: "1px solid #ddd",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.4 }}>
            {data.text}
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {data.choices.map((c) => (
              <label
                key={c.label}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="choice"
                  checked={selected === c.label}
                  onChange={() => saveAnswer(c.label as any)}
                  disabled={saving}
                  style={{ marginTop: 4 }}
                />
                <div>
                  <div style={{ fontWeight: 700 }}>{c.label}</div>
                  <div style={{ opacity: 0.9 }}>{c.text}</div>
                </div>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 10, opacity: 0.7 }}>
            {saving
              ? "Saving..."
              : selected
              ? `Selected: ${selected}`
              : "No selection yet"}
          </div>

          {/* Explanation appears immediately in practice, or after submit in timed */}
          {data.explanation && (
            <div style={{ marginTop: 16 }}>
              <button
                onClick={() => setShowHint((v) => !v)}
                style={{ padding: "8px 12px", borderRadius: 8 }}
              >
                {showHint ? "Hide Hint" : "Show Hint"}
              </button>

              {showHint && (
                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 10,
                    background: "#f7f7f7",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Hint</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>
                    {data.explanation}
                  </div>
                </div>
              )}
            </div>
          )}

          {showUnanswered && unansweredList.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 12,
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Unanswered questions: {unansweredList.length}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {unansweredList.map((qNum) => (
                  <button
                    key={qNum}
                    onClick={() =>
                      router.push(`/attempts/${attemptId}/${qNum}`)
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#f9f9f9",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {qNum}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button
                  onClick={() =>
                    router.push(`/attempts/${attemptId}/${unansweredList[0]}`)
                  }
                  style={{ padding: "8px 12px", borderRadius: 8 }}
                >
                  Go to first unanswered
                </button>

                <button
                  onClick={() => router.push(`/attempts/${attemptId}/result`)}
                  style={{ padding: "8px 12px", borderRadius: 8 }}
                >
                  Submit anyway
                </button>

                <button
                  onClick={() => setShowUnanswered(false)}
                  style={{ padding: "8px 12px", borderRadius: 8 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
