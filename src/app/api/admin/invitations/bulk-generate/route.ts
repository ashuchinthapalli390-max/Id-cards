import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  generateSecureToken,
  hashToken,
  calculateExpiryDate,
  buildUploadUrl,
} from "@/lib/tokens";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { internIds, allPending = true, expiryDays = 7, forceRegenerate = false } = body;

    const now = new Date();

    // Find candidate interns
    let internQuery: any = {
      role: "INTERN",
      isActive: true,
    };

    if (Array.isArray(internIds) && internIds.length > 0) {
      internQuery.id = { in: internIds };
    }

    const interns = await db.user.findMany({
      where: internQuery,
      include: {
        employmentProfile: true,
        idCardInvitations: {
          where: { status: "ACTIVE", expiresAt: { gt: now } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        idCardSubmissions: {
          where: { status: "APPROVED" },
          take: 1,
        },
      },
    });

    const generatedResults: Array<{
      userId: string;
      fullName: string;
      employeeId: string;
      email: string;
      phone: string | null;
      uploadUrl: string;
      rawToken: string;
      expiresAt: Date;
      isNew: boolean;
    }> = [];

    const expiresAt = calculateExpiryDate(Math.max(expiryDays, 30));

    for (const intern of interns) {
      const ep = intern.employmentProfile;
      const employeeId = ep?.employeeId || `CXA-INT-${intern.id.slice(-4)}`;

      // Skip if already approved and not forced
      if (intern.idCardSubmissions.length > 0 && !forceRegenerate) {
        continue;
      }

      // Check if already has active valid invitation
      const existingActive = intern.idCardInvitations[0];
      if (existingActive && !forceRegenerate) {
        // Active invitation already exists, skip to preserve idempotency
        continue;
      }

      // Generate secure token
      const rawToken = generateSecureToken();
      const tokenHash = hashToken(rawToken);

      const invitation = await db.idCardInvitation.create({
        data: {
          userId: intern.id,
          tokenHash,
          status: "ACTIVE",
          expiresAt,
          createdBy: admin.id,
          createdByName: admin.fullName || admin.username,
        },
      });

      const uploadUrl = buildUploadUrl(rawToken);

      generatedResults.push({
        userId: intern.id,
        fullName: intern.fullName || intern.username,
        employeeId,
        email: intern.email,
        phone: intern.phone || ep?.phone || null,
        uploadUrl,
        rawToken,
        expiresAt: invitation.expiresAt,
        isNew: true,
      });
    }

    // Audit log
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "BULK_INVITATIONS_GENERATED",
      details: {
        totalGenerated: generatedResults.length,
        candidateInternsCount: interns.length,
        forceRegenerate,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      totalGenerated: generatedResults.length,
      invitations: generatedResults,
      message: `Successfully generated ${generatedResults.length} secure invitation links.`,
    });
  } catch (err: any) {
    console.error("[POST /api/admin/invitations/bulk-generate Error]", err);
    return NextResponse.json(
      { error: "Failed to perform bulk link generation." },
      { status: 500 }
    );
  }
}
