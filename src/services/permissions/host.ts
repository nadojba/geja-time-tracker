export const normalizeRedmineUrl = (value: string): string => {
  const parsed = new URL(value.trim());
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Informe uma URL Redmine válida usando HTTPS ou HTTP.');
  return value.trim().replace(/\/+$/, '');
};

export const redmineOriginPattern = (value: string): string => {
  const parsed = new URL(normalizeRedmineUrl(value));
  return `${parsed.protocol}//${parsed.host}/*`;
};

export const isInsecureRedmineUrl = (value: string): boolean => new URL(normalizeRedmineUrl(value)).protocol === 'http:';

export async function assertRedmineHostPermission(value: string): Promise<void> {
  const origin = redmineOriginPattern(value);
  const granted = await chrome.permissions.contains({ origins: [origin] });
  if (!granted) throw new Error(`A permissão para acessar ${origin.replace(/\/\*$/, '')} não está concedida. Volte às configurações, teste a conexão e autorize o domínio.`);
}
