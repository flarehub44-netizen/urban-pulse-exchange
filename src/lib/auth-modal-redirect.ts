import type { AuthModalSearch } from "@/lib/auth-modal-search";

const PUBLIC_PREFIXES = ["/", "/markets", "/live"] as const;

export function isPublicAuthPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

export function authModalRedirectTarget(
  intendedFullPath: string,
  mode: "login" | "signup",
): { pathname: string; search: AuthModalSearch } {
  const pathname = intendedFullPath.split("?")[0] || "/markets";
  const search: AuthModalSearch =
    mode === "login"
      ? { auth: "login", redirect: intendedFullPath }
      : { auth: "signup", redirect: intendedFullPath, upgrade: "1" };

  if (isPublicAuthPath(pathname)) {
    return { pathname, search };
  }
  return { pathname: "/markets", search };
}
