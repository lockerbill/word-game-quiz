import Redis from 'ioredis';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return jest.fn();
});

interface RedisCtorOptions {
  password?: string;
}

function getRedisCtorOptions(): RedisCtorOptions | undefined {
  const callsUnknown = (Redis as unknown as jest.Mock).mock.calls as unknown;
  if (!Array.isArray(callsUnknown)) {
    return undefined;
  }

  const calls = callsUnknown as readonly unknown[];
  if (calls.length === 0) {
    return undefined;
  }

  const firstCallUnknown = calls[0];
  if (!Array.isArray(firstCallUnknown)) {
    return undefined;
  }

  const firstCall = firstCallUnknown as readonly unknown[];
  if (firstCall.length < 2) {
    return undefined;
  }

  const options = firstCall[1];
  if (typeof options !== 'object' || options === null) {
    return undefined;
  }

  return options as RedisCtorOptions;
}

describe('RedisService', () => {
  const originalEnv = process.env;
  const connectMock = jest.fn();
  const getMock = jest.fn();
  const setMock = jest.fn();
  const delMock = jest.fn();
  const quitMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.REDIS_URL = 'redis://localhost:6379';

    connectMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue(null);
    setMock.mockResolvedValue('OK');
    delMock.mockResolvedValue(1);
    quitMock.mockResolvedValue('OK');

    (Redis as unknown as jest.Mock).mockImplementation(() => ({
      connect: connectMock,
      get: getMock,
      set: setMock,
      del: delMock,
      quit: quitMock,
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not pass password when REDIS_REST_TOKEN is empty', async () => {
    process.env.REDIS_REST_TOKEN = '   ';
    const service = new RedisService();

    await service.get('leaderboard:daily');

    expect(Redis).toHaveBeenCalledTimes(1);
    const options = getRedisCtorOptions();
    expect(options?.password).toBeUndefined();
  });

  it('passes password when REDIS_REST_TOKEN has a value', async () => {
    process.env.REDIS_REST_TOKEN = 'upstash-token';
    const service = new RedisService();

    await service.get('leaderboard:weekly');

    expect(Redis).toHaveBeenCalledTimes(1);
    const options = getRedisCtorOptions();
    expect(options?.password).toBe('upstash-token');
  });
});
