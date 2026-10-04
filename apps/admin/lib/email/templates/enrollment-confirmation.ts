/**
 * RMS Careers — Enrollment Confirmation Email Template
 *
 * Brand identity: RMS Careers (Rising Minds Solutions)
 * Brand colors: Navy #1a1a6e | Blue #2563eb | Purple #7c3aed
 *
 * Logo delivery:
 *   Reads EMAIL_LOGO_URL from environment. Set this to the absolute public URL of
 *   /rms-logo.jpg after deployment (e.g. https://your-domain.com/rms-logo.jpg).
 *   If unset, the <img> is omitted and the text wordmark is displayed instead —
 *   so the email remains fully functional locally or before deployment.
 *
 * Compatibility:
 *   - Table-based layout (Outlook safe)
 *   - Inline CSS only
 *   - No external web fonts (system font stack)
 *   - No JavaScript
 *   - Alt text on all images
 */

export interface EnrollmentConfirmationEmailData {
  studentName: string;
  studentEmail: string;
  programName: string;
  programCode: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status: string;
}

function formatDate(d?: Date | string | null): string {
  if (!d) return 'To be announced';
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return 'To be announced';
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    }).format(date);
  } catch {
    return 'To be announced';
  }
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function statusColors(status: string): { bg: string; color: string; border: string } {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return { bg: '#ecfdf5', color: '#065f46', border: '#6ee7b7' };
    case 'waitlisted':
      return { bg: '#fff7ed', color: '#9a3412', border: '#fdba74' };
    case 'cancelled':
      return { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' };
    default: // pending
      return { bg: '#eff6ff', color: '#1e3a8a', border: '#93c5fd' };
  }
}

export function renderEnrollmentConfirmationEmail(data: EnrollmentConfirmationEmailData) {
  const subject = `Registration Received — ${data.programName}`;

  const logoUrl = process.env.EMAIL_LOGO_URL || '';
  const enrollmentDate = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(new Date());

  const { bg: statusBg, color: statusColor, border: statusBorder } = statusColors(data.status);
  const statusLabel = formatStatus(data.status);

  // ─── HTML (table-based, inline CSS, email-client safe) ───────────────────
  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer wrapper -->
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f4f8;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Email card -->
        <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dde3ec;">

          <!-- ── HEADER ─────────────────────────────────────────────────── -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a6e 0%,#2563eb 60%,#7c3aed 100%);padding:28px 32px;text-align:center;">
              ${logoUrl
                ? `<img src="${logoUrl}" alt="RMS Careers" width="180" height="auto"
                    style="display:block;margin:0 auto 0 auto;max-width:180px;height:auto;">`
                : `<div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.04em;line-height:1.2;">
                    RMS<span style="color:#93c5fd;">CAREERS</span>
                  </div>
                  <div style="color:#bfdbfe;font-size:12px;letter-spacing:0.12em;margin-top:4px;font-weight:400;">
                    RISING MINDS SOLUTIONS
                  </div>`
              }
            </td>
          </tr>

          <!-- ── STATUS BANNER ─────────────────────────────────────────── -->
          <tr>
            <td style="background-color:#1e3a8a;padding:12px 32px;text-align:center;">
              <span style="color:#bfdbfe;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">
                Registration Received
              </span>
            </td>
          </tr>

          <!-- ── MAIN CONTENT ───────────────────────────────────────────── -->
          <tr>
            <td style="padding:36px 32px 28px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a;line-height:1.3;">
                Hello ${data.studentName},
              </p>
              <p style="margin:0 0 28px 0;font-size:15px;color:#475569;line-height:1.6;">
                Thank you for registering with <strong style="color:#1e3a8a;">RMS Careers</strong>.
                Your enrollment for <strong style="color:#0f172a;">${data.programName}</strong> has been
                successfully recorded.
              </p>

              <!-- Status badge block -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                style="background-color:${statusBg};border:1px solid ${statusBorder};border-radius:6px;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;">
                          Registration Status
                        </td>
                        <td align="right">
                          <span style="display:inline-block;background-color:${statusBg};color:${statusColor};border:1px solid ${statusBorder};font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:3px 12px;border-radius:20px;">
                            ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Program details card -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                style="border:1px solid #e2e8f0;border-radius:6px;margin-bottom:28px;overflow:hidden;">

                <!-- Card header -->
                <tr>
                  <td colspan="2" style="background-color:#f8fafc;padding:10px 20px;border-bottom:1px solid #e2e8f0;">
                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;">
                      Program Details
                    </span>
                  </td>
                </tr>

                <!-- Program -->
                <tr>
                  <td style="padding:12px 20px 6px 20px;font-size:13px;color:#64748b;width:45%;vertical-align:top;">Program</td>
                  <td style="padding:12px 20px 6px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;vertical-align:top;">${data.programName}</td>
                </tr>

                <!-- Divider -->
                <tr><td colspan="2" style="border-top:1px solid #f1f5f9;padding:0;"></td></tr>

                <!-- Code -->
                <tr>
                  <td style="padding:8px 20px;font-size:13px;color:#64748b;vertical-align:top;">Program Code</td>
                  <td style="padding:8px 20px;font-size:13px;font-weight:600;font-family:Consolas,Monaco,'Courier New',monospace;color:#2563eb;text-align:right;vertical-align:top;">${data.programCode}</td>
                </tr>

                <!-- Divider -->
                <tr><td colspan="2" style="border-top:1px solid #f1f5f9;padding:0;"></td></tr>

                <!-- Registration Date -->
                <tr>
                  <td style="padding:8px 20px;font-size:13px;color:#64748b;vertical-align:top;">Registration Date</td>
                  <td style="padding:8px 20px;font-size:13px;font-weight:600;color:#0f172a;text-align:right;vertical-align:top;">${enrollmentDate}</td>
                </tr>

                <!-- Divider -->
                <tr><td colspan="2" style="border-top:1px solid #f1f5f9;padding:0;"></td></tr>

                <!-- Status -->
                <tr>
                  <td style="padding:8px 20px 12px 20px;font-size:13px;color:#64748b;vertical-align:middle;">Status</td>
                  <td style="padding:8px 20px 12px 20px;text-align:right;vertical-align:middle;">
                    <span style="display:inline-block;background-color:${statusBg};color:${statusColor};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:2px 10px;border-radius:20px;border:1px solid ${statusBorder};">
                      ${statusLabel}
                    </span>
                  </td>
                </tr>

              </table>

              <!-- Info notice -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
                style="border-left:3px solid #2563eb;background-color:#eff6ff;border-radius:0 4px 4px 0;margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;color:#1e3a8a;line-height:1.6;">
                    Your registration has been successfully recorded. Our team will review your enrollment
                    and reach out if any further information is required.
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                Warm regards,<br>
                <strong style="color:#0f172a;">RMS Careers Team</strong><br>
                <span style="color:#94a3b8;font-size:13px;">Rising Minds Solutions</span>
              </p>

            </td>
          </tr>

          <!-- ── FOOTER ──────────────────────────────────────────────────── -->
          <tr>
            <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#334155;">RMS Careers</p>
              <p style="margin:0 0 12px 0;font-size:12px;color:#94a3b8;">Career-focused learning and training</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;line-height:1.5;">
                This is an automated email. Please do not reply directly to this message.<br>
                © ${new Date().getFullYear()} RMS Careers — Rising Minds Solutions. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Email card -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;

  // ─── Plain-text fallback ──────────────────────────────────────────────────
  const text = `
RMS CAREERS — Rising Minds Solutions
Registration Received

Hello ${data.studentName},

Thank you for registering with RMS Careers.
Your enrollment for ${data.programName} has been successfully recorded.

PROGRAM DETAILS
───────────────────────────────────
Program         : ${data.programName}
Program Code    : ${data.programCode}
Registration    : ${enrollmentDate}
Status          : ${statusLabel}
───────────────────────────────────

Your registration has been received and is currently ${statusLabel.toLowerCase()}.
Our team will review your enrollment and reach out if any further information is required.

Warm regards,
RMS Careers Team
Rising Minds Solutions

---
This is an automated email. Please do not reply directly to this message.
© ${new Date().getFullYear()} RMS Careers — Rising Minds Solutions
`.trim();

  return { subject, html, text };
}
