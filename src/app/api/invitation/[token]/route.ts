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

    // 1. Check if the intern has already submitted their photo
    const latestSubmission = invitation.user.idCardSubmissions[0];
    const isAlreadySubmitted =
      invitation.status === "SUBMITTED" ||
      (latestSubmission && latestSubmission.status !== "REJECTED");

    if (isAlreadySubmitted) {
      return NextResponse.json(
        {
          valid: true,
          reason: "ALREADY_SUBMITTED",
          isAlreadySubmitted: true,
          submissionStatus: latestSubmission?.status || "SUBMITTED",
          submittedAt: invitation.submittedAt || latestSubmission?.submittedAt,
          rejectionReason: latestSubmission?.rejectionReason || null,
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
        { status: 200 }
      );
    }

    // 2. If intern has not submitted yet, ensure the link is active and validity extended
    // Deadline is extended through October 19, 2026 and well beyond (30 days)
    const minDeadline = new Date("2026-10-19T23:59:59.999Z");
    const safeExpiry = new Date(Math.max(Date.now() + 30 * 24 * 60 * 60 * 1000, minDeadline.getTime()));

    if (invitation.status !== "ACTIVE" || invitation.expiresAt < minDeadline) {
      await db.idCardInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACTIVE",
          expiresAt: safeExpiry,
          revokedAt: null,
          revokedBy: null,
        },
      });
      invitation.status = "ACTIVE";
      invitation.expiresAt = safeExpiry;
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
