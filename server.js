const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Vite development server...');
console.log('Working directory:', process.cwd());

const viteProcess = spawn('npx', ['vite', '--port', '5173', '--host'], {
  cwd: path.join(__dirname),
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Vite server:', error);
});

viteProcess.on('exit', (code) => {
  console.log(`Vite server exited with code ${code}`);
});

console.log('Server process started with PID:', viteProcess.pid);
