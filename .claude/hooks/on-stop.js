'use strict';
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// __dirname = {project}/.claude/hooks
const root      = path.resolve(__dirname, '../..');
const claudeDir = path.join(root, '.claude');

const COOLDOWN_MS  = 4 * 3_600_000; // 4 hours
const MIN_SESSIONS = 3;              // minimum new sessions before dreaming

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(raw);
    const { session_id, transcript_path } = event;
    if (!transcript_path || !fs.existsSync(transcript_path)) { process.exit(0); return; }

    const obs = parseSession(session_id || 'unknown', transcript_path);
    writeObservation(obs);

    if (shouldDream()) spawnDream();
  } catch {}
  process.exit(0);
});

function parseSession(sessionId, transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
  const humanMessages = [];
  const agentsRun     = [];
  const skillsRead    = new Set();
  let pendingAgent    = null;

  for (const line of lines) {
    let e; try { e = JSON.parse(line); } catch { continue; }
    const role    = e.message?.role;
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      // Every human message, verbatim
      if (role === 'user' && block.type === 'text') {
        const text = (block.text || '').trim();
        if (text.length > 2) humanMessages.push(text.slice(0, 300));
      }

      // Agent output arrives as a tool_result
      if (role === 'user' && block.type === 'tool_result' && pendingAgent) {
        const parts = Array.isArray(block.content)
          ? block.content
          : [{ type: 'text', text: String(block.content || '') }];
        const meta = parts.find(p => p.type === 'text' && p.text?.includes('agentId:'));
        if (meta) {
          const output = parts
            .filter(p => p !== meta && p.type === 'text' && p.text)
            .map(p => p.text).join('\n').trim();
          agentsRun.push({
            type:           pendingAgent.type,
            prompt_preview: pendingAgent.prompt,
            output_preview: output.slice(0, 400).replace(/\s+/g, ' '),
          });
          pendingAgent = null;
        }
      }

      // Track what was spawned and what was read
      if (role === 'assistant' && block.type === 'tool_use') {
        if (block.name === 'Agent') {
          const t = (block.input?.subagent_type || 'unknown')
            .replace(/^[^:]+:/, '').toLowerCase();
          pendingAgent = { type: t, prompt: (block.input?.prompt || '').slice(0, 150) };
        }
        if (block.name === 'Read') {
          const m = (block.input?.file_path || '').match(/skills\/([^/]+)\/SKILL\.md$/i);
          if (m) skillsRead.add(m[1]);
        }
      }
    }
  }

  return {
    id:              `sess-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    ts:              new Date().toISOString(),
    session_id:      sessionId,
    transcript_path: transcriptPath,
    human_messages:  humanMessages,
    agents_run:      agentsRun,
    skills_read:     [...skillsRead],
  };
}

function writeObservation(obs) {
  const sessionsDir = path.join(claudeDir, 'learning', 'sessions');
  fs.mkdirSync(sessionsDir, { recursive: true });
  const dateStr = obs.ts.slice(0, 10); // YYYY-MM-DD
  const filePath = path.join(sessionsDir, `${dateStr}.jsonl`);
  fs.appendFileSync(filePath, JSON.stringify(obs) + '\n', 'utf8');
}

function shouldDream() {
  const meta      = readMeta();
  const lastDream = meta.lastDreamAt ? new Date(meta.lastDreamAt) : new Date(0);

  if (meta.lastDreamAt) {
    const elapsed = Date.now() - lastDream.getTime();
    if (elapsed < COOLDOWN_MS) return false;
  }

  // Count sessions written since last dream
  const sessionsDir = path.join(claudeDir, 'learning', 'sessions');
  let newCount = 0;
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl'));
    for (const file of files) {
      const lines = fs.readFileSync(path.join(sessionsDir, file), 'utf8')
        .split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const obs = JSON.parse(line);
          if (new Date(obs.ts) > lastDream) newCount++;
        } catch {}
      }
    }
  } catch {}

  return newCount >= MIN_SESSIONS;
}

function spawnDream() {
  const dreamScript = path.join(claudeDir, 'hooks', 'dream', 'dream.js');
  const child = spawn(process.execPath, [dreamScript], {
    detached: true,
    stdio:    'ignore',
    cwd:      root,
  });
  child.unref();
}

function readMeta() {
  const metaPath = path.join(claudeDir, 'learning', '.dream-meta.json');
  try { return JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch { return {}; }
}
