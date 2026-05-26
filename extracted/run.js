'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const VERSION = '5.5.0';
const INDEX_FILE = path.join(__dirname, './index.js');

let restartCount = 0;
let lastRestart = 0;
const MAX_RESTART = 10;
const RESTART_WINDOW = 60000;

function log(emoji, msg) {
    const time = new Date().toLocaleTimeString('id-ID');
    console.log(`[${time}] ${emoji} ${msg}`);
}

function start() {
    const now = Date.now();

    if (now - lastRestart < RESTART_WINDOW) {
        restartCount++;
    } else {
        restartCount = 0;
    }

    if (restartCount >= MAX_RESTART) {
        log('❌', `Bot restart ${MAX_RESTART}x dalam 1 menit. Dihentikan.`);
        process.exit(1);
    }

    lastRestart = now;

    log('🚀', `CPANEL VIP V${VERSION} — Starting...`);

    const child = spawn(process.argv[0], ['--no-deprecation', INDEX_FILE], {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: { ...process.env, NODE_ENV: 'production' },
    });

    child.on('message', (data) => {
        if (data === 'reset' || data === 'restart') {
            log('🔄', 'Restart diminta oleh bot...');
            child.kill();
        }
    });

    child.on('exit', (code) => {
        if (code === 0) {
            log('✅', 'Bot berhenti normal.');
            return;
        }

        log('⚠️', `Bot crash (code: ${code}). Auto-restart dalam 3 detik...`);
        setTimeout(start, 3000);
    });

    child.on('error', (err) => {
        log('❌', `Spawn error: ${err.message}`);
        setTimeout(start, 5000);
    });
}

console.clear();
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`💎 CPANEL VIP V${VERSION}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

start();
