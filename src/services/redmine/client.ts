import { messageForStatus, RedmineApiError } from './errors';
export { RedmineApiError } from './errors';

export interface RedmineUser { id: number; firstname: string; lastname: string; login: string; }
export interface RedmineProject { id: number; name: string; identifier: string; }
export interface RedmineIssue { id: number; subject: string; description?: string; project: { id: number; name: string }; tracker?: { id: number; name: string }; status?: { id: number; name: string }; priority?: { id: number; name: string }; done_ratio?: number; fixed_version?: { id: number; name: string }; }
export interface RedmineActivity { id: number; name: string; }
export interface RedmineTimeEntry { id: number; issue?: { id: number }; project?: { id: number; name: string }; hours: number; spent_on: string; comments: string; activity?: RedmineActivity; }
export interface CreateIssuePayload {
  project_id: number;
  subject: string;
  description?: string;
  tracker_id?: number;
  status_id?: number;
  priority_id?: number;
}

type Fetcher = typeof fetch;
const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');

export class RedmineClient {
  private cache = new Map<string, { expires: number; value: unknown }>();
  constructor(private readonly baseUrl: string, private readonly apiKey: string, private readonly fetcher: Fetcher = globalThis.fetch.bind(globalThis)) {
    const parsed = new URL(baseUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Informe uma URL Redmine válida usando HTTPS ou HTTP.');
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await this.fetcher(`${normalizeUrl(this.baseUrl)}${path}`, { ...init, signal: controller.signal, headers: { Accept: 'application/json', 'X-Redmine-API-Key': this.apiKey, ...init.headers } });
      if (!response.ok) throw new RedmineApiError(response.status, messageForStatus(response.status), response.status === 429 || response.status >= 500);
      return await response.json() as T;
    } catch (error) {
      if (error instanceof RedmineApiError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new RedmineApiError(0, 'O Redmine não respondeu dentro do limite de 15 segundos.', true);
      }
      const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
      throw new RedmineApiError(0, `O Chrome bloqueou o acesso ao domínio do Redmine. Autorize o domínio solicitado pela extensão e tente novamente.${detail}`, true);
    } finally { clearTimeout(timeout); }
  }

  private async cached<T>(key: string, request: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expires > Date.now()) return hit.value as T;
    const value = await request(); this.cache.set(key, { expires: Date.now() + 30_000, value }); return value;
  }

  currentUser() { return this.request<{ user: RedmineUser }>('/users/current.json'); }
  projects() { return this.paginate<RedmineProject>('/projects.json', 'projects'); }
  issues(params: Record<string, string | number> = { assigned_to_id: 'me' }) { const query = new URLSearchParams({ limit: '100', ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])) }); return this.paginate<RedmineIssue>(`/issues.json?${query}`, 'issues'); }
  activities() { return this.cached('activities', () => this.request<{ time_entry_activities: RedmineActivity[] }>('/enumerations/time_entry_activities.json')); }
  timeEntries(params: Record<string, string | number> = {}) { const query = new URLSearchParams(Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]))); return this.paginate<RedmineTimeEntry>(`/time_entries.json?${query}`, 'time_entries'); }
  createTimeEntry(payload: { issue_id: number; hours: number; activity_id: number; comments: string; spent_on: string }) { return this.request<{ time_entry: RedmineTimeEntry }>('/time_entries.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ time_entry: payload }) }); }
  createIssue(payload: CreateIssuePayload) { return this.request<{ issue: RedmineIssue }>('/issues.json', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ issue: payload }) }); }
  issue(id: number) { return this.request<{ issue: RedmineIssue }>(`/issues/${id}.json`); }

  private async paginate<T>(path: string, key: string): Promise<T[]> {
    const items: T[] = []; let offset = 0; const limit = 100;
    while (true) {
      const separator = path.includes('?') ? '&' : '?';
      const page = await this.request<{ total_count?: number } & Record<string, T[]>>(`${path}${separator}limit=${limit}&offset=${offset}`);
      const batch = page[key] ?? []; items.push(...batch); offset += batch.length;
      if (!batch.length || offset >= (page.total_count ?? offset)) return items;
    }
  }
}

export const buildAccountId = async (url: string, userId: number) => {
  const bytes = new TextEncoder().encode(`${normalizeUrl(url)}:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};
