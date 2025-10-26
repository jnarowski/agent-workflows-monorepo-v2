#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const envPath = join(rootDir, '.env');
const envExamplePath = join(rootDir, '.env.example');

if (!existsSync(envPath) && existsSync(envExamplePath)) {
  console.log('📋 Creating .env from .env.example...');

  // Read template and generate secure JWT secret
  let envContent = readFileSync(envExamplePath, 'utf-8');
  const jwtSecret = randomBytes(32).toString('base64');

  // Replace placeholder JWT_SECRET with generated one
  envContent = envContent.replace(
    'JWT_SECRET=your-secret-key-change-in-production',
    `JWT_SECRET=${jwtSecret}`
  );

  writeFileSync(envPath, envContent);
  console.log('✅ .env file created with secure JWT_SECRET!');
} else if (existsSync(envPath)) {
  // .env already exists, don't overwrite
} else {
  console.warn('⚠️  No .env.example found to copy from');
}
