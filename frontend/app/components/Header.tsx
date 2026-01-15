"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";

export default function Header() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      {/* Left */}
      <Link href="/" style={{ fontWeight: 600 }}>
        RealEstateExams
      </Link>

      {/* Right */}
      {!loading && (
        <nav style={{ display: "flex", gap: 16 }}>
          {user ? (
            <>
              <Link href="/account">My Account</Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login">Login</Link>
              <Link href="/signup">Sign up</Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
