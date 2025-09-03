import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function saveJsonToFile(
  data: any,
  filePath: string,
  options: { indent?: number } = {}
): Promise<void> {
  const { indent = 2 } = options;
  const jsonContent = JSON.stringify(data, null, indent);
  await fs.writeFile(filePath, jsonContent, 'utf-8');
}

export async function readJsonFile(filePath: string): Promise<any> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

export async function readFileAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString('base64');
}

export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', 
    '.png': 'image/png',
    '.bmp': 'image/bmp',
    '.gif': 'image/gif',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
    '.heic': 'image/heic',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}

export function getOutputDirectory(subDir: string): string {
  return path.join(os.homedir(), '.mcp-upstage', 'outputs', subDir);
}

export function generateTimestampedFilename(originalPath: string, suffix: string = 'upstage'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const baseName = path.basename(originalPath, path.extname(originalPath));
  return `${baseName}_${timestamp}_${suffix}.json`;
}