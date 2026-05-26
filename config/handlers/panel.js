/**
 * SC-CPANEL VIP V5.5 - Panel Creation Handler
 * Commands: 1gb-10gb, unli (v1-v10)
 */

const { E, editReply, getPanelConfig, parseServerVersion } = require('./utils');
const { canCreatePanel } = require('../../src/lib/roles');
const { sessions } = require('../../src/lib/connectwa');

// Generate all panel commands
const PANEL_COMMANDS = [];
const sizes = ['1gb','2gb','3gb','4gb','5gb','6gb','7gb','8gb','9gb','10gb','unli'];
for (const size of sizes) {
  PANEL_COMMANDS.push(size);
  for (let i = 2; i <= 10; i++) PANEL_COMMANDS.push(`${size}v${i}`);
}

const RAM_MAP = {
  '1gb': { ram: '1024', disk: '1024', cpu: '40' },
  '2gb': { ram: '2048', disk: '2048', cpu: '60' },
  '3gb': { ram: '3072', disk: '3072', cpu: '80' },
  '4gb': { ram: '4096', disk: '4096', cpu: '100' },
  '5gb': { ram: '5120', disk: '5120', cpu: '120' },
  '6gb': { ram: '6144', disk: '6144', cpu: '140' },
  '7gb': { ram: '7168', disk: '7168', cpu: '160' },
  '8gb': { ram: '8192', disk: '8192', cpu: '180' },
  '9gb': { ram: '9216', disk: '9216', cpu: '200' },
  '10gb': { ram: '10240', disk: '10240', cpu: '220' },
  'unli': { ram: '0', disk: '0', cpu: '0' },
};

async function handle(xy, { command, text, reply, mess }) {
  const userId = xy.from.id;

  // Must be in group
  if (xy.chat.type === 'private') {
    return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b>\n${E.dot} Perintah ini hanya bisa digunakan di dalam grup.</blockquote>`, { parse_mode: 'HTML' });
  }

  const match = command.match(/v(\d+)/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const commandType = command.replace(/v\d+$/, '');

  // Role check
  if (!canCreatePanel(userId, serverVersion)) {
    return reply(
      `<blockquote>${E.cross} <b>Akses Ditolak!</b>\n${E.dot} Kamu tidak memiliki izin membuat panel di <b>${serverVersion.toUpperCase()}</b>.\n${E.dot} Hubungi Owner untuk akses.</blockquote>`,
      { parse_mode: 'HTML' }
    );
  }

  const sentMessage = await reply(
    `<blockquote>${E.bolt} <b>Membuat Panel ${command.toUpperCase()}...</b>\n${E.dot} Mohon tunggu sebentar...</blockquote>`,
    { parse_mode: 'HTML' }
  );

  const panelConfig = getPanelConfig(serverVersion);
  const { panelDomain, pltaKey, pltcKey, nests, eggs, loc } = panelConfig;

  if (!panelDomain || !pltaKey || !pltcKey) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Konfigurasi Error!</b>\n${E.dot} Panel <b>${serverVersion.toUpperCase()}</b> belum dikonfigurasi.</blockquote>`
    );
  }

  const spec = RAM_MAP[commandType];
  if (!spec) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Perintah tidak valid!</b></blockquote>`
    );
  }

  const { ram, disk, cpu } = spec;

  if (!text) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Format Salah!</b>\n` +
      `${E.dot} Penggunaan:\n<code>${global.prefix}${command} sendwa/sendtele,username,nowa/idtele</code>\n\n` +
      `${E.dot} Contoh:\n<code>${global.prefix}${command} sendtele,usernameku,123456789</code></blockquote>`
    );
  }

  const t = text.split(',');
  if (t.length < 3) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Format Salah!</b>\n` +
      `${E.dot} Penggunaan:\n<code>${global.prefix}${command} sendwa/sendtele,username,nowa/idtele</code></blockquote>`
    );
  }

  const [sendType, username, targetNumberRaw] = t.map(a => a.trim());
  const targetNumber = targetNumberRaw.replace(/\D/g, '');

  if (!['sendwa', 'sendtele'].includes(sendType)) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Tipe Pengiriman Invalid!</b>\n${E.dot} Gunakan: <code>sendwa</code> atau <code>sendtele</code></blockquote>`
    );
  }

  if (!targetNumber.match(/^\d+$/)) {
    return editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Nomor/ID tujuan tidak valid!</b></blockquote>`
    );
  }

  try {
    const email = `${username}@buyer.zexc`;
    const password = Math.random().toString(36).slice(-8);

    // Check existing user
    try {
      const checkResponse = await fetch(`${panelDomain}/api/application/users/email/${email}`, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: `Bearer ${pltaKey}` },
      });
      if (checkResponse.ok) throw new Error('Email atau Username sudah digunakan!');
    } catch (error) {
      if (error.message === 'Email atau Username sudah digunakan!') throw error;
    }

    // Create user
    const userRes = await fetch(`${panelDomain}/api/application/users`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${pltaKey}` },
      body: JSON.stringify({
        email, username, first_name: username, last_name: username,
        language: 'en', password: password.toString(),
      }),
    });
    const userData = await userRes.json();
    if (userData.errors) throw new Error(`API Error: ${userData.errors[0].detail}`);
    const user = userData.attributes;

    // Get egg startup
    const eggRes = await fetch(`${panelDomain}/api/application/nests/${nests}/eggs/${eggs}`, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${pltcKey}` },
    });
    const eggData = await eggRes.json();
    const startup_cmd = eggData.attributes.startup;

    // Create server
    const serverRes = await fetch(`${panelDomain}/api/application/servers`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${pltcKey}` },
      body: JSON.stringify({
        name: username,
        description: 'SC-CPANEL VIP V5.5 | Premium Panel',
        user: user.id,
        egg: parseInt(eggs),
        docker_image: 'ghcr.io/parkervcp/yolks:nodejs_20',
        startup: startup_cmd,
        environment: { INST: 'npm', USER_UPLOAD: '0', AUTO_UPDATE: '0', CMD_RUN: 'npm start', STARTUP_CMD: 'pip install -r requirements.txt' },
        limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu },
        feature_limits: { databases: 5, backups: 5, allocations: 5 },
        deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] },
      }),
    });
    const serverData = await serverRes.json();
    if (serverData.errors) throw new Error(`API Error: ${serverData.errors[0].detail}`);
    const server = serverData.attributes;

    // Format credential message
    const credentialMsg =
      `<blockquote>${E.diamond} <b>Panel Berhasil Dibuat!</b>\n\n` +
      `${E.crown} <b>ID User</b>: ${user.id}\n` +
      `${E.star} <b>ID Server</b>: ${server.id}\n` +
      `${E.fire} <b>EMAIL</b>: ${user.email}\n` +
      `${E.bolt} <b>USERNAME</b>: <code>${user.username}</code>\n` +
      `${E.sparkles} <b>PASSWORD</b>: <code>${password}</code>\n` +
      `${E.rocket} <b>LOGIN</b>: <a href="${panelDomain}">Klik untuk login</a>\n\n` +
      `${E.cross} <b>PERHATIAN:</b> Simpan informasi ini!</blockquote>`;

    // Send credentials to target
    if (sendType === 'sendtele') {
      await xy.api.sendMessage(targetNumber, credentialMsg, { parse_mode: 'HTML' });
    } else if (sendType === 'sendwa') {
      const sessionNumber = Array.from(sessions.keys())[0];
      const waClient = sessions.get(sessionNumber);
      if (!waClient) throw new Error('Sesi WhatsApp tidak ditemukan.');
      await waClient.sendMessage(
        targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`,
        { text: credentialMsg.replace(/<[^>]+>/g, '') }
      );
    }

    // Success message in group
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.check} <b>Panel Berhasil Dibuat!</b>\n\n` +
      `${E.dot} Username: <code>${username}</code>\n` +
      `${E.dot} Server: <b>${serverVersion.toUpperCase()}</b>\n` +
      `${E.dot} RAM: <b>${commandType.toUpperCase()}</b>\n` +
      `${E.dot} ID Server: <code>${server.id}</code>\n` +
      `${E.dot} Dikirim via: <b>${sendType === 'sendtele' ? 'Telegram' : 'WhatsApp'}</b> ${targetNumber}</blockquote>`
    );
  } catch (error) {
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.cross} <b>Gagal Membuat Panel!</b>\n${E.dot} Error: ${error.message}</blockquote>`
    );
  }
}

module.exports = { commands: PANEL_COMMANDS, handle };
