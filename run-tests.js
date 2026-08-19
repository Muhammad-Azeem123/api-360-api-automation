const { spawn } = require('child_process');
const env = (process.argv[2] || 'dev').toLowerCase().trim();
process.env.ENV = env;

// Forward all arguments after the environment to Playwright, wrapping paths with spaces in quotes
const args = process.argv.slice(3);
const escapedArgs = args.map(arg => {
  if (arg.includes(' ') && !arg.startsWith('"') && !arg.startsWith("'")) {
    return `"${arg}"`;
  }
  return arg;
});
const playwrightArgs = ['playwright', 'test', ...escapedArgs];

console.log(`\n======================================================================`);
console.log(`[Launcher] Running Playwright tests in ${env.toUpperCase()} environment...`);
console.log(`[Launcher] Command: npx ${playwrightArgs.join(' ')}`);
console.log(`======================================================================\n`);

const child = spawn('npx', playwrightArgs, { stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  process.exit(code || 0);
});
