import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true, trim: true },
    subject:      { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    class:        { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    term:         { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
    institute:    { type: mongoose.Schema.Types.ObjectId, ref: 'Institute', required: true },
    date:         { type: Date, required: true },
    startTime:    { type: String, required: true },   // "09:00"
    endTime:      { type: String, required: true },   // "11:00"
    examType:     { type: String, enum: ['written', 'oral', 'practical', 'test'], default: 'written' },
    totalMarks:   { type: Number, default: 100 },
    venue:        { type: String, default: '' },
    instructions: { type: String, default: '' },
    status:       { type: String, enum: ['upcoming', 'ongoing', 'completed'], default: 'upcoming' },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

examSchema.index({ institute: 1, term: 1 });
examSchema.index({ class: 1, term: 1 });

export default mongoose.model('Exam', examSchema);
