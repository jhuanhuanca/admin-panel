const COOKIE = "admin_session";
const PENDING = "admin_pending";

export interface PendingLogin {
  challenge: string;
  pending: "setup" | "code";
  secret?: string;
  otpauth?: string;
}

export function readSession(cookieHeader: string | null): string | null {
  return readCookie(cookieHeader, COOKIE);
}

export function sessionCookie(token: string): string {
  return `${COOKIE}=${encodeURIComponent(token)}; ${flags(900)}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE}=; ${flags(0)}`;
}

export function readPending(cookieHeader: string | null): PendingLogin | null {
  const raw = readCookie(cookieHeader, PENDING);
  if (raw === null) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingLogin;
    if (
      parsed.challenge &&
      (parsed.pending === "setup" || parsed.pending === "code")
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function pendingCookie(pending: PendingLogin): string {
  return `${PENDING}=${encodeURIComponent(JSON.stringify(pending))}; ${flags(300)}`;
}

export function clearPendingCookie(): string {
  return `${PENDING}=; ${flags(0)}`;
}

function flags(maxAge: number): string {
  const secure = Deno.env.get("ADMIN_COOKIE_SECURE") === "true" ? "; Secure" : "";

  return `HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (cookieHeader === null) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [cookieName, ...rest] = part.trim().split("=");
    if (cookieName === name && rest.length > 0) {
      const value = decodeURIComponent(rest.join("="));
      return value === "" ? null : value;
    }
  }

  return null;
}
