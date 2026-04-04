import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config } from 'dotenv';

const envFileCandidates = [
  resolve(process.cwd(), 'server', '.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '..', '.env'),
  resolve(process.cwd(), '..', 'server', '.env'),
];

const uniqueCandidates = [...new Set(envFileCandidates)];

for (const path of uniqueCandidates) {
  if (existsSync(path)) {
    config({ path, override: false });
  }
}
