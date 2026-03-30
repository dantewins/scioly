import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "app_session";
const secret = new TextEncoder().encode(process.env.APP_JWT_SECRET!);

const PUBLIC_PAGES = ["/login", "/"];
const PUBLIC_API_PREFIXES = [
    "/api/auth/login",
    "/api/public/",
];

function isPublicPage(pathname: string) {
    return PUBLIC_PAGES.includes(pathname);
}

function isPublicApi(pathname: string) {
    return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isStaticAsset(pathname: string) {
    return (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/favicon") ||
        pathname === "/robots.txt" ||
        pathname === "/sitemap.xml"
    );
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (isStaticAsset(pathname)) {
        return NextResponse.next();
    }

    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const publicPage = isPublicPage(pathname);
    const publicApi = isPublicApi(pathname);

    // Allow public auth endpoints and public pages when logged out
    if (!token) {
        if (publicPage || publicApi) {
            return NextResponse.next();
        }

        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
        }

        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const { payload } = await jwtVerify(token, secret, {
            algorithms: ["HS256"],
        });

        const userId = payload.sub as string | undefined;
        const role = payload.role as string | undefined;

        // If logged in and trying to visit login page, send to dashboard
        if (publicPage) {
            return NextResponse.redirect(new URL("/dashboard", req.url));
        }

        const requestHeaders = new Headers(req.headers);

        if (userId) requestHeaders.set("x-user-id", userId);
        if (role) requestHeaders.set("x-user-role", role);

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    } catch {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 401 });
        }

        const res = NextResponse.redirect(new URL("/", req.url));
        res.cookies.delete(SESSION_COOKIE);
        return res;
    }
}

export const config = {
    matcher: ["/", "/login", "/dashboard/:path*", "/api/:path*"],
};