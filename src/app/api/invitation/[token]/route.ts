import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const rawToken = params.token;

  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 16) {
    return NextResponse.json(
      { valid: false, reason: "INVALID_TOKEN", error: "Invalid invitation link." },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  try {
    const invitation = await db.idCardInvitation.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            employmentProfile: true,
            idCardSubmissions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { valid: false, reason: "NOT_FOUND", error: "This invitation link was not found or has been revoked." },
        { status: 404 }
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        { valid: false, reason: "REVOKED", error: "This invitation link has been revoked by CodeXa Agency administration." },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < now || invitation.status === "EXPIRED") {
      return NextResponse.json(
        { valid: false, reason: "EXPIRED", error: "This invitation link has expired. Please contact CodeXa Agency to request a new link." },
        { status: 410 }
      );
    }

    if (invitation.status === "SUBMITTED") {
      const latestSubmission = invitation.user.idCardSubmissions[0];
      return NextResponse.json(
        {
          valid: false,
          reason: "ALREADY_SUBMITTED",
          error: "You have already submitted your official ID card photograph.",
          submittedAt: invitation.submittedAt || latestSubmission?.submittedAt,
          submissionStatus: latestSubmission?.status || "SUBMITTED",
          intern: {
            fullName: invitation.user.fullName,
            employeeId: invitation.user.employmentProfile?.employeeId || "CXA-INT",
          },
        },
        { status: 200 }
      );
    }

    // Invitation is active and valid! Return minimal safe details:
    return NextResponse.json(
      {
        valid: true,
        invitation: {
          id: invitation.id,
          expiresAt: invitation.expiresAt,
        },
        intern: {
          fullName: invitation.user.fullName,
          employeeId: invitation.user.employmentProfile?.employeeId || "CXA-INT",
          department:
            invitation.user.employmentProfile?.department ||
            invitation.user.employmentProfile?.academicBranch ||
            invitation.user.department ||
            "Engineering",
          college: invitation.user.employmentProfile?.college || null,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "Referrer-Policy": "no-referrer",
        },
      }
    );
  } catch (err: any) {
    console.error("[GET /api/invitation/[token] Error]", err?.message);
    return NextResponse.json(
      { valid: false, reason: "SERVER_ERROR", error: "Internal server error validating invitation." },
      { status: 500 }
    );
  }
}
