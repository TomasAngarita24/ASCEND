export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface ApiRequestOptions extends RequestInit {
  accessToken?: string;
  timeoutMs?: number;
}

export class ApiClient {
  constructor(private readonly baseUrls: string | readonly string[]) {}

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { accessToken, headers, timeoutMs = 8000, ...requestOptions } = options;
    const baseUrls = Array.isArray(this.baseUrls) ? this.baseUrls : [this.baseUrls];
    let lastError: unknown;

    for (const baseUrl of baseUrls) {
      try {
        const response = await this.fetchWithTimeout(`${baseUrl}${path}`, {
          ...requestOptions,
          headers: {
            accept: 'application/json',
            ...(requestOptions.body ? { 'content-type': 'application/json' } : {}),
            ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
            ...headers,
          },
          signal: requestOptions.signal,
        }, timeoutMs);

        if (response.status === 204) {
          return undefined as T;
        }

        const responseText = typeof response.text === 'function' ? await response.text() : null;
        const body = responseText && responseText.length > 0
          ? JSON.parse(responseText) as T & ApiErrorBody
          : typeof response.json === 'function'
            ? await response.json() as T & ApiErrorBody
            : undefined;

        if (!response.ok) {
          throw new ApiError(
            response.status,
            (body as ApiErrorBody | undefined)?.error?.code ?? 'REQUEST_FAILED',
            (body as ApiErrorBody | undefined)?.error?.message ?? 'No fue posible completar la solicitud.',
          );
        }

        return body as T;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }

    throw new Error('No fue posible conectar con ASCEND.');
  }

  private fetchWithTimeout(input: RequestInfo, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('La solicitud tardó demasiado y no pudo completarse.'));
      }, timeoutMs);

      fetch(input, init)
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}
