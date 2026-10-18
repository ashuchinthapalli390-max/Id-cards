"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Download,
  FileArchive,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  FolderArchive,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";

interface ApprovedItem {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  email: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  fileSize: number | null;
}

export default function ExportZipPage() {
  const [approvedItems, setApprovedItems] = useState<ApprovedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const fetchApproved = useCallback(async () => {
    setIsLoading(true);
    setDownloadError("");
    try {
      const res = await fetch("/api/admin/interns?limit=100&photoStatus=APPROVED");
      const data = await res.json();

      if (res.ok && data.interns) {
        const approved: ApprovedItem[] = [];
        data.interns.forEach((intern: any) => {
          if (intern.submission && intern.submission.status === "APPROVED") {
            approved.push({
              id: intern.submission.id,
              employeeId: intern.employeeId,
              fullName: intern.fullName,
              department: intern.department,
              email: intern.email,
              submittedAt: intern.submission.submittedAt,
              reviewedAt: intern.submission.reviewedAt,
              reviewedByName: intern.submission.reviewedByName,
              fileSize: intern.submission.fileSize,
            });
          }
        });
        setApprovedItems(approved);
      }
    } catch {
      setDownloadError("Failed to fetch approved photographs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === approvedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(approvedItems.map((item) => item.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const updated = new Set(selectedIds);
    if (updated.has(id)) {
      updated.delete(id);
    } else {
      updated.add(id);
    }
    setSelectedIds(updated);
  };

  // Trigger ZIP download
  const handleDownloadZip = (useSelectedOnly = false) => {
    setIsDownloading(true);
    setDownloadError("");

    let url = "/api/admin/export/zip";
    if (useSelectedOnly && selectedIds.size > 0) {
      const idsArray = Array.from(selectedIds);
      url += `?selectedIds=${encodeURIComponent(JSON.stringify(idsArray))}`;
    }

    // Trigger browser download via hidden anchor
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "CodeXa_ID_Card_Photos_Export.zip");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Official ID Card Photo Export
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Generate and download structured ZIP package with renamed JPEG images, CSV metadata, and README documentation for printing.
          </p>
        </div>

        <button
          onClick={fetchApproved}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Main Download Card */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-rose-500 to-amber-500" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{approvedItems.length} Approved Photographs Ready for Export</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              Complete Official Printing Archive (ZIP)
            </h2>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              Downloads a verified ZIP package where every image is automatically renamed to its official Intern ID (<code className="text-rose-400 font-mono">CXA-INT-2026-xxx.jpg</code>), bundled with <code className="text-zinc-300">interns.csv</code> and export audit documentation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {/* Primary Action Button */}
            <button
              onClick={() => handleDownloadZip(false)}
              disabled={isDownloading || approvedItems.length === 0}
              className="px-8 py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-rose-600 via-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-xl shadow-rose-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2.5"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Preparing ZIP Stream...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>DOWNLOAD ALL APPROVED PHOTOS (ZIP)</span>
                </>
              )}
            </button>

            {/* Custom Batch Download Button */}
            {selectedIds.size > 0 && (
              <button
                onClick={() => handleDownloadZip(true)}
                disabled={isDownloading}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-rose-900/50 transition-colors flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Download Selected ({selectedIds.size}) Photos (ZIP)</span>
              </button>
            )}
          </div>
        </div>

        {downloadError && (
          <div className="mt-4 p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}
      </div>

      {/* Package Structure Specification Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* images/ directory */}
        <div className="bg-[#0b0d13] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2.5 mb-2 text-rose-400 font-bold text-sm">
            <FolderArchive className="w-5 h-5" />
            <span>images/</span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Contains all high-resolution approved photographs named deterministically as <code className="text-zinc-200 font-mono">&lt;INTERN_ID&gt;.jpg</code>. Unapproved and rejected photos are excluded.
          </p>
        </div>

        {/* interns.csv */}
        <div className="bg-[#0b0d13] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2.5 mb-2 text-emerald-400 font-bold text-sm">
            <FileSpreadsheet className="w-5 h-5" />
            <span>interns.csv</span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            UTF-8 RFC-4180 CSV mapping Intern ID, Full Name, Department, Email, Photo Filename, and relative image path for easy automated batch printing in ID card software.
          </p>
        </div>

        {/* README.txt */}
        <div className="bg-[#0b0d13] border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center space-x-2.5 mb-2 text-amber-400 font-bold text-sm">
            <FileText className="w-5 h-5" />
            <span>README.txt</span>
          </div>
          <p className="text-zinc-400 text-xs leading-relaxed">
            Generation timestamp, exporting administrator identity, total approved records, archive structure, and official data privacy guidelines.
          </p>
        </div>
      </div>

      {/* Approved Photos Table with Selection */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#12151f]">
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-bold text-rose-400 hover:text-rose-300"
            >
              {selectedIds.size === approvedItems.length && approvedItems.length > 0
                ? "Deselect All"
                : "Select All"}
            </button>
            <span className="text-xs text-zinc-500">
              ({selectedIds.size} of {approvedItems.length} selected)
            </span>
          </div>

          <div className="text-xs text-zinc-400">
            Naming Rule: <span className="font-mono text-white font-bold">&lt;INTERN_ID&gt;.jpg</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090b10] text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === approvedItems.length && approvedItems.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded accent-rose-500"
                  />
                </th>
                <th className="py-3 px-4">Intern ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Target Export Filename</th>
                <th className="py-3 px-4">Reviewed By</th>
                <th className="py-3 px-4 text-right">Individual Photo</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                    Loading approved records...
                  </td>
                </tr>
              ) : approvedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No approved photographs found yet. Review and approve submitted photos on the dashboard or photo gallery.
                  </td>
                </tr>
              ) : (
                approvedItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const exportFilename = `${item.employeeId.replace(/[^a-zA-Z0-9_-]/g, "_")}.jpg`;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#12151f]/60 transition-colors ${
                        isChecked ? "bg-rose-950/20" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(item.id)}
                          className="rounded accent-rose-500"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-rose-400">
                        {item.employeeId}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">{item.fullName}</span>
                        <div className="text-[10px] text-zinc-500 font-mono">{item.email}</div>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-300">{item.department}</td>

                      <td className="py-3.5 px-4 font-mono text-zinc-200">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]">
                          images/{exportFilename}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-zinc-400">
                        {item.reviewedByName || "Administrator"}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <a
                          href={`/api/admin/photos/preview/${item.id}`}
                          target="_blank"
                          rel="noreferrer"
                          download={exportFilename}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                        >
                          <Download className="w-3 h-3 text-rose-400" />
                          <span>JPEG</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
