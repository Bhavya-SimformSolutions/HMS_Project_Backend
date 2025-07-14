import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

/**
 * Middleware to verify the JSON Web Token (JWT) from the request headers.
 * 
 * This middleware checks for the presence of a JWT in the `Authorization` header,
 * verifies its validity, and extracts the user's role and ID from the token payload.
 * If the token is invalid or missing, it responds with an appropriate error status.
 * 
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @param next - The next middleware function in the request-response cycle.
 * 
 * @remarks
 * - The JWT is expected to be in the format: `Bearer <token>`.
 * - The `JWT_SECRET` environment variable is used to verify the token.
 * - If the token is valid, the `role` and `userId` properties are added to the `req` object.
 * 
 * @throws
 * - Responds with a `401 Unauthorized` status if the token is missing.
 * - Responds with a `403 Forbidden` status if the token is invalid or does not contain the required fields.
 */
export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
    if(typeof decoded === "object" && "role" in decoded){
      req.role = (decoded as { role: string }).role;
      req.userId = (decoded as { id: string }).id;
      next(); 
    }
    else{
      res.status(403).json({ message: "Invalid token" });
      return;
    }
  
  } catch (err) {
    console.error("JWT Verification Error:", err);
    res.status(403).json({ message: "Invalid token" });
  }
};