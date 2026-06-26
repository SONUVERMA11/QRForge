/**
 * QRForge — Input Validation Schemas
 * 
 * Fastify JSON Schema validation for all API endpoints.
 * These run BEFORE route handlers — invalid requests never reach business logic.
 */

// URL regex: basic but effective
const URL_PATTERN = '^https?:\\/\\/.+';

export const schemas = {
  // ─── Auth ──────────────────────────────────────────
  register: {
    body: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 8, maxLength: 128 },
        name: { type: 'string', minLength: 1, maxLength: 100 },
        orgName: { type: 'string', minLength: 1, maxLength: 100 },
      },
      additionalProperties: false,
    },
  },

  login: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 1 },
      },
      additionalProperties: false,
    },
  },

  // ─── QR Codes ──────────────────────────────────────
  createQR: {
    body: {
      type: 'object',
      required: ['destinationUrl'],
      properties: {
        label: { type: 'string', maxLength: 200 },
        destinationUrl: { type: 'string', pattern: URL_PATTERN, maxLength: 2048 },
        tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20 },
        folderId: { type: 'string' },
        customCode: { type: 'string', minLength: 4, maxLength: 20 },
        scanLimit: { type: 'integer', minimum: 1 },
        expiresAt: { type: 'string' },
        fallbackUrl: { type: 'string', pattern: URL_PATTERN },
        password: { type: 'string', minLength: 4, maxLength: 50 },
        styleConfig: {
          type: 'object',
          properties: {
            fgColor: { type: 'string' },
            bgColor: { type: 'string' },
            dotStyle: { type: 'string' },
            cornerStyle: { type: 'string' },
            logoUrl: { type: 'string' },
            errorCorrection: { type: 'string', enum: ['L', 'M', 'Q', 'H'] },
          },
        },
      },
      additionalProperties: false,
    },
  },

  updateQR: {
    body: {
      type: 'object',
      properties: {
        label: { type: 'string', maxLength: 200 },
        tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20 },
        folderId: { type: ['string', 'null'] },
        isActive: { type: 'boolean' },
        scanLimit: { type: ['integer', 'null'], minimum: 1 },
        expiresAt: { type: ['string', 'null'] },
        fallbackUrl: { type: ['string', 'null'] },
      },
      additionalProperties: false,
    },
  },

  // ─── Redirects ─────────────────────────────────────
  setRedirect: {
    body: {
      type: 'object',
      required: ['destinationUrl'],
      properties: {
        destinationUrl: { type: 'string', pattern: URL_PATTERN, maxLength: 2048 },
        notes: { type: 'string', maxLength: 500 },
      },
      additionalProperties: false,
    },
  },

  // ─── Rules ─────────────────────────────────────────
  createRule: {
    body: {
      type: 'object',
      required: ['conditionType', 'destinationUrl'],
      properties: {
        conditionType: {
          type: 'string',
          enum: ['time_window', 'geo_country', 'geo_region', 'device_type', 'scan_count', 'scheduled', 'ab_test', 'always'],
        },
        conditionValue: { type: 'object' },
        destinationUrl: { type: 'string', pattern: URL_PATTERN, maxLength: 2048 },
        label: { type: 'string', maxLength: 200 },
        priority: { type: 'integer', minimum: 0, maximum: 999 },
      },
      additionalProperties: false,
    },
  },
};

export default schemas;
