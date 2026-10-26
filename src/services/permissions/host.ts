export const normalizeRedmineUrl = (value: string): string => {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
    throw new Error('Informe uma URL Redmine válida usando HTTPS ou HTTP.');
  return value.trim().replace(/\/+$/, '');
};

export const redmineOriginPattern = (value: string): string => {
  const parsed = new URL(normalizeRedmineUrl(value));
  return `${parsed.protocol}//${parsed.host}/*`;
};

export const isInsecureRedmineUrl = (value: string): boolean =>
  new URL(normalizeRedmineUrl(value)).protocol === 'http:';

export const redmineIssueUrl = (baseUrl: string, issueId: number): string => {
  const parsed = new URL(normalizeRedmineUrl(baseUrl));
  const basePath = parsed.pathname.replace(/\/+$/, '');
  parsed.pathname = `${basePath}/issues/${issueId}`;
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
};

export const redmineIssueIdFromUrl = (
  baseUrl: string,
  pageUrl: string,
): number | undefined => {
  const configured = new URL(normalizeRedmineUrl(baseUrl));
  const page = new URL(pageUrl);
  const basePath = configured.pathname.replace(/\/+$/, '');
  const issuePrefix = `${basePath}/issues/`;
  if (page.origin !== configured.origin || !page.pathname.startsWith(issuePrefix))
    return undefined;
  const match = page.pathname.slice(issuePrefix.length).match(/^(\d+)(?:\/|$)/);
  const issueId = match?.[1] ? Number(match[1]) : undefined;
  return issueId && issueId > 0 ? issueId : undefined;
};

export async function assertRedmineHostPermission(
  value: string,
): Promise<void> {
  const origin = redmineOriginPattern(value);
  const granted = await chrome.permissions.contains({ origins: [origin] });
  if (!granted)
    throw new Error(
      `A permissão para acessar ${origin.replace(/\/\*$/, '')} não está concedida. Volte às configurações, teste a conexão e autorize o domínio.`,
    );
}
