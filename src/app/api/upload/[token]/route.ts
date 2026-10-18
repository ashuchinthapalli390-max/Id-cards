import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { validateImageBuffer } from "@/lib/image-validator";
import { uploadInternPhotoToPrivateStorage } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const rawToken = params.token;

  if (!rawToken || typeof rawToken !== "string" || rawToken.trim().length < 16) {
    return NextResponse.json(
      { success: false, error: "Invalid invitation token." },
      { status: 400 }
    );
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  try {
    // 1. Validate invitation token
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
        { success: false, error: "Invitation not found or has been revoked." },
        { status: 404 }
      );
    }

    if (invitation.status === "REVOKED") {
      return NextResponse.json(
        { success: false, error: "This invitation link was revoked by administration." },
        { status: 410 }
      );
    }

    if (invitation.expiresAt < now || invitation.status === "EXPIRED") {
      return NextResponse.json(
        { success: false, error: "This invitation link has expired." },
        { status: 410 }
      );
    }

    if (invitation.status === "SUBMITTED") {
      return NextResponse.json(
        {
          success: false,
          error: "You have already submitted an ID card photograph. If you need to re-upload, please ask an administrator to reopen your submission.",
        },
        { status: 409 }
      );
    }

    // 2. Extract uploaded file from FormData
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No photo file provided." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Server-side content-based image validation
    const validation = validateImageBuffer(buffer);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid image." },
        { status: 400 }
      );
    }

    const internId =
      invitation.user.employmentProfile?.employeeId ||
      `CXA-INT-${invitation.user.id.slice(-6).toUpperCase()}`;

    // 4. Compute file hash
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // Check version
    const previousSubmission = invitation.user.idCardSubmissions[0];
    const version = (previousSubmission?.version || 0) + 1;

    // 5. Upload to private Supabase storage
    const uploadResult = await uploadInternPhotoToPrivateStorage(
      internId,
      buffer,
      validation.mimeType || "image/jpeg",
      version
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || "Failed to store image." },
        { status: 500 }
      );
    }

    // 6. Record submission in PostgreSQL
    const submissionId = `cxa_id_sub_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const storagePath = uploadResult.storagePath;

    await db.$transaction(async (tx) => {
      // Create new photo submission record
      await tx.idCardPhotoSubmission.create({
        data: {
          id: submissionId,
          userId: invitation.userId,
          invitationId: invitation.id,
          storagePath,
          imageUrl: storagePath, // Stored safely as path; authenticated proxy used for display
          mimeType: validation.mimeType || "image/jpeg",
          fileSize: validation.fileSizeBytes,
          width: validation.width || null,
          height: validation.height || null,
          version,
          status: "SUBMITTED",
          storageBucket: uploadResult.storageBucket,
          sha256Hash,
          originalFilename: file.name.slice(0, 100),
          submittedAt: now,
        },
      });

      // Mark invitation as submitted
      await tx.idCardInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "SUBMITTED",
          submittedAt: now,
        },
      });
    });

    // 7. Audit log event
    await logAuditEvent({
      actorId: invitation.userId,
      actorName: invitation.user.fullName || internId,
      actorType: "INTERN",
      action: "PHOTO_SUBMITTED",
      targetInternId: internId,
      targetInternName: invitation.user.fullName,
      details: {
        submissionId,
        version,
        fileSizeBytes: validation.fileSizeBytes,
        dimensions: `${validation.width}x${validation.height}`,
      },
      req: request,
    });

    return NextResponse.json({
      success: true,
      submissionId,
      employeeId: internId,
      fullName: invitation.user.fullName,
      status: "SUBMITTED",
      message: "Photograph submitted successfully.",
    });
  } catch (err: any) {
    console.error("[POST /api/upload/[token] Error]", err);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred while processing your upload." },
      { status: 500 }
    );
  }
}
