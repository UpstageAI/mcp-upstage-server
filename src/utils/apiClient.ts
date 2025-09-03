import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import * as retry from 'retry';
import { createReadStream } from 'fs';
import { API_CONFIG } from './constants';

interface ApiRequestOptions {
  apiKey: string;
  files?: Record<string, any>;
  data?: Record<string, any>;
  json?: Record<string, any>;
}

export class ApiClient {
  private readonly headers: Record<string, string>;

  constructor(apiKey: string) {
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'x-upstage-client': 'mcp',
    };
  }

  async makeRequest(
    url: string,
    options: ApiRequestOptions,
    operation: string = 'API request'
  ): Promise<any> {
    const retryOperation = retry.operation({
      retries: API_CONFIG.RETRY_ATTEMPTS - 1,
      factor: 2,
      minTimeout: API_CONFIG.RETRY_DELAY,
      maxTimeout: API_CONFIG.RETRY_DELAY * 4,
    });

    return new Promise((resolve, reject) => {
      retryOperation.attempt(async (currentAttempt) => {
        try {
          const response = await this.sendRequest(url, options);
          resolve(response.data);
        } catch (error) {
          if (error instanceof AxiosError) {
            const message = error.response?.data?.message || error.message;
            const status = error.response?.status;
            
            // Don't retry client errors (except rate limiting)
            if (status && status >= 400 && status < 500 && status !== 429) {
              reject(new Error(`${operation} failed: ${message}`));
              return;
            }
            
            const retryError = new Error(`${operation} failed: ${message}`);
            if (!retryOperation.retry(retryError)) {
              reject(retryOperation.mainError() || retryError);
              return;
            }
            
            console.error(
              `${operation} attempt ${currentAttempt} failed. ${retryOperation.attempts()} attempts left.`
            );
          } else {
            const err = error instanceof Error ? error : new Error(String(error));
            if (!retryOperation.retry(err)) {
              reject(retryOperation.mainError() || err);
            }
          }
        }
      });
    });
  }

  private async sendRequest(url: string, options: ApiRequestOptions): Promise<any> {
    const config: AxiosRequestConfig = {
      timeout: API_CONFIG.TIMEOUT,
      headers: { ...this.headers },
    };

    if (options.files) {
      // Handle file upload with FormData
      const formData = new FormData();
      
      // Add files
      for (const [key, filePath] of Object.entries(options.files)) {
        if (typeof filePath === 'string') {
          formData.append(key, createReadStream(filePath));
        } else {
          formData.append(key, filePath);
        }
      }
      
      // Add additional data fields
      if (options.data) {
        for (const [key, value] of Object.entries(options.data)) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
      
      // Update headers with FormData headers
      config.headers = { ...config.headers, ...formData.getHeaders() };
      
      return axios.post(url, formData, config);
    } else if (options.json) {
      // Handle JSON request
      config.headers!['Content-Type'] = 'application/json';
      return axios.post(url, options.json, config);
    } else {
      // Handle form data without files
      const formData = new FormData();
      if (options.data) {
        for (const [key, value] of Object.entries(options.data)) {
          formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
        }
      }
      
      Object.assign(config.headers!, formData.getHeaders());
      
      return axios.post(url, formData, config);
    }
  }
}

export async function makeApiRequest(
  url: string,
  apiKey: string,
  options: Omit<ApiRequestOptions, 'apiKey'>,
  operation?: string
): Promise<any> {
  const client = new ApiClient(apiKey);
  return client.makeRequest(url, { ...options, apiKey }, operation);
}