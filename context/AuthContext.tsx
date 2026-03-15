"use client";

import {
    createContext,
    useContext,
    useMemo,
    useState,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import type {
    User,
    UserRole,
} from "@prisma/client";

type AuthCtx = {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;

    // role helpers
    role: UserRole | null;
    isWebsiteOwner: boolean;
    isAdmin: boolean;
    isBoardMember: boolean;
    isMember: boolean;

    // permission helpers
    hasRole: (role: UserRole) => boolean;
    hasAnyRole: (roles: UserRole[]) => boolean;
    canAccessAdmin: boolean;
    canManageMembers: boolean;
    canManageTeams: boolean;
    canManageFinances: boolean;
    canManageResources: boolean;

    // actions
    setUser: (u: User | null) => void;
    refresh: () => void;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({
    children,
    initialUser,
}: {
    children: React.ReactNode;
    initialUser: User | null;
}) {
    const router = useRouter();
    const [user, _setUser] = useState<User | null>(initialUser);
    const [loading, setLoading] = useState(false);

    const setUser = useCallback((u: User | null) => {
        _setUser(u);
    }, []);

    const refresh = useCallback(() => {
        router.refresh();
    }, [router]);

    const signOut = useCallback(async () => {
        setLoading(true);

        try {
            const res = await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "include",
            });

            if (!res.ok) {
                console.error("Logout failed:", await res.text());
            }

            _setUser(null);
            router.push("/login");
            router.refresh();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setLoading(false);
        }
    }, [router]);

    const value = useMemo<AuthCtx>(() => {
        const role = user?.role ?? null;
        const isAuthenticated = !!user;

        const hasRole = (targetRole: UserRole) => role === targetRole;

        const hasAnyRole = (roles: UserRole[]) =>
            !!role && roles.includes(role);

        const isWebsiteOwner = role === "WEBSITE_OWNER";
        const isAdmin = role === "ADMIN";
        const isBoardMember = role === "BOARD_MEMBER";
        const isMember = role === "MEMBER";

        // permission grouping
        const canAccessAdmin = hasAnyRole([
            "WEBSITE_OWNER",
            "ADMIN",
            "BOARD_MEMBER",
        ]);

        const canManageMembers = hasAnyRole([
            "WEBSITE_OWNER",
            "ADMIN",
            "BOARD_MEMBER",
        ]);

        const canManageTeams = hasAnyRole([
            "WEBSITE_OWNER",
            "ADMIN",
            "BOARD_MEMBER",
        ]);

        const canManageFinances = hasAnyRole([
            "WEBSITE_OWNER",
            "ADMIN",
        ]);

        const canManageResources = hasAnyRole([
            "WEBSITE_OWNER",
            "ADMIN",
            "BOARD_MEMBER",
        ]);

        return {
            user,
            loading,
            isAuthenticated,

            role,
            isWebsiteOwner,
            isAdmin,
            isBoardMember,
            isMember,

            hasRole,
            hasAnyRole,
            canAccessAdmin,
            canManageMembers,
            canManageTeams,
            canManageFinances,
            canManageResources,

            setUser,
            refresh,
            signOut,
        };
    }, [user, loading, setUser, refresh, signOut]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within <AuthProvider>");
    }
    return ctx;
}