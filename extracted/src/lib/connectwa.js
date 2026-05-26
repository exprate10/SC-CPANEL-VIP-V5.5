const { default: makeWASocket, Browsers, DisconnectReason, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");

let bot;

const SESSIONS_DIR = "./sessions";
const SESSIONS_FILE = "./sessions/active_sessions.json";
const sessions = new Map();

function ensureSessionDir(number) {
  const dir = `${SESSIONS_DIR}/${number}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function updateActiveSessions() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(Array.from(sessions.keys()), null, 2));
  } catch (error) {}
}

async function restoreWhatsAppSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) { fs.writeFileSync(SESSIONS_FILE, "[]"); return; }
    const activeSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
    for (const number of activeSessions) {
      try { await startWhatsAppSession(number); await new Promise(r => setTimeout(r, 5000)); } catch (e) {}
    }
  } catch (error) {}
}

async function startWhatsAppSession(number, chatId, messageId = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const sessionPath = ensureSessionDir(number);
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

      const waClient = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.ubuntu("Chrome"),
        markOnlineOnConnect: true,
        syncFullHistory: false,
        defaultQueryTimeoutMs: 60000,
        connectTimeoutMs: 60000,
      });

      if (chatId && messageId && bot) {
        try { await bot.api.editMessageText(chatId, messageId, `Menghubungkan WhatsApp: ${number}...`); } catch (e) {}
      }

      if (!waClient.authState.creds.registered) {
        try {
          const code = await waClient.requestPairingCode(number);
          if (!code) throw new Error("Pairing code tidak diterima");
          const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
          const messageText = `📲 Kode pairing untuk ${number}:\n\n<code>${formattedCode}</code>\n\n⚠️ Kode hanya valid 1 menit!\n\nCara input:\n1. Buka WhatsApp\n2. Perangkat Tertaut\n3. Tautkan Perangkat\n4. Pilih "Masukkan kode"\n5. Masukkan kode di atas`;

          if (chatId && bot) {
            try {
              if (messageId) await bot.api.editMessageText(chatId, messageId, messageText, { parse_mode: 'HTML' });
              else await bot.api.sendMessage(chatId, messageText, { parse_mode: 'HTML' });
            } catch (e) { await bot.api.sendMessage(chatId, messageText, { parse_mode: 'HTML' }); }
          }
        } catch (error) {
          if (chatId && bot) { try { await bot.api.sendMessage(chatId, `❌ Gagal pairing: ${error.message}`); } catch (e) {} }
          reject(error);
          return;
        }
      }

      waClient.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "open") {
          sessions.set(number, waClient);
          updateActiveSessions();
          if (chatId && bot) { try { await bot.api.sendMessage(chatId, `✅ WhatsApp ${number} terhubung!`); } catch (e) {} }
          resolve(waClient);
        } else if (connection === "close") {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
            setTimeout(() => startWhatsAppSession(number, chatId, messageId).then(resolve).catch(reject), 5000);
          } else {
            sessions.delete(number);
            updateActiveSessions();
            try { fs.rmSync(sessionPath, { recursive: true, force: true }); } catch (e) {}
            if (chatId && bot) { try { await bot.api.sendMessage(chatId, `❌ WhatsApp ${number} logout.`); } catch (e) {} }
            reject(new Error(`Session ${number} logged out`));
          }
        }
      });

      waClient.ev.on("creds.update", saveCreds);
    } catch (error) { reject(error); }
  });
}

function setBotInstance(botInstance) {
  bot = botInstance;
  console.log("✅ Bot instance set for WhatsApp session manager");
}

module.exports = { sessions, startWhatsAppSession, restoreWhatsAppSessions, updateActiveSessions, setBotInstance };