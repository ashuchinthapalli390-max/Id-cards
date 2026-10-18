import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadProtectedPhotoBuffer, getProtectedPhotoSignedUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized access to photo." }, { status: 401 });
  }

  const submissionId = params.id;
  if (!submissionId) {
    return NextResponse.json({ error: "Missing submission ID." }, { status: 400 });
  }

  try {
    const submission = await db.idCardPhotoSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      return NextResponse.json({ error: "Photo submission not found." }, { status: 404 });
    }

    // 1. Download buffer from private storage
    const { buffer, error } = await downloadProtectedPhotoBuffer(
      submission.storagePath,
      submission.storageBucket || "id-card-photos"
    );

    if (buffer) {
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": submission.mimeType || "image/jpeg",
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // 2. Fallback: Short-lived signed URL redirect
    const signedUrl = await getProtectedPhotoSignedUrl(
      submission.storagePath,
      submission.storageBucket || "id-card-photos",
      300
    );

    if (signedUrl) {
      return NextResponse.redirect(signedUrl);
    }

    return NextResponse.json(
      { error: error || "Unable to retrieve photograph." },
      { status: 502 }
    );
  } catch (err: any) {
    console.error("[GET /api/admin/photos/preview Error]", err);
    return NextResponse.json({ error: "Failed to load photo." }, { status: 500 });
  }
}
