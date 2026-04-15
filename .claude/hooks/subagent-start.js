'use strict';
const fs   = require('fs');
const path = require('path');

// __dirname = {project}/.claude/hooks
const root      = path.resolve(__dirname, '../..');
const claudeDir = path.join(root, '.claude');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => raw += c);
process.stdin.on('end', () => {
  try {
    const event     = JSON.parse(raw);
    const agentType = (event.agent_type || '').replace(/^[^:]+:/, '').trim().toLowerCase();
    const parts     = [];

    // Global lessons — apply to every agent
    const global = readFile(path.join(claudeDir, 'learning', 'global.md'));
    if (global) parts.push(`### Global Learnings\n\n${global}`);

    // Agent-specific lessons
    if (agentType) {
      const learned = readFile(path.join(claudeDir, 'learning', 'agents', `${agentType}.md`));
      if (learned) parts.push(`### Learnings for ${agentType}\n\n${learned}`);
    }

    if (parts.length === 0) { process.exit(0); return; }

    const attr = agentType ? ` agent="${agentType}"` : '';
    process.stdout.write(`<mnemosyne${attr}>\n\n${parts.join('\n\n')}\n\n</mnemosyne>\n`);
  } catch {}
  process.exit(0);
});

function readFile(p) {
  try { return fs.readFileSync(p, 'utf8').trim(); } catch { return ''; }
}
