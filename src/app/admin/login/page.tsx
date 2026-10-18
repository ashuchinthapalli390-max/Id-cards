"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  User,
  Lock,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  // Mode: "master" (default) or "credentials"
  const [loginMode, setLoginMode] = useState<"master" | "credentials">("master");

  // Master key state
  const [masterKey, setMasterKey] = useState("");

  // Individual credentials state
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey.trim()) {
      setErrorMessage("Please enter the Administrator Master Key.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterKey: masterKey.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Authentication failed. Invalid Master Key.");
        setIsLoading(false);
      } else {
        router.push("/admin/dashboard");
      }
    } catch {
      setErrorMessage("Unable to connect to authentication server. Please retry.");
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
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
        setErrorMessage(data.error || "Authentication failed. Invalid credentials.");
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
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col justify-between p-4 bg-cyber-grid">
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
            <div className="w-16 h-16 rounded-2xl bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.45)] text-[#FF1E3C] mx-auto flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(255,30,60,0.35)]">
              <KeyRound className="w-8 h-8" />
            </div>
            <div className="cyber-badge mb-2">
              <span className="badge-dot" />
              <span>Master Admin Access</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-white tracking-tight">
              Administrator Portal
            </h1>
            <p className="text-[#A5A5A5] text-xs mt-1.5 leading-relaxed">
              Instant single-key authorization for ID card approval, telemetry, and ZIP exports.
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex bg-[#141414] p-1 rounded-xl mb-6 border border-[rgba(217,4,41,0.2)]">
            <button
              type="button"
              onClick={() => {
                setLoginMode("master");
                setErrorMessage("");
              }}
              className={`flex-1 py-2 text-xs font-heading font-bold rounded-lg transition-all ${
                loginMode === "master"
                  ? "bg-[linear-gradient(135deg,#FF1E3C_0%,#D90429_100%)] text-white shadow-[0_0_15px_rgba(255,30,60,0.3)]"
                  : "text-[#A5A5A5] hover:text-white"
              }`}
            >
              Master Key Access
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("credentials");
                setErrorMessage("");
              }}
              className={`flex-1 py-2 text-xs font-heading font-bold rounded-lg transition-all ${
                loginMode === "credentials"
                  ? "bg-[linear-gradient(135deg,#FF1E3C_0%,#D90429_100%)] text-white shadow-[0_0_15px_rgba(255,30,60,0.3)]"
                  : "text-[#A5A5A5] hover:text-white"
              }`}
            >
              Account Login
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-[rgba(217,4,41,0.18)] border border-[rgba(255,30,60,0.45)] rounded-xl text-[#FF1E3C] text-xs flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Master Key Form (Default Single Login) */}
          {loginMode === "master" ? (
            <form onSubmit={handleMasterLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5A5] mb-2">
                  Administrator Master Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    required
                    autoFocus
                    placeholder="Enter Master Key configured in .env"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                    className="w-full bg-[#141414] border border-[rgba(217,4,41,0.3)] focus:border-[#FF1E3C] focus:ring-1 focus:ring-[#FF1E3C] rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-[#666666] outline-none transition-all font-mono"
                  />
                  <KeyRound className="w-4 h-4 text-[#A5A5A5] absolute left-3.5 top-4" />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-4 text-[#A5A5A5] hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#666666] mt-2">
                  Configured via <code className="text-[#A5A5A5] font-mono">ADMIN_MASTER_KEY</code> in your environment.
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-cyber-primary w-full py-4 text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 mt-4 shadow-[0_0_25px_rgba(255,30,60,0.4)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing Master Session...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Admin Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Traditional Credentials Form */
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
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
                    type={showKey ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#141414] border border-[rgba(217,4,41,0.25)] focus:border-[#FF1E3C] focus:ring-1 focus:ring-[#FF1E3C] rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-[#666666] outline-none transition-all font-mono"
                  />
                  <Lock className="w-4 h-4 text-[#A5A5A5] absolute left-3.5 top-3.5" />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3.5 top-3.5 text-[#A5A5A5] hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                    <span>Sign In With Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-[rgba(217,4,41,0.15)] flex items-center justify-between text-[11px] text-[#A5A5A5]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              Encrypted Session
            </span>
            <span className="font-mono text-[#666666]">30-Day Persistence</span>
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
