import { Platform } from 'react-native';
import type { CatalogEntry, LoginResult, Region, Session, Spool, SpoolUpdate } from './types';

export class BambuApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BambuApiError';
    this.status = status;
  }
}

const API_HOSTS: Record<Region, string> = {
  china: 'api.bambulab.cn',
  global: 'api.bambulab.com',
};

const WEB_HOSTS: Record<Region, string> = {
  china: 'https://bambulab.cn',
  global: 'https://bambulab.com',
};

const directMode = Platform.OS !== 'web';

function workerApiBase() {
  if (typeof window !== 'undefined' && window.location.port === '8081') {
    return `${window.location.protocol}//${window.location.hostname}:8787`;
  }
  return '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return {} as Record<string, unknown>;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new BambuApiError('服务返回了无法识别的数据。', response.status);
  }
}

async function workerRequest(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${workerApiBase()}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new BambuApiError('无法连接服务，请检查网络后重试。');
  }

  const data = await parseJsonResponse(response);
  if (response.status === 401) {
    throw new BambuApiError(
      typeof data.error === 'string' ? data.error : '登录已过期，请重新登录。',
      401,
    );
  }
  if (!response.ok) {
    throw new BambuApiError(
      typeof data.error === 'string' ? data.error : `请求失败（${response.status}）。`,
      response.status,
    );
  }
  return data;
}

async function directRequest(
  region: Region,
  path: string,
  init: RequestInit = {},
  token?: string,
) {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`https://${API_HOSTS[region]}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new BambuApiError('无法连接拓竹服务，请检查网络后重试。');
  }

  const text = await response.text();
  let data: Record<string, unknown> | null = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }
  return { response, data };
}

function parseLoginResult(
  data: Record<string, unknown>,
  region: Region,
  email: string,
): LoginResult {
  if (data.kind === 'success') {
    return {
      kind: 'success',
      session: { region, email: email.trim(), demo: false },
    };
  }
  if (data.kind === 'code-required') {
    return {
      kind: 'code-required',
      message:
        typeof data.message === 'string'
          ? data.message
          : '验证码已发送，请输入邮箱或短信中的验证码。',
    };
  }
  if (data.kind === 'tfa-required') {
    return {
      kind: 'tfa-required',
      message:
        typeof data.message === 'string'
          ? data.message
          : '该账号启用了双重验证，请输入验证器中的验证码。',
      tfaKey: typeof data.tfaKey === 'string' ? data.tfaKey : '',
    };
  }
  throw new BambuApiError('登录失败，请检查账号信息。');
}

async function directLogin(
  region: Region,
  email: string,
  password?: string,
  code?: string,
): Promise<LoginResult> {
  const payload = code
    ? { account: email, code }
    : { account: email, password: password || '', apiError: '' };
  const { response, data } = await directRequest(
    region,
    '/v1/user-service/user/login',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok || !data) {
    throw new BambuApiError(
      response.status === 400
        ? '账号、密码、验证码或地区不正确。'
        : `拓竹云登录失败（${response.status}）。`,
      response.status === 400 ? 400 : 502,
    );
  }

  const token = data.accessToken;
  if (typeof token === 'string' && token) {
    return {
      kind: 'success',
      session: { token, region, email: email.trim(), demo: false },
    };
  }
  if (data.loginType === 'verifyCode') {
    return {
      kind: 'code-required',
      message: '验证码已发送，请输入邮箱或短信中的验证码。',
    };
  }
  if (data.loginType === 'tfa') {
    const tfaKey = data.tfaKey ?? data.tfa_key;
    return {
      kind: 'tfa-required',
      message: '该账号启用了双重验证，请输入验证器中的验证码。',
      tfaKey: typeof tfaKey === 'string' ? tfaKey : '',
    };
  }
  throw new BambuApiError('拓竹云返回了未知的登录状态。', 502);
}

function readSetCookies(headers: Headers) {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (extended.getSetCookie) return extended.getSetCookie();
  const value = headers.get('set-cookie');
  return value ? value.split(/,(?=\s*[A-Za-z0-9_-]+=)/) : [];
}

function cookieValue(values: string[], name: string) {
  for (const value of values) {
    const match = value.match(new RegExp(`(?:^|,\\s*)${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

async function directLoginWithTfa(
  region: Region,
  email: string,
  tfaKey: string,
  code: string,
): Promise<Session> {
  if (!tfaKey) throw new BambuApiError('双重验证会话已失效，请重新登录。');

  let csrfResponse: Response;
  try {
    csrfResponse = await fetch(`${WEB_HOSTS[region]}/api/csrf`, {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new BambuApiError('无法连接拓竹验证服务，请检查网络后重试。');
  }
  const csrf = cookieValue(readSetCookies(csrfResponse.headers), 'bbl_csrf_token');
  if (!csrf) throw new BambuApiError('无法获取拓竹双重验证会话。', 502);

  let response: Response;
  try {
    response = await fetch(`${WEB_HOSTS[region]}/api/sign-in/tfa`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-bbl-csrf-token': csrf,
        Cookie: `bbl_csrf_token=${csrf}`,
      },
      body: JSON.stringify({ tfaKey, tfaCode: code }),
    });
  } catch {
    throw new BambuApiError('无法连接拓竹验证服务，请检查网络后重试。');
  }

  const responseData = asRecord(await response.json().catch(() => null));
  const token =
    cookieValue(readSetCookies(response.headers), 'token') ||
    (typeof responseData?.accessToken === 'string' ? responseData.accessToken : null);
  if (!response.ok || !token) {
    throw new BambuApiError('双重验证码无效或已过期。', 400);
  }
  return { token, region, email: email.trim(), demo: false };
}

function requireToken(session: Session) {
  if (!session.token) throw new BambuApiError('登录已过期，请重新登录。', 401);
  return session.token;
}

function toOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeSpoolRecord(value: unknown): Spool {
  if (!value || typeof value !== 'object') return value as Spool;
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
    (typeof deviceName === 'string' || typeof devId === 'string');
  return {
    ...raw,
    inPrinter:
      inPrinter === null || inPrinter === undefined
        ? hasMapping
        : inPrinter === true ||
          inPrinter === 1 ||
          String(inPrinter).toLowerCase() === 'true',
    deviceName: typeof deviceName === 'string' ? deviceName : undefined,
    devId,
    amsSn: raw.amsSn ?? raw.ams_sn,
    amsId: parsedAmsId,
    slotId: parsedSlotId,
    amsType: toOptionalNumber(raw.amsType ?? raw.ams_type),
  } as Spool;
}

async function directGetSpools(session: Session): Promise<Spool[]> {
  const token = requireToken(session);
  const spools: Spool[] = [];
  let offset = 0;
  for (let page = 0; page < 50; page += 1) {
    const { response, data } = await directRequest(
      session.region,
      `/v1/design-user-service/my/filament/v2?offset=${offset}&limit=100`,
      {},
      token,
    );
    if (!response.ok || !data) {
      throw new BambuApiError(
        `读取耗材库失败（${response.status}）。`,
        response.status === 401 ? 401 : 502,
      );
    }
    const hits = Array.isArray(data.hits) ? data.hits : [];
    spools.push(...hits.map(normalizeSpoolRecord));
    const total = typeof data.total === 'number' ? data.total : spools.length;
    offset += hits.length;
    if (!hits.length || offset >= total) break;
  }
  return spools;
}

function firstValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

function normalizeCatalog(raw: Record<string, unknown> | null): CatalogEntry[] {
  const entries = Array.isArray(raw?.filamentSettings) ? raw.filamentSettings : [];
  return entries
    .filter((entry): entry is Record<string, unknown> =>
      Boolean(entry && typeof entry === 'object'),
    )
    .map((entry) => ({
      vendor: String(entry.filamentVendor || ''),
      material: String(entry.filamentType || ''),
      name: String(entry.filamentName || ''),
      filamentId: String(entry.filamentId || ''),
    }))
    .filter((entry) => entry.vendor && entry.name);
}

function normalizePresets(raw: Record<string, unknown> | null): CatalogEntry[] {
  const filament = asRecord(raw?.filament);
  const entries = Array.isArray(filament?.private) ? filament.private : [];
  const unique = new Map<string, CatalogEntry>();
  for (const value of entries) {
    const entry = asRecord(value);
    if (!entry) continue;
    const filamentId = String(entry.filament_id || '');
    if (!filamentId || unique.has(filamentId)) continue;
    unique.set(filamentId, {
      vendor: firstValue(entry.filament_vendor),
      material: firstValue(entry.filament_type),
      name: String(entry.name || filamentId).split(' @')[0].trim(),
      filamentId,
    });
  }
  return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function directGetCatalog(session: Session) {
  const token = requireToken(session);
  const [catalogResult, presetsResult] = await Promise.all([
    directRequest(session.region, '/v1/design-user-service/filament/config', {}, token),
    directRequest(
      session.region,
      '/v1/iot-service/api/slicer/setting?version=1.10.0.89',
      {},
      token,
    ),
  ]);
  if (!catalogResult.response.ok || !catalogResult.data) {
    throw new BambuApiError(
      `读取官方耗材目录失败（${catalogResult.response.status}）。`,
      502,
    );
  }
  return {
    catalog: normalizeCatalog(catalogResult.data),
    presets:
      presetsResult.response.ok && presetsResult.data
        ? normalizePresets(presetsResult.data)
        : [],
  };
}

export async function login(
  region: Region,
  email: string,
  password: string,
): Promise<LoginResult> {
  if (directMode) return directLogin(region, email, password);
  const data = await workerRequest('/api/auth/login', {
    method: 'POST',
    body: { region, email, password },
  });
  return parseLoginResult(data, region, email);
}

export async function loginWithCode(
  region: Region,
  email: string,
  code: string,
): Promise<Session> {
  if (directMode) {
    const result = await directLogin(region, email, undefined, code);
    if (result.kind !== 'success') {
      throw new BambuApiError(result.message);
    }
    return result.session;
  }
  await workerRequest('/api/auth/verify', {
    method: 'POST',
    body: { region, email, code },
  });
  return { region, email: email.trim(), demo: false };
}

export async function loginWithTfa(
  region: Region,
  email: string,
  tfaKey: string,
  code: string,
): Promise<Session> {
  if (directMode) return directLoginWithTfa(region, email, tfaKey, code);
  await workerRequest('/api/auth/tfa', {
    method: 'POST',
    body: { region, email, tfaKey, code },
  });
  return { region, email: email.trim(), demo: false };
}

export async function logout(session: Session) {
  if (!directMode) await workerRequest('/api/auth/logout', { method: 'POST' });
}

export async function getSpools(session: Session): Promise<Spool[]> {
  if (directMode) return directGetSpools(session);
  const data = await workerRequest('/api/spools');
  if (!Array.isArray(data.spools)) {
    throw new BambuApiError('耗材库数据格式无效。');
  }
  return data.spools as Spool[];
}

export async function updateSpool(
  session: Session,
  spool: Spool,
  update: SpoolUpdate,
): Promise<Spool> {
  const body = {
    id: spool.id,
    filamentName: spool.filamentName ?? spool.displayName ?? '',
    ...update,
  };
  if (directMode) {
    const { response, data } = await directRequest(
      session.region,
      '/v1/design-user-service/my/filament/v2',
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
      requireToken(session),
    );
    if (!response.ok || !data) {
      throw new BambuApiError(
        `更新耗材失败（${response.status}）。`,
        response.status === 401 ? 401 : 502,
      );
    }
  } else {
    await workerRequest('/api/spools', { method: 'PUT', body });
  }
  return { ...spool, ...update };
}

export async function deleteSpool(session: Session, id: number): Promise<void> {
  if (directMode) {
    const { response, data } = await directRequest(
      session.region,
      '/v1/design-user-service/my/filament/v2/batch',
      {
        method: 'DELETE',
        body: JSON.stringify({ ids: [id] }),
      },
      requireToken(session),
    );
    if (!response.ok || !data) {
      throw new BambuApiError(
        `删除耗材失败（${response.status}）。`,
        response.status === 401 ? 401 : 502,
      );
    }
    return;
  }
  await workerRequest('/api/spools', {
    method: 'DELETE',
    body: { id },
  });
}

export async function getCatalog(session: Session): Promise<{
  catalog: CatalogEntry[];
  presets: CatalogEntry[];
}> {
  if (directMode) return directGetCatalog(session);
  const data = await workerRequest('/api/catalog');
  return {
    catalog: Array.isArray(data.catalog) ? (data.catalog as CatalogEntry[]) : [],
    presets: Array.isArray(data.presets) ? (data.presets as CatalogEntry[]) : [],
  };
}
