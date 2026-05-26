/**
 * SC-CPANEL VIP V5.5 - Server Management Handler
 * Commands: totalserver, cekserver, listsrv, listusr, listadmin,
 *           delusr, deladmin, delsrv, delallpanel, cekcpu,
 *           delsrvoff, autocpuon/off, installpanel, uninstallpanel,
 *           startwings, hbpanel, installtema*, uninstalltema, subdo,
 *           qc (quote creator)
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client } = require('ssh2');
const { E, editReply, readJson, writeJson, getPanelConfig, getServerStatus, DB, generateReadableString } = require('./utils');
const { isOwnerRole, canAccessKeys, canCreateAdminPanel } = require('../../src/lib/roles');

const SERVER_COMMANDS = [];

// totalserver v1-v10
for (const prefix of ['totalserver', 'cekcpu', 'delsrvoff', 'delallpanel', 'autocpuon', 'autocpuoff']) {
  SERVER_COMMANDS.push(prefix);
  for (let i = 2; i <= 10; i++) SERVER_COMMANDS.push(`${prefix}v${i}`);
}


// listsrv, listusr, listadmin v1-v10
for (const prefix of ['listsrv', 'listusr', 'listadmin', 'delusr', 'deladmin', 'delsrv']) {
  SERVER_COMMANDS.push(prefix);
  for (let i = 2; i <= 10; i++) SERVER_COMMANDS.push(`${prefix}v${i}`);
}

// SSH / misc
SERVER_COMMANDS.push(
  'installpanel', 'uninstallpanel', 'startwings', 'hbpanel',
  'installtemanebula', 'installtemastellar', 'installtemadarknate',
  'installtemaenigma', 'installtemabilling', 'installtemaiceminecraft',
  'installtemanook', 'installtemanightcore', 'uninstalltema',
  'subdo', 'cekserver', 'qc',
);

async function handle(xy, { command, text, q, reply, mess, isOwner, InputFile, botToken, InlineKeyboard, CatBox }) {
  const userId = xy.from.id;

  // ======================== TOTAL SERVER ========================
  if (command.startsWith('totalserver')) {
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} <b>Konfigurasi ${serverVersion.toUpperCase()} tidak ditemukan.</b></blockquote>`, { parse_mode: 'HTML' });
    const hasPanelAccess = canAccessKeys(userId, serverVersion);
    const domainDisplay = hasPanelAccess ? panelConfig.panelDomain : '***Disembunyikan***';
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menghitung server ${serverVersion.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let count = 0, page = 1, hasMore = true;
      while (hasMore) {
        const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
        count += r.data.data.length;
        hasMore = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages;
        page++;
      }
      await editReply(xy, sentMessage.message_id,
        `<blockquote>${E.star} <b>Total Server ${serverVersion.toUpperCase()}</b>\n\n` +
        `${E.dot} Domain: ${domainDisplay}\n${E.dot} Total: <code>${count} Server</code></blockquote>`
      );
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }

  // ======================== CEK SERVER STATUS ========================
  if (command === 'cekserver') {
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengecek Server V1-V10...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
      let statuses = [];
      for (const v of servers) {
        const pc = getPanelConfig(v);
        const name = `SERVER ${v.slice(1)}`;
        if (!pc.panelDomain || !pc.pltaKey) { statuses.push(`${E.cross} ${name} OFF`); continue; }
        try {
          const r = await axios.get(`${pc.panelDomain}/api/application/servers?per_page=1`, { headers: { 'Authorization': `Bearer ${pc.pltaKey}` }, timeout: 5000 });
          statuses.push(r.status === 200 ? `${E.check} ${name} ON` : `${E.cross} ${name} OFF`);
        } catch (e) { statuses.push(`${E.cross} ${name} OFF`); }
      }
      await editReply(xy, sentMessage.message_id,
        `<blockquote>${E.fire} <b>STATUS SERVER SC-CPANEL VIP</b>\n\n${statuses.join('\n')}\n\n${E.diamond} <b>SC-CPANEL VIP V5.5</b></blockquote>`
      );
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }


  // ======================== LIST SRV / USR / ADMIN ========================
  if (command.match(/^(listsrv|listusr|listadmin)/)) {
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    if (!canAccessKeys(userId, serverVersion)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} <b>Konfigurasi tidak ditemukan.</b></blockquote>`, { parse_mode: 'HTML' });
    const halaman = parseInt(text) || 1;
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengambil data halaman ${halaman}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const isServerList = command.includes('srv'), isAdminList = command.includes('admin');
      const endpoint = isServerList ? 'servers' : 'users';
      const resp = await fetch(`${panelConfig.panelDomain}/api/application/${endpoint}?page=${halaman}&per_page=25`, { headers: { Authorization: `Bearer ${panelConfig.pltaKey}` } });
      const hasil = await resp.json();
      if (!hasil.data?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Tidak ada data.</b></blockquote>`);
      let filtered = isAdminList ? hasil.data.filter(u => u.attributes.root_admin) : hasil.data;
      if (!filtered.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Tidak ada data.</b></blockquote>`);
      let txt = `${E.star} <b>${isServerList ? 'Server' : isAdminList ? 'Admin' : 'User'} (${serverVersion.toUpperCase()})</b>\n${E.dot} ${panelConfig.panelDomain}\n\n`;
      for (const item of filtered) { const i = item.attributes; txt += `${E.dot} <code>${i.id}</code> - ${i.name || i.username}\n`; }
      txt += `\n${E.fire} Hal ${hasil.meta.pagination.current_page}/${hasil.meta.pagination.total_pages} | Total: ${hasil.meta.pagination.total}`;
      let btns = new InlineKeyboard();
      if (hasil.meta.pagination.current_page > 1) btns.text('🔙 Prev', `${command} ${halaman - 1}`);
      if (hasil.meta.pagination.current_page < hasil.meta.pagination.total_pages) btns.text('Next 🚀', `${command} ${halaman + 1}`);
      await xy.api.editMessageText(xy.chat.id, sentMessage.message_id, `<blockquote>${txt}</blockquote>`, { parse_mode: 'HTML', reply_markup: btns.row() });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Error:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== DELETE USR / SRV / ADMIN ========================
  if (command.match(/^(delusr|deladmin|delsrv)v?\d*$/)) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const panelConfig = getPanelConfig(serverVersion);
    const targetType = command.includes('srv') ? 'server' : 'user';
    if (!text || !/^\d+$/.test(text)) return reply(`<blockquote>${E.cross} Format: <code>/${command} ID</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menghapus ${targetType} ID ${text}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const f = await fetch(`${panelConfig.panelDomain}/api/application/${targetType}s/${text}`, { method: 'DELETE', headers: { Authorization: `Bearer ${panelConfig.pltaKey}` } });
      if (f.status === 204) await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>${targetType} ID ${text} dihapus!</b></blockquote>`);
      else { const d = await f.json(); throw new Error(d.errors[0].detail); }
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }


  // ======================== DEL ALL PANEL ========================
  if (command.startsWith('delallpanel')) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const excludedIds = (text || '').trim().split(',').map(id => id.trim()).filter(id => /^\d+$/.test(id));
    if (!excludedIds.length) return reply(`<blockquote>${E.cross} Format: <code>/${command} id1,id2</code></blockquote>`, { parse_mode: 'HTML' });
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} <b>Konfigurasi tidak ditemukan.</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menghapus semua kecuali: ${excludedIds.join(', ')}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let all = [], page = 1, more = true;
      while (more) { const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); all = all.concat(r.data.data); more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages; page++; }
      const toDelete = all.filter(s => !excludedIds.includes(String(s.attributes.id)));
      let deleted = 0;
      for (const s of toDelete) { try { await axios.delete(`${panelConfig.panelDomain}/api/application/servers/${s.attributes.id}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); deleted++; } catch (e) {} }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>${deleted}/${toDelete.length}</b> server dihapus dari ${serverVersion.toUpperCase()}!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== CEK CPU ========================
  if (command.startsWith('cekcpu')) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey || !panelConfig.pltcKey) return reply(`<blockquote>${E.cross} <b>Konfigurasi tidak ditemukan.</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengecek CPU ${serverVersion.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let servers = [], page = 1, more = true;
      while (more) { const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); servers = servers.concat(r.data.data); more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages; page++; }
      let abnormal = [];
      for (const s of servers) {
        try { const rr = await axios.get(`${panelConfig.panelDomain}/api/client/servers/${s.attributes.uuid}/resources`, { headers: { 'Authorization': `Bearer ${panelConfig.pltcKey}` } }); const cpu = rr.data.attributes.resources.cpu_absolute; if (cpu > 320) abnormal.push({ id: s.attributes.id, name: s.attributes.name, usage: cpu }); } catch (e) {}
      }
      if (!abnormal.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Semua server normal!</b></blockquote>`);
      let msg = `${E.bolt} <b>CPU Abnormal (${serverVersion.toUpperCase()})</b>\n\n`;
      abnormal.forEach(s => msg += `${E.dot} <code>${s.id}</code> ${s.name} - ${s.usage.toFixed(2)}%\n`);
      await editReply(xy, sentMessage.message_id, `<blockquote>${msg}</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }

  // ======================== DEL SRV OFFLINE ========================
  if (command.startsWith('delsrvoff')) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey || !panelConfig.pltcKey) return reply(`<blockquote>${E.cross} <b>Konfigurasi tidak ditemukan.</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mencari server offline ${serverVersion.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let all = [], page = 1, more = true;
      while (more) { const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); all = all.concat(r.data.data); more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages; page++; }
      let offline = [];
      for (const s of all) { const status = await getServerStatus(s.attributes.uuid, panelConfig); if (status === 'offline' || status === 'stopped') offline.push(s.attributes); }
      if (!offline.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Tidak ada server offline.</b></blockquote>`);
      let del = 0;
      for (const s of offline) { try { await axios.delete(`${panelConfig.panelDomain}/api/application/servers/${s.id}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); del++; } catch (e) {} }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>${del} server offline dihapus!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }


  // ======================== AUTO CPU ON/OFF ========================
  if (command.startsWith('autocpuon') || command.startsWith('autocpuoff')) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const action = command.includes('on');
    let statusData = readJson(DB.CPU_CHECK, {});
    if (!statusData[serverVersion]) statusData[serverVersion] = { active: false, auto_stop: {}, chat_id: null };
    if (action) {
      if (xy.chat.type === 'group' || xy.chat.type === 'supergroup') statusData[serverVersion].chat_id = xy.chat.id;
      else if (!statusData[serverVersion].chat_id) return reply(`<blockquote>${E.cross} <b>Jalankan di Grup</b> untuk mengaktifkan Auto-Check CPU.</blockquote>`, { parse_mode: 'HTML' });
    } else { statusData[serverVersion].chat_id = null; }
    statusData[serverVersion].active = action;
    writeJson(DB.CPU_CHECK, statusData);
    const statusText = action ? 'DIAKTIFKAN' : 'DINONAKTIFKAN';
    const emoji = action ? E.check : E.cross;
    return reply(`<blockquote>${emoji} <b>Auto-Check CPU ${serverVersion.toUpperCase()} ${statusText}!</b>\n${E.dot} Bot akan mengecek CPU setiap 5 menit.</blockquote>`, { parse_mode: 'HTML' });
  }

  // ======================== SSH COMMANDS ========================
  if (['installpanel','uninstallpanel','startwings','hbpanel','installtemanebula','installtemastellar','installtemadarknate','installtemaenigma','installtemabilling','installtemaiceminecraft','installtemanook','installtemanightcore','uninstalltema'].includes(command)) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/${command} ipvps,pwvps</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memulai SSH ${command.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let [vpsIP, vpsPassword, arg3] = text.split(',').map(a => a.trim());
      const ssh = new Client();
      const connSettings = { host: vpsIP, port: 22, username: 'root', password: vpsPassword };
      const rand = Math.floor(1000 + Math.random() * 9000);
      const temaMap = { 'installtemanebula': 2, 'installtemastellar': 3, 'installtemadarknate': 4, 'installtemaenigma': 5, 'installtemabilling': 6, 'installtemaiceminecraft': 10, 'installtemanook': 11, 'installtemanightcore': 12 };
      let sshCommand = '', finalMessage = '';
      await new Promise((resolve, reject) => { ssh.on('ready', resolve).on('error', reject).connect(connSettings); });
      if (temaMap[command]) {
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh) <<EOF\n${temaMap[command]}\n\n\nEOF`;
        finalMessage = `<blockquote>${E.check} <b>Tema berhasil diinstall!</b></blockquote>`;
      } else if (command === 'uninstalltema') {
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh) <<EOF\n9\nEOF`;
        finalMessage = `<blockquote>${E.check} <b>Tema dihapus!</b></blockquote>`;
      } else if (command === 'installpanel') {
        if (!arg3) throw new Error('Domain diperlukan!');
        const namaAcak = `admin${rand}`, emailAcak = `admin${rand}@zexc.my.id`, passPanel = `${rand}`;
        sshCommand = `bash <(curl -s https://pterodactyl-installer.se) <<EOF\n0\n${namaAcak}\n${namaAcak}\n\nAsia/Jakarta\n${emailAcak}\n${emailAcak}\n${namaAcak}\n${namaAcak}\n${namaAcak}\n${passPanel}\n${arg3}\ny\nyes\nEOF`;
        finalMessage = `<blockquote>${E.check} <b>Panel Terinstall!</b>\n${E.dot} URL: https://${arg3}\n${E.dot} User: <code>${namaAcak}</code>\n${E.dot} Pass: <code>${passPanel}</code></blockquote>`;
      } else if (command === 'uninstallpanel') {
        sshCommand = `bash <(curl -s https://pterodactyl-installer.se) <<EOF\n6\ny\ny\ny\n\n\nEOF`;
        finalMessage = `<blockquote>${E.check} <b>Panel dihapus!</b></blockquote>`;
      } else if (command === 'hbpanel') {
        const newuser = 'admin' + generateReadableString(4), newpw = 'Admin' + generateReadableString(4);
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/iLyxxDev/hosting/refs/heads/main/install.sh) <<EOF\nnaelganteng\n7\n${newuser}\n${newpw}\nEOF`;
        finalMessage = `<blockquote>${E.check} <b>Hackback berhasil!</b>\n${E.dot} User: <code>${newuser}</code>\n${E.dot} Pass: <code>${newpw}</code></blockquote>`;
      } else if (command === 'startwings') {
        if (!arg3) throw new Error('Token node diperlukan!');
        sshCommand = `${arg3} && sudo systemctl restart wings`;
        finalMessage = `<blockquote>${E.check} <b>Wings berhasil direstart!</b></blockquote>`;
      }
      await new Promise((resolve, reject) => { ssh.exec(sshCommand, (err, stream) => { if (err) return reject(err); stream.on('close', (code) => { code !== 0 ? reject(new Error(`Exit code ${code}`)) : resolve(); }).on('data', () => {}).stderr.on('data', () => {}); }); });
      ssh.end();
      await editReply(xy, sentMessage.message_id, finalMessage);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>SSH Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== SUBDOMAIN ========================
  if (command === 'subdo') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text || !text.includes(',')) return reply(`<blockquote>${E.cross} Format: <code>/subdo host,ip</code></blockquote>`, { parse_mode: 'HTML' });
    const [host, ip] = text.split(',').map(a => a.trim());
    const dom = Object.keys(global.subdomain || {});
    if (!dom.length) return reply(`<blockquote>${E.cross} <b>Tidak ada subdomain tersedia.</b></blockquote>`, { parse_mode: 'HTML' });
    const keyboard = dom.map((d, i) => [{ text: d, callback_data: `subdo ${i} ${host}|${ip}` }]);
    return reply(`<blockquote>${E.diamond} <b>Pilih Domain:</b>\n${E.dot} Host: ${host}\n${E.dot} IP: ${ip}</blockquote>`, { reply_markup: { inline_keyboard: keyboard }, parse_mode: 'HTML' });
  }

  // ======================== QC (Quote Creator) ========================
  if (command === 'qc') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const teks = xy.message.reply_to_message?.text || text;
    if (!teks) return reply(`<blockquote>${E.cross} Format: <code>/qc teks</code> atau reply pesan.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat QC...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const { exec } = require('child_process');
      const targetUser = xy.message.reply_to_message?.from || xy.from;
      let avatarUrl = 'https://telegra.ph/file/134ccbbd0dfc434a910ab.png';
      try { const photos = await xy.api.getUserProfilePhotos(targetUser.id); if (photos.total_count > 0) { const file = await xy.api.getFile(photos.photos[0][0].file_id); if (file?.file_path) avatarUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`; } } catch (e) {}
      const { data } = await axios.post('https://bot.lyo.su/quote/generate', { type: 'quote', format: 'png', backgroundColor: '#1a1a2e', width: 700, height: 580, scale: 2, messages: [{ from: { id: 1, name: targetUser.first_name, photo: { url: avatarUrl } }, text: teks, replyMessage: {} }] }, { headers: { 'Content-Type': 'application/json' } });
      const pngBuffer = Buffer.from(data.result.image, 'base64');
      const inputPath = './qc_input.png', outputPath = './qc_output.webp';
      fs.writeFileSync(inputPath, pngBuffer);
      await new Promise((resolve, reject) => { exec(`ffmpeg -y -i "${inputPath}" -vf "scale=512:-1" "${outputPath}"`, (err) => { fs.existsSync(inputPath) && fs.unlinkSync(inputPath); if (err) reject(err); else resolve(); }); });
      await xy.api.sendSticker(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath));
      fs.unlinkSync(outputPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>QC berhasil!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }
}

module.exports = { commands: SERVER_COMMANDS, handle };
