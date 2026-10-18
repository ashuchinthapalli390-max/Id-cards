import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        { authenticated: false, error: "Not authenticated or unauthorized." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: admin,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/me Error]", err);
    return NextResponse.json(
      { authenticated: false, error: "Authentication verification failed." },
      { status: 500 }
    );
  }
}
