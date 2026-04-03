import { OllamaValidationProvider } from './ollama.provider';

describe('OllamaValidationProvider', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('parses strict JSON response payload', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        response: '{"valid": false, "confidence": 0.21}',
      }),
    })) as any;

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
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ response: 'invalid-json' }),
    })) as any;

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
