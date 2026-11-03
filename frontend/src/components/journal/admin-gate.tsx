"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/services/auth/use-auth";
import useLanguage from "@/services/i18n/use-language";
import { RoleEnum } from "@/services/api/types/role";

// Conduit useAuthenticatedAccount retained-page rule adapted to Brocoders auth.
// It preserves an already-open draft on expiry; it grants no API permissions.
export default function AdminGate({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth();
  const router = useRouter();
  const language = useLanguage();
  const [resolvedAdmin, setResolvedAdmin] = useState(false);
  const isAdmin = Number(user?.role?.id) === RoleEnum.ADMIN;
  useEffect(() => {
    if (isAdmin) setResolvedAdmin(true);
  }, [isAdmin]);
  useEffect(() => {
    if (!isLoaded || isAdmin || resolvedAdmin) return;
    if (user) router.replace(`/${language}`);
    else
      router.replace(
        `/${language}/sign-in?${new URLSearchParams({ returnTo: window.location.pathname })}`
      );
  }, [isLoaded, isAdmin, resolvedAdmin, user, router, language]);
  return isAdmin || resolvedAdmin ? (
    children
  ) : (
    <p role="status">Checking access…</p>
  );
}
