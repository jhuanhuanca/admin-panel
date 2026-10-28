const API = Deno.env.get("ADMIN_API_URL") ?? "http://127.0.0.1:8000";

export interface StaffProfile {
  name: string;
  role: string;
}

export interface ReportItem {
  id: number;
  status: string;
  reason: string;
  body: string | null;
  target_type: string;
  target_id: number;
  excerpt: string;
  reporter_nick: string | null;
  author_nick: string | null;
  created_at: string | null;
}

interface Envelope<T> {
  data: T;
  errors: Record<string, string[]>;
}

function headers(token?: string): Headers {
  const value = new Headers({
    Accept: "application/json",
    "X-Admin-Request": "1",
  });

  if (token) {
    value.set("Authorization", `Bearer ${token}`);
  }

  return value;
}

export interface StaffChallenge {
  pending: "setup" | "code";
  challenge: string;
  secret?: string;
  otpauth?: string;
}

export async function loginStaff(
  email: string,
  password: string,
): Promise<StaffChallenge | null> {
  const requestHeaders = headers();
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/auth/login`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json() as Envelope<StaffChallenge>;
  return body.data;
}

export async function confirmStaffTotp(
  challenge: string,
  code: string,
): Promise<{ token: string } | "codigo" | "expirado"> {
  const requestHeaders = headers();
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/auth/totp`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ challenge, code }),
  });

  if (response.ok) {
    const body = await response.json() as Envelope<{ token: string }>;
    return { token: body.data.token };
  }

  const body = await response.json().catch(() => null) as
    | Envelope<unknown>
    | null;
  const message = body?.errors?.auth?.[0] ?? "";
  return message.includes("expiró") ? "expirado" : "codigo";
}

export async function staffProfile(
  token: string,
): Promise<StaffProfile | null> {
  const response = await fetch(`${API}/api/admin/me`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return null;
  }

  const body = await response.json() as Envelope<StaffProfile>;
  return body.data;
}

export interface StaffDebate {
  id: number;
  excerpt: string;
  author_nick: string | null;
  closed: boolean;
  featured: boolean;
  created_at: string | null;
}

export async function listStaffDebates(token: string): Promise<StaffDebate[]> {
  const response = await fetch(`${API}/api/admin/debates`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.json() as Envelope<StaffDebate[]>;
  return body.data;
}

export interface LeaderCandidateItem {
  id: number;
  nick: string | null;
  participation: number;
  respect: number;
  status: string;
  calculated_at: string | null;
}

export async function listLeaderCandidates(
  token: string,
): Promise<LeaderCandidateItem[]> {
  const response = await fetch(`${API}/api/admin/leaders`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.json() as Envelope<LeaderCandidateItem[]>;
  return body.data;
}

export async function decideLeader(
  token: string,
  id: number,
  status: "accepted" | "set_aside" | "pending",
): Promise<boolean> {
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/leaders/${id}/decision`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ status }),
  });

  return response.ok;
}

export async function setDebateState(
  token: string,
  id: number,
  action: "close" | "reopen" | "feature" | "unfeature",
): Promise<boolean> {
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/debates/${id}/state`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ action }),
  });

  return response.ok;
}

export interface DashboardUser {
  nick: string;
  created_at: string | null;
  metrics_consent: boolean;
  device_registered: boolean;
  last_seen_at: string | null;
}

export interface DashboardData {
  counts: {
    users: number;
    open_reports: number;
    debates: number;
  };
  users: DashboardUser[];
}

export interface KpiPlatform {
  debates: number;
  arguments: number;
  votes: number;
  news: number;
  voices: number;
  open_reports: number;
  consented: number;
}

export interface KpiScores {
  profiles: number;
  participation: number | null;
  quality: number | null;
  respect: number | null;
  influence: number | null;
}

export interface KpiDebate {
  id: number;
  excerpt: string;
  author_nick: string | null;
  arguments: number;
  replies: number;
  reactions: number;
  favor: number;
  contra: number;
  shares: number;
}

export interface KpiData {
  platform: KpiPlatform;
  scores: KpiScores;
  debates: KpiDebate[];
}

export async function loadKpis(token: string): Promise<KpiData | null> {
  const response = await fetch(`${API}/api/admin/kpis`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return null;
  }

  const body = await response.json() as Envelope<KpiData>;
  return body.data;
}

export interface StatusData {
  database: "ok" | "down";
  queue: {
    driver: string;
    pending: number;
    failed: number;
  };
  attention: {
    open_reports: number;
    sanctions: number;
    leaders: number;
  };
  failure: {
    name: string;
    failed_at: string | null;
  } | null;
}

export async function loadStatus(token: string): Promise<StatusData | null> {
  const response = await fetch(`${API}/api/admin/status`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return null;
  }

  const body = await response.json() as Envelope<StatusData>;
  return body.data;
}

export async function loadDashboard(
  token: string,
): Promise<DashboardData | null> {
  const response = await fetch(`${API}/api/admin/dashboard`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return null;
  }

  const body = await response.json() as Envelope<DashboardData>;
  return body.data;
}

export async function releaseDevice(
  token: string,
  nick: string,
): Promise<boolean> {
  const response = await fetch(
    `${API}/api/admin/users/${encodeURIComponent(nick)}/release-device`,
    {
      method: "POST",
      headers: headers(token),
    },
  );

  return response.ok;
}

export interface NewerReports {
  latest: number;
  reports: ReportItem[];
}

export async function loadNewerReports(
  token: string,
  after: number,
): Promise<NewerReports | "auth" | null> {
  try {
    const response = await fetch(
      `${API}/api/admin/reports/newer?after=${after}`,
      { headers: headers(token), signal: AbortSignal.timeout(4000) },
    );
    if (response.status === 401) {
      return "auth";
    }
    if (!response.ok) {
      return null;
    }

    const body = await response.json() as Envelope<NewerReports>;
    return body.data;
  } catch {
    return null;
  }
}

export async function listReports(token: string): Promise<ReportItem[]> {
  const response = await fetch(`${API}/api/admin/reports`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.json() as Envelope<ReportItem[]>;
  return body.data;
}

export interface SanctionItem {
  id: number;
  nick: string | null;
  reason: string;
  ends_at: string | null;
  lifted: boolean;
}

export async function listSanctions(token: string): Promise<SanctionItem[]> {
  const response = await fetch(`${API}/api/admin/sanctions`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.json() as Envelope<SanctionItem[]>;
  return body.data;
}

export async function applyReportSanction(
  token: string,
  reportId: number,
  days: 1 | 7 | 30,
): Promise<boolean> {
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(
    `${API}/api/admin/reports/${reportId}/sanction`,
    {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify({ days }),
    },
  );

  return response.ok;
}

export async function liftSanction(
  token: string,
  id: number,
): Promise<boolean> {
  const response = await fetch(`${API}/api/admin/sanctions/${id}/lift`, {
    method: "POST",
    headers: headers(token),
  });

  return response.ok;
}

export async function decideReport(
  token: string,
  id: number,
  status: "resolved" | "dismissed",
): Promise<boolean> {
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/reports/${id}/decision`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({ status }),
  });

  return response.ok;
}

export async function logoutStaff(token: string): Promise<void> {
  await fetch(`${API}/api/admin/auth/logout`, {
    method: "POST",
    headers: headers(token),
  });
}
