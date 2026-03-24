import User from "../models/user.js";
import Institute from "../models/Institute.js";
import Class from "../models/Class.js";
import Subject from "../models/Subject.js";
import Assignment from "../models/Assignment.js";
import Result from "../models/Result.js";
import FeeParticular from "../models/Fees.js";
import Attendance from "../models/Attendance.js";
import bcrypt from "bcryptjs";
import logger from "../utils/logger.js";

export const requestAdminSignup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: "Email already in use" });

    await User.create({
      fullName,
      email,
      password,
      role: "admin",
      approved: false,
      institute: null,
    });

    res.status(201).json({
      message: "Admin signup request submitted. Awaiting approval.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createStudent = async (req, res) => {
  try {
    // 1️⃣ Authorization
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    if (!req.user.institute) {
      return res.status(400).json({ message: "Institute required" });
    }

    const { fullName, email, classId, studentProfile } = req.body;

    // 2️⃣ Validate class
    const classDoc = await Class.findOne({
      _id: classId,
      institute: req.user.institute,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    // 3️⃣ Prevent duplicate email
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Student already exists" });
    }

    // 4️⃣ Create temp password
    const tempPassword = Math.random().toString(36).slice(-8);

    // 5️⃣ Create student
    const student = await User.create({
      fullName,
      email,
      password: tempPassword,
      role: "student",
      institute: req.user.institute,
      class: classId,
      approved: true,
      studentProfile,
    });

    // 6️⃣ 🔥 IMPORTANT: push student into class
    await Class.findByIdAndUpdate(classId, {
      $addToSet: { students: student._id }, // prevents duplicates
    });

    res.status(201).json({
      statusCode: 201,
      message: "Student created successfully",
      student,
      tempPassword,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createLecturer = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    if (!req.user.institute) {
      return res.status(400).json({ message: "Institute required" });
    }

    const { fullName, email, lecturerProfile } = req.body;

    if (!lecturerProfile) {
      return res.status(400).json({
        message: "Lecturer profile data is required",
      });
    }

    const user = await User.create({
      fullName,
      email,
      password: Math.random().toString(36).slice(-8),
      role: "lecturer",
      // class: req.user.class,
      institute: req.user.institute,
      approved: true,
      lecturerProfile,
    });

    res.status(201).json({
      statusCode: 201,
      message: "Employee created successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateLecturerProfile = async (req, res) => {
  try {
    const lecturerId = req.params.id;

    const user = await User.findById(lecturerId);

    if (!user || user.role !== "lecturer") {
      return res.status(404).json({ message: "Lecturer not found" });
    }

    user.lecturerProfile = req.body;
    await user.save();

    res.json({
      message: "Lecturer profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// export const createUser = async (req, res) => {
//   try {
//     // 🔐 Only admins can create users
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ message: 'Admin access only' });
//     }

//     if (!req.user.institute) {
//       return res.status(400).json({
//         message: 'Create institute before adding users',
//       });
//     }

//     const { fullName, email, role } = req.body;

//     // 🔒 Allow only specific roles
//     const allowedRoles = ['lecturer', 'student'];
//     if (!allowedRoles.includes(role)) {
//       return res.status(400).json({
//         message: 'Invalid role',
//       });
//     }

//     const exists = await User.findOne({ email });
//     if (exists) {
//       return res.status(409).json({ message: 'User already exists' });
//     }

//     // 🔑 Generate temp password
//     const tempPassword = Math.random().toString(36).slice(-8);

//     const user = await User.create({
//       fullName,
//       email,
//       password: tempPassword,
//       role,
//       institute: req.user.institute,
//       approved: true,
//     //   mustChangePassword: true, // 👈 recommended field
//     });

//     res.status(201).json({
//       message: `${role} created successfully`,
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         email: user.email,
//         role: user.role,
//       },
//       tempPassword, // send once
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const resetPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createInstitute = async (req, res) => {
  try {
    const {
      name,
      address,
      phoneNumber,
      website,
      country,
      email,
      targetLine,
      logo,
    } = req.body;

    // Check if admin already has an institute
    const existingInstitute = await Institute.findOne({
      admin: req.user.id,
    });

    if (existingInstitute) {
      return res.status(400).json({
        message: " Admin already created an Institute ",
      });
    }

    const institute = await Institute.create({
      name,
      address,
      website,
      country,
      email,
      phoneNumber,
      targetLine,
      logo,
      admin: req.user.id,
    });

    // Attach institute to admin
    await User.findByIdAndUpdate(req.user.id, {
      institute: institute._id,
    });

    res.status(201).json({
      message: "Institute created successfully",
      institute,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllStudents = async (req, res) => {
  const students = await User.find({
    role: "student",
    institute: req.user.institute,
  }).populate("class", "name");

  res.json(students);
};

export const getAllLecturers = async (req, res) => {
  const lecturers = await User.find({ role: "lecturer" });
  res.json(lecturers);
};

export const getLecturerById = async (req, res) => {
  const lecturer = await User.findById(req.params.lecturerId).select(
    "fullName email lecturerProfile"
  );
  res.json(lecturer);
};

export const getStudentById = async (req, res) => {
  const student = await User.findById(req.params.studentId).select(
    "fullName studentProfile"
  );
  res.json(student);
};

export const getClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!["admin", "lecturer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const instituteId = req.user.institute?._id || req.user.institute;

    const classDoc = await Class.findOne({
      _id: classId,
      institute: instituteId,
    })
      .populate("lecturer", "fullName email role phoneNumber")
      .populate("students", "fullName email role class studentProfile");

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const totalStudents = classDoc.students.length;
    const totalMales = classDoc.students.filter(
      (student) => student?.studentProfile.gender === "male"
    ).length;
    const totalFemales = classDoc.students.filter(
      (student) => student?.studentProfile.gender === "female"
    ).length;

    res.status(200).json({
      statusCode: 200,
      class: classDoc,
      totalStudents,
      totalMales,
      totalFemales,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClassWithStudents = async (req, res) => {
  const classData = await Class.findById(req.params.classId).populate(
    "students",
    "fullName email"
  );

  res.json(classData);
};

export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("lecturer", "fullName email")
      .populate("students", "fullName email studentProfile");

    // Add gender statistics
    const result = classes.map((cls) => {
      const classObj = cls.toObject();
      const totalMale = classObj.students.filter(
        (student) => student.studentProfile?.gender && student.studentProfile.gender.toLowerCase() === 'male'
      ).length;
      const totalFemale = classObj.students.filter(
        (student) => student.studentProfile?.gender && student.studentProfile.gender.toLowerCase() === 'female'
      ).length;

      return {
        ...classObj,
        totalMale,
        totalFemale,
        totalStudents: classObj.students.length,
        students: classObj.students.map((s) => ({
          _id: s._id,
          fullName: s.fullName,
          email: s.email,
        })),
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentsByClass = async (req, res) => {
  const students = await User.find({
    role: "student",
    // class: req.params.classId
  }).populate("class", "name");

  res.json(students);
};

export const getLecturerClasses = async (req, res) => {
  const subjects = await Subject.find({
    lecturer: req.params.lecturerId,
  }).populate("class", "name");

  res.json(subjects);
};

export const getStudentClasses = async (req, res) => {
  const student = await User.findById(req.params.studentId).populate(
    "class",
    "name"
  );

  const subjects = await Subject.find({
    class: student.class._id,
  });

  res.json({
    class: student.class,
    subjects,
  });
};

export const getAllAssignments = async (req, res) => {
  const assignments = await Assignment.find()
    .populate("subject", "name")
    .populate("createdBy", "name");

  res.json(assignments);
};

export const getResultsBySubject = async (req, res) => {
  const results = await Result.find({
    subject: req.params.subjectId,
  })
    .populate("student", "name")
    .populate("subject", "name");

  res.json(results);
};

export const getMyInstitute = async (req, res) => {
  try {
    const institute = await Institute.findOne({ admin: req.user.id });

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: institute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch institute",
      error: error.message,
    });
  }
};

// export const updateInstitute = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const institute = await Institute.findById(id);
//     if (!institute) {
//       return res.status(404).json({ message: "Institute not found" });
//     }

//     // 🔐 Authorization check
//     if (
//       req.user.role !== "super_admin" &&
//       institute.createdBy.toString() !== req.user.id
//     ) {
//       return res.status(403).json({
//         message: "You are not allowed to update this institute",
//       });
//     }

//     const updatedInstitute = await Institute.findByIdAndUpdate(
//       id,
//       req.body,
//       { new: true, runValidators: true }
//     );

//     res.status(200).json({
//       message: "Institute updated successfully",
//       data: updatedInstitute,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const updateInstitute = async (req, res) => {
  try {
    const institute = await Institute.findOneAndUpdate(
      { admin: req.user.id },
      req.body,
      { new: true }
    );

    if (!institute) {
      return res.status(404).json({ message: "Institute not found" });
    }

    res.status(200).json({
      message: "Institute updated successfully",
      data: institute,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createFeeParticular = async (req, res) => {
  try {
    // Admin must have an institute
    if (!req.user.institute) {
      return res.status(400).json({
        message: "Create institute before adding fees",
      });
    }

    const { fees } = req.body;

    // Validate input
    if (!Array.isArray(fees) || fees.length === 0) {
      return res.status(400).json({
        message: "Fees must be a non-empty array",
      });
    }

    const titles = fees.map((f) => f.title);
    const hasDuplicates = new Set(titles).size !== titles.length;

    if (hasDuplicates) {
      return res.status(400).json({
        message: "Duplicate fee titles in request",
      });
    }

    // Prepare fee records
    const feeDocs = fees.map((fee) => ({
      title: fee.title,
      amount: fee.amount,
      institute: req.user.institute,
      createdBy: req.user.id,
    }));

    const createdFees = await FeeParticular.insertMany(feeDocs);

    res.status(201).json({
      message: "Fee particulars created successfully",
      count: createdFees.length,
      fees: createdFees,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAttendance = async (req, res) => {
  const { classId, date, records } = req.body;

  const attendance = await Attendance.findOneAndUpdate(
    { class: classId, date, institute: req.user.institute },
    {
      class: classId,
      date,
      institute: req.user.institute,
      records,
      markedBy: req.user.id,
    },
    { upsert: true, new: true }
  );

  res.json({ message: "Attendance saved", attendance });
};

export const attendanceSummary = async (req, res) => {
  const { studentId } = req.params;

  const total = await Attendance.countDocuments({
    "records.student": studentId,
  });

  const present = await Attendance.countDocuments({
    records: { $elemMatch: { student: studentId, status: "present" } },
  });

  const percentage = total === 0 ? 0 : ((present / total) * 100).toFixed(2);

  res.json({ total, present, percentage });
};

// export const createFeeParticular = async (req, res) => {
//   try {
//     const { title, amount } = req.body;

//     // Admin must have an institute
//     if (!req.user.institute) {
//       return res.status(400).json({
//         message: "Create institute before adding fees",
//       });
//     }

//     const fee = await FeeParticular.create({
//       title,
//       amount,
//       institute: req.user.institute,
//       createdBy: req.user.id,
//     });

//     res.status(201).json({
//       message: "Fee particular created successfully",
//       fee,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };
