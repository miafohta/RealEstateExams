"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../providers";

export default function MePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?next=/me");
    }
  }, [loading, user, router]);

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>;
  if (!user) return null;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>My Account</h1>
      <p>
        <b>Email:</b> {user.email}
      </p>
      <p>
        <b>User ID:</b> {user.id}
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={logout}>Logout</button>
        <Link href="/">Home</Link>
      </div>
    </div>
  );
}
