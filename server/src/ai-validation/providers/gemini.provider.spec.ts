import { GeminiValidationProvider } from './gemini.provider';

describe('GeminiValidationProvider', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  const setMockFetch = (value: {
    ok: boolean;
    status?: number;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  }): void => {
    const mock = jest.fn().mockResolvedValue(value as Response);
    global.fetch = mock as unknown as typeof fetch;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'test-gemini-key';
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('parses JSON content from model response', async () => {
    setMockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'Result: {"valid": true, "confidence": 0.88}',
                  },
                ],
              },
            },
          ],
        }),
    });

    const provider = new GeminiValidationProvider();
    const result = await provider.validate({
      letter: 'B',
      categoryName: 'Animal',
      answer: 'Bear',
      knownAnswers: ['Bear'],
    });

    expect(result).toEqual({ valid: true, confidence: 0.88 });
  });

  it('throws when response text does not include JSON object', async () => {
    setMockFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          candidates: [
            {
              content: {
                parts: [{ text: 'not-json' }],
              },
            },
          ],
        }),
    });

    const provider = new GeminiValidationProvider();
    await expect(
      provider.validate({
        letter: 'B',
        categoryName: 'Animal',
        answer: 'Bear',
        knownAnswers: [],
      }),
    ).rejects.toThrow('No JSON object found in model response');
  });

  it('throws when Gemini request fails', async () => {
    setMockFetch({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });

    const provider = new GeminiValidationProvider();
    await expect(
      provider.validate({
        letter: 'B',
        categoryName: 'Animal',
        answer: 'Bear',
        knownAnswers: [],
      }),
    ).rejects.toThrow('Gemini request failed (429): rate limited');
  });
});
