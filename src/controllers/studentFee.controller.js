// import Student from '../models/Student.js';
// import FeeParticular from '../models/Fees.js';
import User from '../models/user.js';

// controllers/studentFee.controller.js
import ClassFee from "../models/ClassFee.js";
import StudentFee from "../models/StudentFee.js";


export const assignFeeToStudent = async (req, res) => {
  try {
    const { studentId } = req.body;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const classFee = await ClassFee.findOne({
      class: student.class,
      institute: student.institute,
    }).populate("fees.fee");

    if (!classFee) {
      return res.status(404).json({
        message: "No fees assigned to student's class",
      });
    }

    const totalAmount = classFee.fees.reduce(
      (sum, f) => sum + f.amount,
      0
    );

    const studentFee = await StudentFee.create({
      student: studentId,
      class: student.class,
      institute: student.institute,
      fees: classFee.fees,
      totalAmount,
      balance: totalAmount,
    });

    res.status(201).json({
      message: "Student fees generated successfully",
      studentFee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const getStudentsWithFees = async (req, res) => {
  try {
    const studentsWithFees = await StudentFee.find({
      institute: req.user.institute,
    })
      .populate('student', 'fullName email')
      .populate('feeParticular', 'title amount');
    res.json(studentsWithFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getFeesForStudent = async (req, res) => {
  try {
    const studentFees = await StudentFee.find({
      student: req.params.studentId,
      institute: req.user.institute,
    })
      .populate('student', 'fullName email')
      .populate('feeParticular', 'title amount');
    res.json(studentFees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
