import { OllamaValidationProvider } from './ollama.provider';

describe('OllamaValidationProvider', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  const setFetchMock = (payload: unknown) => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(payload),
      } as Response),
    );

    global.fetch = fetchMock as typeof fetch;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('parses strict JSON response payload', async () => {
    setFetchMock({ response: '{"valid": false, "confidence": 0.21}' });

    const provider = new OllamaValidationProvider();
    const result = await provider.validate({
      letter: 'B',
      categoryName: 'Animal',
      answer: 'Boat',
      knownAnswers: ['Bear'],
    });

    expect(result).toEqual({ valid: false, confidence: 0.21 });
  });

  it('throws when Ollama response field is not valid JSON', async () => {
    setFetchMock({ response: 'invalid-json' });

    const provider = new OllamaValidationProvider();
    await expect(
      provider.validate({
        letter: 'B',
        categoryName: 'Animal',
        answer: 'Boat',
        knownAnswers: [],
      }),
    ).rejects.toThrow();
  });
});
