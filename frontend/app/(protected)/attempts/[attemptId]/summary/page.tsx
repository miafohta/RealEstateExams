"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/src/lib/api"; 
import type { SubmitOut, ReviewItemOut } from "@/src/lib/api"; 

type TabKey = "result" | "review";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-black text-white"
          : "bg-white text-gray-700 border hover:bg-gray-50",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

export default function AttemptSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const search = useSearchParams();

  const attemptId = Number(params.attemptId);

  const initialTab = (search.get("tab") as TabKey) || "result";
  const [tab, setTab] = useState<TabKey>(
    initialTab === "review" ? "review" : "result"
  );

  const [result, setResult] = useState<SubmitOut | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  const [review, setReview] = useState<ReviewItemOut[] | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Keep URL query param in sync (so refresh keeps the current tab)
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + "?" + url.searchParams.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Load result immediately
  useEffect(() => {
    if (!Number.isFinite(attemptId)) return;

    setResultError(null);
    setResult(null);

    api
      .attemptResult(attemptId)
      .then(setResult)
      .catch((e: any) => {
        // Option B: If not submitted, backend should return 409
        setResultError(e?.message ?? "Failed to load result");
      });
  }, [attemptId]);

  // Lazy-load review only when tab switches to review
  useEffect(() => {
    if (tab !== "review") return;
    if (review !== null) return; // already loaded
    if (!Number.isFinite(attemptId)) return;

    setReviewError(null);
    setReviewLoading(true);

    api
      .review(attemptId)
      .then((items) => setReview(items))
      .catch((e: any) => setReviewError(e?.message ?? "Failed to load review"))
      .finally(() => setReviewLoading(false));
  }, [tab, review, attemptId]);

  const title = useMemo(() => {
    if (result?.passed === true) return "Passed ✅";
    if (result?.passed === false) return "FAIL ❌";
    return "Attempt Summary";
  }, [result]);

  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Attempt #{Number.isFinite(attemptId) ? attemptId : "—"}
          </p>
        </div>

        <div className="flex gap-2">
          <TabButton active={tab === "result"} onClick={() => setTab("result")}>
            Result
          </TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            Review
          </TabButton>
        </div>
      </div>

      <div className="mt-6">
        {tab === "result" && (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            {!result && !resultError && (
              <p className="text-sm text-gray-600">Loading result…</p>
            )}

            {resultError && (
              <div className="rounded-xl border bg-red-50 p-3 text-sm text-red-700">
                {resultError}
                <div className="mt-2 text-xs text-red-600">
                  If this says “not submitted yet”, it means the attempt wasn’t
                  submitted (manual submit or timer auto-submit must POST submit
                  first).
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-6">
                {/* Top stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="mt-1 text-xl font-semibold">
                      {result.score_percent?.toFixed(1)}%
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Correct</div>
                    <div className="mt-1 text-xl font-semibold">
                      {result.correct}/{result.total_questions}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Status</div>
                    <div className="mt-1 text-xl font-semibold">
                      {result.passed ? "Pass" : "Fail"}
                    </div>
                  </div>

                  <div className="rounded-xl border p-3">
                    <div className="text-xs text-gray-500">Submitted</div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      {result.submitted_at
                        ? new Date(result.submitted_at).toLocaleString()
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div>
                  <h2 className="text-md font-semibold">Breakdown by Topic</h2>

                  <div className="mt-3 flex flex-wrap gap-3">
                    {Object.entries(result.breakdown_by_topic).map(([topic, v]) => (
                      <div
                        key={topic}
                        className="min-w-[180px] rounded-xl border border-gray-200 bg-white p-3 transition hover:shadow-sm"
                      >
                        <div className="text-sm font-semibold text-gray-900">{topic}</div>
                        <div className="mt-1 text-sm text-gray-600">
                          {v.correct} / {v.total} correct
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === "review" && (
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            {reviewLoading && (
              <p className="text-sm text-gray-600">Loading review…</p>
            )}

            {reviewError && (
              <div className="rounded-xl border bg-red-50 p-3 text-sm text-red-700">
                {reviewError}
              </div>
            )}

            {review && review.length === 0 && (
              <p className="text-sm text-gray-600">
                No review items found for this attempt.
              </p>
            )}

            {review && review.length > 0 && (
              <div className="space-y-4">
                {review.map((item) => (
                  <div key={item.position} className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">
                        Q{item.position}: {item.text}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.topic} {item.subtopic ? `• ${item.subtopic}` : ""}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {item.choices.map((c) => {
                        const isCorrect = c.label === item.correct_label;
                        const isSelected = c.label === item.selected_label;

                        return (
                          <div
                            key={c.label}
                            className={[
                              "rounded-lg border px-3 py-2 text-sm",
                              isCorrect
                                ? "border-green-300 bg-green-50"
                                : isSelected
                                  ? "border-red-300 bg-red-50"
                                  : "bg-white",
                            ].join(" ")}
                          >
                            <span className="font-medium">{c.label}.</span>{" "}
                            {c.text}
                            {isCorrect ? (
                              <span className="ml-2 text-xs font-semibold text-green-700">
                                Correct
                              </span>
                            ) : null}
                            {isSelected && !isCorrect ? (
                              <span className="ml-2 text-xs font-semibold text-red-700">
                                Your answer
                              </span>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation ? (
                      <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                        {item.explanation}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
