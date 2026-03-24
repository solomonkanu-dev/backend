import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
      enum: ["admin", "lecturer", "student", "super_admin"],
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

    // 🔹 Role-specific data
    studentProfile: {
      type: studentProfileSchema,
      default: null,
    },

    lecturerProfile: {
      type: lecturerProfileSchema,
      default: null,
    },
  },
  { timestamps: true }
);

// 🔐 Password Hash
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

export default mongoose.model("User", userSchema);
