// controllers/classFee.controller.js
import ClassFee from "../models/ClassFee.js";

export const assignFeesToClass = async (req, res) => {
  try {
    const { classId, fees } = req.body;

    if (!req.user.institute) {
      return res.status(403).json({
        message: "Admin must belong to an institute",
      });
    }

    const classFee = await ClassFee.findOneAndUpdate(
      { class: classId, institute: req.user.institute },
      {
        class: classId,
        institute: req.user.institute,
        fees,
        createdBy: req.user.id,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      message: "Fees assigned to class successfully",
      classFee,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
