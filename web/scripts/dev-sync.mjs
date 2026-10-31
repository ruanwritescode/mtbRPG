// Runs the Vite dev server and, every few seconds, fast-forwards the current branch from origin.
// Commits pushed from elsewhere (for example a cloud Claude session) show up in the browser within
// seconds through hot module replacement, with no rebuild. Local edits are left alone: the pull is
// skipped while the working tree has changes.
import { spawn, execSync } from 'node:child_process';

const INTERVAL = Number(process.env.SYNC_INTERVAL ?? 8) * 1000;
const cwd = new URL('..', import.meta.url).pathname;

const vite = spawn('npx', ['vite', ...process.argv.slice(2)], { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
vite.on('exit', (code) => process.exit(code ?? 0));

function sh(cmd) {
  return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
}

let last = '';
setInterval(() => {
  try {
    if (sh('git status --porcelain --untracked-files=no')) return; // local edits in progress
    const branch = sh('git rev-parse --abbrev-ref HEAD');
    sh(`git fetch --quiet origin ${branch}`);
    const behind = sh(`git rev-list --count HEAD..origin/${branch}`);
    if (behind !== '0') {
      sh(`git merge --ff-only --quiet origin/${branch}`);
      const head = sh('git log -1 --format=%h%x20%s');
      if (head !== last) console.log(`\n[dev-sync] pulled ${behind} commit(s): ${head}\n`);
      last = head;
    }
  } catch (e) {
    console.log(`[dev-sync] ${e.message.split('\n')[0]}`);
  }
}, INTERVAL);
