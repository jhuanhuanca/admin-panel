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
  reporter_name: string | null;
  reporter_department: string | null;
  reporter_municipality: string | null;
  author_nick: string | null;
  author_name: string | null;
  author_department: string | null;
  author_municipality: string | null;
  created_at: string | null;
}

interface Envelope<T> {
  data: T;
  errors: Record<string, string[]>;
}

function directoryQuery(query: { q?: string; department?: string; municipality?: string }): string {
  const params = new URLSearchParams();
  const q = query.q?.trim() ?? "";
  const department = query.department?.trim() ?? "";
  const municipality = query.municipality?.trim() ?? "";
  if (q !== "") params.set("q", q);
  if (department !== "") params.set("department", department);
  if (municipality !== "") params.set("municipality", municipality);
  const text = params.toString();

  return text === "" ? "" : `?${text}`;
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
): Promise<StaffProfile | "auth" | null> {
  try {
    const response = await fetch(`${API}/api/admin/me`, {
      headers: headers(token),
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 401 || response.status === 403) {
      return "auth";
    }
    if (!response.ok) {
      return null;
    }

    const body = await response.json() as Envelope<StaffProfile>;
    return body.data;
  } catch {
    return null;
  }
}

export interface StaffDebate {
  id: number;
  excerpt: string;
  author_nick: string | null;
  category: string | null;
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
  name: string | null;
  department: string | null;
  municipality: string | null;
  participation: number;
  respect: number;
  status: string;
  calculated_at: string | null;
}

export async function listLeaderCandidates(
  token: string,
  query: { q?: string; department?: string; municipality?: string } = {},
): Promise<LeaderCandidateItem[]> {
  const response = await fetch(`${API}/api/admin/leaders${directoryQuery(query)}`, {
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

export async function publishStaffDebate(
  token: string,
  debate: { body: string; context: string; category: string; image: string; video: boolean },
): Promise<string | null> {
  const image = debate.image.trim();
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/debates`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      body: debate.body.trim(),
      context: debate.context.trim(),
      category: debate.category,
      image: image === "" ? null : image,
      kind: image === "" ? "text" : debate.video ? "video" : "image",
    }),
  });

  if (response.status === 201) {
    return null;
  }

  const body = await response.json().catch(() => null) as Envelope<unknown> | null;
  const errors = body?.errors ?? {};
  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      return messages[0];
    }
  }

  return "No se pudo publicar el debate.";
}

export interface StaffNews {
  id: number;
  title: string;
  summary: string;
  source: string;
  debate_id: number | null;
  published_at: string | null;
}

export async function listStaffNews(token: string): Promise<StaffNews[]> {
  const response = await fetch(`${API}/api/admin/news`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return [];
  }

  const body = await response.json() as Envelope<StaffNews[]>;
  return body.data;
}

export async function publishStaffNews(
  token: string,
  item: { title: string; summary: string; source: string; debateId: string },
): Promise<string | null> {
  const debateId = item.debateId.trim();
  const requestHeaders = headers(token);
  requestHeaders.set("Content-Type", "application/json");
  const response = await fetch(`${API}/api/admin/news`, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify({
      title: item.title.trim(),
      summary: item.summary.trim(),
      source: item.source.trim(),
      debate_id: debateId === "" ? null : Number(debateId),
    }),
  });

  if (response.status === 201) {
    return null;
  }

  const body = await response.json().catch(() => null) as Envelope<unknown> | null;
  const errors = body?.errors ?? {};
  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      return messages[0];
    }
  }

  return "No se pudo publicar la noticia.";
}

export interface StaffHero {
  slot: "home" | "polls";
  announcement: string | null;
  kind: "image" | "video" | null;
  media: string | null;
}

export async function listStaffHeroes(token: string): Promise<{ home: StaffHero; polls: StaffHero }> {
  const empty = (slot: "home" | "polls"): StaffHero => ({
    slot,
    announcement: null,
    kind: null,
    media: null,
  });
  const response = await fetch(`${API}/api/admin/heroes`, {
    headers: headers(token),
  });
  if (!response.ok) {
    return { home: empty("home"), polls: empty("polls") };
  }

  const body = await response.json() as Envelope<{ home: StaffHero; polls: StaffHero }>;
  return body.data;
}

export async function saveStaffHero(token: string, form: FormData): Promise<string | null> {
  const response = await fetch(`${API}/api/admin/heroes`, {
    method: "POST",
    headers: headers(token),
    body: form,
  });

  if (response.ok) {
    return null;
  }

  const body = await response.json().catch(() => null) as Envelope<unknown> | null;
  const errors = body?.errors ?? {};
  for (const messages of Object.values(errors)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      return messages[0];
    }
  }

  return "No se pudo guardar el fondo.";
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
  name: string | null;
  department: string | null;
  municipality: string | null;
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
  query: { q?: string; department?: string; municipality?: string } = {},
): Promise<DashboardData | null> {
  const response = await fetch(`${API}/api/admin/dashboard${directoryQuery(query)}`, {
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
