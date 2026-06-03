import { useState, useEffect } from "react";
import { Lock } from "lucide-react";

const STORAGE_KEY = "happiness-os-unlocked";

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-unlock only in the local dev / editor preview environment
    const host = window.location.hostname;
    const isEditor = host === "localhost" || host === "127.0.0.1";

    if (isEditor) {
      setUnlocked(true);
      setChecking(false);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD || "";
    const inputPassword = password.trim().toLowerCase();
    const storedPassword = correctPassword.trim().toLowerCase();

    if (inputPassword === storedPassword) {
      localStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError("Wrong password. Try again.");
      setPassword("");
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6B7280] text-sm">Loading…</p>
      </div>
    );
  }

  if (unlocked) {
    return children;
  }

  return (
    <div className="min-h-screen bg-white font-inter text-[#111827] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#F9FAFB] border border-[#E5E7EB] rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock size={22} className="text-[#6B7280]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mb-1">
            Happiness OS
          </h1>
          <p className="text-[#6B7280] text-sm">Enter password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-[#E5E7EB] text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent mb-3 text-center"
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 mb-3 text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-[#2563EB] text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {loading ? "Checking…" : "Unlock"}
          </button>
        </form>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
      `}</style>
    </div>
  );
}
