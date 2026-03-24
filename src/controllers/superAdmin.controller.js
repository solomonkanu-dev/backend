
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Institute from '../models/Institute.js';



export const superAdminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: 'super_admin' });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Super admin login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const approveAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const admin = await User.findByIdAndUpdate(
      adminId,
      { approved: true },
      { new: true }
    );

    if (!admin) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({
      role: 'admin',
      approved: false,
    }).select('-password').sort({createdAt: -1});

    res.status(200).json({
      message: 'Pending admin requests',
      total: pendingAdmins.length,
      data: pendingAdmins,
    });
    // res.json(pendingAdmins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSystemStats = async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments();
    const approvedAdmins = await User.countDocuments({ approved: true });
    const pendingAdmins = await User.countDocuments({ approved: false });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalLecturers = await User.countDocuments({ role: 'lecturer' });

    const totalInstitutes = await Institute.countDocuments();

    res.status(200).json({
      message: 'System statistics',
      data: {
        admins: {
          total: totalAdmins,
          approved: approvedAdmins,
          pending: pendingAdmins,
        },
        institutes: {
          total: totalInstitutes,
        },
        students: {
          total: totalStudents,
        },
        lecturers: {
          total: totalLecturers,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch system stats',
      error: error.message,
    });
  }
};


export const getAllInstitutes = async (req, res) => {
  try {
    const institutes = await Institute.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: institutes.length,
      data: institutes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch institutes",
      error: error.message,
    });
  }
};

export const getInstituteById = async (req, res) => {
  try {
    const institute = await Institute.findById(req.params.id);

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found",
      });
    }

    res.status(200).json({
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
