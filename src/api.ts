import { Platform } from 'react-native';
import type { CatalogEntry, LoginResult, Region, Spool, SpoolUpdate } from './types';

export class BambuApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BambuApiError';
    this.status = status;
  }
}

function apiBase() {
  const configured = process.env.EXPO_PUBLIC_API_BASE?.replace(/\/$/, '');
  if (configured) return configured;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (window.location.port === '8081') {
      return `${window.location.protocol}//${window.location.hostname}:8787`;
    }
    return '';
  }
  return '';
}

async function request(
  path: string,
  options: {
    method?: string;
    body?: Record<string, unknown>;
  } = {},
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${apiBase()}${path}`, {
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

  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new BambuApiError('服务返回了无法识别的数据。', response.status);
    }
  }

  if (response.status === 401) {
    throw new BambuApiError(
      typeof data.error === 'string' ? data.error : '登录已过期，请重新登录。',
      401,
    );
  }
  if (!response.ok) {
    throw new BambuApiError(
      typeof data.error === 'string'
        ? data.error
        : `请求失败（${response.status}）。`,
      response.status,
    );
  }
  return data;
}

export async function login(
  region: Region,
  email: string,
  password: string,
): Promise<LoginResult> {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { region, email, password },
  });
  if (data.kind === 'success') return { kind: 'success' };
  if (data.kind === 'code-required') {
    return {
      kind: 'code-required',
      message:
        typeof data.message === 'string'
          ? data.message
          : '验证码已发送，请输入验证码。',
    };
  }
  if (data.kind === 'tfa-required') {
    return {
      kind: 'tfa-required',
      message:
        typeof data.message === 'string'
          ? data.message
          : '当前版本暂不支持双重验证登录。',
      tfaKey: typeof data.tfaKey === 'string' ? data.tfaKey : '',
    };
  }
  throw new BambuApiError('登录失败，请检查账号信息。');
}

export async function loginWithCode(
  region: Region,
  email: string,
  code: string,
): Promise<void> {
  await request('/api/auth/verify', {
    method: 'POST',
    body: { region, email, code },
  });
}

export async function loginWithTfa(
  region: Region,
  email: string,
  tfaKey: string,
  code: string,
): Promise<void> {
  await request('/api/auth/tfa', {
    method: 'POST',
    body: { region, email, tfaKey, code },
  });
}

export async function logout() {
  await request('/api/auth/logout', { method: 'POST' });
}

export async function getSpools(): Promise<Spool[]> {
  const data = await request('/api/spools');
  if (!Array.isArray(data.spools)) {
    throw new BambuApiError('耗材库数据格式无效。');
  }
  return data.spools as Spool[];
}

export async function updateSpool(
  spool: Spool,
  update: SpoolUpdate,
): Promise<Spool> {
  await request('/api/spools', {
    method: 'PUT',
    body: {
      id: spool.id,
      filamentName: spool.filamentName ?? spool.displayName ?? '',
      ...update,
    },
  });
  return { ...spool, ...update };
}

export async function deleteSpool(id: number): Promise<void> {
  await request('/api/spools', {
    method: 'DELETE',
    body: { id },
  });
}

export async function getCatalog(): Promise<{
  catalog: CatalogEntry[];
  presets: CatalogEntry[];
}> {
  const data = await request('/api/catalog');
  return {
    catalog: Array.isArray(data.catalog) ? (data.catalog as CatalogEntry[]) : [],
    presets: Array.isArray(data.presets) ? (data.presets as CatalogEntry[]) : [],
  };
}
