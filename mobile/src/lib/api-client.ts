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
}

export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { accessToken, headers, ...requestOptions } = options;
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...requestOptions,
      headers: {
        accept: 'application/json',
        ...(requestOptions.body ? { 'content-type': 'application/json' } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
    });
    if (response.status === 204) {
      return undefined as T;
    }
    const body = await response.json() as T & ApiErrorBody;
    if (!response.ok) {
      throw new ApiError(
        response.status,
        body.error?.code ?? 'REQUEST_FAILED',
        body.error?.message ?? 'No fue posible completar la solicitud.',
      );
    }
    return body;
  }
}
