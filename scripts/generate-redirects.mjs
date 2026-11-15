import { mkdirSync, writeFileSync } from 'node:fs';

const target = (process.env.API_PROXY_TARGET || '').trim().replace(/\/+$/, '');

if (!/^https?:\/\//.test(target)) {
  const message = 'API_PROXY_TARGET не задан или указан без https://';
  if (process.env.NETLIFY) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`${message}. Файл dist/_redirects не создан.`);
  process.exit(0);
}

mkdirSync('dist', { recursive: true });
writeFileSync('dist/_redirects', `/api/*  ${target}/api/:splat  200!\n`);
console.log(`dist/_redirects: /api/* -> ${target}/api/*`);