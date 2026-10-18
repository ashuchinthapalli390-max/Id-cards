import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildUploadUrl } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() || "";
  const department = searchParams.get("department")?.trim() || "ALL";
  const invitationFilter = searchParams.get("invitationStatus")?.trim() || "ALL";
  const photoFilter = searchParams.get("photoStatus")?.trim() || "ALL";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
  const sortBy = searchParams.get("sortBy") || "employeeId"; // 'employeeId' | 'name' | 'submission'
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";

  const now = new Date();

  try {
    // 1. Build where query for intern users
    const where: any = {
      role: "INTERN",
    };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        {
          employmentProfile: {
            employeeId: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    if (department !== "ALL") {
      where.employmentProfile = {
        ...(where.employmentProfile || {}),
        department: { equals: department, mode: "insensitive" },
      };
    }

    // Fetch matching interns with their profiles, latest invitations, and latest submissions
    const allMatchingUsers = await db.user.findMany({
      where,
      include: {
        employmentProfile: true,
        idCardInvitations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        idCardSubmissions: {
          orderBy: { version: "desc" },
          take: 1,
        },
      },
      orderBy:
        sortBy === "name"
          ? { fullName: sortOrder }
          : { createdAt: "asc" },
    });

    // Map each intern with computed statuses
    const mappedInterns = allMatchingUsers.map((u) => {
      const ep = u.employmentProfile;
      const employeeId = ep?.employeeId || `CXA-INT-${u.id.slice(-4)}`;
      const dept = ep?.department || ep?.academicBranch || u.department || "Engineering";

      const latestInvitation = u.idCardInvitations[0] || null;
      const latestSubmission = u.idCardSubmissions[0] || null;

      // Compute invitation status
      let invitationStatus: "NOT_GENERATED" | "ACTIVE" | "EXPIRED" | "SUBMITTED" | "REVOKED" = "NOT_GENERATED";
      if (latestInvitation) {
        if (latestInvitation.status === "REVOKED") {
          invitationStatus = "REVOKED";
        } else if (latestInvitation.status === "SUBMITTED") {
          invitationStatus = "SUBMITTED";
        } else if (latestInvitation.expiresAt < now || latestInvitation.status === "EXPIRED") {
          invitationStatus = "EXPIRED";
        } else {
          invitationStatus = "ACTIVE";
        }
      }

      // Compute photo status
      let photoStatus: "NOT_UPLOADED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" = "NOT_UPLOADED";
      if (latestSubmission) {
        if (latestSubmission.status === "APPROVED") {
          photoStatus = "APPROVED";
        } else if (latestSubmission.status === "REJECTED") {
          photoStatus = "REJECTED";
        } else {
          photoStatus = "PENDING_REVIEW";
        }
      }

      return {
        id: u.id,
        employeeId,
        fullName: u.fullName || u.username,
        email: u.email,
        phone: u.phone || ep?.phone || null,
        department: dept,
        academicBranch: ep?.academicBranch || null,
        college: ep?.college || null,
        invitationStatus,
        invitation: latestInvitation
          ? {
              id: latestInvitation.id,
              status: latestInvitation.status,
              expiresAt: latestInvitation.expiresAt,
              emailStatus: latestInvitation.emailStatus,
              emailSentAt: latestInvitation.emailSentAt,
              createdAt: latestInvitation.createdAt,
            }
          : null,
        photoStatus,
        submission: latestSubmission
          ? {
              id: latestSubmission.id,
              status: latestSubmission.status,
              submittedAt: latestSubmission.submittedAt,
              reviewedAt: latestSubmission.reviewedAt,
              reviewedByName: latestSubmission.reviewedByName,
              rejectionReason: latestSubmission.rejectionReason,
              fileSize: latestSubmission.fileSize,
              width: latestSubmission.width,
              height: latestSubmission.height,
              version: latestSubmission.version,
            }
          : null,
      };
    });

    // Apply in-memory filters for invitationStatus and photoStatus (since computed)
    let filtered = mappedInterns;

    if (invitationFilter !== "ALL") {
      filtered = filtered.filter((i) => i.invitationStatus === invitationFilter);
    }

    if (photoFilter !== "ALL") {
      filtered = filtered.filter((i) => i.photoStatus === photoFilter);
    }

    // Sort if needed by employeeId or submission date
    if (sortBy === "employeeId") {
      filtered.sort((a, b) => {
        const numA = parseInt(a.employeeId.replace(/\D/g, "") || "0", 10);
        const numB = parseInt(b.employeeId.replace(/\D/g, "") || "0", 10);
        return sortOrder === "asc" ? numA - numB : numB - numA;
      });
    } else if (sortBy === "submission") {
      filtered.sort((a, b) => {
        const dateA = a.submission?.submittedAt ? new Date(a.submission.submittedAt).getTime() : 0;
        const dateB = b.submission?.submittedAt ? new Date(b.submission.submittedAt).getTime() : 0;
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
    }

    // Pagination
    const totalCount = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    // Get unique departments for filter dropdown
    const allDepartments = Array.from(
      new Set(
        mappedInterns
          .map((i) => i.department)
          .filter(Boolean)
      )
    ).sort();

    return NextResponse.json({
      interns: paginatedItems,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
      departments: allDepartments,
    });
  } catch (err: any) {
    console.error("[GET /api/admin/interns Error]", err);
    return NextResponse.json(
      { error: "Failed to query interns from database." },
      { status: 500 }
    );
  }
}
