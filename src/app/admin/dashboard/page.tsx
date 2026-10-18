"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Send,
  Copy,
  ExternalLink,
  Download,
  Share2,
  Check,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowUpRight,
} from "lucide-react";

interface Stats {
  totalInterns: number;
  totalInvitations: number;
  activeInvitations: number;
  expiredInvitations: number;
  photosReceived: number;
  pendingUploads: number;
  pendingReviews: number;
  approvedPhotos: number;
  rejectedPhotos: number;
}

interface InternRow {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string;
  college: string | null;
  invitationStatus: "NOT_GENERATED" | "ACTIVE" | "EXPIRED" | "SUBMITTED" | "REVOKED";
  invitation: {
    id: string;
    status: string;
    expiresAt: string;
    emailStatus: string;
    emailSentAt: string | null;
  } | null;
  photoStatus: "NOT_UPLOADED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  submission: {
    id: string;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    reviewedByName: string | null;
    rejectionReason: string | null;
    fileSize: number | null;
    width: number | null;
    height: number | null;
  } | null;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [interns, setInterns] = useState<InternRow[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedInvStatus, setSelectedInvStatus] = useState("ALL");
  const [selectedPhotoStatus, setSelectedPhotoStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal States
  const [linkModalData, setLinkModalData] = useState<{
    internName: string;
    employeeId: string;
    email: string;
    phone: string | null;
    uploadUrl: string;
    invitationId: string;
    expiresAt: string;
  } | null>(null);

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState("");

  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  // Quick photo preview modal
  const [previewPhotoSubmissionId, setPreviewPhotoSubmissionId] = useState<string | null>(null);
  const [previewIntern, setPreviewIntern] = useState<InternRow | null>(null);

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error("fetchStats error", err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 2. Fetch Interns Table
  const fetchInterns = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search,
        department: selectedDept,
        invitationStatus: selectedInvStatus,
        photoStatus: selectedPhotoStatus,
      });

      const res = await fetch(`/api/admin/interns?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.interns) {
        setInterns(data.interns);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
        if (data.departments) {
          setDepartments(data.departments);
        }
      }
    } catch (err) {
      console.error("fetchInterns error", err);
    } finally {
      setIsLoadingTable(false);
    }
  }, [page, search, selectedDept, selectedInvStatus, selectedPhotoStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchInterns();
  }, [fetchInterns]);

  // Handle Single Link Generation
  const handleGenerateLink = async (intern: InternRow, forceRegenerate = false) => {
    try {
      const res = await fetch("/api/admin/invitations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: intern.id,
          forceRegenerate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLinkModalData({
          internName: data.invitation.internName,
          employeeId: data.invitation.employeeId,
          email: data.invitation.email,
          phone: data.invitation.phone,
          uploadUrl: data.invitation.uploadUrl,
          invitationId: data.invitation.id,
          expiresAt: data.invitation.expiresAt,
        });
        setCopiedUrl(false);
        setEmailStatusMsg("");
        fetchInterns();
        fetchStats();
      } else {
        alert(data.error || "Failed to generate invitation link.");
      }
    } catch {
      alert("Network error generating link.");
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    if (linkModalData?.uploadUrl) {
      navigator.clipboard.writeText(linkModalData.uploadUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  // Send Email from modal
  const handleSendEmailFromModal = async () => {
    if (!linkModalData) return;
    setIsSendingEmail(true);
    setEmailStatusMsg("");

    try {
      const res = await fetch("/api/admin/invitations/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: interns.find((i) => i.employeeId === linkModalData.employeeId)?.id,
          customUploadUrl: linkModalData.uploadUrl,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatusMsg("✓ Invitation email dispatched successfully via Resend.");
        fetchInterns();
      } else {
        setEmailStatusMsg(`✕ Failed to send email: ${data.error}`);
      }
    } catch {
      setEmailStatusMsg("✕ Network error sending email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Handle Bulk Generation
  const handleBulkGenerate = async () => {
    const confirmAction = confirm(
      "Generate personalized upload links for ALL pending interns who do not currently have an active link?"
    );
    if (!confirmAction) return;

    setBulkGenerating(true);
    setBulkMessage("");

    try {
      const res = await fetch("/api/admin/invitations/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allPending: true }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBulkMessage(`✓ ${data.message}`);
        fetchStats();
        fetchInterns();
      } else {
        setBulkMessage(`✕ Error: ${data.error}`);
      }
    } catch {
      setBulkMessage("✕ Network exception during bulk generation.");
    } finally {
      setBulkGenerating(false);
    }
  };

  // Quick Review Action
  const handleQuickReview = async (submissionId: string, action: "APPROVE" | "REJECT") => {
    try {
      const res = await fetch("/api/admin/photos/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewPhotoSubmissionId(null);
        fetchStats();
        fetchInterns();
      } else {
        alert(data.error || "Review update failed.");
      }
    } catch {
      alert("Network error updating review.");
    }
  };

  // Helper badge renderers
  const renderInvitationBadge = (status: InternRow["invitationStatus"]) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            Active
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/60 text-blue-400 border border-blue-800/40">
            Submitted
          </span>
        );
      case "EXPIRED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/60 text-amber-400 border border-amber-800/40">
            Expired
          </span>
        );
      case "REVOKED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            Revoked
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-500 border border-zinc-800">
            Not Generated
          </span>
        );
    }
  };

  const renderPhotoBadge = (status: InternRow["photoStatus"]) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/50 flex items-center space-x-1 w-max">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Approved</span>
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/50 flex items-center space-x-1 w-max">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Pending Review</span>
          </span>
        );
      case "REJECTED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/50 flex items-center space-x-1 w-max">
            <XCircle className="w-3 h-3 text-rose-400" />
            <span>Rejected</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-900 text-zinc-500 border border-zinc-800">
            Not Uploaded
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Intern ID Card Portal Overview
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Real-time telemetry and management connected to the CodeXa Agency production database.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              fetchStats();
              fetchInterns();
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center space-x-1.5"
            title="Refresh database records"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/exports"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-950 transition-all flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export ZIP</span>
          </Link>
        </div>
      </div>

      {/* Bulk Alert Banner */}
      {bulkMessage && (
        <div className="p-4 bg-zinc-900 border border-zinc-700 rounded-2xl text-xs text-zinc-200 flex items-center justify-between">
          <span>{bulkMessage}</span>
          <button onClick={() => setBulkMessage("")} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Live Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
        {/* Total Interns */}
        <div className="bg-[#0e1117] border border-zinc-800/80 rounded-2xl p-4 relative overflow-hidden">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Total Interns
          </span>
          <span className="text-2xl font-black text-white font-mono">
            {isLoadingStats ? "..." : stats?.totalInterns ?? 0}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">Registered in DB</div>
        </div>

        {/* Invitations Generated */}
        <div className="bg-[#0e1117] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Links Created
          </span>
          <span className="text-2xl font-black text-white font-mono">
            {isLoadingStats ? "..." : stats?.totalInvitations ?? 0}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">
            {stats?.activeInvitations ?? 0} active now
          </div>
        </div>

        {/* Photos Received */}
        <div className="bg-[#0e1117] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1">
            Received
          </span>
          <span className="text-2xl font-black text-blue-400 font-mono">
            {isLoadingStats ? "..." : stats?.photosReceived ?? 0}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">Uploaded photos</div>
        </div>

        {/* Pending Uploads */}
        <div className="bg-[#0e1117] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Pending Upload
          </span>
          <span className="text-2xl font-black text-zinc-300 font-mono">
            {isLoadingStats ? "..." : stats?.pendingUploads ?? 0}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">Awaiting photos</div>
        </div>

        {/* Pending Reviews */}
        <div className="bg-[#0e1117] border border-amber-900/40 bg-amber-950/10 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
            Need Review
          </span>
          <span className="text-2xl font-black text-amber-400 font-mono">
            {isLoadingStats ? "..." : stats?.pendingReviews ?? 0}
          </span>
          <div className="text-[10px] text-amber-500/80 mt-1">Ready for approval</div>
        </div>

        {/* Approved Photos */}
        <div className="bg-[#0e1117] border border-emerald-900/40 bg-emerald-950/10 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Approved
          </span>
          <span className="text-2xl font-black text-emerald-400 font-mono">
            {isLoadingStats ? "..." : stats?.approvedPhotos ?? 0}
          </span>
          <div className="text-[10px] text-emerald-500/80 mt-1">Ready for print</div>
        </div>

        {/* Rejected Photos */}
        <div className="bg-[#0e1117] border border-rose-900/40 bg-rose-950/10 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
            Rejected
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">
            {isLoadingStats ? "..." : stats?.rejectedPhotos ?? 0}
          </span>
          <div className="text-[10px] text-rose-500/80 mt-1">Resubmission req.</div>
        </div>

        {/* Expired Links */}
        <div className="bg-[#0e1117] border border-zinc-800/80 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
            Expired
          </span>
          <span className="text-2xl font-black text-zinc-500 font-mono">
            {isLoadingStats ? "..." : stats?.expiredInvitations ?? 0}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">Over 7 days</div>
        </div>
      </div>

      {/* Action Bar & Quick Actions */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 disabled:opacity-50 transition-all flex items-center space-x-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{bulkGenerating ? "Generating Links..." : "Generate Links for All Pending Interns"}</span>
          </button>

          <Link
            href="/admin/photos"
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-colors flex items-center space-x-1.5"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Photo Review Gallery ({stats?.pendingReviews ?? 0})</span>
          </Link>
        </div>

        <div className="text-xs text-zinc-400 font-medium">
          Showing <span className="text-white font-mono font-bold">{totalCount}</span> registered intern records
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#0b0d13] border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by Name, Intern ID, or Email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#12151f] border border-zinc-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#12151f] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Invitation Status Filter */}
          <div>
            <select
              value={selectedInvStatus}
              onChange={(e) => {
                setSelectedInvStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#12151f] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="ALL">All Invitation Statuses</option>
              <option value="NOT_GENERATED">Not Generated</option>
              <option value="ACTIVE">Active (Valid)</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
            </select>
          </div>

          {/* Photo Status Filter */}
          <div>
            <select
              value={selectedPhotoStatus}
              onChange={(e) => {
                setSelectedPhotoStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#12151f] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            >
              <option value="ALL">All Photo Statuses</option>
              <option value="NOT_UPLOADED">Not Uploaded</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interns Table */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12151f] text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3.5 px-4">Intern ID</th>
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Invitation</th>
                <th className="py-3.5 px-4">Photo Status</th>
                <th className="py-3.5 px-4">Uploaded At</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              {isLoadingTable ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading interns from PostgreSQL...
                  </td>
                </tr>
              ) : interns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No interns match the current filters.
                  </td>
                </tr>
              ) : (
                interns.map((intern) => (
                  <tr key={intern.id} className="hover:bg-[#12151f]/60 transition-colors">
                    {/* Intern ID */}
                    <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                      {intern.employeeId}
                    </td>

                    {/* Full Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{intern.fullName}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{intern.email}</div>
                    </td>

                    {/* Department */}
                    <td className="py-3.5 px-4">
                      <span className="text-zinc-300 font-medium">{intern.department}</span>
                      {intern.college && (
                        <div className="text-[10px] text-zinc-500 truncate max-w-xs">
                          {intern.college}
                        </div>
                      )}
                    </td>

                    {/* Invitation Status */}
                    <td className="py-3.5 px-4">
                      {renderInvitationBadge(intern.invitationStatus)}
                      {intern.invitation?.emailStatus === "SENT" && (
                        <div className="text-[10px] text-emerald-400 mt-1 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Email Sent</span>
                        </div>
                      )}
                    </td>

                    {/* Photo Status */}
                    <td className="py-3.5 px-4">
                      {renderPhotoBadge(intern.photoStatus)}
                    </td>

                    {/* Uploaded At */}
                    <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                      {intern.submission?.submittedAt
                        ? new Date(intern.submission.submittedAt).toLocaleDateString("en-GB")
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* If photo is submitted or approved, show view button */}
                        {intern.submission && (
                          <button
                            onClick={() => {
                              setPreviewPhotoSubmissionId(intern.submission?.id || null);
                              setPreviewIntern(intern);
                            }}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                            title="Inspect photograph"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Generate / View Link Button */}
                        <button
                          onClick={() => handleGenerateLink(intern, intern.invitationStatus === "ACTIVE")}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors flex items-center space-x-1"
                          title="Generate or share personalized upload link"
                        >
                          <LinkIcon className="w-3 h-3" />
                          <span>
                            {intern.invitationStatus === "ACTIVE"
                              ? "Link"
                              : intern.invitationStatus === "SUBMITTED"
                              ? "Reopen"
                              : "Generate"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="bg-[#12151f] border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-xs text-zinc-400">
          <div>
            Page <span className="font-bold text-white">{page}</span> of{" "}
            <span className="font-bold text-white">{totalPages}</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE LINK GENERATION & SHARING MODAL */}
      {linkModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1117] border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-rose-950/60 text-rose-400 border border-rose-800/40">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Personalized Upload Link</h3>
                  <span className="text-[11px] text-zinc-400">{linkModalData.employeeId} • {linkModalData.internName}</span>
                </div>
              </div>
              <button
                onClick={() => setLinkModalData(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* URL Display */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-semibold text-zinc-300">Secure Personal URL</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={linkModalData.uploadUrl}
                  className="w-full bg-[#141722] border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-zinc-100 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 flex items-center space-x-1 transition-colors"
                >
                  {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedUrl ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                Expires on {new Date(linkModalData.expiresAt).toLocaleDateString()} at {new Date(linkModalData.expiresAt).toLocaleTimeString()}
              </p>
            </div>

            {/* Sharing Options */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <span className="text-xs font-bold text-zinc-300 block">Dispatch Actions:</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Send Official Email via Resend */}
                <button
                  onClick={handleSendEmailFromModal}
                  disabled={isSendingEmail}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isSendingEmail ? "Sending..." : "Send Official Email"}</span>
                </button>

                {/* WhatsApp Share */}
                {linkModalData.phone ? (
                  <a
                    href={`https://api.whatsapp.com/send?phone=91${linkModalData.phone.replace(/\D/g, "")}&text=${encodeURIComponent(
                      `Hello ${linkModalData.internName},\n\nHere is your official CodeXa Agency ID card photo upload link:\n${linkModalData.uploadUrl}\n\nPlease upload a clear passport-style portrait photo. No login required.\n\nRegards,\nCodeXa Agency`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 text-xs font-semibold text-emerald-300 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Share on WhatsApp</span>
                  </a>
                ) : (
                  <button
                    onClick={() => {
                      const text = `Hello ${linkModalData.internName}, here is your official CodeXa Agency ID card photo link: ${linkModalData.uploadUrl}`;
                      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share via WhatsApp</span>
                  </button>
                )}
              </div>

              {emailStatusMsg && (
                <p className="text-xs text-zinc-300 mt-2 p-2 bg-zinc-900 rounded-lg">
                  {emailStatusMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUICK PHOTO PREVIEW MODAL */}
      {previewPhotoSubmissionId && previewIntern && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1117] border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">{previewIntern.fullName}</h3>
                <span className="text-xs font-mono text-rose-400">{previewIntern.employeeId}</span>
              </div>
              <button
                onClick={() => setPreviewPhotoSubmissionId(null)}
                className="text-zinc-400 hover:text-white text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {/* Image Preview */}
            <div className="w-full h-72 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/photos/preview/${previewPhotoSubmissionId}`}
                alt={previewIntern.fullName}
                className="h-full object-contain"
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleQuickReview(previewPhotoSubmissionId, "APPROVE")}
                className="py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center space-x-1.5 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Approve Photo</span>
              </button>

              <button
                onClick={() => handleQuickReview(previewPhotoSubmissionId, "REJECT")}
                className="py-2.5 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center space-x-1.5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
