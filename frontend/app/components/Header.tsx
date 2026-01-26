"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers";
import { UserCircleIcon } from "@heroicons/react/24/outline"

export default function Header() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="border-b bg-white">
      {/* Left */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-semibold">
          RealEstateExams
      </Link>

      {/* Right */}
      {!loading && (
        <nav style={{ display: "flex", gap: 16 }}>
          {user ? (
            <>
                <Link href="/account" 
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900" 
                  aria-label="My Account"><UserCircleIcon className="h-8 w-8" />
                </Link>
              <button onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
                  <Link href="/login" className="text-sm text-blue-600 hover:underline">Login</Link>
                  <Link href="/signup" className="text-sm text-blue-600 hover:underline">Sign up</Link>
            </>
          )}
        </nav>
      )}
      </div>
    </header>
  );
}
