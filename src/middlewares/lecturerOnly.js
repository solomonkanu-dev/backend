export const lecturerOnly = (req, res, next) => {
  if (req.user.role !== "lecturer") {
    return res.status(403).json({ message: "Access denied — lecturers only" });
  }
  next();
};
