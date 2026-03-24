import Class from '../models/Class.js';
import User from '../models/user.js';
import Subject from '../models/Subject.js';
import logger from '../utils/logger.js';


export const createClass = async (req, res) => {
  try {
    // only admin can create class
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, lecturerId } = req.body;

    if (!name || !lecturerId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // check lecturer
    const lecturer = await User.findOne({
      _id: lecturerId,
      role: "lecturer",
      institute: req.user.institute,
    });

    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found" });
    }

    // const exists = await Class.findOne({ code });
    // if (exists) {
    //   return res.status(409).json({ message: "Class already exists" });
    // }

    const newClass = await Class.create({
      name,
      lecturer: lecturer._id,
      institute: req.user.institute,
    });

    res.status(201).json({
      message: "Class created successfully",
      class: newClass,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const addStudentToClass = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { classId, studentId } = req.body;

    const student = await User.findOne({
      _id: studentId,
      role: "student",
      institute: req.user.institute,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classData = await Class.findOne({ _id: classId, institute: req.user.institute });
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    if (classData.students.some((s) => s.toString() === studentId.toString())) {
      return res.status(400).json({ message: "Student already in class" });
    }

    classData.students.push(studentId);
    await classData.save();

    res.status(200).json({
      message: "Student added to class",
      class: classData,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getLecturerClasses = async (req, res) => {
  try {
    const classes = await Class.find({ lecturer: req.user.id }).populate(
      "students",
      "fullName email"
    );

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getStudentClasses = async (req, res) => {
  try {
    const classes = await Class.find({ students: req.user.id }).populate(
      "lecturer",
      "fullName"
    );

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getInstituteClasses = async (req, res) => {
  try {
    const classes = await Class.find({ institute: req.user.institute })
      .populate("lecturer", "fullName")
      .populate("students", "fullName");

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



export const getClasses = async (req, res) => {
  try {
    const classes = await Class.find({
      institute: req.user.institute,
    }).populate('lecturer', 'fullName email');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getClassById = async (req, res) => {
  try {
    const singleClass = await Class.findById(req.params.id).populate(
      'lecturer',
      'fullName email'
    );
    if (!singleClass) {
      return res.status(404).json({ message: 'Class not found' });
    }
    res.json(singleClass);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignLecturerToClass = async (req, res) => {
  try {
    const { classId, lecturerId } = req.body;

    const singleClass = await Class.findById(classId);
    if (!singleClass) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // only admin can assign a lecturer
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const lecturer = await User.findOne({ _id: lecturerId, role: 'lecturer', institute: singleClass.institute || req.user.institute });
    if (!lecturer) {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    singleClass.lecturer = lecturer._id;
    await singleClass.save();

    res.json({
      message: 'Lecturer assigned to class successfully',
      class: singleClass,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getClassesWithSubjectSummary = async (req, res) => {
  try {
    // Admin & Lecturer only
    if (!["admin", "lecturer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const instituteId = req.user.institute?._id || req.user.institute;

    // Fetch classes
    const classes = await Class.find({ institute: instituteId })
      .populate("lecturer", "fullName email")
      .populate("students", "fullName email studentProfile")
      .lean();

    // Fetch subjects for all classes in one query (important)
    const subjects = await Subject.find({
      institute: instituteId,
    }).lean();

    // Map subjects by classId
    const subjectMap = {};
    subjects.forEach((subject) => {
      const classId = subject.class.toString();
      if (!subjectMap[classId]) subjectMap[classId] = [];
      subjectMap[classId].push(subject);
    });

    // Build response
    const result = classes.map((cls) => {
      const classSubjects = subjectMap[cls._id.toString()] || [];

      const totalSubjects = classSubjects.length;
      
      // Count male and female students
      const totalMale = cls.students.filter(
        (student) => student.studentProfile?.gender && student.studentProfile.gender.toLowerCase() === 'male'
      ).length;
      const totalFemale = cls.students.filter(
        (student) => student.studentProfile?.gender && student.studentProfile.gender.toLowerCase() === 'female'
      ).length;

      logger.info(`Class ${cls.name}: ${totalMale} male, ${totalFemale} female students.`);

      return {
        ...cls,
        totalSubjects,
        totalMale,
        totalFemale,
        totalStudents: cls.students.length,
        subjects: classSubjects.map((s) => ({
          id: s._id,
          name: s.name,
          totalMarks: s.totalMarks,
        })),
        students: cls.students.map((s) => ({
          _id: s._id,
          fullName: s.fullName,
          email: s.email,
        })),
      };
    });

    res.status(200).json({
      statusCode: 200,
      count: result.length,
      classes: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getStudentByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const classData = await Class.findOne({
      _id: classId,
      institute: req.user.institute,
    }).populate({
      path: "students",
      select: "fullName email studentProfile profilePhoto isActive",
    }).lean();

    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    const students = classData.students.map((student) => ({
      _id: student._id,
      fullName: student.fullName,
      email: student.email,
      registrationNumber: student.studentProfile?.registrationNumber,
      dateOfAdmission: student.studentProfile?.dateOfAdmission,
      dateOfBirth: student.studentProfile?.dateOfBirth,
      gender: student.studentProfile?.gender,
      mobileNumber: student.studentProfile?.mobileNumber,
      address: student.studentProfile?.address,
      bloodGroup: student.studentProfile?.bloodGroup,
      profilePhoto: student.profilePhoto,
      isActive: student.isActive,
    }));

    res.status(200).json({
      statusCode: 200,
      class: {
        _id: classData._id,
        name: classData.name,
      },
      count: students.length,
      students,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

