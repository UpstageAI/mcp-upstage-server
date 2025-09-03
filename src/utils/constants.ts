export const API_ENDPOINTS = {
  DOCUMENT_DIGITIZATION: 'https://api.upstage.ai/v1/document-digitization',
  INFORMATION_EXTRACTION: 'https://api.upstage.ai/v1/information-extraction',
  SCHEMA_GENERATION: 'https://api.upstage.ai/v1/information-extraction/schema-generation',
  DOCUMENT_CLASSIFICATION: 'https://api.upstage.ai/v1/document-classification',
} as const;

export const ALLOWED_EXTENSIONS = {
  DOCUMENT_PARSING: ['.pdf', '.jpeg', '.jpg', '.png', '.tiff', '.tif', '.bmp', '.gif', '.webp'],
  INFO_EXTRACTION: ['.jpeg', '.jpg', '.png', '.bmp', '.pdf', '.tiff', '.tif', '.heic', '.docx', '.pptx', '.xlsx'],
} as const;

export const FILE_LIMITS = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_PAGES: 100,
} as const;

export const API_CONFIG = {
  TIMEOUT: 5 * 60 * 1000, // 5 minutes in milliseconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second initial delay
} as const;