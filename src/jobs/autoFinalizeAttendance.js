import cron from "node-cron";
import Attendance from "../models/Attendance.js";
import Class from "../models/Class.js";
import User from "../models/user.js";

// Runs Mon–Fri at 17:00 (5 PM).
// For every class in every institute, marks absent any student
// who has no attendance record for today.
// Conflict rule: never downgrades an existing "present" record.

export function startAutoFinalizeJob() {
  // Cron: "0 17 * * 1-5"  →  minute 0, hour 17, any day, any month, Mon–Fri
  cron.schedule("0 17 * * 1-5", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);


    console.log(`[AutoFinalize] Running for ${today.toDateString()}`);

    
    try {
      // Get all classes that have students
      const classes = await Class.find({ students: { $exists: true, $not: { $size: 0 } } })
        .select("_id institute students")
        .lean();

      let totalAbsentMarked = 0;

      for (const cls of classes) {
        try {
          const instituteId = cls.institute;
          const allStudentIds = cls.students.map((s) => String(s));

          // Find today's attendance doc for this class
          const attendance = await Attendance.findOne({
            class: cls._id,
            institute: instituteId,
            date: today,
            type: "student",
            subject: null,
          });

          if (!attendance) {
            // No attendance session at all — create one with everyone absent
            await Attendance.create({
              class: cls._id,
              institute: instituteId,
              date: today,
              type: "student",
              subject: null,
              records: allStudentIds.map((id) => ({ student: id, status: "absent" })),
            });
            totalAbsentMarked += allStudentIds.length;
            continue;
          }

          // Partial session — fill in absent for anyone not yet recorded
          const scannedIds = new Set(attendance.records.map((r) => String(r.student)));
          let added = 0;

          for (const studentId of allStudentIds) {
            if (!scannedIds.has(studentId)) {
              attendance.records.push({ student: studentId, status: "absent" });
              added++;
            }
          }

          if (added > 0) {
            await attendance.save();
            totalAbsentMarked += added;
          }
        } catch (classErr) {
          console.error(`[AutoFinalize] Error for class ${cls._id}:`, classErr.message);
        }
      }

      console.log(`[AutoFinalize] Done — ${totalAbsentMarked} absent records added`);
    } catch (err) {
      console.error("[AutoFinalize] Fatal error:", err.message);
    }
  });

  console.log("[AutoFinalize] Cron job scheduled: Mon–Fri at 17:00");
}
