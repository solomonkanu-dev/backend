export const parentOnly = (req, res, next) => {
  if (req.user.role !== "parent") return res.status(403).json({ message: "Access denied" });
  next();
};
