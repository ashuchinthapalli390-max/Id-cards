"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  User,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail.trim() || !password) {
      setErrorMessage("Please enter both username/email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed.");
        setIsLoading(false);
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      setErrorMessage("Unable to connect to authentication server. Please retry.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col justify-between p-4">
      {/* Top Bar */}
      <header className="max-w-6xl w-full mx-auto py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <img
            src="/images/logo.jpeg"
            alt="CodeXa Logo"
            className="w-9 h-9 rounded-lg border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_12px_rgba(255,30,60,0.3)]"
          />
          <span className="font-heading font-black tracking-widest text-white text-sm">
            CODEXA <span className="text-[#FF1E3C]">AGENCY</span>
          </span>
        </Link>

        <div className="text-xs text-[#A5A5A5] font-mono">
          id.codxa-agency.online
        </div>
      </header>

      {/* Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="cyber-card p-8 sm:p-9 shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] text-[#FF1E3C] mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,30,60,0.3)]">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">Admin Portal Login</h1>
            <p className="text-[#A5A5A5] text-xs mt-1.5">
              Authenticate using your existing CodeXa administrative credentials.
            </p>
          </div>

          {/* Authorized Roles Notice */}
          <div className="bg-[#141414] border border-[rgba(217,4,41,0.2)] rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-1.5 text-white text-xs font-heading font-bold mb-2">
              <ShieldCheck className="w-4 h-4 text-[#FF1E3C]" />
              <span>Authorized Administrative Roles</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] text-[#FF1E3C] font-semibold text-center">
                • Founder
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] text-[#FF1E3C] font-semibold text-center">
                • Co-Founder
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#070707] border border-[rgba(217,4,41,0.2)] text-[#A5A5A5] font-semibold text-center">
                • CTO
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-[#070707] border border-[rgba(217,4,41,0.2)] text-[#A5A5A5] font-semibold text-center">
                • HR
              </span>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-[rgba(217,4,41,0.18)] border border-[rgba(255,30,60,0.45)] rounded-xl text-[#FF1E3C] text-xs flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. ashu or admin@codxa-agency.online"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full bg-[#141414] border border-[rgba(217,4,41,0.25)] focus:border-[#FF1E3C] focus:ring-1 focus:ring-[#FF1E3C] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#666666] outline-none transition-all"
                />
                <User className="w-4 h-4 text-[#A5A5A5] absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5A5] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#141414] border border-[rgba(217,4,41,0.25)] focus:border-[#FF1E3C] focus:ring-1 focus:ring-[#FF1E3C] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-[#666666] outline-none transition-all font-mono"
                />
                <Lock className="w-4 h-4 text-[#A5A5A5] absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#A5A5A5] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-cyber-primary w-full py-3.5 text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Administrator</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[rgba(217,4,41,0.15)] text-center text-[11px] text-[#666666]">
            Protected with bcrypt authentication & persistent secure cookie sessions.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-[#666666] py-3 flex items-center justify-center gap-2">
        <img src="/images/logo.jpeg" alt="CodeXa" className="w-4 h-4 rounded object-cover" />
        <span>© {new Date().getFullYear()} CodeXa Agency. ID Card Photo Collection Portal.</span>
      </footer>
    </div>
  );
}
