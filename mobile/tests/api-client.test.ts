import { ApiClient } from '../src/lib/api-client';

describe('ApiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('tries the next base URL when the first one fails', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

    global.fetch = fetchMock as typeof fetch;

    const client = new ApiClient(['http://10.0.2.2:3000', 'http://192.168.1.17:3000']);

    const result = await client.request('/auth/register', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://10.0.2.2:3000/auth/register', expect.anything());
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://192.168.1.17:3000/auth/register', expect.anything());
    expect(result).toEqual({ ok: true });
  });
});
