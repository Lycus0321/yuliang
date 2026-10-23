type Region = "china" | "global";

type SessionData = {
  token: string;
  region: Region;
  email?: string;
  exp: number;
};

type Env = {
  SESSION_SECRET: string;
  ASSETS?: Fetcher;
  LOGIN_RATE_LIMITER?: RateLimit;
};

const COOKIE_NAME = "yuliang_session";
const SESSION_MAX_AGE = 80 * 24 * 60 * 60;
const API_HOSTS: Record<Region, string> = {
  china: "api.bambulab.cn",
  global: "api.bambulab.com",
};
const WEB_HOSTS: Record<Region, string> = {
  china: "https://bambulab.cn",
  global: "https://bambulab.com",
};

function isRegion(value: unknown): value is Region {
  return value === "china" || value === "global";
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return null;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = allowedOrigin(request);
  if (!origin) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Accept,Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    Vary: "Origin",
  };
}

function json(
  request: Request,
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request),
      ...extraHeaders,
    },
  });
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sessionKey(secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptSession(session: SessionData, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await sessionKey(secret);
  const encoded = new TextEncoder().encode(JSON.stringify(session));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(cipher))}`;
}

async function decryptSession(value: string, secret: string): Promise<SessionData | null> {
  try {
    const [ivPart, cipherPart] = value.split(".");
    if (!ivPart || !cipherPart) return null;
    const key = await sessionKey(secret);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(ivPart) },
      key,
      base64UrlToBytes(cipherPart),
    );
    const session = JSON.parse(new TextDecoder().decode(plain)) as SessionData;
    if (!session.token || !isRegion(session.region) || session.exp <= Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("Cookie") || "";
  for (const part of cookie.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

async function getSession(request: Request, env: Env) {
  const cookie = readCookie(request, COOKIE_NAME);
  if (!cookie) return null;
  return decryptSession(cookie, env.SESSION_SECRET);
}

async function sessionCookie(
  request: Request,
  env: Env,
  data: { token: string; region: Region; email?: string },
) {
  const session: SessionData = {
    ...data,
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const value = await encryptSession(session, env.SESSION_SECRET);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;
}

function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`;
}

async function readJson(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function bambuRequest(
  region: Region,
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`https://${API_HOSTS[region]}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { response, data: null };
    }
  }
  return { response, data };
}

async function loginBambu(
  request: Request,
  env: Env,
  body: { region: Region; email: string; password?: string; code?: string },
) {
  const payload = body.code
    ? { account: body.email, code: body.code }
    : { account: body.email, password: body.password || "", apiError: "" };
  const { response, data } = await bambuRequest(
    body.region,
    "/v1/user-service/user/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok || !data) {
    return json(
      request,
      {
        error:
          response.status === 400
            ? "账号、密码、验证码或地区不正确。"
            : `拓竹云登录失败（${response.status}）。`,
      },
      response.status === 400 ? 400 : 502,
    );
  }

  const token = data.accessToken;
  if (typeof token === "string" && token) {
    const cookie = await sessionCookie(request, env, {
      token,
      region: body.region,
      email: body.email,
    });
    return json(
      request,
      { kind: "success" },
      200,
      { "Set-Cookie": cookie },
    );
  }
  if (data.loginType === "verifyCode") {
    return json(request, {
      kind: "code-required",
      message: "验证码已发送，请输入邮箱或短信中的验证码。",
    });
  }
  if (data.loginType === "tfa") {
    return json(request, {
      kind: "tfa-required",
      message: "该账号启用了双重验证。当前 Cloudflare Worker 无法通过 Bambu 的浏览器校验，请暂时使用邮箱/短信验证码登录方式。",
    });
  }
  return json(request, { error: "拓竹云返回了未知的登录状态。" }, 502);
}

function setCookies(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (extended.getSetCookie) return extended.getSetCookie();
  const value = headers.get("set-cookie");
  return value ? value.split(/,(?=\s*[A-Za-z0-9_-]+=)/) : [];
}

function cookieValue(values: string[], name: string) {
  for (const value of values) {
    const match = value.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function loginTfaBambu(
  request: Request,
  env: Env,
  body: { region: Region; email: string; tfaKey: string; code: string },
) {
  const csrfResponse = await fetch(`${WEB_HOSTS[body.region]}/api/csrf`, {
    headers: { Accept: "application/json" },
  });
  const csrf = cookieValue(setCookies(csrfResponse.headers), "bbl_csrf_token");
  if (!csrf) {
    return json(request, { error: "无法获取 Bambu 双重验证会话。" }, 502);
  }

  const response = await fetch(`${WEB_HOSTS[body.region]}/api/sign-in/tfa`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-bbl-csrf-token": csrf,
      Cookie: `bbl_csrf_token=${csrf}`,
    },
    body: JSON.stringify({ tfaKey: body.tfaKey, tfaCode: body.code }),
  });
  const cookies = setCookies(response.headers);
  let token = cookieValue(cookies, "token");
  if (!token) {
    const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    token = typeof data?.accessToken === "string" ? data.accessToken : null;
  }
  if (!response.ok || !token) {
    return json(request, { error: "双重验证码无效或已过期。" }, 400);
  }

  const cookie = await sessionCookie(request, env, {
    token,
    region: body.region,
    email: body.email,
  });
  return json(request, { kind: "success" }, 200, { "Set-Cookie": cookie });
}

async function getSpools(request: Request, session: SessionData) {
  const spools: unknown[] = [];
  let offset = 0;
  for (let page = 0; page < 50; page += 1) {
    const { response, data } = await bambuRequest(
      session.region,
      `/v1/design-user-service/my/filament/v2?offset=${offset}&limit=100`,
      {},
      session.token,
    );
    if (!response.ok || !data) {
      return json(
        request,
        { error: `读取耗材库失败（${response.status}）。` },
        response.status === 401 ? 401 : 502,
      );
    }
    const hits = Array.isArray(data.hits) ? data.hits : [];
    spools.push(...hits.map(normalizeSpoolRecord));
    const total = typeof data.total === "number" ? data.total : spools.length;
    offset += hits.length;
    if (!hits.length || offset >= total) break;
  }
  return json(request, { spools });
}

function normalizeSpoolRecord(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const raw = value as Record<string, unknown>;
  const slotId = raw.slotId ?? raw.slot_id;
  const amsId = raw.amsId ?? raw.ams_id;
  const inPrinter = raw.inPrinter ?? raw.in_printer;
  const deviceName = raw.deviceName ?? raw.device_name;
  const devId = raw.devId ?? raw.dev_id;
  const parsedSlotId = toOptionalNumber(slotId);
  const parsedAmsId = toOptionalNumber(amsId);
  const hasMapping =
    parsedSlotId !== undefined &&
    parsedAmsId !== undefined &&
    (typeof deviceName === "string" || typeof devId === "string");
  return {
    ...raw,
    inPrinter:
      inPrinter === null || inPrinter === undefined
        ? hasMapping
        : inPrinter === true ||
          inPrinter === 1 ||
          String(inPrinter).toLowerCase() === "true",
    deviceName: typeof deviceName === "string" ? deviceName : undefined,
    devId,
    amsSn: raw.amsSn ?? raw.ams_sn,
    amsId: parsedAmsId,
    slotId: parsedSlotId,
    amsType: toOptionalNumber(raw.amsType ?? raw.ams_type),
  };
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function updateSpool(request: Request, session: SessionData, body: Record<string, unknown>) {
  if (typeof body.id !== "number") {
    return json(request, { error: "缺少料盘 ID。" }, 400);
  }
  const { response, data } = await bambuRequest(
    session.region,
    "/v1/design-user-service/my/filament/v2",
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
    session.token,
  );
  if (!response.ok) {
    return json(
      request,
      { error: `更新耗材失败（${response.status}）。` },
      response.status === 401 ? 401 : 502,
    );
  }
  return json(request, { ok: true, data });
}

async function deleteSpool(request: Request, session: SessionData, body: Record<string, unknown>) {
  if (typeof body.id !== "number") {
    return json(request, { error: "缺少料盘 ID。" }, 400);
  }
  const { response, data } = await bambuRequest(
    session.region,
    "/v1/design-user-service/my/filament/v2/batch",
    {
      method: "DELETE",
      body: JSON.stringify({ ids: [body.id] }),
    },
    session.token,
  );
  if (!response.ok) {
    return json(
      request,
      { error: `删除耗材失败（${response.status}）。` },
      response.status === 401 ? 401 : 502,
    );
  }
  return json(request, { ok: true, data });
}

function firstValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || "");
  return String(value || "");
}

function normalizeCatalog(raw: Record<string, unknown> | null) {
  const entries = Array.isArray(raw?.filamentSettings) ? raw.filamentSettings : [];
  return entries
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
    .map((entry) => ({
      vendor: String(entry.filamentVendor || ""),
      material: String(entry.filamentType || ""),
      name: String(entry.filamentName || ""),
      filamentId: String(entry.filamentId || ""),
    }))
    .filter((entry) => entry.vendor && entry.name);
}

function normalizePresets(raw: Record<string, unknown> | null) {
  const filament =
    raw?.filament && typeof raw.filament === "object"
      ? (raw.filament as Record<string, unknown>)
      : null;
  const entries = Array.isArray(filament?.private) ? filament.private : [];
  const unique = new Map<string, Record<string, string>>();
  for (const value of entries) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const filamentId = String(entry.filament_id || "");
    if (!filamentId || unique.has(filamentId)) continue;
    unique.set(filamentId, {
      vendor: firstValue(entry.filament_vendor),
      material: firstValue(entry.filament_type),
      name: String(entry.name || filamentId).split(" @")[0].trim(),
      filamentId,
    });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function getCatalog(request: Request, session: SessionData) {
  const [catalogResult, presetsResult] = await Promise.all([
    bambuRequest(
      session.region,
      "/v1/design-user-service/filament/config",
      {},
      session.token,
    ),
    bambuRequest(
      session.region,
      "/v1/iot-service/api/slicer/setting?version=1.10.0.89",
      {},
      session.token,
    ),
  ]);
  if (!catalogResult.response.ok || !catalogResult.data) {
    return json(
      request,
      { error: `读取官方耗材目录失败（${catalogResult.response.status}）。` },
      502,
    );
  }
  return json(request, {
    catalog: normalizeCatalog(catalogResult.data),
    presets:
      presetsResult.response.ok && presetsResult.data
        ? normalizePresets(presetsResult.data)
        : [],
  });
}

async function isAuthRateLimited(request: Request, env: Env) {
  if (!env.LOGIN_RATE_LIMITER) return false;
  const clientKey =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For") ||
    "unknown";
  const outcome = await env.LOGIN_RATE_LIMITER.limit({
    key: `bambu-auth:${clientKey.split(",")[0].trim()}`,
  });
  return !outcome.success;
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (path === "/api/health") return json(request, { ok: true });

  if (path === "/api/auth/login" && request.method === "POST") {
    if (await isAuthRateLimited(request, env)) {
      return json(
        request,
        { error: "登录尝试过于频繁，请稍后再试。" },
        429,
        { "Retry-After": "60" },
      );
    }
    const body = await readJson(request);
    if (!body || !isRegion(body.region) || typeof body.email !== "string") {
      return json(request, { error: "登录参数不完整。" }, 400);
    }
    return loginBambu(request, env, {
      region: body.region,
      email: body.email,
      password: typeof body.password === "string" ? body.password : undefined,
    });
  }

  if (path === "/api/auth/verify" && request.method === "POST") {
    if (await isAuthRateLimited(request, env)) {
      return json(
        request,
        { error: "验证码尝试过于频繁，请稍后再试。" },
        429,
        { "Retry-After": "60" },
      );
    }
    const body = await readJson(request);
    if (
      !body ||
      !isRegion(body.region) ||
      typeof body.email !== "string" ||
      typeof body.code !== "string"
    ) {
      return json(request, { error: "验证码参数不完整。" }, 400);
    }
    return loginBambu(request, env, {
      region: body.region,
      email: body.email,
      code: body.code,
    });
  }

  if (path === "/api/auth/tfa" && request.method === "POST") {
    if (await isAuthRateLimited(request, env)) {
      return json(
        request,
        { error: "双重验证尝试过于频繁，请稍后再试。" },
        429,
        { "Retry-After": "60" },
      );
    }
    const body = await readJson(request);
    if (
      !body ||
      !isRegion(body.region) ||
      typeof body.email !== "string" ||
      typeof body.tfaKey !== "string" ||
      typeof body.code !== "string"
    ) {
      return json(request, { error: "双重验证参数不完整。" }, 400);
    }
    return loginTfaBambu(request, env, {
      region: body.region,
      email: body.email,
      tfaKey: body.tfaKey,
      code: body.code,
    });
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    return json(
      request,
      { ok: true },
      200,
      { "Set-Cookie": clearSessionCookie(request) },
    );
  }

  const session = await getSession(request, env);
  if (path === "/api/auth/session") {
    if (!session) return json(request, { authenticated: false }, 401);
    return json(request, {
      authenticated: true,
      region: session.region,
      email: session.email,
    });
  }

  if (!session) return json(request, { error: "登录已过期，请重新登录。" }, 401);
  if (path === "/api/spools" && request.method === "GET") {
    return getSpools(request, session);
  }
  if (path === "/api/catalog" && request.method === "GET") {
    return getCatalog(request, session);
  }
  if (path === "/api/spools" && request.method === "PUT") {
    const body = await readJson(request);
    if (!body) return json(request, { error: "更新参数无效。" }, 400);
    return updateSpool(request, session, body);
  }
  if (path === "/api/spools" && request.method === "DELETE") {
    const body = await readJson(request);
    if (!body) return json(request, { error: "删除参数无效。" }, 400);
    return deleteSpool(request, session, body);
  }
  return json(request, { error: "接口不存在。" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!env.SESSION_SECRET) {
      return json(request, { error: "Worker 未配置 SESSION_SECRET。" }, 500);
    }
    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env);
    }
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
