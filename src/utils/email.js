/**
 * Email notification utility — fire-and-forget, never throws.
 * Uses Nodemailer with per-institute SMTP settings as the email transport.
 */
import nodemailer from 'nodemailer';

// ─── HTML shell ───────────────────────────────────────────────────────────────

function wrapHtml(instituteName, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07)">
    <div style="background:#3C50E0;padding:28px 32px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">${instituteName}</h1>
    </div>
    <div style="padding:32px">
      ${body}
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;text-align:center;border-top:1px solid #E2E8F0">
      <p style="margin:0;font-size:12px;color:#94A3B8">${instituteName} · Automated notification · Do not reply</p>
    </div>
  </div>
</body></html>`;
}

// ─── Template builder ──────────────────────────────────────────────────────────

/**
 * @param {'feePayment'|'resultsPublished'|'announcement'|'assignmentPosted'|'attendanceAlert'|'test'} type
 * @param {string} instituteName
 * @param {Record<string, any>} data
 * @returns {{ subject: string, html: string }}
 */
export function buildEmail(type, instituteName, data) {
  switch (type) {
    case 'feePayment': {
      const { studentName, receiptNumber, amount, method, balance, date } = data;
      return {
        subject: `Fee Payment Receipt — ${instituteName}`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#1E293B">Payment Receipt</h2>
          <p style="margin:0 0 8px;color:#475569">Dear <strong>${studentName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569">Your fee payment has been successfully recorded.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Receipt Number</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${receiptNumber}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Amount Paid</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">NLe${Number(amount).toLocaleString()}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Payment Method</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right;text-transform:capitalize">${method}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Remaining Balance</td>
              <td style="padding:10px 0;color:${balance > 0 ? '#EF4444' : '#22C55E'};font-weight:600;text-align:right">NLe${Number(balance).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748B;font-size:14px">Date</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${date}</td>
            </tr>
          </table>
          ${balance <= 0 ? '<p style="color:#22C55E;font-weight:600">Your fees are fully paid. Thank you!</p>' : ''}
        `),
      };
    }

    case 'resultsPublished': {
      const { studentName, subject, marksObtained, totalMarks, grade } = data;
      return {
        subject: `New Result Published — ${subject}`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#1E293B">Result Published</h2>
          <p style="margin:0 0 8px;color:#475569">Dear <strong>${studentName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569">Your result for <strong>${subject}</strong> has been published.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Subject</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${subject}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Marks Obtained</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${marksObtained} / ${totalMarks}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748B;font-size:14px">Grade</td>
              <td style="padding:10px 0;text-align:right">
                <span style="display:inline-block;padding:2px 12px;border-radius:999px;background:#3C50E0;color:#fff;font-weight:700;font-size:15px">${grade}</span>
              </td>
            </tr>
          </table>
          <p style="color:#475569;font-size:13px">Log in to your portal to view your full results.</p>
        `),
      };
    }

    case 'announcement': {
      const { title, body: annBody } = data;
      return {
        subject: `New Announcement: ${title}`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#1E293B">${title}</h2>
          <div style="color:#475569;line-height:1.6">${annBody}</div>
        `),
      };
    }

    case 'assignmentPosted': {
      const { title, subject, dueDate, totalMarks } = data;
      return {
        subject: `New Assignment: ${title}`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#1E293B">New Assignment Posted</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Title</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${title}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Subject</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${subject}</td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Due Date</td>
              <td style="padding:10px 0;color:#EF4444;font-weight:600;text-align:right">${dueDate}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748B;font-size:14px">Total Marks</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${totalMarks}</td>
            </tr>
          </table>
          <p style="color:#475569;font-size:13px">Log in to your portal to view and submit the assignment.</p>
        `),
      };
    }

    case 'attendanceAlert': {
      const { studentName, rate, totalClasses } = data;
      return {
        subject: `Attendance Alert — Below 75%`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#EF4444">Attendance Warning</h2>
          <p style="margin:0 0 8px;color:#475569">Dear <strong>${studentName}</strong>,</p>
          <p style="margin:0 0 20px;color:#475569">Your attendance has dropped below the minimum required threshold of <strong>75%</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 0;color:#64748B;font-size:14px">Current Attendance</td>
              <td style="padding:10px 0;color:#EF4444;font-weight:700;text-align:right">${rate}%</td>
            </tr>
            <tr>
              <td style="padding:10px 0;color:#64748B;font-size:14px">Total Classes</td>
              <td style="padding:10px 0;color:#1E293B;font-weight:600;text-align:right">${totalClasses}</td>
            </tr>
          </table>
          <p style="color:#EF4444;font-weight:600">Please attend classes regularly to maintain exam eligibility.</p>
        `),
      };
    }

    case 'test':
    default: {
      return {
        subject: `Test Email — ${instituteName}`,
        html: wrapHtml(instituteName, `
          <h2 style="margin:0 0 16px;font-size:18px;color:#1E293B">Test Email</h2>
          <p style="color:#475569">This is a test email from <strong>${instituteName}</strong>. Your email configuration is working correctly.</p>
        `),
      };
    }
  }
}

// ─── Nodemailer transporter factory ──────────────────────────────────────────

function createTransporter(smtp) {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? 587,
    secure: smtp.secure ?? false,
    auth: {
      user: smtp.user,
      // App Passwords are displayed with spaces — strip them
      pass: smtp.pass?.replace(/\s/g, ''),
    },
  });
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Fire-and-forget email sender via Nodemailer (per-institute SMTP).
 * @param {{ instituteId: string, type: string, recipientId?: string, recipientEmail: string, instituteName: string, data: Record<string, any> }} opts
 */
export async function sendEmailNotification({ instituteId, type, recipientId, recipientEmail, instituteName, data }) {
  try {
    if (!recipientEmail) return;

    // Lazy-load models to avoid circular dependencies at startup
    const { default: NotificationSettings } = await import('../models/NotificationSettings.js');
    const settings = await NotificationSettings.findOne({ institute: instituteId }).lean();

    const smtp = settings?.smtp;
    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      console.warn('[email] SMTP not configured for institute — skipping email');
      return;
    }

    // Check if this notification type is enabled
    if (type !== 'test' && settings?.enabled?.[type] === false) return;

    // Check user opt-out preference (only for non-critical types)
    const optOutTypes = ['announcement', 'assignmentPosted'];
    if (recipientId && optOutTypes.includes(type)) {
      const { default: User } = await import('../models/user.js');
      const user = await User.findById(recipientId).select('emailOptOut').lean();
      if (user?.emailOptOut?.includes(type)) return;
    }

    const { subject: emailSubject, html } = buildEmail(type, instituteName, data ?? {});
    const fromName = smtp.fromName || instituteName;
    const fromEmail = smtp.fromEmail || smtp.user;
    const from = `${fromName} <${fromEmail}>`;

    let status = 'sent';
    let errorMsg = null;

    try {
      const transporter = createTransporter(smtp);
      await transporter.sendMail({ from, to: recipientEmail, subject: emailSubject, html });
    } catch (sendErr) {
      status = 'failed';
      errorMsg = sendErr?.message ?? String(sendErr);
      console.error('[email] Nodemailer send error:', errorMsg);
    }

    // Log the attempt — best-effort, never throws
    try {
      const { default: EmailLog } = await import('../models/EmailLog.js');
      await EmailLog.create({
        institute: instituteId,
        recipientUser: recipientId ?? null,
        recipientEmail,
        type,
        subject: emailSubject,
        status,
        error: errorMsg,
        sentAt: new Date(),
      });
    } catch {
      // ignore log errors
    }
  } catch {
    // fire-and-forget — never throws
  }
}

// ─── Test email (used by settings controller) ─────────────────────────────────

/**
 * Sends a test email via Nodemailer using the institute's SMTP settings.
 * Returns { ok: true } or throws so the controller can surface the error.
 */
export async function sendTestEmailDirect({ instituteId, instituteName, toEmail }) {
  const { default: NotificationSettings } = await import('../models/NotificationSettings.js');
  const settings = await NotificationSettings.findOne({ institute: instituteId }).lean();

  const smtp = settings?.smtp;
  if (!smtp?.host || !smtp?.user || !smtp?.pass) {
    throw new Error('SMTP is not configured. Please set up your SMTP settings first.');
  }

  const { subject, html } = buildEmail('test', instituteName, {});
  const fromName = smtp.fromName || instituteName;
  const fromEmail = smtp.fromEmail || smtp.user;

  const transporter = createTransporter(smtp);
  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: toEmail,
    subject,
    html,
  });

  return { ok: true };
}
