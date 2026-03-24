import jwt from "jsonwebtoken";
import User from "../models/user.js";

const auth = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Check Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2️⃣ Check cookie
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
      .populate("institute", "name");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 5️⃣ Attach user
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default auth;
