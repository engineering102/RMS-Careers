export interface EnrollmentConfirmationEmailData {
  studentName: string;
  studentEmail: string;
  programName: string;
  programCode: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status: string;
}

export function renderEnrollmentConfirmationEmail(data: EnrollmentConfirmationEmailData) {
  const subject = `Registration Received — ${data.programName}`;

  const formatDate = (d?: Date | string | null) => {
    if (!d) return 'To be announced';
    try {
      return new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'To be announced';
    }
  };

  const startDateFormatted = formatDate(data.startDate);
  const endDateFormatted = formatDate(data.endDate);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #0f172a;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.025em;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .intro {
      font-size: 15px;
      color: #334155;
      margin-bottom: 24px;
    }
    .details-card {
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .details-card h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px border-dashed #cbd5e1;
      font-size: 14px;
    }
    .detail-label {
      color: #64748b;
    }
    .detail-value {
      font-weight: 600;
      color: #0f172a;
    }
    .status-badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      font-weight: 600;
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .notice {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 12px 16px;
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 24px;
      border-radius: 0 4px 4px 0;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 20px 24px;
      font-size: 13px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Academy Enrollment</h1>
    </div>
    <div class="content">
      <div class="greeting">Hello ${data.studentName},</div>
      <div class="intro">
        Your registration for <strong>${data.programName}</strong> has been successfully received.
      </div>

      <div class="details-card">
        <h3>Program Registration Details</h3>
        <table width="100%" border="0" datetime="now" style="font-size: 14px; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Program:</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${data.programName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Program Code:</td>
            <td style="padding: 6px 0; font-family: monospace; text-align: right; color: #0f172a;">${data.programCode}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Start Date:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a;">${startDateFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">End Date:</td>
            <td style="padding: 6px 0; text-align: right; color: #0f172a;">${endDateFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #64748b;">Registration Status:</td>
            <td style="padding: 6px 0; text-align: right;">
              <span class="status-badge">Pending</span>
            </td>
          </tr>
        </table>
      </div>

      <div class="notice">
        Your registration has been received and is currently pending. Further instructions will be shared by the academy if required.
      </div>

      <p style="font-size: 14px; margin-bottom: 0;">
        Best regards,<br>
        <strong>Academy Enrollment Team</strong>
      </p>
    </div>
    <div class="footer">
      This is an automated registration acknowledgement. Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hello ${data.studentName},

Your registration for ${data.programName} has been successfully received.

PROGRAM REGISTRATION DETAILS
----------------------------------
Program: ${data.programName}
Program Code: ${data.programCode}
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
Registration Status: Pending

Your registration has been received and is currently pending. Further instructions will be shared by the academy if required.

Best regards,
Academy Enrollment Team
  `.trim();

  return { subject, html, text };
}
