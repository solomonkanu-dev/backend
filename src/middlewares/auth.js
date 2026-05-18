import jwt from "jsonwebtoken";
import User from "../models/user.js";

const auth = async (req, res, next) => {
  try {
    let token;

    // 1. Check Authorization header (used by mobile / non-browser clients)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2. Fall back to HTTP-only cookie (used by browser clients)
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // 3️⃣ Verify token
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Fetch user
    const user = await User.findById(payload.id)
      .select("-password")
      .populate("institute", "name logo schoolType onboardingCompleted status");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5️⃣ Check if account is suspended
    if (!user.isActive) {
      return res.status(403).json({ message: "Account has been suspended" });
    }

    // 5b. Block users whose institute has been suspended or archived
    if (
      user.role !== "super_admin" &&
      user.institute &&
      user.institute.status &&
      user.institute.status !== "active"
    ) {
      return res
        .status(403)
        .json({ message: "Institute access has been disabled" });
    }

    // 6️⃣ Attach user
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default auth;
