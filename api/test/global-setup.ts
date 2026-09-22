import { execSync } from 'node:child_process';
import { testEnv } from './test-env.js';

export default function setup() {
  execSync('pnpm prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: testEnv.DATABASE_URL },
  });
}
