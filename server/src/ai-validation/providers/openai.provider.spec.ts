import { OpenAiValidationProvider } from './openai.provider';

describe('OpenAiValidationProvider', () => {
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
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('parses JSON content from model response', async () => {
    setFetchMock({
      choices: [
        {
          message: {
            content: 'Result: {"valid": true, "confidence": 0.93}',
          },
        },
      ],
    });

    const provider = new OpenAiValidationProvider();
    const result = await provider.validate({
      letter: 'B',
      categoryName: 'Animal',
      answer: 'Bear',
      knownAnswers: ['Bear'],
    });

    expect(result).toEqual({ valid: true, confidence: 0.93 });
  });

  it('throws when response is malformed JSON content', async () => {
    setFetchMock({
      choices: [{ message: { content: 'not-json' } }],
    });

    const provider = new OpenAiValidationProvider();
    await expect(
      provider.validate({
        letter: 'B',
        categoryName: 'Animal',
        answer: 'Bear',
        knownAnswers: [],
      }),
    ).rejects.toThrow('No JSON object found in model response');
  });
});
