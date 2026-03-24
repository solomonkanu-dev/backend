import User from '../models/user.js';

// Placeholder for student controller
export const getStudentDashboard = (req, res) => {
  res.json({ message: 'User dashboard not yet implemented' });
};

export const getStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate(
      'institute',
      'name'
    );
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await User.findById(req.params.id).populate(
      'institute',
      'name'
    );
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
