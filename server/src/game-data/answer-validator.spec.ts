import { validateAnswer } from './answer-validator';

describe('validateAnswer', () => {
  it('rejects unknown answers when category has no known answers', () => {
    const result = validateAnswer('B', 'Bengal Tiger', []);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('no_match');
  });

  it('rejects answers with wrong letter before any matching', () => {
    const result = validateAnswer('B', 'Tiger', ['Tiger']);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('wrong_letter');
  });
});
