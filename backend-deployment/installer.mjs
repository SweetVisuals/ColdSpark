import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, 'install.log');

function log(msg) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logPath, entry);
    console.log(msg);
}

log("=== STARTING CLEAN INSTALLER ===");

// 1. Delete package-lock.json
const lockPath = path.join(__dirname, 'package-lock.json');
if (fs.existsSync(lockPath)) {
    log('Deleting package-lock.json to prevent conflicts...');
    try {
        fs.unlinkSync(lockPath);
        log('Deleted package-lock.json.');
    } catch (e) {
        log(`Warning: Could not delete package-lock.json: ${e.message}`);
    }
}

// 2. Delete node_modules if it exists (Clean Slate)
const modPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(modPath)) {
    log('Deleting node_modules folder (this might take a moment)...');
    try {
        fs.rmSync(modPath, { recursive: true, force: true });
        log('Deleted node_modules.');
    } catch (e) {
        log(`Warning: Could not delete node_modules (proceeding anyway): ${e.message}`);
    }
}

// 3. Run npm install
// Added more verbose logging flag just in case
const command = 'npm install --omit=dev --no-audit --no-fund';
log(`Executing command: ${command}`);

const child = exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        log(`INSTALLATION FAILED: ${error.message}`);
        // Often stderr contains the reason even if error message matches command
    } else {
        log('INSTALLATION SUCCESS!');
    }

    if (stdout) log(`STDOUT:\n${stdout}`);
    if (stderr) log(`STDERR:\n${stderr}`);

    log("=== INSTALLER FINISHED ===");
});

// Dummy Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Clean Installer running... Check install.log\n');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    log(`Installer listening on port ${PORT}`);
});
