/**
 * SC-CPANEL VIP V5.5 - User Management Handler
 * Commands: addowner, delowner, listowner, addseller, delseller, listseller,
 *           pt/rt (v1-v10), addallpt, addallrt, delpt/delrt,
 *           addprem, delprem, listprem, addgrub, delgrub, listgrub
 */

const fs = require('fs');
const { E, editReply, readJson, writeJson, DB } = require('./utils');
const { isOwnerRole } = require('../../src/lib/roles');

const USER_COMMANDS = [
  'addowner', 'delowner', 'listowner',
  'addseller', 'delseller', 'listseller',
  'addprem', 'delprem', 'listprem',
  'addallrt', 'addallpt',
  'addgrub', 'delgrub', 'listgrub',
];

// pt/rt v1-v10
for (const prefix of ['pt', 'rt', 'delpt', 'delrt']) {
  USER_COMMANDS.push(prefix);
  for (let i = 2; i <= 10; i++) USER_COMMANDS.push(`${prefix}${i}`);
}

async function handle(xy, { command, text, reply, mess, owners, seller }) {
  const userId = xy.from.id;

  // ======================== OWNER MANAGEMENT ========================
  if (command === 'addowner') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b>\n${E.dot} Khusus Owner.</blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addowner ID_Telegram</code></blockquote>`, { parse_mode: 'HTML' });
    if (owners.includes(text)) return reply(`<blockquote>${E.cross} ID <b>${text}</b> sudah menjadi Owner.</blockquote>`, { parse_mode: 'HTML' });
    owners.push(text);
    fs.writeFileSync(DB.OWNER, JSON.stringify(owners, null, 2));
    return reply(`<blockquote>${E.check} <b>Owner Ditambahkan!</b>\n${E.dot} ID: <code>${text}</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'delowner') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b>\n${E.dot} Khusus Owner.</blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delowner ID_Telegram</code></blockquote>`, { parse_mode: 'HTML' });
    const index = owners.indexOf(text);
    if (index === -1) return reply(`<blockquote>${E.cross} ID <b>${text}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    owners.splice(index, 1);
    fs.writeFileSync(DB.OWNER, JSON.stringify(owners, null, 2));
    return reply(`<blockquote>${E.check} <b>Owner Dihapus!</b>\n${E.dot} ID: <code>${text}</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'listowner') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!owners.length) return reply(`<blockquote>${E.cross} Belum ada Owner terdaftar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Owner...</b></blockquote>`, { parse_mode: 'HTML' });
    const list = [];
    for (const id of owners) {
      try {
        const user = await xy.api.getChat(id);
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
        list.push(`${E.dot} <code>${id}</code> - <b>${name}</b>`);
      } catch { list.push(`${E.dot} <code>${id}</code> - <i>Tidak ditemukan</i>`); }
    }
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.crown} <b>Daftar Owner</b> (${owners.length})\n\n${list.join('\n')}</blockquote>`
    );
    return;
  }

  // ======================== SELLER MANAGEMENT ========================
  if (command === 'addseller') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(
      `<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addseller ID,durasi,waktu</code>\n` +
      `${E.dot} Contoh: <code>/addseller 123456789,1,jam</code>\n${E.dot} Waktu: menit, jam, hari, bulan</blockquote>`, { parse_mode: 'HTML' }
    );
    const [id, dur, unit] = text.split(',');
    if (!id || !dur || !unit) return reply(`<blockquote>${E.cross} Format salah! Contoh: <code>/addseller 123456789,1,jam</code></blockquote>`, { parse_mode: 'HTML' });
    const ms = { menit: 60000, jam: 3600000, hari: 86400000, bulan: 2592000000 };
    const durasi = parseInt(dur);
    if (isNaN(durasi) || !ms[unit]) return reply(`<blockquote>${E.cross} Durasi atau satuan waktu tidak valid.</blockquote>`, { parse_mode: 'HTML' });
    if (seller.some(s => s.id === id)) return reply(`<blockquote>${E.cross} ID <b>${id}</b> sudah jadi Seller.</blockquote>`, { parse_mode: 'HTML' });
    seller.push({ id, expiresAt: Date.now() + durasi * ms[unit] });
    fs.writeFileSync(DB.SELLER, JSON.stringify(seller, null, 2));
    return reply(`<blockquote>${E.check} <b>Seller Ditambahkan!</b>\n${E.dot} ID: <code>${id}</code>\n${E.dot} Durasi: <b>${durasi} ${unit}</b></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'delseller') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delseller ID</code></blockquote>`, { parse_mode: 'HTML' });
    const idx = seller.findIndex(s => s.id === text);
    if (idx === -1) return reply(`<blockquote>${E.cross} ID <b>${text}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    seller.splice(idx, 1);
    fs.writeFileSync(DB.SELLER, JSON.stringify(seller, null, 2));
    return reply(`<blockquote>${E.check} <b>Seller Dihapus!</b>\n${E.dot} ID: <code>${text}</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'listseller') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!seller.length) return reply(`<blockquote>${E.cross} Belum ada Seller terdaftar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Seller...</b></blockquote>`, { parse_mode: 'HTML' });
    const list = [];
    const updatedSeller = [...seller];
    for (const s of updatedSeller) {
      const sisa = s.expiresAt - Date.now();
      if (sisa <= 0) continue;
      const jam = Math.floor(sisa / 3600000);
      const menit = Math.floor((sisa % 3600000) / 60000);
      const sisaWaktu = jam > 0 ? `${jam}j ${menit}m` : `${menit}m`;
      try {
        const user = await xy.api.getChat(s.id);
        const nama = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        list.push(`${E.dot} <code>${s.id}</code> - <b>${nama}</b> (${sisaWaktu})`);
      } catch { list.push(`${E.dot} <code>${s.id}</code> - <i>N/A</i> (${sisaWaktu})`); }
    }
    const cleaned = seller.filter(s => s.expiresAt - Date.now() > 0);
    fs.writeFileSync(DB.SELLER, JSON.stringify(cleaned, null, 2));
    if (!list.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Tidak ada Seller aktif.</blockquote>`);
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.star} <b>Daftar Seller Aktif</b> (${list.length})\n\n${list.join('\n')}</blockquote>`
    );
    return;
  }

  // ======================== PARTNER / RESELLER (pt/rt) ========================
  if (command.match(/^(pt|rt)\d*$/)) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const isResellerCmd = command.startsWith('rt');
    const file = isResellerCmd ? DB.RESELLER : DB.PARTNER;
    const panelName = isResellerCmd ? 'Reseller Panel' : 'Partner Panel';
    const match = command.match(/(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} <b>Reply pesan pengguna</b> yang ingin ditambahkan ke <b>${panelName}</b>.</blockquote>`, { parse_mode: 'HTML' });
    const userIdTarget = xy.message.reply_to_message.from.id;
    const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
    let listData = readJson(file);
    if (listData.findIndex(u => u.id === userIdTarget && u.server === serverVersion) !== -1) {
      return reply(`<blockquote>${E.cross} <b>${userName}</b> sudah terdaftar di ${panelName} <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
    }
    listData.push({ id: userIdTarget, server: serverVersion });
    writeJson(file, listData);
    return reply(`<blockquote>${E.check} <b>${panelName} - ${serverVersion.toUpperCase()}</b>\n${E.dot} User: <b>${userName}</b>\n${E.dot} Status: Berhasil ditambahkan!</blockquote>`, { parse_mode: 'HTML' });
  }

  // ======================== DEL PARTNER / RESELLER ========================
  if (command.match(/^(delpt|delrt)\d*$/)) {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const isResellerCmd = command.startsWith('delrt');
    const file = isResellerCmd ? DB.RESELLER : DB.PARTNER;
    const panelName = isResellerCmd ? 'Reseller Panel' : 'Partner Panel';
    const match = command.match(/(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} <b>Reply pesan pengguna</b> yang ingin dihapus dari <b>${panelName}</b>.</blockquote>`, { parse_mode: 'HTML' });
    const userIdTarget = xy.message.reply_to_message.from.id;
    const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
    let listData = readJson(file);
    const initialLength = listData.length;
    listData = listData.filter(u => u.id !== userIdTarget || u.server !== serverVersion);
    if (listData.length === initialLength) return reply(`<blockquote>${E.cross} <b>${userName}</b> tidak ditemukan di ${panelName} <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
    writeJson(file, listData);
    return reply(`<blockquote>${E.check} <b>${panelName} - ${serverVersion.toUpperCase()}</b>\n${E.dot} User: <b>${userName}</b>\n${E.dot} Status: Berhasil dihapus!</blockquote>`, { parse_mode: 'HTML' });
  }

  // ======================== ADD ALL RT / PT ========================
  if (command === 'addallrt' || command === 'addallpt') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const isReseller = command === 'addallrt';
    const file = isReseller ? DB.RESELLER : DB.PARTNER;
    const panelName = isReseller ? 'Reseller Panel' : 'Partner Panel';
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} <b>Reply pesan pengguna</b> yang ingin ditambahkan ke semua <b>${panelName}</b>.</blockquote>`, { parse_mode: 'HTML' });
    const userIdTarget = xy.message.reply_to_message.from.id;
    const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
    const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
    let listData = readJson(file);
    let addedCount = 0;
    for (const server of servers) {
      if (listData.findIndex(u => u.id === userIdTarget && u.server === server) === -1) {
        listData.push({ id: userIdTarget, server });
        addedCount++;
      }
    }
    if (addedCount > 0) {
      writeJson(file, listData);
      return reply(`<blockquote>${E.check} <b>${panelName} - ALL SERVER</b>\n${E.dot} User: <b>${userName}</b>\n${E.dot} Ditambahkan ke: <b>${addedCount} server</b></blockquote>`, { parse_mode: 'HTML' });
    }
    return reply(`<blockquote>${E.cross} <b>${userName}</b> sudah terdaftar di semua ${panelName}.</blockquote>`, { parse_mode: 'HTML' });
  }

  // ======================== PREMIUM MANAGEMENT ========================
  if (command === 'addprem') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} <b>Reply pesan pengguna</b> yang ingin dijadikan Premium.</blockquote>`, { parse_mode: 'HTML' });
    const userIdTarget = String(xy.message.reply_to_message.from.id);
    const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
    let listData = readJson(DB.PREMIUM);
    if (listData.includes(userIdTarget)) return reply(`<blockquote>${E.cross} <b>${userName}</b> sudah Premium.</blockquote>`, { parse_mode: 'HTML' });
    listData.push(userIdTarget);
    writeJson(DB.PREMIUM, listData);
    return reply(
      `<blockquote>${E.crown} <b>Premium Ditambahkan!</b>\n${E.dot} User: <b>${userName}</b>\n${E.dot} ID: <code>${userIdTarget}</code>\n` +
      `${E.dot} Akses: Reseller di semua Panel (v1-v10)</blockquote>`, { parse_mode: 'HTML' }
    );
  }

  if (command === 'delprem') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text && !xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Penggunaan: <code>/delprem ID</code> atau reply pesan.</blockquote>`, { parse_mode: 'HTML' });
    let targetId, targetName;
    if (xy.message.reply_to_message) { targetId = String(xy.message.reply_to_message.from.id); targetName = xy.message.reply_to_message.from.first_name || 'Pengguna'; }
    else { targetId = text.trim(); targetName = targetId; }
    let listData = readJson(DB.PREMIUM);
    const initialLength = listData.length;
    listData = listData.filter(id => id !== targetId);
    if (listData.length === initialLength) return reply(`<blockquote>${E.cross} ID <code>${targetId}</code> tidak ditemukan di Premium.</blockquote>`, { parse_mode: 'HTML' });
    writeJson(DB.PREMIUM, listData);
    return reply(`<blockquote>${E.check} <b>Premium Dihapus!</b>\n${E.dot} User: <b>${targetName}</b>\n${E.dot} ID: <code>${targetId}</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'listprem') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const listData = readJson(DB.PREMIUM);
    if (!listData.length) return reply(`<blockquote>${E.cross} Belum ada Premium terdaftar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Premium...</b></blockquote>`, { parse_mode: 'HTML' });
    const list = [];
    for (const id of listData) {
      try {
        const user = await xy.api.getChat(id);
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
        list.push(`${E.dot} <code>${id}</code> - <b>${name}</b>`);
      } catch { list.push(`${E.dot} <code>${id}</code> - <i>N/A</i>`); }
    }
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.crown} <b>Daftar Premium</b> (${listData.length})\n\n${list.join('\n')}</blockquote>`
    );
    return;
  }

  // ======================== GROUP WHITELIST ========================
  if (command === 'addgrub') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetId = text.trim();
    if (!targetId || !/^-?\d+$/.test(targetId)) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addgrub [ID Grup]</code></blockquote>`, { parse_mode: 'HTML' });
    let listData = readJson(DB.ALLOWED_GROUPS);
    if (listData.some(g => String(g.id) === targetId)) return reply(`<blockquote>${E.cross} Grup <code>${targetId}</code> sudah terdaftar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menambahkan grup...</b></blockquote>`, { parse_mode: 'HTML' });
    let groupName = `ID: ${targetId}`;
    try { const chatInfo = await xy.api.getChat(targetId); groupName = chatInfo.title || groupName; } catch (e) { groupName = `Grup (${targetId})`; }
    listData.push({ id: targetId, name: groupName, added_by: xy.from.id, date: new Date().toISOString() });
    writeJson(DB.ALLOWED_GROUPS, listData);
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.check} <b>Grup Ditambahkan!</b>\n${E.dot} Nama: <b>${groupName}</b>\n${E.dot} ID: <code>${targetId}</code></blockquote>`
    );
    return;
  }

  if (command === 'delgrub') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetId = text.trim();
    if (!targetId || !/^-?\d+$/.test(targetId)) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delgrub [ID Grup]</code></blockquote>`, { parse_mode: 'HTML' });
    let listData = readJson(DB.ALLOWED_GROUPS);
    const initialLength = listData.length;
    listData = listData.filter(g => String(g.id) !== targetId);
    if (listData.length === initialLength) return reply(`<blockquote>${E.cross} Grup <code>${targetId}</code> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    writeJson(DB.ALLOWED_GROUPS, listData);
    let finalMsg = `${E.check} <b>Grup Dihapus!</b>\n${E.dot} ID: <code>${targetId}</code>`;
    try { await xy.api.leaveChat(targetId); finalMsg += `\n${E.check} Bot keluar dari grup.`; }
    catch (e) { finalMsg += `\n${E.cross} Gagal keluar dari grup.`; }
    return reply(`<blockquote>${finalMsg}</blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'listgrub') {
    if (!isOwnerRole(userId)) return reply(`<blockquote>${E.cross} <b>Akses Ditolak!</b></blockquote>`, { parse_mode: 'HTML' });
    const listData = readJson(DB.ALLOWED_GROUPS);
    if (!listData.length) return reply(`<blockquote>${E.cross} Belum ada grup terdaftar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar grup...</b></blockquote>`, { parse_mode: 'HTML' });
    const list = listData.map(g => `${E.dot} <code>${g.id}</code> - <b>${g.name || 'N/A'}</b>`);
    await editReply(xy, sentMessage.message_id,
      `<blockquote>${E.star} <b>Grup yang Diizinkan</b> (${listData.length})\n\n${list.join('\n')}</blockquote>`
    );
    return;
  }
}

module.exports = { commands: USER_COMMANDS, handle };
