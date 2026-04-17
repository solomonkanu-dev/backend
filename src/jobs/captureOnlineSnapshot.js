import cron from "node-cron";
import OnlineUserReport from "../models/OnlineUserReport.js";
import { getOnlineSnapshot } from "../presence.js";

// Runs at the top of every hour, 7 days a week.
// Reads the live in-memory presence snapshot and upserts today's entry
// into the current week's OnlineUserReport document.

export async function captureSnapshot() {
  const { counts } = getOnlineSnapshot();
  const newTotal = counts.student + counts.lecturer + counts.parent + counts.admin;

  const now = new Date();

  // All boundaries computed in UTC to avoid timezone drift
  const todayMidnight = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  // Days since Monday: Sun=0 → offset 6, Mon=1 → offset 0, …
  const dayOffset = (now.getUTCDay() + 6) % 7;

  const weekStart = new Date(todayMidnight);
  weekStart.setUTCDate(weekStart.getUTCDate() - dayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  // Find or create the week document
  let report = await OnlineUserReport.findOneAndUpdate(
    { weekStart },
    { $setOnInsert: { weekStart, weekEnd, days: [], isComplete: false } },
    { upsert: true, new: true }
  );

  // Locate today's daily entry
  const dayIndex = report.days.findIndex(
    (d) => d.date.getTime() === todayMidnight.getTime()
  );

  if (dayIndex === -1) {
    // First snapshot of this day — push a fresh entry
    report.days.push({
      date:        todayMidnight,
      dayOfWeek:   now.getUTCDay(),
      peakCounts:  { ...counts },
      peakTotal:   newTotal,
      avgTotal:    newTotal,
      snapshotsTaken: 1,
      _runningSum: newTotal,
    });
  } else {
    const entry = report.days[dayIndex];
    entry.snapshotsTaken += 1;
    entry._runningSum    += newTotal;
    entry.avgTotal        = entry._runningSum / entry.snapshotsTaken;
    if (newTotal > entry.peakTotal) {
      entry.peakTotal  = newTotal;
      entry.peakCounts = { ...counts };
    }
  }

  await report.save();

  // Mark the week as complete once its end has passed
  if (!report.isComplete && new Date() > weekEnd) {
    report.isComplete = true;
    await report.save();
  }

  console.log(
    `[SnapshotCapture] Week ${weekStart.toDateString()} — ` +
    `today total=${newTotal} (students=${counts.student} lecturers=${counts.lecturer} ` +
    `parents=${counts.parent} admins=${counts.admin})`
  );
}

export function startSnapshotCaptureJob() {
  cron.schedule("0 * * * *", async () => {
    try {
      await captureSnapshot();
    } catch (err) {
      console.error("[SnapshotCapture] Error:", err.message);
    }
  });
  console.log("[SnapshotCapture] Cron job scheduled: hourly");
}
