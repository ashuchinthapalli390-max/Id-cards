import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "30", 10)));
  const action = searchParams.get("action")?.trim() || "ALL";

  try {
    const where: any = {};
    if (action !== "ALL") {
      where.action = action;
    }

    const [totalCount, logs] = await Promise.all([
      db.idCardAuditLog.count({ where }),
      db.idCardAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admin/audit-logs Error]", err);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs." },
      { status: 500 }
    );
  }
}
