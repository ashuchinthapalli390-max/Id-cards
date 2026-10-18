"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  User,
  ShieldCheck,
  Download,
} from "lucide-react";

interface PhotoSubmissionItem {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  department: string;
  email: string;
  status: "SUBMITTED" | "APPROVED" | "REJECTED";
  submittedAt: string;
  rejectionReason: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  version: number;
  width: number | null;
  height: number | null;
  fileSize: number | null;
}

export default function PhotoReviewGalleryPage() {
  const [photos, setPhotos] = useState<PhotoSubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SUBMITTED" | "APPROVED" | "REJECTED">("ALL");
  const [search, setSearch] = useState("");

  // Inspection Modal State
  const [activePhoto, setActivePhoto] = useState<PhotoSubmissionItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotationAngle, setRotationAngle] = useState(0);

  // Rejection Form
  const [rejectionReason, setRejectionReason] = useState("");
  const [requestResubmission, setRequestResubmission] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const commonRejectionReasons = [
    "Blurry or out-of-focus photograph",
    "Face is not centered or facing forward",
    "Background is not plain or has distracting elements",
    "Wearing sunglasses, cap, or face-obscuring items",
    "Low resolution / screenshot instead of camera photo",
    "Poor or uneven lighting / heavy facial shadows",
    "Group photo cropped too small",
  ];

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/interns?limit=100&photoStatus=ALL");
      const data = await res.json();

      if (res.ok && data.interns) {
        // Collect all submitted photos
        const submissionsList: PhotoSubmissionItem[] = [];
        data.interns.forEach((intern: any) => {
          if (intern.submission) {
            submissionsList.push({
              id: intern.submission.id,
              userId: intern.id,
              employeeId: intern.employeeId,
              fullName: intern.fullName,
              department: intern.department,
              email: intern.email,
              status: intern.submission.status,
              submittedAt: intern.submission.submittedAt,
              rejectionReason: intern.submission.rejectionReason,
              reviewedByName: intern.submission.reviewedByName,
              reviewedAt: intern.submission.reviewedAt,
              version: intern.submission.version,
              width: intern.submission.width,
              height: intern.submission.height,
              fileSize: intern.submission.fileSize,
            });
          }
        });

        setPhotos(submissionsList);
      }
    } catch (err) {
      console.error("fetchPhotos error", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Handle Review (Approve or Reject)
  const handleReviewAction = async (action: "APPROVE" | "REJECT") => {
    if (!activePhoto) return;

    if (action === "REJECT" && !rejectionReason.trim()) {
      alert("Please select or enter a rejection reason.");
      return;
    }

    setIsUpdatingStatus(true);
    setActionSuccessMsg("");

    try {
      const res = await fetch("/api/admin/photos/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: activePhoto.id,
          action,
          rejectionReason: action === "REJECT" ? rejectionReason : undefined,
          requestResubmission: action === "REJECT" ? requestResubmission : false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`✓ Photo successfully ${action === "APPROVE" ? "approved" : "rejected"}.`);
        setTimeout(() => {
          setActivePhoto(null);
          setActionSuccessMsg("");
          setRejectionReason("");
          fetchPhotos();
        }, 1200);
      } else {
        alert(data.error || "Action failed.");
      }
    } catch {
      alert("Network error processing review.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Filter photos
  const filteredPhotos = photos.filter((p) => {
    if (filterStatus !== "ALL" && p.status !== filterStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.fullName.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countPending = photos.filter((p) => p.status === "SUBMITTED").length;
  const countApproved = photos.filter((p) => p.status === "APPROVED").length;
  const countRejected = photos.filter((p) => p.status === "REJECTED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Photo Review Gallery
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Inspect submitted intern identity photos, examine alignment, zoom, rotate, approve, or reject.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPhotos}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>

          <Link
            href="/admin/exports"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Approved ZIP</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#141722] p-1.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setFilterStatus("ALL")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterStatus === "ALL"
                ? "bg-zinc-800 text-white shadow"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All Photos ({photos.length})
          </button>

          <button
            onClick={() => setFilterStatus("SUBMITTED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              filterStatus === "SUBMITTED"
                ? "bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow"
                : "text-amber-400/80 hover:text-amber-300"
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Pending Review ({countPending})</span>
          </button>

          <button
            onClick={() => setFilterStatus("APPROVED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              filterStatus === "APPROVED"
                ? "bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow"
                : "text-emerald-400/80 hover:text-emerald-300"
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved ({countApproved})</span>
          </button>

          <button
            onClick={() => setFilterStatus("REJECTED")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
              filterStatus === "REJECTED"
                ? "bg-rose-950/80 text-rose-300 border border-rose-800/60 shadow"
                : "text-rose-400/80 hover:text-rose-300"
            }`}
          >
            <XCircle className="w-3 h-3" />
            <span>Rejected ({countRejected})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search photos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#12151f] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
          />
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Grid Gallery */}
      {isLoading ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-xs">
          Loading photographs from protected storage...
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="bg-[#0e1117] border border-zinc-800 rounded-3xl p-12 text-center text-zinc-400">
          <ImageIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No photographs found</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {photos.length === 0
              ? "No interns have submitted ID card photographs yet. Use the dashboard to generate and send invitation links."
              : "No photographs match the active filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => {
                setActivePhoto(photo);
                setZoomLevel(1);
                setRotationAngle(0);
                setRejectionReason(photo.rejectionReason || "");
                setActionSuccessMsg("");
              }}
              className="bg-[#0e1117] border border-zinc-800/90 hover:border-zinc-700 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xl group flex flex-col justify-between"
            >
              {/* Photo Thumbnail */}
              <div className="relative w-full h-64 bg-zinc-950 flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/admin/photos/preview/${photo.id}`}
                  alt={photo.fullName}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                />

                {/* Status Badge in corner */}
                <div className="absolute top-2.5 right-2.5">
                  {photo.status === "APPROVED" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 shadow">
                      Approved
                    </span>
                  )}
                  {photo.status === "SUBMITTED" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600/50 shadow">
                      Pending
                    </span>
                  )}
                  {photo.status === "REJECTED" && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/90 text-rose-300 border border-rose-600/50 shadow">
                      Rejected
                    </span>
                  )}
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono font-bold text-white backdrop-blur-sm">
                  {photo.employeeId}
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4">
                <h4 className="font-bold text-white text-sm truncate group-hover:text-rose-400 transition-colors">
                  {photo.fullName}
                </h4>
                <p className="text-[11px] text-zinc-400 truncate mt-0.5">{photo.department}</p>

                <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>{new Date(photo.submittedAt).toLocaleDateString("en-GB")}</span>
                  <span className="text-rose-400 font-semibold group-hover:underline flex items-center">
                    <span>Inspect</span>
                    <ChevronRight className="w-3 h-3 ml-0.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FULL INSPECTION & APPROVAL MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e1117] border border-zinc-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-[#0e1117] z-10">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>{activePhoto.fullName}</span>
                  <span className="font-mono text-xs text-rose-400 px-2 py-0.5 bg-rose-950/50 rounded border border-rose-800/40">
                    {activePhoto.employeeId}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400">{activePhoto.department} • Uploaded on {new Date(activePhoto.submittedAt).toLocaleString()}</p>
              </div>

              <button
                onClick={() => setActivePhoto(null)}
                className="text-zinc-400 hover:text-white text-2xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Display with Zoom & Rotate */}
              <div className="flex flex-col items-center">
                <div className="w-full h-80 bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 flex items-center justify-center relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/admin/photos/preview/${activePhoto.id}`}
                    alt={activePhoto.fullName}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotationAngle}deg)`,
                      transition: "transform 0.2s ease-out",
                    }}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* Image Inspection Controls */}
                <div className="mt-3 flex items-center space-x-3 bg-[#141722] p-2 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-zinc-400 w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>

                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-zinc-700" />

                  <button
                    onClick={() => setRotationAngle((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center space-x-1"
                    title="Rotate 90 degrees"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Review Decision Form */}
              <div className="space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                    Review Decision
                  </h4>

                  {/* Current Status */}
                  <div className="bg-[#141722] border border-zinc-800 rounded-xl p-3 text-xs space-y-1.5 mb-4">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Current Status:</span>
                      <span className="font-bold text-white uppercase">{activePhoto.status}</span>
                    </div>
                    {activePhoto.reviewedByName && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Last Reviewed By:</span>
                        <span className="text-zinc-300">{activePhoto.reviewedByName}</span>
                      </div>
                    )}
                    {activePhoto.rejectionReason && (
                      <div className="text-rose-400 text-[11px] pt-1 border-t border-zinc-800">
                        Reason: {activePhoto.rejectionReason}
                      </div>
                    )}
                  </div>

                  {/* Rejection Reasons Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-300 block">
                      Rejection Reason (if rejecting):
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full bg-[#141722] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                    >
                      <option value="">Select standard reason or type below...</option>
                      {commonRejectionReasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Or enter custom rejection reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full bg-[#141722] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
                    />

                    <label className="flex items-center space-x-2 text-xs text-zinc-400 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={requestResubmission}
                        onChange={(e) => setRequestResubmission(e.target.checked)}
                        className="rounded accent-rose-500"
                      />
                      <span>Send email notification with rejection reason & &quot;Upload Again&quot; button (uses permanent link)</span>
                    </label>
                  </div>

                  {actionSuccessMsg && (
                    <div className="mt-3 p-2.5 bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs rounded-xl font-medium">
                      {actionSuccessMsg}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleReviewAction("APPROVE")}
                    disabled={isUpdatingStatus}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Photo</span>
                  </button>

                  <button
                    onClick={() => handleReviewAction("REJECT")}
                    disabled={isUpdatingStatus}
                    className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Photo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
