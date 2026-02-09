import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.API_BASE_URL || 'https://puntomodel.onrender.com';
const SOURCE_FILE = 'docs/endpoints.generated.md';

const parseEndpoints = (content) => {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.split('->')[0].trim())
    .map((line) => {
      const match = line.match(/^-\\s+([A-Z]+)\\s+(\\S+)/);
      if (!match) return null;
      return { method: match[1], path: match[2] };
    })
    .filter(Boolean);
};

const shouldVerify = ({ method, path }) => {
  if (!['GET', 'HEAD'].includes(method)) return false;
  if (path.includes(':')) return false;
  return true;
};

const run = async () => {
  const content = await fs.readFile(SOURCE_FILE, 'utf8');
  const endpoints = parseEndpoints(content).filter(shouldVerify);

  if (endpoints.length === 0) {
    console.log('Nenhum endpoint elegivel para verificacao.');
    return;
  }

  console.log(`Verificando ${endpoints.length} endpoints em ${BASE_URL}`);

  for (const endpoint of endpoints) {
    const url = new URL(endpoint.path, BASE_URL).toString();
    const start = performance.now();
    try {
      const response = await fetch(url, { method: endpoint.method });
      const elapsed = Math.round(performance.now() - start);
      console.log(`${endpoint.method} ${endpoint.path} -> ${response.status} (${elapsed}ms)`);
    } catch (error) {
      const elapsed = Math.round(performance.now() - start);
      console.log(`${endpoint.method} ${endpoint.path} -> ERROR (${elapsed}ms) ${error?.message || error}`);
    }
  }
};

run().catch((error) => {
  console.error('Falha ao verificar endpoints:', error);
  process.exit(1);
});
