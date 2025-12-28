#!/usr/bin/env node
/**
 * Expo Logger - Wraps expo commands and saves all output to expo_logs.txt
 * Usage: node scripts/expo-logger.js [expo args...]
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Use /tmp if project directory isn't writable
const projectLogFile = path.join(process.cwd(), 'expo_logs.txt');
const tmpLogFile = '/tmp/expo_logs.txt';
let logFile;
try {
  fs.accessSync(path.dirname(projectLogFile), fs.constants.W_OK);
  // Test if we can write to the file
  fs.writeFileSync(projectLogFile, '', { flag: 'a' });
  logFile = projectLogFile;
} catch {
  logFile = tmpLogFile;
}
const args = process.argv.slice(2);

// Create/clear log file with timestamp header
const startTime = new Date().toISOString();
fs.writeFileSync(logFile, `=== Expo Dev Server Started: ${startTime} ===\n\n`);

const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Spawn expo with all passed arguments
const expo = spawn('npx', ['expo', ...args], {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

// Pipe stdout to both console and log file
expo.stdout.on('data', (data) => {
  process.stdout.write(data);
  logStream.write(data);
});

// Pipe stderr to both console and log file
expo.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});

expo.on('close', (code) => {
  const endTime = new Date().toISOString();
  logStream.write(`\n=== Expo Dev Server Stopped: ${endTime} (exit code: ${code}) ===\n`);
  logStream.end();
  process.exit(code);
});

expo.on('error', (err) => {
  logStream.write(`\n=== Error: ${err.message} ===\n`);
  logStream.end();
  process.exit(1);
});
