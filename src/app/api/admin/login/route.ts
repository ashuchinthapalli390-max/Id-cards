import { NextRequest, NextResponse } from "next/server";
import {
  authenticateAdminCredentials,
  authenticateMasterKey,
  isValidMasterKey,
  createAdminSession,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth";
import { logAuditEvent, getClientIp, getUserAgent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { masterKey, usernameOrEmail, password } = body;

    let authResult: { user: any; error?: string };

    // 1. Single Master Key login (Direct or password fallback)
    const candidateKey = (masterKey || (password && isValidMasterKey(password) ? password : null) || (!usernameOrEmail && password ? password : null))?.trim();

    if (candidateKey && isValidMasterKey(candidateKey)) {
      authResult = await authenticateMasterKey(candidateKey);
    } else if (usernameOrEmail && password) {
      // 2. Standard credentials check
      authResult = await authenticateAdminCredentials(usernameOrEmail, password);
    } else if (masterKey) {
      authResult = await authenticateMasterKey(masterKey);
    } else {
      return NextResponse.json(
        { success: false, error: "Please enter your Administrator Access Key." },
        { status: 400 }
      );
    }

    const { user, error } = authResult;

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: error || "Authentication failed. Invalid Access Key." },
        { status: 401 }
      );
    }

    // Create session in PostgreSQL
    const ip = getClientIp(request) || undefined;
    const userAgent = getUserAgent(request) || undefined;

    const rawSessionToken = await createAdminSession(user.id, { ip, userAgent });

    // Record audit log
    await logAuditEvent({
      actorId: user.id,
      actorName: user.fullName || user.username,
      actorRole: user.effectiveRole,
      actorType: "ADMIN",
      action: "ADMIN_LOGIN",
      details: {
        method: candidateKey && isValidMasterKey(candidateKey) ? "MASTER_KEY" : "CREDENTIALS",
        role: user.role,
        effectiveRole: user.effectiveRole,
      },
      req: request,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        effectiveRole: user.effectiveRole,
      },
    });

    // Write HttpOnly secure session cookie
    response.cookies.set(SESSION_COOKIE_NAME, rawSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error("[POST /api/admin/login Error]", err);
    return NextResponse.json(
      { success: false, error: "An error occurred during authentication." },
      { status: 500 }
    );
  }
}
