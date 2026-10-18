import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, logoutAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();

    if (admin) {
      await logAuditEvent({
        actorId: admin.id,
        actorName: admin.fullName || admin.username,
        actorRole: admin.effectiveRole,
        actorType: "ADMIN",
        action: "ADMIN_LOGOUT",
        req: request,
      });
    }

    await logoutAdmin();

    const response = NextResponse.json({ success: true, message: "Logged out successfully." });
    response.cookies.delete("cxa_id_session");
    return response;
  } catch (err: any) {
    console.error("[POST /api/admin/logout Error]", err);
    return NextResponse.json(
      { success: false, error: "Failed to log out." },
      { status: 500 }
    );
  }
}
