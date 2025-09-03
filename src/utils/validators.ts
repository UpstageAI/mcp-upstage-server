import { promises as fs } from 'fs';
import path from 'path';
import { ALLOWED_EXTENSIONS, FILE_LIMITS } from './constants';

export async function validateFileExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${filePath}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

export async function validateFileSize(filePath: string, maxSize: number = FILE_LIMITS.MAX_SIZE): Promise<void> {
  const stats = await fs.stat(filePath);
  if (stats.size > maxSize) {
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    throw new Error(`File size (${sizeMB}MB) exceeds maximum allowed size (${maxSizeMB}MB)`);
  }
}

export function validateFileExtension(
  filePath: string,
  allowedExtensions: readonly string[]
): void {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error(
      `Unsupported file format: ${ext}. Supported formats: ${allowedExtensions.join(', ')}`
    );
  }
}

export async function validateDocumentFile(filePath: string): Promise<void> {
  await validateFileExists(filePath);
  validateFileExtension(filePath, ALLOWED_EXTENSIONS.DOCUMENT_PARSING);
  await validateFileSize(filePath);
}

export async function validateExtractionFile(filePath: string): Promise<void> {
  await validateFileExists(filePath);
  validateFileExtension(filePath, ALLOWED_EXTENSIONS.INFO_EXTRACTION);
  await validateFileSize(filePath);
}