/**
 * SMS notification utility — fire-and-forget, never throws.
 * Uses Twilio with a single global number configured via env vars:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */

// ─── Text builder ─────────────────────────────────────────────────────────────

/**
 * @param {'feePayment'|'resultsPublished'|'announcement'|'assignmentPosted'|'attendanceAlert'|'test'} type
 * @param {string} instituteName
 * @param {Record<string, any>} data
 * @returns {string}
 */
export function buildSmsText(type, instituteName, data) {
  const tag = `[${instituteName}]`;

  switch (type) {
    case 'feePayment': {
      const { studentName, receiptNumber, amount, method, balance } = data;
      return `${tag} Payment of NLe${Number(amount).toLocaleString()} (${method}) recorded for ${studentName}. Receipt: ${receiptNumber}. Balance: NLe${Number(balance).toLocaleString()}.`;
    }
    case 'resultsPublished': {
      const { studentName, subject, marksObtained, totalMarks, grade } = data;
      return `${tag} ${studentName}, your result for ${subject} is out. Score: ${marksObtained}/${totalMarks} — Grade ${grade}.`;
    }
    case 'assignmentPosted': {
      const { title, subject, dueDate } = data;
      return `${tag} New assignment: "${title}" (${subject}). Due: ${dueDate}.`;
    }
    case 'attendanceAlert': {
      const { studentName, rate } = data;
      return `${tag} Attendance alert for ${studentName}: ${rate}% (minimum 75%). Please attend classes regularly.`;
    }
    case 'announcement': {
      const { title, body } = data;
      const snippet = body?.length > 100 ? `${body.slice(0, 100)}…` : (body ?? '');
      return `${tag} ${title}: ${snippet}`;
    }
    case 'test':
    default:
      return `${tag} Test SMS from EduPulse. Your SMS notifications are working correctly.`;
  }
}

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * Fire-and-forget SMS sender via Twilio.
 * @param {{ instituteId: string, type: string, recipientPhone?: string, instituteName: string, data: Record<string, any> }} opts
 */
export async function sendSmsNotification({ instituteId, type, recipientPhone, instituteName, data }) {
  try {
    if (!recipientPhone) return;

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      console.warn('[sms] Twilio env vars not configured — skipping SMS');
      return;
    }

    // Check enabled toggle for this type
    if (type !== 'test') {
      const { default: NotificationSettings } = await import('../models/NotificationSettings.js');
      const settings = await NotificationSettings.findOne({ institute: instituteId }).lean();
      if (settings?.enabled?.[type] === false) return;
    }

    const body = buildSmsText(type, instituteName, data ?? {});

    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    await client.messages.create({
      from: TWILIO_FROM_NUMBER,
      to: recipientPhone,
      body,
    });

    console.info(`[sms] sent "${type}" to ${recipientPhone}`);
  } catch (err) {
    console.error(`[sms] failed to send "${type}":`, err?.message ?? err);
    // fire-and-forget — never re-throws
  }
}

// ─── Test SMS (used by settings controller) ───────────────────────────────────

/**
 * Sends a test SMS via Twilio.
 * Returns { ok: true } or throws so the controller can surface the error.
 */
export async function sendTestSmsDirect(toPhone) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    throw new Error('Twilio env vars (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER) are not configured on the server.');
  }

  const twilio = (await import('twilio')).default;
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

  await client.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: toPhone,
    body: 'Test SMS from EduPulse. Your SMS notifications are working correctly.',
  });

  return { ok: true };
}
