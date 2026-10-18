import { NextRequest, NextResponse } from "next/server";
import { PassThrough } from "stream";
import archiver from "archiver";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadProtectedPhotoBuffer } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Escapes a CSV value according to RFC-4180 and guards against CSV formula injection.
 */
function escapeCsvValue(val: string | null | undefined): string {
  if (val == null) return '""';
  let s = String(val).trim();

  // CSV Formula Injection mitigation: If cell begins with =, +, -, @, or tab/CR, prepend apostrophe
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }

  // Escape double quotes by doubling them
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Normalizes an official Intern ID for safe filenames.
 * CXA-INT-2026-001 -> CXA-INT-2026-001.jpg
 */
function getPhotoFilename(employeeId: string): string {
  const safeId = employeeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeId}.jpg`;
}

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized access to photo export." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const selectedIdsParam = searchParams.get("selectedIds");
  let selectedIds: string[] = [];
  if (selectedIdsParam) {
    try {
      selectedIds = JSON.parse(selectedIdsParam);
    } catch {
      selectedIds = selectedIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  try {
    // 1. Query approved photo submissions
    const whereClause: any = {
      status: "APPROVED",
    };

    if (selectedIds.length > 0) {
      whereClause.id = { in: selectedIds };
    }

    const approvedSubmissions = await db.idCardPhotoSubmission.findMany({
      where: whereClause,
      include: {
        user: {
          include: {
            employmentProfile: true,
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    });

    if (approvedSubmissions.length === 0) {
      return NextResponse.json(
        { error: "No approved photographs are currently ready for export." },
        { status: 404 }
      );
    }

    // 2. Prepare date and metadata
    const now = new Date();
    // Format in IST (Asia/Kolkata)
    const istDateString = now.toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    }); // YYYY-MM-DD
    const istTimeString = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    }); // HH:MM:SS

    const zipFilename = `CodeXa_ID_Photos_${istDateString}_IST.zip`;

    // 3. Create archiver and passthrough stream
    const archive = archiver("zip", {
      zlib: { level: 6 }, // standard compression
    });

    const stream = new PassThrough();
    archive.pipe(stream);

    // Prepare CSV rows and README content
    const csvHeader = [
      "Intern ID",
      "Full Name",
      "Department",
      "Email",
      "Photo Filename",
      "Photo Relative Path",
      "Upload Date",
      "Approval Status",
    ].join(",");

    const csvRows: string[] = [csvHeader];
    let successfulPhotoCount = 0;

    // Collect images in parallel with controlled concurrency
    const validExportEntries: Array<{
      employeeId: string;
      fullName: string;
      department: string;
      email: string;
      photoFilename: string;
      photoRelativePath: string;
      uploadDate: string;
      buffer: Buffer;
    }> = [];

    for (const sub of approvedSubmissions) {
      const ep = sub.user.employmentProfile;
      const employeeId = ep?.employeeId || `CXA-INT-${sub.user.id.slice(-4)}`;
      const fullName = sub.user.fullName || sub.user.username;
      const dept = ep?.department || ep?.academicBranch || sub.user.department || "Engineering";
      const email = sub.user.email;
      const photoFilename = getPhotoFilename(employeeId);
      const photoRelativePath = `images/${photoFilename}`;
      const uploadDate = sub.submittedAt
        ? new Date(sub.submittedAt).toISOString().split("T")[0]
        : istDateString;

      // Download buffer from storage
      const { buffer, error } = await downloadProtectedPhotoBuffer(
        sub.storagePath,
        sub.storageBucket || "id-card-photos"
      );

      if (buffer && buffer.length > 0) {
        validExportEntries.push({
          employeeId,
          fullName,
          department: dept,
          email,
          photoFilename,
          photoRelativePath,
          uploadDate,
          buffer,
        });

        csvRows.push(
          [
            escapeCsvValue(employeeId),
            escapeCsvValue(fullName),
            escapeCsvValue(dept),
            escapeCsvValue(email),
            escapeCsvValue(photoFilename),
            escapeCsvValue(photoRelativePath),
            escapeCsvValue(uploadDate),
            escapeCsvValue("APPROVED"),
          ].join(",")
        );

        successfulPhotoCount++;
      } else {
        console.warn(`[ZIP Export] Skipped photo for ${employeeId} due to storage download failure:`, error);
      }
    }

    if (validExportEntries.length === 0) {
      return NextResponse.json(
        { error: "Could not retrieve the photograph files from private storage." },
        { status: 502 }
      );
    }

    // 4. Append images/ to archive
    for (const entry of validExportEntries) {
      archive.append(entry.buffer, { name: entry.photoRelativePath });
    }

    // 5. Append interns.csv
    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel compatibility
    archive.append(csvContent, { name: "interns.csv" });

    // 6. Append README.txt
    const readmeContent = `CODEXA AGENCY
OFFICIAL INTERN ID CARD PHOTO EXPORT

Export Date: ${istDateString}
Export Time: ${istTimeString} IST
Exported By: ${admin.fullName || admin.username} (${admin.effectiveRole})
Total Approved Photos: ${successfulPhotoCount}
Total CSV Records: ${successfulPhotoCount}

ARCHIVE STRUCTURE

images/
  Contains approved photographs named by official Intern ID.

interns.csv
  Contains intern details and image mappings (UTF-8 encoded).

README.txt
  Contains export documentation and generation audit metadata.

IMAGE NAMING RULE
<INTERN_ID>.jpg

IMAGE FORMAT
JPEG

NOTES
All exported photographs were reviewed and approved through the official
CodeXa ID Card Photo Collection Portal (https://id.codxa-agency.online).

DATA HANDLING & PRIVACY
Contains sensitive personal identification information.
Store securely in accordance with CodeXa Agency data security protocols.
Share only with authorized personnel for ID card printing operations.
`.trim();

    archive.append(readmeContent, { name: "README.txt" });

    // Finalize archive in background
    archive.finalize().catch((err) => {
      console.error("[archive.finalize error]", err);
    });

    // 7. Audit log export action
    await logAuditEvent({
      actorId: admin.id,
      actorName: admin.fullName || admin.username,
      actorRole: admin.effectiveRole,
      action: "ZIP_EXPORT_DOWNLOADED",
      details: {
        totalPhotosExported: successfulPhotoCount,
        selectedIdsCount: selectedIds.length,
        zipFilename,
      },
      req: request,
    });

    return new Response(stream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipFilename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: any) {
    console.error("[GET /api/admin/export/zip Error]", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating the ZIP archive." },
      { status: 500 }
    );
  }
}
