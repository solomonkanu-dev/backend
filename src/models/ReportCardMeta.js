import mongoose from "mongoose";

const reportCardMetaSchema = new mongoose.Schema(
  {
    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    term: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicTerm",
      default: null,
    },
    classTeacherComment: { type: String, trim: true, default: "" },
    principalComment: { type: String, trim: true, default: "" },
    promotionStatus: {
      type: String,
      enum: ["promoted", "repeated", "pending"],
      default: "pending",
    },
    // Affective + psychomotor ratings (1–5) for this student + term
    traitRatings: [
      {
        _id: false,
        trait: { type: mongoose.Schema.Types.ObjectId, ref: "RatingTrait", required: true },
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// One report-card meta record per student per term (term=null for annual/all-terms)
reportCardMetaSchema.index({ institute: 1, student: 1, term: 1 }, { unique: true });

export default mongoose.model("ReportCardMeta", reportCardMetaSchema);
