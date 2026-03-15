import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "app_session";
const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!);

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required." },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                email: true,
                passwordHash: true,
                role: true,
                firstName: true,
                lastName: true,
            }
        });

        if (!user || !user.passwordHash) {
            return NextResponse.json(
                { error: "Invalid email or password." },
                { status: 401 }
            );
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid email or password." },
                { status: 401 }
            );
        }

        const token = await new SignJWT({
            role: user.role,
            email: user.email,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setSubject(user.id)
            .setIssuedAt()
            .setExpirationTime("7d")
            .sign(secret);

        const res = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
            },
        });

        res.cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return res;
    } catch (error) {
        console.error("LOGIN_ERROR", error);

        return NextResponse.json(
            { error: "Internal server error." },
            { status: 500 }
        );
    }
}