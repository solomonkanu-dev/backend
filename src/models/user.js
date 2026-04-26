import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const onboardingTransitionSchema = new mongoose.Schema(
  {
    from: String,
    to: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const guardianSchema = new mongoose.Schema(
  {
    guardianName: String,
    guardianPhone: String,
    guardianEmail: String,
    guardianAddress: String,
    guardianRelationship: String,
    guardianOccupation: String,
  },
  { _id: false }
);

const studentProfileSchema = new mongoose.Schema(
  {
    registrationNumber: String,
    dateOfAdmission: Date,
    dateOfBirth: Date,
    gender: String,
    mobileNumber: String,
    address: String,
    bloodGroup: String,
    religion: String,
    orphanStatus: String,
    previousSchool: String,
    familyType: String,
    medicalInfo: String,
    guardian: guardianSchema,
  },
  { _id: false }
);

const lecturerProfileSchema = new mongoose.Schema(
  {
    employeeId: String,
    department: String,
    position: String,
    dateOfJoining: Date,
    dateOfBirth: Date,
    gender: String,
    maritalStatus: String,
    bloodGroup: String,
    phoneNumber: String,
    address: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "lecturer", "student", "super_admin", "parent"],
      required: true,
    },

    approved: {
      type: Boolean,
      default: false,
    },

    institute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institute",
      default: null,
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null,
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lifecycleStatus: {
      type: String,
      enum: ["active", "graduated", "transferred", "withdrawn"],
      default: "active",
    },
    lifecycleNote: { type: String, default: "" },
    lifecycleUpdatedAt: { type: Date, default: null },

    // 🔹 Role-specific data
    studentProfile: {
      type: studentProfileSchema,
      default: null,
    },

    lecturerProfile: {
      type: lecturerProfileSchema,
      default: null,
    },

    // Phone number for parent accounts (also used as fallback for other roles)
    phoneNumber: { type: String, default: null },

    linkedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],

    promotionHistory: [
      {
        fromClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
        toClass: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },
        promotedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    onboarding: {
      status: { type: String, enum: ['pending', 'under_review', 'approved', 'rejected'], default: 'pending' },
      submittedAt: { type: Date, default: null },
      reviewNote: { type: String, default: '' },
      rejectionReason: { type: String, default: '' },
      transitions: [onboardingTransitionSchema],
    },

    emailOptOut: { type: [String], default: [] },

    archivedAt: { type: Date, default: null },
    archiveNote: { type: String, default: '' },

    // QR attendance
    qrToken: { type: String, default: null },
    qrActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ institute: 1, role: 1 });
userSchema.index({ qrToken: 1 }, { unique: true, sparse: true });

// 🔐 Password Hash
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export default mongoose.model("User", userSchema);
