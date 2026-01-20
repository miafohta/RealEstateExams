"use client";

import { useEffect, useMemo, useState } from "react";
import { AttemptMeta } from "@/src/lib/types";

type Stats = {
  attemptsTaken: number;
  bestScore: number | null;
  avgScore: number | null;
  passRate: number | null; // 0-100
};

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-400">{sub}</div> : null}
    </div>
  );
}

export default function ProgressSnapshot() {
  const [attempts, setAttempts] = useState<AttemptMeta[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/me/attempts`,
          {
            method: "GET",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!res.ok) {
          // If user isn't logged in you might get 401 — treat as "no data" rather than scary error.
          if (res.status === 401) {
            if (!cancelled) setAttempts([]);
            return;
          }
          const text = await res.text();
          throw new Error(text || `Request failed: ${res.status}`);
        }

        const data = (await res.json()) as AttemptMeta[];
        if (!cancelled) setAttempts(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load attempts");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats: Stats = useMemo(() => {
    const list = attempts ?? [];

    const submitted = list.filter(
      (a) => a.submitted_at && typeof a.score_percent === "number"
    );

    const attemptsTaken = submitted.length;

    if (attemptsTaken === 0) {
      return {
        attemptsTaken: 0,
        bestScore: null,
        avgScore: null,
        passRate: null,
      };
    }

    const scores = submitted
      .map((a) => a.score_percent as number)
      .filter((n) => Number.isFinite(n));

    const bestScore = scores.length ? Math.max(...scores) : null;
    const avgScore =
      scores.length ? scores.reduce((s, n) => s + n, 0) / scores.length : null;

    const passedCount = submitted.filter((a) => a.passed === true).length;
    const passRate = (passedCount / attemptsTaken) * 100;

    return {
      attemptsTaken,
      bestScore,
      avgScore,
      passRate,
    };
  }, [attempts]);

  // Loading state
  if (attempts === null && !error) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-2xl border bg-gray-50"
          />
        ))}
      </div>
    );
  }

  // Error state (non-401)
  if (error) {
    return (
      <div className="rounded-2xl border bg-red-50 p-4 text-sm text-red-700">
        Couldn’t load progress snapshot. {error}
      </div>
    );
  }

  // Empty state (no submitted attempts yet)
  if (stats.attemptsTaken === 0) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
        No completed attempts yet. Take a practice exam to see your progress here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Attempts taken" value={`${stats.attemptsTaken}`} />
      <StatCard
        label="Best score"
        value={stats.bestScore === null ? "—" : `${round1(stats.bestScore)}%`}
        sub="Completed attempts"
      />
      <StatCard
        label="Average score"
        value={stats.avgScore === null ? "—" : `${round1(stats.avgScore)}%`}
        sub="Completed attempts"
      />
      <StatCard
        label="Pass rate"
        value={stats.passRate === null ? "—" : `${round1(stats.passRate)}%`}
        sub="Passed / completed"
      />
    </div>
  );
}
