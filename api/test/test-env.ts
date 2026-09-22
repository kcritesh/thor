export const testEnv = {
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ??
    'postgresql://thor:thor@127.0.0.1:5433/thor_test',
  AI_PROVIDER: 'mock',
  MOCK_MODE: 'success',
  AI_TIMEOUT_MS: '300',
};
