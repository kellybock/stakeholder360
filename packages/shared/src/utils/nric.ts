import { createHash } from 'crypto';

export function hashNric(nric: string): string {
  const normalized = nric.toUpperCase().trim();
  return createHash('sha256').update(normalized).digest('hex');
}

export function maskNric(nric: string): string {
  if (nric.length < 4) return '****';
  return `${nric[0]}****${nric.slice(-3)}`;
}

export function validateNricFormat(nric: string): boolean {
  return /^[STFGM]\d{7}[A-Z]$/i.test(nric.trim());
}
