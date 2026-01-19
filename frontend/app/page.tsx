"use client";

import { useEffect, useMemo,useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, AttemptSummary, UserOut, AttemptMode } from "@/src/lib/api";

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<UserOut | null>(null);
  const [attempts, setAttempts] = useState<AttemptSummary[] | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [loading, setLoading] = useState<AttemptMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeAttemptId, setResumeAttemptId] = useState<number | null>(null);
  const [resumePos, setResumePos] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setAuthLoading(true);
      setAttemptsError(null);

      try {
        const me = await api.me();
        if (cancelled) return;
        setUser(me);

        setAttemptsLoading(true);
        const list = await api.myAttempts();
        if (cancelled) return;
        setAttempts(list);
      } catch (e: any) {
        // not logged in (401) is normal
        if (!cancelled) {
          setUser(null);
          setAttempts(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
          setAttemptsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function getResumePos(attemptId: number) {
    const lp = localStorage.getItem(`attempt:lastpos:${attemptId}`);
    const pos = lp ? Number(lp) : 1;
    return Number.isFinite(pos) && pos >= 1 ? pos : 1;
  }


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

      <div
        style={{
          marginTop: 24,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
            My Attempts
          </h2>

          {user ? (
            <button
              onClick={async () => {
                await api.logout();
                setUser(null);
                setAttempts(null);
                router.refresh();
              }}
              style={{ padding: "8px 12px", borderRadius: 8 }}
            >
              Logout
            </button>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign up</Link>
            </div>
          )}
        </div>

        {authLoading && <div style={{ marginTop: 10 }}>Checking login…</div>}

        {!authLoading && !user && (
          <div style={{ marginTop: 10, opacity: 0.9 }}>
            Login to save attempts across devices and see your history here.
          </div>
        )}

        {!authLoading && user && (
          <>
            <div style={{ marginTop: 8, opacity: 0.85 }}>
              Signed in as <b>{user.email}</b>
            </div>

            {attemptsLoading && (
              <div style={{ marginTop: 10 }}>Loading attempts…</div>
            )}

            {attemptsError && (
              <div style={{ marginTop: 10, color: "crimson" }}>
                {attemptsError}
              </div>
            )}

            {!attemptsLoading && attempts && attempts.length === 0 && (
              <div style={{ marginTop: 10, opacity: 0.9 }}>
                No attempts yet.
              </div>
            )}

            {!attemptsLoading && attempts && attempts.length > 0 && (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {attempts.map((a) => {
                  console.log("attempt", a.attempt_id, "submitted_at", a.submitted_at);

                  const isSubmitted = !!a.submitted_at;
                  const status = isSubmitted
                    ? `${a.score_percent ?? 0}% ${
                        a.passed ? "✅ Passed" : "❌ Not passed"
                      }`
                    : "In progress";

                  return (
                    <div
                      key={a.attempt_id}
                      style={{
                        padding: 12,
                        border: "1px solid #eee",
                        borderRadius: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          Attempt #{a.attempt_id} · {a.mode}
                        </div>
                        <div style={{ fontWeight: 700 }}>{status}</div>
                      </div>

                      <div style={{ marginTop: 6, opacity: 0.85 }}>
                        Started: {new Date(a.started_at).toLocaleString()}
                        {a.submitted_at
                          ? ` · Submitted: ${new Date(
                              a.submitted_at
                            ).toLocaleString()}`
                          : ""}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        {!isSubmitted && (
                          <button
                            onClick={() => {
                              const pos = getResumePos(a.attempt_id);
                              router.push(`/attempts/${a.attempt_id}/${pos}`);
                            }}
                            style={{ padding: "8px 12px", borderRadius: 8 }}
                          >
                            Resume
                          </button>
                        )}

                        {isSubmitted && (
                          <>
                            <button
                              onClick={() =>
                                router.push(`/attempts/${a.attempt_id}/result`)
                              }
                              style={{ padding: "8px 12px", borderRadius: 8 }}
                            >
                              Result
                            </button>

                            <button
                              onClick={() =>
                                router.push(`/attempts/${a.attempt_id}/review`)
                              }
                              style={{ padding: "8px 12px", borderRadius: 8 }}
                            >
                              Review
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
