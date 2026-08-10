import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS= 12;
const TOKEN_LIFETIME= "15m";

export function hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password, passwordHash){
    return bcrypt.compare(password, passwordHash);
}

export function createAccessToken(userId) {
    if(!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        {
            sub: String(userId),
        },
        process.env.JWT_SECRET,
        {
            expiresIn: TOKEN_LIFETIME,
            issuer: "job-application-tracker",
            audience: "job-application-tracker-client",

        },
    );
}

export function verifyAccessToken(token) {
    if(!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.verify(token, process.env.JWT_SECRET,{
       issuer: "job-application-tracker",
       audience: "job-application-tracker-client",

        });
}