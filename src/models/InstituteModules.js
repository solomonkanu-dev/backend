import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  institute: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', unique: true },
  modules: {
    // People
    teachers:         { type: Boolean, default: true },
    classes:          { type: Boolean, default: true },
    students:         { type: Boolean, default: true },
    parents:          { type: Boolean, default: true },
    // Academics
    subjects:         { type: Boolean, default: true },
    timetable:        { type: Boolean, default: true },
    academicCalendar: { type: Boolean, default: true },
    assignments:      { type: Boolean, default: true },
    attendance:       { type: Boolean, default: true },
    results:          { type: Boolean, default: true },
    exams:            { type: Boolean, default: true },
    promote:          { type: Boolean, default: true },
    // Finance
    fees:             { type: Boolean, default: true },
    terms:            { type: Boolean, default: true },
    salary:           { type: Boolean, default: true },
    financialRecords: { type: Boolean, default: true },
    // Communication
    messages:         { type: Boolean, default: true },
    announcements:    { type: Boolean, default: true },
    gallery:          { type: Boolean, default: true },
    // Administration
    aiAnalytics:      { type: Boolean, default: true },
    auditLogs:        { type: Boolean, default: true },
    archive:          { type: Boolean, default: true },
  },
}, { timestamps: true });

export default mongoose.model('InstituteModules', schema);
