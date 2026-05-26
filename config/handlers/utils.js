/**
 * SC-CPANEL VIP V5.5 - Shared Utilities
 * Common functions used across all handler modules
 */

const fs = require('fs');
const axios = require('axios');

const E = {
  diamond: '💎',
  crown: '👑',
  fire: '⚡',
  star: '🌟',
  bolt: '🔥',
  rocket: '🚀',
  sparkles: '✨',
  target: '🎯',
  check: '✅',
  cross: '❌',
  trophy: '🏆',
  beginner: '🔙',
  artist: '🎨',
  tools: '🧰',
  store: '🛒',
  group: '👥',
  box: '📦',
  dot: '•',
};

// ===================== FILE I/O =====================

function readJson(filePath, defaultValue = []) {
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`${E.cross} Error reading ${filePath}:`, e.message);
    return defaultValue;
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`${E.cross} Error writing to ${filePath}:`, e.message);
    return false;
  }
}

// ===================== MESSAGE HELPERS =====================

/**
 * Edit message with HTML parse_mode, fallback to sendMessage if edit fails
 */
async function editReply(xy, messageId, text) {
  try {
    await xy.api.editMessageText(xy.chat.id, messageId, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error(`Gagal edit pesan ${messageId}:`, e.message);
    try {
      await xy.api.sendMessage(xy.chat.id, text, { parse_mode: 'HTML' });
    } catch (e2) {}
  }
}

/**
 * Standard v5.5 reply wrapper - all replies use blockquote + bold + HTML
 */
function reply55(xy, text, opts = {}) {
  return xy.reply(text, { parse_mode: 'HTML', ...opts });
}

// ===================== PANEL CONFIG =====================

function getPanelConfig(version) {
  const configs = {
    v1: { name: 'Server V1', panelDomain: global.domain, pltaKey: global.plta, pltcKey: global.pltc, nests: global.nests, eggs: global.eggs, loc: global.loc },
    v2: { name: 'Server V2', panelDomain: global.domainV2, pltaKey: global.pltaV2, pltcKey: global.pltcV2, nests: global.nestsV2, eggs: global.eggsV2, loc: global.locV2 },
    v3: { name: 'Server V3', panelDomain: global.domainV3, pltaKey: global.pltaV3, pltcKey: global.pltcV3, nests: global.nestsV3, eggs: global.eggsV3, loc: global.locV3 },
    v4: { name: 'Server V4', panelDomain: global.domainV4, pltaKey: global.pltaV4, pltcKey: global.pltcV4, nests: global.nestsV4, eggs: global.eggsV4, loc: global.locV4 },
    v5: { name: 'Server V5', panelDomain: global.domainV5, pltaKey: global.pltaV5, pltcKey: global.pltcV5, nests: global.nestsV5, eggs: global.eggsV5, loc: global.locV5 },
    v6: { name: 'Server V6', panelDomain: global.domainV6, pltaKey: global.pltaV6, pltcKey: global.pltcV6, nests: global.nestsV6, eggs: global.eggsV6, loc: global.locV6 },
    v7: { name: 'Server V7', panelDomain: global.domainV7, pltaKey: global.pltaV7, pltcKey: global.pltcV7, nests: global.nestsV7, eggs: global.eggsV7, loc: global.locV7 },
    v8: { name: 'Server V8', panelDomain: global.domainV8, pltaKey: global.pltaV8, pltcKey: global.pltcV8, nests: global.nestsV8, eggs: global.eggsV8, loc: global.locV8 },
    v9: { name: 'Server V9', panelDomain: global.domainV9, pltaKey: global.pltaV9, pltcKey: global.pltcV9, nests: global.nestsV9, eggs: global.eggsV9, loc: global.locV9 },
    v10: { name: 'Server V10', panelDomain: global.domainV10, pltaKey: global.pltaV10, pltcKey: global.pltcV10, nests: global.nestsV10, eggs: global.eggsV10, loc: global.locV10 },
  };
  return configs[version] || {};
}

// ===================== SERVER HELPERS =====================

async function getServerStatus(serverUuid, panelConfig) {
  try {
    const response = await axios.get(`${panelConfig.panelDomain}/api/client/servers/${serverUuid}/resources`, {
      headers: { 'Authorization': `Bearer ${panelConfig.pltcKey}` },
      timeout: 5000,
    });
    return response.data.attributes.current_state;
  } catch (error) {
    return 'error';
  }
}

async function stopServer(serverUuid, panelDomain, pltcKey) {
  try {
    await axios.post(`${panelDomain}/api/client/servers/${serverUuid}/power`, { signal: 'stop' }, {
      headers: { 'Authorization': `Bearer ${pltcKey}`, 'Content-Type': 'application/json' },
    });
    return true;
  } catch (error) {
    console.error(`Gagal stop server ${serverUuid}:`, error.message);
    return false;
  }
}

// ===================== DATABASE PATHS =====================

const DB = {
  WELEAVE: './src/database/weleave.json',
  ANTILINK: './src/database/antilink.json',
  LIST: './src/database/list.json',
  WARN: './src/database/warns.json',
  PREMIUM: './src/database/premium.json',
  ALLOWED_GROUPS: './src/database/allowed_groups.json',
  CPU_CHECK: './src/database/cpu_check_status.json',
  PARTNER: './src/database/partner.json',
  RESELLER: './src/database/reseller.json',
  SELLER: './src/database/seller.json',
  OWNER: './owner.json',
};

// ===================== HELPER FUNCTIONS =====================

function parseServerVersion(command) {
  const match = command.match(/v(\d+)$/);
  return match ? `v${match[1]}` : 'v1';
}

function generateReadableString(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  E,
  readJson,
  writeJson,
  editReply,
  reply55,
  getPanelConfig,
  getServerStatus,
  stopServer,
  DB,
  parseServerVersion,
  generateReadableString,
};
