#!/usr/bin/env node
const base = process.env.API_BASE_URL || 'https://puntomodel.onrender.com/api';

const tests = [
  { name: 'health', method: 'GET', path: '/health', expectOk: true },
  { name: 'models', method: 'GET', path: '/models?online=true', expectOk: true },
  { name: 'stats', method: 'GET', path: '/stats', expectOk: true },
  { name: 'admin users', method: 'GET', path: '/admin/users', expectOk: true },
  { name: 'admin models', method: 'GET', path: '/admin/models', expectOk: true },
];

const timeoutMs = 15000;

const runTest = async (test) => {
  const url = `${base}${test.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: test.method, signal: controller.signal });
    const text = await res.text();
    const isJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    let json = null;
    if (isJson) {
      try {
        json = JSON.parse(text);
      } catch {
        // ignore parse error
      }
    }
    const ok = res.ok && (test.expectOk ? true : true);
    const status = `${res.status} ${res.statusText}`;
    return { name: test.name, ok, status, url, isJson, json, bodyPreview: text.slice(0, 160) };
  } catch (err) {
    return { name: test.name, ok: false, status: err?.name === 'AbortError' ? 'timeout' : 'error', url, isJson: false, json: null, bodyPreview: String(err) };
  } finally {
    clearTimeout(timer);
  }
};

const main = async () => {
  console.log(`API base: ${base}`);
  const results = [];
  for (const test of tests) {
    results.push(await runTest(test));
  }

  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  const nameWidth = Math.max(...results.map((r) => r.name.length)) + 2;
  for (const r of results) {
    const status = r.ok ? 'OK' : 'FAIL';
    console.log(`${pad(r.name, nameWidth)} ${status}  ${r.status}  ${r.url}`);
    if (!r.ok) {
      console.log(`  body: ${r.bodyPreview}`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    process.exit(1);
  }
};

main();
