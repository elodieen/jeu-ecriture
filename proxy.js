// Proxy local Anthropic — démarre avec: node proxy.js
// La clé API est lue depuis .env.server (jamais exposée au frontend)
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Charger .env.server sans dépendance externe
try {
  const raw = fs.readFileSync(path.join(__dirname, '.env.server'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.server absent — on utilise l'environnement tel quel
}

const PORT = 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌  ANTHROPIC_API_KEY introuvable.');
  console.error('    Crée un fichier .env.server avec : ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const SYSTEM_PROMPT =
  "Tu es un assembleur narratif. Voici les contributions de chaque personnage pour ce temps. " +
  "Coud-les en un texte fluide SANS réécrire leur voix. Tu peux ajouter maximum 3 transitions " +
  "courtes entre crochets ex: [La salle se vide.]. Les contradictions sont des tensions narratives, " +
  "garde-les telles quelles.";

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer((req, res) => {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/assemble') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let contributions;
      try {
        ({ contributions } = JSON.parse(body));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'JSON invalide' }));
        return;
      }

      const userContent = contributions
        .map(c => `${c.personnage} : "${c.texte}"`)
        .join('\n');

      const payload = JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userContent }],
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      };

      const apiReq = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', chunk => { data += chunk; });
        apiRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error.message);
            const text = parsed.content[0].text;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ histoire: text }));
            console.log(`✓  Histoire assemblée (${text.length} chars)`);
          } catch (e) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });

      apiReq.on('error', e => {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      apiReq.write(payload);
      apiReq.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`✓  Proxy Anthropic → http://localhost:${PORT}/assemble`);
});
