export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) {
    return '***';
  }

  const [local, domain] = parts;
  const firstChar = local && local.length > 0 ? local[0] : '';
  return `${firstChar}***@${domain}`;
}
