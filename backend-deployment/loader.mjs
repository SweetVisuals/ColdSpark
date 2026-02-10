import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, 'crash.log');

function log(message) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
    console.log(message);
}

log("Starting application via loader.mjs...");

process.on('uncaughtException', (err) => {
    log(`UNCAUGHT EXCEPTION: ${err.stack}`);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    log(`UNHANDLED REJECTION: ${reason}`);
});

(async () => {
    try {
        log("Importing server/index.mjs...");
        await import('./server/index.mjs');
        log("server/index.mjs imported successfully.");
    } catch (err) {
        log(`CRITICAL ERROR LOADING APP: ${err.stack}`);
        process.exit(1);
    }
})();
