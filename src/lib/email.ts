import { Resend } from "resend";
import { db } from "./db";

let resendInstance: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendInstance) {
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export interface SendInvitationEmailParams {
  internName: string;
  internId: string;
  recipientEmail: string;
  uploadUrl: string;
  invitationId?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Sends a personalized ID card submission email to an intern via Resend.
 */
export async function sendInternInvitationEmail({
  internName,
  internId,
  recipientEmail,
  uploadUrl,
  invitationId,
}: SendInvitationEmailParams): Promise<EmailSendResult> {
  const resend = getResendClient();
  if (!resend) {
    const err = "Resend API key is not configured in environment.";
    if (invitationId) {
      await db.idCardInvitation.update({
        where: { id: invitationId },
        data: { emailStatus: "FAILED", emailError: err },
      }).catch(() => {});
    }
    return { success: false, error: err };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "CodeXa Agency <contact@codxa-agency.online>";
  const subject = `CodeXa Agency | Submit Your ID Card Photograph (${internId})`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08090c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090c; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #0f1117; border: 1px solid #27272a; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #171b26 0%, #10121a 100%); border-bottom: 2px solid #e11d48;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #e11d48; text-transform: uppercase;">Official Portal</span>
                    <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">CODEXA AGENCY</h1>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(225, 29, 72, 0.15); border: 1px solid rgba(225, 29, 72, 0.3); border-radius: 6px; font-size: 12px; font-weight: 600; color: #fb7185;">
                      ID CARD 2026
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 19px; color: #ffffff; font-weight: 700;">
                Dear ${internName},
              </h2>

              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                Your official CodeXa Agency ID card photograph submission link is ready.
              </p>

              <!-- Intern Verified Details Card -->
              <table width="100%" style="background-color: #171a23; border: 1px solid #27272a; border-radius: 8px; margin: 0 0 24px; padding: 16px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #a1a1aa; width: 35%;">Intern ID:</td>
                  <td style="padding: 6px 12px; font-size: 14px; color: #ffffff; font-weight: 700; font-family: monospace;">${internId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #a1a1aa;">Full Name:</td>
                  <td style="padding: 6px 12px; font-size: 14px; color: #ffffff; font-weight: 600;">${internName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #a1a1aa;">Verification:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #34d399; font-weight: 600;">✓ Verified Registered Intern</td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Please click the button below to open your personal submission link. <strong>No password or login is required</strong>. Your identity and Intern ID are already verified.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${uploadUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 14px rgba(225, 29, 72, 0.4); text-align: center;">
                      Upload Your ID Card Photo &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Requirements Checklist -->
              <div style="background-color: #12151d; border-left: 3px solid #e11d48; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Photo Requirements</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #d4d4d8;">
                  <li>Clear, passport-style portrait (facing forward).</li>
                  <li>Plain, light, or clean solid background.</li>
                  <li>Good lighting with visible face (no hats or sunglasses).</li>
                  <li>JPG or PNG format, up to 5 MB.</li>
                </ul>
              </div>

              <!-- Security Warning -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; border-top: 1px solid #1f2430; padding-top: 16px;">
                🔒 <strong>Confidentiality Notice:</strong> This is your personalized secure link. Do not forward or share this link with others.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b0d12; border-top: 1px solid #1f2430; font-size: 12px; color: #71717a; text-align: center;">
              &copy; 2026 CodeXa Agency. All rights reserved.<br>
              Official Subdomain: <a href="https://id.codxa-agency.online" style="color: #e11d48; text-decoration: none;">id.codxa-agency.online</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
    });

    if (response.error) {
      console.error("[sendInternInvitationEmail Error]", response.error);
      if (invitationId) {
        await db.idCardInvitation.update({
          where: { id: invitationId },
          data: {
            emailStatus: "FAILED",
            emailError: response.error.message || "Email provider error",
          },
        }).catch(() => {});
      }
      return { success: false, error: response.error.message };
    }

    if (invitationId) {
      await db.idCardInvitation.update({
        where: { id: invitationId },
        data: {
          emailStatus: "SENT",
          emailSentAt: new Date(),
          emailError: null,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (err: any) {
    console.error("[sendInternInvitationEmail Exception]", err);
    if (invitationId) {
      await db.idCardInvitation.update({
        where: { id: invitationId },
        data: { emailStatus: "FAILED", emailError: err.message },
      }).catch(() => {});
    }
    return { success: false, error: err.message || "Network exception sending email" };
  }
}

export interface SendPhotoRejectedEmailParams {
  internName: string;
  internId: string;
  recipientEmail: string;
  uploadUrl: string;
  rejectionReason: string;
}

/**
 * Sends a photo rejection notification email to an intern with their rejection reason
 * and a prominent "Upload Again" button pointing to their permanent personalized link.
 */
export async function sendPhotoRejectedEmail({
  internName,
  internId,
  recipientEmail,
  uploadUrl,
  rejectionReason,
}: SendPhotoRejectedEmailParams): Promise<EmailSendResult> {
  const resend = getResendClient();
  if (!resend) {
    const err = "Resend API key is not configured in environment.";
    console.error("[sendPhotoRejectedEmail] Resend not configured.");
    return { success: false, error: err };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || "CodeXa Agency <contact@codxa-agency.online>";
  const subject = `Action Required: ID Card Photo Rejected - Please Upload Again (${internId})`;

  const safeReason = rejectionReason || "Photograph does not meet official passport framing, background, or lighting standards.";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #08090c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #08090c; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #0f1117; border: 1px solid rgba(225, 29, 72, 0.4); border-radius: 12px; overflow: hidden; box-shadow: 0 10px 35px rgba(225, 29, 72, 0.15);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1c0e14 0%, #10121a 100%); border-bottom: 2px solid #e11d48;">
              <table width="100%">
                <tr>
                  <td>
                    <span style="font-size: 11px; font-weight: 700; letter-spacing: 2px; color: #fb7185; text-transform: uppercase;">Official ID Card Portal</span>
                    <h1 style="margin: 4px 0 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">CODEXA AGENCY</h1>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; background-color: rgba(225, 29, 72, 0.2); border: 1px solid rgba(225, 29, 72, 0.5); border-radius: 6px; font-size: 11px; font-weight: 700; color: #ff4d6d; text-transform: uppercase;">
                      Action Required
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 19px; color: #ffffff; font-weight: 700;">
                Dear ${internName},
              </h2>

              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                Your submitted ID card photograph has been reviewed by the CodeXa Agency administrative committee and <strong>could not be approved</strong> for physical ID card printing.
              </p>

              <!-- Rejection Reason Highlight Box -->
              <div style="background-color: #1a0f14; border: 1px solid rgba(225, 29, 72, 0.4); border-left: 4px solid #e11d48; padding: 18px 20px; border-radius: 8px; margin: 0 0 24px;">
                <p style="margin: 0 0 6px; font-size: 11px; font-weight: 700; color: #fb7185; text-transform: uppercase; letter-spacing: 1px;">
                  Reason for Rejection:
                </p>
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #ffffff; font-weight: 600;">
                  "${safeReason}"
                </p>
              </div>

              <!-- Intern Verified Details -->
              <table width="100%" style="background-color: #171a23; border: 1px solid #27272a; border-radius: 8px; margin: 0 0 24px; padding: 14px;">
                <tr>
                  <td style="padding: 5px 12px; font-size: 13px; color: #a1a1aa; width: 35%;">Official Intern ID:</td>
                  <td style="padding: 5px 12px; font-size: 14px; color: #ffffff; font-weight: 700; font-family: monospace;">${internId}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 12px; font-size: 13px; color: #a1a1aa;">Full Name:</td>
                  <td style="padding: 5px 12px; font-size: 14px; color: #ffffff; font-weight: 600;">${internName}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 12px; font-size: 13px; color: #a1a1aa;">Current Status:</td>
                  <td style="padding: 5px 12px; font-size: 13px; color: #fb7185; font-weight: 600;">⚠️ Resubmission Needed</td>
                </tr>
              </table>

              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                Please click the button below to open your personalized direct upload link and submit a compliant replacement photo immediately. <strong>No login or password required</strong>.
              </p>

              <!-- Upload Again CTA Button -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${uploadUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 800; border-radius: 8px; box-shadow: 0 4px 18px rgba(225, 29, 72, 0.45); letter-spacing: 0.5px; text-transform: uppercase;">
                      Upload Again &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Helpful Tips for Approval -->
              <div style="background-color: #12151d; border-left: 3px solid #3b82f6; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px;">Tips for Instant Approval</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; color: #d4d4d8;">
                  <li>Take a clear, direct-facing passport portrait.</li>
                  <li>Stand in front of a plain wall with good lighting.</li>
                  <li>Ensure no shadows cover your face or eyes.</li>
                  <li>Do not wear hats, caps, masks, or dark sunglasses.</li>
                </ul>
              </div>

              <!-- Direct Link Fallback -->
              <p style="margin: 0 0 16px; font-size: 12px; line-height: 1.5; color: #71717a;">
                Button not working? Copy and paste this exact link into your browser:<br>
                <a href="${uploadUrl}" style="color: #fb7185; word-break: break-all; text-decoration: underline;">${uploadUrl}</a>
              </p>

              <!-- Notice -->
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #71717a; border-top: 1px solid #1f2430; padding-top: 16px;">
                🔒 <strong>Confidentiality Notice:</strong> This direct upload link is uniquely registered to your CodeXa Intern profile.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0b0d12; border-top: 1px solid #1f2430; font-size: 12px; color: #71717a; text-align: center;">
              &copy; 2026 CodeXa Agency. All rights reserved.<br>
              Official Subdomain: <a href="https://id.codxa-agency.online" style="color: #e11d48; text-decoration: none;">id.codxa-agency.online</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
    });

    if (response.error) {
      console.error("[sendPhotoRejectedEmail Error]", response.error);
      return { success: false, error: response.error.message };
    }

    console.log(`[sendPhotoRejectedEmail] Successfully sent rejection email to ${recipientEmail} (ID: ${internId})`);
    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (err: any) {
    console.error("[sendPhotoRejectedEmail Exception]", err);
    return { success: false, error: err.message || "Network exception sending rejection email" };
  }
}

