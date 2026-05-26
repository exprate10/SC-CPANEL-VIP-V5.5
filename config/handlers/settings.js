/**
 * SC-CPANEL VIP V5.5 - Settings Handler
 * Commands: seturl, setplta, setpltc (v1-v10)
 */

const fs = require('fs');
const { E, editReply } = require('./utils');
const { isOwnerRole } = require('../../src/lib/roles');

const SETTINGS_COMMANDS = [];
for (const prefix of ['seturl', 'setplta', 'setpltc']) {
  SETTINGS_COMMANDS.push(prefix);
  for (let i = 2; i <= 10; i++) SETTINGS_COMMANDS.push(`${prefix}v${i}`);
}

async function handle(xy, { command, text, reply }) {
  const userId = xy.from.id;

  if (!isOwnerRole(userId)) {
    return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b>\n${E.dot} Hanya Owner yang dapat mengubah konfigurasi.</blockquote>`, { parse_mode: 'HTML' });
  }

  const match = command.match(/v(\d+)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const configPath = './config/settings.js';

  let key;
  if (command.startsWith('seturl')) {
    key = `global.domain${serverVersion === 'v1' ? '' : serverVersion.toUpperCase()}`;
  } else if (command.startsWith('setplta')) {
    key = `global.plta${serverVersion === 'v1' ? '' : serverVersion.toUpperCase()}`;
  } else if (command.startsWith('setpltc')) {
    key = `global.pltc${serverVersion === 'v1' ? '' : serverVersion.toUpperCase()}`;
  }

  if (!text) {
    return reply(
      `<blockquote>${E.cross} <b>Format salah!</b>\n` +
      `${E.dot} Penggunaan:\n<code>${global.prefix + command} [nilai_baru]</code>\n` +
      `${E.dot} Contoh:\n<code>${global.prefix + command} https://panel.domain.id</code></blockquote>`,
      { parse_mode: 'HTML' }
    );
  }

  let settingsContent = fs.readFileSync(configPath, 'utf8');
  const regex = new RegExp(`${key.replace('.', '\\.')}\\s*=\\s*['"\`].*?['"\`]`, 's');

  if (regex.test(settingsContent)) {
    settingsContent = settingsContent.replace(regex, `${key} = '${text}'`);
    fs.writeFileSync(configPath, settingsContent, 'utf8');

    const globalVarName = key.replace('global.', '');
    global[globalVarName] = text;

    return reply(
      `<blockquote>${E.check} <b>Konfigurasi Diperbarui!</b>\n` +
      `${E.dot} Key: <code>${key}</code>\n` +
      `${E.dot} Value: <code>${text}</code></blockquote>`,
      { parse_mode: 'HTML' }
    );
  } else {
    return reply(
      `<blockquote>${E.cross} <b>Gagal!</b>\n${E.dot} Variabel <code>${key}</code> tidak ditemukan di settings.js</blockquote>`,
      { parse_mode: 'HTML' }
    );
  }
}

module.exports = { commands: SETTINGS_COMMANDS, handle };
