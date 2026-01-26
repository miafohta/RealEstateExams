"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../providers";

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function MePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/me");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl p-4">
        <div className="mt-10 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 space-y-2">
            <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-56 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="mt-6 h-9 w-32 animate-pulse rounded-xl bg-gray-100" />
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="mx-auto max-w-2xl p-4">
      <div className="mt-10">
        <div className="mb-5">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Account</h1>
          <p className="mt-1 text-base text-gray-500">
            Manage your profile and session.
          </p>
        </div>

        <div className="space-y-4">
          <Card title="Profile" subtitle="Your account details">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="mt-1 text-sm font-medium text-gray-900">
                    {user.email}
                  </div>
                </div>
                <span className="rounded-full border bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                  Logged in
                </span>
              </div>

              <div>
                <div className="text-xs text-gray-500">User ID</div>
                <div className="mt-1 text-sm font-medium text-gray-900">
                  {user.id}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Actions" subtitle="Quick links">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  await logout();
                  router.push("/login");
                }}
                className="inline-flex items-center rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Logout
              </button>

              <Link
                href="/"
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Home
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
