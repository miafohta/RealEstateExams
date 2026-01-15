"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../providers";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const qs = searchParams?.toString();
  const nextUrl = qs ? `${pathname}?${qs}` : pathname || "/";

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(nextUrl)}`);
    }
  }, [loading, user, router, nextUrl]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return null;

  return <>{children}</>;
}
