"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Camera,
  Lock,
  ArrowRight,
  CheckCircle2,
  FileImage,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleOpenLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setErrorMsg("Please enter your secure invitation token or paste your personalized link.");
      return;
    }

    // Extract token if user pasted full URL (e.g. /upload/token or /u/token)
    let extractedToken = trimmed;
    if (trimmed.includes("/upload/")) {
      const parts = trimmed.split("/upload/");
      extractedToken = parts[1].split("?")[0].split("#")[0].trim();
    } else if (trimmed.includes("/u/")) {
      const parts = trimmed.split("/u/");
      extractedToken = parts[1].split("?")[0].split("#")[0].trim();
    }

    if (extractedToken.length < 16) {
      setErrorMsg("Invalid token format. Please check the link sent by your CodeXa administrator.");
      return;
    }

    router.push(`/upload/${extractedToken}`);
  };

  return (
    <div className="flex flex-col min-h-screen justify-between">
      {/* Top Header Navigation */}
      <header className="border-b border-[rgba(217,4,41,0.2)] bg-[#0C0C0C]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/images/logo.jpeg"
              alt="CodeXa Logo"
              className="w-10 h-10 rounded-lg border border-[rgba(255,30,60,0.55)] object-cover shadow-[0_0_14px_rgba(255,30,60,0.3)]"
            />
            <div className="flex flex-col">
              <span className="font-heading font-black tracking-widest text-white text-base sm:text-lg">
                CODEXA <span className="text-[#FF1E3C]">AGENCY</span>
              </span>
              <span className="text-[10px] text-[#A5A5A5] font-medium tracking-wide">
                Official Intern ID Card Photo Collection Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="https://codxa-agency.online"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#A5A5A5] hover:text-[#FF1E3C] transition-colors"
            >
              <span>Main Website</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <Link
              href="/admin/login"
              className="btn-cyber-outline text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-[#FF1E3C]" />
              <span>Admin Console</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12 w-full flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="cyber-badge mb-5">
            <span className="badge-dot" />
            <span>Official Subdomain • Secure ID Photo Collection</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-black text-white tracking-tight leading-tight mb-4">
            Official Intern <span className="text-[#FF1E3C] text-neon-glow">ID Card</span> Photo Submission
          </h1>
          <p className="text-[#A5A5A5] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Welcome to the official CodeXa Agency intern identity portal. Upload your passport-style photograph for physical identity card issuance via your unique, one-time personalized secure link.
          </p>
        </div>

        {/* Token Access Card */}
        <div className="cyber-card max-w-2xl mx-auto w-full mb-12 shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-[rgba(217,4,41,0.3)]">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-[rgba(217,4,41,0.15)] border border-[rgba(255,30,60,0.4)] flex items-center justify-center text-[#FF1E3C] shrink-0 shadow-[0_0_15px_rgba(255,30,60,0.25)]">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-white">
                Have a Personal Upload Link?
              </h2>
              <p className="text-xs sm:text-sm text-[#A5A5A5] mt-1">
                Paste your secure link or token sent by CodeXa Agency HR to access your verified profile.
              </p>
            </div>
          </div>

          <form onSubmit={handleOpenLink} className="space-y-4">
            <div>
              <label htmlFor="token-input" className="block text-xs font-semibold uppercase tracking-wider text-[#A5A5A5] mb-2">
                Personal Invitation Link or Token
              </label>
              <div className="relative">
                <input
                  id="token-input"
                  type="text"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value);
                    setErrorMsg("");
                  }}
                  placeholder="https://id.codxa-agency.online/upload/cx-sec-..."
                  className="w-full bg-[#141414] border border-[rgba(217,4,41,0.25)] focus:border-[#FF1E3C] focus:ring-1 focus:ring-[#FF1E3C] rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#666666] outline-none transition-all font-mono"
                />
              </div>
              {errorMsg && (
                <p className="text-xs text-[#FF1E3C] mt-2 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E3C]" />
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-cyber-primary w-full py-3.5 text-sm flex items-center justify-center gap-2 rounded-xl"
            >
              <span>Access ID Photo Upload</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[rgba(217,4,41,0.15)] flex flex-col sm:flex-row items-center justify-between text-xs text-[#A5A5A5] gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#10B981]" />
              <span>No login or password required</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-[#FF1E3C]" />
              <span>256-bit cryptographically secured</span>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto w-full">
          <div className="cyber-card p-6">
            <div className="w-10 h-10 rounded-lg bg-[rgba(217,4,41,0.12)] border border-[rgba(217,4,41,0.3)] flex items-center justify-center text-[#FF1E3C] mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-heading font-bold text-white mb-2">Verified Intern ID</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Links map directly to your official database record. Your photograph is automatically named with your unique Intern ID.
            </p>
          </div>

          <div className="cyber-card p-6">
            <div className="w-10 h-10 rounded-lg bg-[rgba(217,4,41,0.12)] border border-[rgba(217,4,41,0.3)] flex items-center justify-center text-[#FF1E3C] mb-4">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-heading font-bold text-white mb-2">Passport-Style Cropper</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              Mobile-first responsive photo tool with interactive 3:4 crop, zoom, and orientation adjustments for clear physical printing.
            </p>
          </div>

          <div className="cyber-card p-6">
            <div className="w-10 h-10 rounded-lg bg-[rgba(217,4,41,0.12)] border border-[rgba(217,4,41,0.3)] flex items-center justify-center text-[#10B981] mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-heading font-bold text-white mb-2">Private Storage & Review</h3>
            <p className="text-xs text-[#A5A5A5] leading-relaxed">
              All submissions are stored in an encrypted private vault, reviewed by authorized CodeXa administrators, and exported for ID production.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(217,4,41,0.2)] bg-[#070707] py-6 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#666666] gap-4">
          <div className="flex items-center gap-2">
            <img src="/images/logo.jpeg" alt="CodeXa" className="w-5 h-5 rounded object-cover" />
            <span className="font-heading font-bold text-[#A5A5A5]">CODEXA AGENCY</span>
            <span>• Intern Operations & ID Issuance</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#10B981]">
              <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
              System Operational
            </span>
            <span>© {new Date().getFullYear()} CodeXa Agency. All Rights Reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
