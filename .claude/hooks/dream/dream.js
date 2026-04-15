'use strict';
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// __dirname = {project}/.claude/hooks/dream
const root      = path.resolve(__dirname, '../../..');
const claudeDir = path.join(root, '.claude');

const SESSIONS_DIR   = path.join(claudeDir, 'learning', 'sessions');
const GLOBAL_MD      = path.join(claudeDir, 'learning', 'global.md');
const AGENTS_DIR     = path.join(claudeDir, 'learning', 'agents');
const META_PATH      = path.join(claudeDir, 'learning', '.dream-meta.json');
const MAX_SESSIONS   = 20;

function readMeta() {
  try { return JSON.parse(fs.readFileSync(META_PATH, 'utf8')); } catch { return {}; }
}

function writeMeta(meta) {
  fs.mkdirSync(path.dirname(META_PATH), { recursive: true });
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf8');
}

function loadSessions() {
  const meta      = readMeta();
  const lastDream = meta.lastDreamAt ? new Date(meta.lastDreamAt) : new Date(0);
  const allObs    = [];

  try {
    const files = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.jsonl'))
      .sort(); // chronological by filename (YYYY-MM-DD)

    for (const file of files) {
      const lines = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8')
        .split('\n').filter(Boolean);
      for (const line of lines) {
        try { allObs.push(JSON.parse(line)); } catch {}
      }
    }
  } catch {}

  // Sort by ts, take last MAX_SESSIONS, tag new ones
  allObs.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const recent = allObs.slice(-MAX_SESSIONS);
  return { recent, lastDream };
}

function formatSession(obs, isNew) {
  const star = isNew ? '★ ' : '  ';
  const ts   = obs.ts.slice(0, 16).replace('T', ' ');
  const agents = obs.agents_run.map(a => a.type).join(', ') || 'none';
  const skills = obs.skills_read.join(', ') || 'none';

  const lines = [`${star}${ts} | agents:[${agents}] | skills:[${skills}]`];
  lines.push(`  Human messages:`);
  obs.human_messages.forEach((m, i) => lines.push(`    ${i + 1}. "${m}"`));

  for (const ag of obs.agents_run) {
    if (ag.output_preview) {
      lines.push(`  ${ag.type} output: "${ag.output_preview}"`);
    }
  }
  return lines.join('\n');
}

function buildPrompt(recent, lastDream) {
  const sessionBlocks = recent
    .map(obs => formatSession(obs, new Date(obs.ts) > lastDream))
    .join('\n\n');

  return `You analyze recent Claude Code sessions and write one-line rules to prevent repeated mistakes.
★ = new since last dream. These are fresh signal.

## Sessions

${sessionBlocks}

## Where to write rules

- ${AGENTS_DIR}/{type}.md   — for corrections tied to a specific agent type
- ${GLOBAL_MD}              — for corrections that apply to every agent
- ${root}/.claude/skills/{name}/SKILL.md — fix a skill file that caused the mistake

## Instructions

1. Read each target file before writing so you do not duplicate existing rules.
2. Only write a rule if the SAME correction appears in 2 or more sessions.
3. Write one-line rules only. Be specific, not vague.
4. Maximum 5 new rules per run total across all files.
5. Append rules to the relevant file. Add a comment: <!-- dream ${new Date().toISOString().slice(0, 10)} -->

Good rule: "Never use em-dashes. Use commas or short sentences instead."
Bad rule:  "Be more careful with formatting."

Analyze the sessions now and write the rules.`;
}

function main() {
  const { recent, lastDream } = loadSessions();
  if (recent.length === 0) { process.exit(0); return; }

  const prompt = buildPrompt(recent, lastDream);

  // Ensure target directories exist so Claude can write to them
  fs.mkdirSync(AGENTS_DIR, { recursive: true });
  fs.mkdirSync(path.join(claudeDir, 'learning'), { recursive: true });
  if (!fs.existsSync(GLOBAL_MD)) fs.writeFileSync(GLOBAL_MD, '', 'utf8');

  // Spawn a one-shot Claude Haiku session with Write and Edit access
  const result = spawnSync(
    'claude',
    [
      '-p', prompt,
      '--model', 'claude-haiku-4-5-20251001',
      '--allowedTools', 'Read,Write,Edit',
      '--output-format', 'text',
    ],
    { cwd: root, encoding: 'utf8', timeout: 120_000 },
  );

  if (result.error) {
    process.stderr.write(`dream: claude spawn failed: ${result.error.message}\n`);
  }

  // Update meta so next shouldDream() check works correctly
  writeMeta({ lastDreamAt: new Date().toISOString() });
}

main();
