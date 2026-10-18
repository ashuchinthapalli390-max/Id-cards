"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  actorType: "ADMIN" | "INTERN" | "SYSTEM";
  action: string;
  targetInternId: string | null;
  targetInternName: string | null;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "30",
        action: actionFilter,
      });

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.logs) {
        setLogs(data.logs);
        setTotalPages(data.pagination.totalPages);
        setTotalCount(data.pagination.totalCount);
      }
    } catch (err) {
      console.error("fetchLogs error", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "ADMIN_LOGIN":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/70 text-blue-300 border border-blue-800/40">
            LOGIN
          </span>
        );
      case "INVITATION_GENERATED":
      case "BULK_INVITATIONS_GENERATED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950/70 text-purple-300 border border-purple-800/40">
            LINK_GEN
          </span>
        );
      case "PHOTO_SUBMITTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/40">
            SUBMITTED
          </span>
        );
      case "PHOTO_APPROVED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
            APPROVED
          </span>
        );
      case "PHOTO_REJECTED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/40">
            REJECTED
          </span>
        );
      case "ZIP_EXPORT_DOWNLOADED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/40">
            EXPORT_ZIP
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Security & Compliance Audit Logs
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1">
            Immutable tracking of administrator logins, token generations, photo submissions, reviews, and ZIP downloads.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-[#12151f] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="ADMIN_LOGIN">Admin Logins</option>
            <option value="INVITATION_GENERATED">Single Link Generated</option>
            <option value="BULK_INVITATIONS_GENERATED">Bulk Links Generated</option>
            <option value="INVITATION_EMAIL_SENT">Emails Sent</option>
            <option value="PHOTO_SUBMITTED">Photo Submissions</option>
            <option value="PHOTO_APPROVED">Photo Approvals</option>
            <option value="PHOTO_REJECTED">Photo Rejections</option>
            <option value="ZIP_EXPORT_DOWNLOADED">ZIP Exports</option>
          </select>
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          Total Recorded: <span className="text-white font-bold">{totalCount}</span> events
        </span>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0e1117] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#12151f] text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
              <tr>
                <th className="py-3 px-4">Timestamp (IST)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Intern</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4">IP Address</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono">
                    Loading audit events...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#12151f]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      {new Date(log.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.actorName || "System"}</div>
                      {log.actorRole && (
                        <span className="text-[10px] text-rose-400 font-bold uppercase block">
                          {log.actorRole}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">{renderActionBadge(log.action)}</td>

                    <td className="py-3 px-4">
                      {log.targetInternId ? (
                        <div>
                          <span className="font-mono font-bold text-rose-400">
                            {log.targetInternId}
                          </span>
                          {log.targetInternName && (
                            <div className="text-[10px] text-zinc-400">{log.targetInternName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      {log.details ? (
                        <pre className="text-[10px] font-mono text-zinc-400 truncate bg-zinc-950 p-1.5 rounded border border-zinc-800">
                          {JSON.stringify(log.details)}
                        </pre>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-500">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  );
}
