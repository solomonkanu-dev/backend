import Subject from '../models/Subject.js';
import User from '../models/user.js';
import Class from "../models/Class.js";


// export const createSubject = async (req, res) => {
//   try {
//     if (req.user.role !== "admin") {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     const { name, classId, lecturerId } = req.body;

//     if (!name || !classId || !lecturerId) {
//       return res.status(400).json({ message: "All fields required" });
//     }

//     const classData = await Class.findOne({
//       _id: classId,
//       institute: req.user.institute,
//     });

//     if (!classData) {
//       return res.status(404).json({ message: "Class not found" });
//     }

//     const lecturer = await User.findOne({
//       _id: lecturerId,
//       role: "lecturer",
//       institute: req.user.institute,
//     });

//     if (!lecturer) {
//       return res.status(404).json({ message: "Lecturer not found" });
//     }

//     const exists = await Subject.findOne({
//       code,
//       class: classId,
//     });

//     if (exists) {
//       return res.status(409).json({ message: "Subject already exists" });
//     }

//     const subject = await Subject.create({
//       name,
//       code,
//       class: classId,
//       lecturer: lecturerId,
//       institute: req.user.institute,
//     });

//     res.status(201).json({
//       message: "Subject created successfully",
//       subject,
//     });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

export const createSubjectForClass = async (req, res) => {
  try {
    if (!["admin", "lecturer"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

        if (!req.user.institute) {
      return res.status(400).json({ message: "Institute required" });
    }

    const { name, classId, lecturerId, totalMarks } = req.body;

    const instituteId = req.user.institute?._id || req.user.institute;

    const classDoc = await Class.findOne({
      _id: classId,
      institute: instituteId,
    });

    if (!classDoc) {
      return res.status(404).json({ message: "Class not found" });
    }

    const subject = await Subject.create({
      name,
      class: classId,
      lecturer: lecturerId || null,
      totalMarks: totalMarks || 100,
      institute: instituteId,
    });

     await Class.findByIdAndUpdate(classId, {
      $addToSet: { subjects: subject._id }, // prevents duplicates
    });

    res.status(201).json({
      statusCode: 201,
      message: "Subject assigned to class successfully",
      subject,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getLecturerSubjects = async (req, res) => {
  const subjects = await Subject.find({
    lecturer: req.user.id,
  }).populate("class", "name");

  res.json(subjects);
};

export const getStudentSubjects = async (req, res) => {
  const subjects = await Subject.find({
    class: req.user.class,
  }).populate("lecturer", "fullName");

  res.json(subjects);
};


export const getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({
      institute: req.user.institute,
    }).populate('lecturer', 'fullName email')
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubjectById = async (req, res) => {
  try {
    const singleSubject = await Subject.findById(req.params.id).populate(
      'lecturer',
      'fullName email'
    );
    if (!singleSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    res.json(singleSubject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const assignLecturerToSubject = async (req, res) => {
  try {
    const { subjectId, lecturerId } = req.body;

    const singleSubject = await Subject.findById(subjectId);
    if (!singleSubject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    const lecturer = await User.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(404).json({ message: 'Lecturer not found' });
    }

    singleSubject.lecturer = lecturerId;
    await singleSubject.save();

    res.json({
      message: 'Lecturer assigned to subject successfully',
      subject: singleSubject,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
