import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {
    const [
      totalInterns,
      totalInvitations,
      activeInvitations,
      expiredInvitations,
      photosReceived,
      pendingReviews,
      approvedPhotos,
      rejectedPhotos,
    ] = await Promise.all([
      db.user.count({ where: { role: "INTERN" } }),
      db.idCardInvitation.count(),
      db.idCardInvitation.count({
        where: {
          status: "ACTIVE",
          expiresAt: { gt: now },
        },
      }),
      db.idCardInvitation.count({
        where: {
          OR: [
            { status: "EXPIRED" },
            { status: "ACTIVE", expiresAt: { lte: now } },
          ],
        },
      }),
      db.idCardPhotoSubmission.count(),
      db.idCardPhotoSubmission.count({ where: { status: "SUBMITTED" } }),
      db.idCardPhotoSubmission.count({ where: { status: "APPROVED" } }),
      db.idCardPhotoSubmission.count({ where: { status: "REJECTED" } }),
    ]);

    const pendingUploads = Math.max(0, totalInterns - photosReceived);

    return NextResponse.json({
      stats: {
        totalInterns,
        totalInvitations,
        activeInvitations,
        expiredInvitations,
        photosReceived,
        pendingUploads,
        pendingReviews,
        approvedPhotos,
        rejectedPhotos,
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admin/stats Error]", err);
    return NextResponse.json(
      { error: "Failed to fetch live statistics." },
      { status: 500 }
    );
  }
}
