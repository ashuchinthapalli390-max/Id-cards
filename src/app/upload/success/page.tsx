"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Home } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const internId = searchParams.get("id") || "CXA-INT-2026";
  const fullName = searchParams.get("name") || "";

  return (
    <div className="min-h-screen bg-[#070707] text-[#F7F7F7] flex flex-col items-center justify-center p-4">
      <div className="cyber-card max-w-lg w-full text-center shadow-2xl relative overflow-hidden">
        {/* Success Icon */}
        <div className="w-18 h-18 rounded-full bg-[rgba(16,185,129,0.15)] border border-[rgba(16,185,129,0.45)] text-[#10B981] mx-auto flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="cyber-badge mb-3">
          <span className="badge-dot" />
          <span>Official Confirmation</span>
        </div>

        <h1 className="text-xl sm:text-2xl font-heading font-black text-white mt-1 mb-2">
          PHOTO SUBMITTED SUCCESSFULLY
        </h1>

        <p className="text-[#A5A5A5] text-xs sm:text-sm leading-relaxed mb-6">
          Your official ID Card photograph has been securely received and recorded under your verified intern record.
        </p>

        {/* Intern Details Card */}
        <div className="bg-[#141414] border border-[rgba(217,4,41,0.2)] rounded-2xl p-5 text-left text-xs sm:text-sm space-y-3 mb-6">
          <div className="flex items-center justify-between border-b border-[rgba(217,4,41,0.12)] pb-2.5">
            <span className="text-[#A5A5A5] font-medium text-xs">Official Intern ID:</span>
            <span className="text-[#FF1E3C] font-mono font-black text-base">{internId}</span>
          </div>

          {fullName && (
            <div className="flex items-center justify-between border-b border-[rgba(217,4,41,0.12)] pb-2.5">
              <span className="text-[#A5A5A5] font-medium text-xs">Full Name:</span>
              <span className="text-white font-semibold text-xs sm:text-sm">{fullName}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#A5A5A5] font-medium text-xs">Review Status:</span>
            <span className="inline-flex items-center space-x-1.5 text-[#10B981] font-semibold text-xs bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.3)] px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
              <span>Pending Administrative Review</span>
            </span>
          </div>
        </div>

        {/* Administration Review Notice */}
        <div className="bg-[#070707] border border-[rgba(217,4,41,0.2)] rounded-xl p-4 text-xs text-[#A5A5A5] leading-relaxed mb-6">
          <div className="flex items-center justify-center space-x-1.5 text-white font-semibold mb-1">
            <ShieldCheck className="w-4 h-4 text-[#FF1E3C]" />
            <span>Next Steps</span>
          </div>
          Your photograph will be reviewed by CodeXa Agency administrators for quality and alignment before physical printing on your official ID card.
        </div>

        <Link
          href="/"
          className="btn-cyber-outline w-full py-3.5 text-xs flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Return to Portal Home</span>
        </Link>
      </div>

      <footer className="mt-8 text-xs text-[#666666] flex items-center gap-2">
        <img src="/images/logo.jpeg" alt="CodeXa" className="w-4 h-4 rounded object-cover" />
        <span>© {new Date().getFullYear()} CodeXa Agency. Secure ID Card Portal.</span>
      </footer>
    </div>
  );
}

export default function UploadSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070707] flex items-center justify-center text-[#A5A5A5] text-sm">
          Loading confirmation...
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
