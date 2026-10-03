export const PAGINATION = {
  MAX_PAGE_SIZE: 100,
  CURSOR_MAX_LENGTH: 512,
  BASE64URL: /^[A-Za-z0-9_-]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  INVALID_CURSOR: 'Invalid cursor',
} as const;
