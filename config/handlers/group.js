/**
 * SC-CPANEL VIP V5.5 - Group Management Handler
 * Commands: open, close, kickuser, promoteuser, demoteuser, changetitle,
 *           changedesk, changeppgc, pinn, unpinn, delete, warnn, warns,
 *           resetwarnn, welcome, leave, antilink, linkgroup, groupstats,
 *           createpolling, addlist, dellist, updatelist, dellistall,
 *           listproduk, searchproduk, adduser
 */

const fs = require('fs');
const { E, editReply, readJson, writeJson, DB } = require('./utils');

const GROUP_COMMANDS = [
  'open', 'close', 'kickuser', 'promoteuser', 'demoteuser',
  'changetitle', 'changedesk', 'changeppgc', 'pinn', 'unpinn',
  'delete', 'warnn', 'warns', 'resetwarnn', 'welcome', 'leave',
  'antilink', 'linkgroup', 'groupstats', 'createpolling',
  'addlist', 'dellist', 'updatelist', 'dellistall',
  'listproduk', 'searchproduk', 'adduser',
];


async function handle(xy, { command, text, reply, mess, isGroupAdmins, isBotGroupAdmins, warnDB, saveWarnDB, InputFile, botToken }) {
  const userId = xy.from.id;
  const isGroup = xy.chat.type === 'group' || xy.chat.type === 'supergroup';

  // ======================== GROUP PERMISSIONS ========================
  if (command === 'open') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.setChatPermissions(xy.chat.id, { can_send_messages: true, can_send_audios: true, can_send_photos: true, can_send_videos: true, can_send_other_messages: true });
      return reply(`<blockquote>${E.check} <b>Grup DIBUKA!</b>\n${E.dot} ${xy.chat.title}</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal membuka grup.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'close') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.setChatPermissions(xy.chat.id, { can_send_messages: false });
      return reply(`<blockquote>${E.cross} <b>Grup DITUTUP!</b>\n${E.dot} ${xy.chat.title}</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal menutup grup.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }


  // ======================== MEMBER MANAGEMENT ========================
  if (command === 'kickuser') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota yang ingin dikick.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.banChatMember(xy.chat.id, targetUser.id);
      return reply(`<blockquote>${E.check} <b>${targetUser.first_name}</b> dikeluarkan dari grup!</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal mengeluarkan anggota.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'promoteuser') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota yang ingin dipromote.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.promoteChatMember(xy.chat.id, targetUser.id, {
        can_change_info: true, can_delete_messages: true, can_invite_users: true,
        can_restrict_members: true, can_pin_messages: true, can_manage_topics: true,
        can_manage_video_chats: true, can_promote_members: false,
      });
      return reply(`<blockquote>${E.crown} <b>${targetUser.first_name}</b> diangkat menjadi Admin!</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal promote.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'demoteuser') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota yang ingin didemote.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.promoteChatMember(xy.chat.id, targetUser.id, {
        can_change_info: false, can_delete_messages: false, can_invite_users: false,
        can_restrict_members: false, can_pin_messages: false, can_manage_topics: false,
        can_manage_video_chats: false, can_promote_members: false,
      });
      return reply(`<blockquote>${E.check} <b>${targetUser.first_name}</b> diturunkan menjadi member.</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal demote.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'adduser') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota.</blockquote>`, { parse_mode: 'HTML' });
    return reply(`<blockquote>${E.star} <b>Untuk menambahkan ${targetUser.first_name}</b>, kirim link undangan grup kepadanya.</blockquote>`, { parse_mode: 'HTML' });
  }


  // ======================== GROUP SETTINGS ========================
  if (command === 'changetitle') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/changetitle [Judul Baru]</code></blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.setChatTitle(xy.chat.id, text);
      return reply(`<blockquote>${E.check} <b>Nama grup diubah!</b>\n${E.dot} Baru: <b>${text}</b></blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal mengubah nama.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'changedesk') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const newDesc = text?.trim() || 'Tidak ada deskripsi.';
    try {
      await xy.api.setChatDescription(xy.chat.id, newDesc);
      return reply(`<blockquote>${E.check} <b>Deskripsi diubah!</b>\n${E.dot} <i>${newDesc}</i></blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'changeppgc') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!xy.message.reply_to_message || !xy.message.reply_to_message.photo) return reply(`<blockquote>${E.cross} Reply gambar untuk PP grup.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengganti foto profil grup...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const axios = require('axios');
      const fileId = xy.message.reply_to_message.photo.at(-1).file_id;
      const file = await xy.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const response = await axios.get(fileUrl, { responseType: 'stream' });
      const filePath = `./temp_ppgc_${Date.now()}.jpg`;
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      await xy.api.setChatPhoto(xy.chat.id, new InputFile(filePath));
      fs.unlinkSync(filePath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Foto profil grup berhasil diganti!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal mengganti foto.</b></blockquote>`); }
    return;
  }


  // ======================== PIN/UNPIN ========================
  if (command === 'pinn') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Reply pesan yang ingin disematkan.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.pinChatMessage(xy.chat.id, xy.message.reply_to_message.message_id, { disable_notification: true });
      return reply(`<blockquote>${E.check} <b>Pesan disematkan!</b></blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'unpinn') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      if (xy.message.reply_to_message) {
        await xy.api.unpinChatMessage(xy.chat.id, xy.message.reply_to_message.message_id);
      } else {
        await xy.api.unpinAllChatMessages(xy.chat.id);
      }
      return reply(`<blockquote>${E.check} <b>Sematan dilepas!</b></blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  if (command === 'delete') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Reply pesan yang ingin dihapus.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.deleteMessage(xy.chat.id, xy.message.reply_to_message.message_id);
      await xy.api.deleteMessage(xy.chat.id, xy.message.message_id);
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal menghapus.</b></blockquote>`, { parse_mode: 'HTML' }); }
    return;
  }

  // ======================== WARNING SYSTEM ========================
  if (command === 'warnn') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota.</blockquote>`, { parse_mode: 'HTML' });
    const targetId = String(targetUser.id), groupID = String(xy.chat.id), maxWarn = 5;
    let groupWarns = warnDB[groupID] || {};
    let userWarns = (groupWarns[targetId] || 0) + 1;
    groupWarns[targetId] = userWarns;
    warnDB[groupID] = groupWarns;
    saveWarnDB(warnDB);
    if (userWarns >= maxWarn) {
      try {
        await xy.api.banChatMember(xy.chat.id, targetUser.id);
        delete groupWarns[targetId]; saveWarnDB(warnDB);
        return reply(`<blockquote>${E.bolt} <b>${targetUser.first_name}</b> dikeluarkan!\n${E.dot} Peringatan: <b>${userWarns}/${maxWarn}</b></blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { return reply(`<blockquote>${E.bolt} <b>${targetUser.first_name}</b> mencapai batas warn, gagal kick.</blockquote>`, { parse_mode: 'HTML' }); }
    }
    return reply(`<blockquote>${E.bolt} <b>${targetUser.first_name}</b> diperingatkan!\n${E.dot} Peringatan: <b>${userWarns}/${maxWarn}</b></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'warns') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from || xy.from;
    const groupWarns = warnDB[String(xy.chat.id)] || {};
    const userWarns = groupWarns[String(targetUser.id)] || 0;
    return reply(`<blockquote>${E.star} <b>${targetUser.first_name}</b>\n${E.dot} Peringatan: <b>${userWarns}/5</b></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'resetwarnn') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const targetUser = xy.message.reply_to_message?.from;
    if (!targetUser) return reply(`<blockquote>${E.cross} Reply pesan anggota.</blockquote>`, { parse_mode: 'HTML' });
    const targetId = String(targetUser.id), groupID = String(xy.chat.id);
    let groupWarns = warnDB[groupID] || {};
    if (groupWarns[targetId]) { delete groupWarns[targetId]; warnDB[groupID] = groupWarns; saveWarnDB(warnDB); }
    return reply(`<blockquote>${E.check} <b>Peringatan ${targetUser.first_name} di-reset!</b></blockquote>`, { parse_mode: 'HTML' });
  }


  // ======================== WELCOME / LEAVE / ANTILINK ========================
  if (command === 'welcome') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const groupID = xy.chat.id;
    let listData = readJson(DB.WELEAVE, []);
    let found = listData.findIndex(item => item.id === groupID);
    const action = (text || '').toLowerCase().trim();
    if (action === 'on') {
      if (found === -1) listData.push({ id: groupID, welcome: true, leave: false });
      else listData[found].welcome = true;
      writeJson(DB.WELEAVE, listData);
      return reply(`<blockquote>${E.check} <b>Welcome DIAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    } else if (action === 'off') {
      if (found !== -1) { listData[found].welcome = false; writeJson(DB.WELEAVE, listData); }
      return reply(`<blockquote>${E.cross} <b>Welcome DINONAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    }
    return reply(`<blockquote>${E.star} Penggunaan: <code>/welcome on/off</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'leave') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const groupID = xy.chat.id;
    let listData = readJson(DB.WELEAVE, []);
    let found = listData.findIndex(item => item.id === groupID);
    const action = (text || '').toLowerCase().trim();
    if (action === 'on') {
      if (found === -1) listData.push({ id: groupID, welcome: false, leave: true });
      else listData[found].leave = true;
      writeJson(DB.WELEAVE, listData);
      return reply(`<blockquote>${E.check} <b>Leave DIAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    } else if (action === 'off') {
      if (found !== -1) { listData[found].leave = false; writeJson(DB.WELEAVE, listData); }
      return reply(`<blockquote>${E.cross} <b>Leave DINONAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    }
    return reply(`<blockquote>${E.star} Penggunaan: <code>/leave on/off</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'antilink') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    const groupID = xy.chat.id;
    let listData = readJson(DB.ANTILINK, []);
    let found = listData.findIndex(item => item.id === groupID);
    const action = (text || '').toLowerCase().trim();
    if (action === 'on') {
      if (found === -1) listData.push({ id: groupID, active: true });
      else listData[found].active = true;
      writeJson(DB.ANTILINK, listData);
      return reply(`<blockquote>${E.check} <b>Anti-Link DIAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    } else if (action === 'off') {
      if (found !== -1) { listData[found].active = false; writeJson(DB.ANTILINK, listData); }
      return reply(`<blockquote>${E.cross} <b>Anti-Link DINONAKTIFKAN!</b></blockquote>`, { parse_mode: 'HTML' });
    }
    const status = found !== -1 && listData[found].active ? 'AKTIF' : 'NONAKTIF';
    return reply(`<blockquote>${E.star} <b>Anti-Link:</b> ${status}\n${E.dot} <code>/antilink on/off</code></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'linkgroup') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isBotGroupAdmins) return reply(`<blockquote>${E.cross} <b>Bot harus jadi Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const link = await xy.api.exportChatInviteLink(xy.chat.id);
      return reply(`<blockquote>${E.rocket} <b>Link Undangan:</b>\n${link}</blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal mendapatkan link.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }


  // ======================== GROUP STATS / POLLING ========================
  if (command === 'groupstats') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengambil statistik grup...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const chat = await xy.api.getChat(xy.chat.id);
      const memberCount = await xy.api.getChatMemberCount(xy.chat.id);
      const admins = await xy.getChatAdministrators();
      await editReply(xy, sentMessage.message_id,
        `<blockquote>${E.star} <b>STATISTIK GRUP</b>\n\n` +
        `${E.dot} Nama: <b>${chat.title}</b>\n` +
        `${E.dot} ID: <code>${xy.chat.id}</code>\n` +
        `${E.dot} Anggota: <b>${memberCount}</b>\n` +
        `${E.dot} Admin: <b>${admins.length}</b>\n` +
        `${E.dot} Deskripsi: <i>${chat.description || '-'}</i>\n` +
        `${E.dot} Tipe: ${chat.type}</blockquote>`
      );
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal mengambil statistik.</b></blockquote>`); }
    return;
  }

  if (command === 'createpolling') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!isGroupAdmins) return reply(`<blockquote>${E.cross} <b>Khusus Admin!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text || !text.includes('|')) return reply(`<blockquote>${E.cross} Format: <code>/createpolling Pertanyaan | Pilihan1,Pilihan2,...</code></blockquote>`, { parse_mode: 'HTML' });
    const [question, optionsRaw] = text.split('|').map(s => s.trim());
    const options = optionsRaw.split(',').map(s => s.trim()).filter(s => s);
    if (!question || options.length < 2) return reply(`<blockquote>${E.cross} Minimal 2 pilihan.</blockquote>`, { parse_mode: 'HTML' });
    try {
      await xy.api.sendPoll(xy.chat.id, question, options, { is_anonymous: true });
      return reply(`<blockquote>${E.check} <b>Polling berhasil dibuat!</b></blockquote>`, { parse_mode: 'HTML' });
    } catch (e) { return reply(`<blockquote>${E.cross} <b>Gagal membuat polling.</b></blockquote>`, { parse_mode: 'HTML' }); }
  }

  // ======================== LIST / PRODUK ========================
  if (command === 'addlist') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const info = (text || '').split('|');
    if (info.length < 2) return reply(`<blockquote>${E.cross} Format: <code>/addlist Key | Respon</code></blockquote>`, { parse_mode: 'HTML' });
    const [key, resp] = info.map(s => s.trim());
    const groupID = xy.chat.id;
    let listData = readJson(DB.LIST);
    if (listData.some(item => item.id === groupID && item.key.toLowerCase() === key.toLowerCase())) {
      return reply(`<blockquote>${E.cross} Key <b>${key}</b> sudah ada.</blockquote>`, { parse_mode: 'HTML' });
    }
    listData.push({ id: groupID, key, response: resp, isImage: false, image_url: '' });
    writeJson(DB.LIST, listData);
    return reply(`<blockquote>${E.check} <b>Produk Ditambahkan!</b>\n${E.dot} Key: <b>${key}</b></blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'dellist') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/dellist Key</code></blockquote>`, { parse_mode: 'HTML' });
    const key = text.trim(), groupID = xy.chat.id;
    let listData = readJson(DB.LIST);
    const init = listData.length;
    listData = listData.filter(item => !(item.id === groupID && item.key.toLowerCase() === key.toLowerCase()));
    if (listData.length < init) { writeJson(DB.LIST, listData); return reply(`<blockquote>${E.check} <b>${key}</b> dihapus!</blockquote>`, { parse_mode: 'HTML' }); }
    return reply(`<blockquote>${E.cross} Key <b>${key}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'updatelist') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const info = (text || '').split('|');
    if (info.length < 2) return reply(`<blockquote>${E.cross} Format: <code>/updatelist Key | Respon Baru</code></blockquote>`, { parse_mode: 'HTML' });
    const [key, resp] = info.map(s => s.trim()), groupID = xy.chat.id;
    let listData = readJson(DB.LIST);
    const idx = listData.findIndex(item => item.id === groupID && item.key.toLowerCase() === key.toLowerCase());
    if (idx === -1) return reply(`<blockquote>${E.cross} Key <b>${key}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    listData[idx].response = resp;
    writeJson(DB.LIST, listData);
    return reply(`<blockquote>${E.check} <b>${key}</b> diperbarui!</blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'dellistall') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const groupID = xy.chat.id;
    let listData = readJson(DB.LIST);
    const init = listData.length;
    listData = listData.filter(item => item.id !== groupID);
    writeJson(DB.LIST, listData);
    return reply(`<blockquote>${E.check} <b>${init - listData.length} produk</b> dihapus!</blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'listproduk') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    const groupID = xy.chat.id;
    const list = readJson(DB.LIST).filter(item => item.id === groupID);
    if (!list.length) return reply(`<blockquote>${E.cross} Tidak ada produk.</blockquote>`, { parse_mode: 'HTML' });
    let txt = list.map((item, i) => `${i+1}. <b>${item.key}</b>`).join('\n');
    return reply(`<blockquote>${E.star} <b>DAFTAR PRODUK</b> (${list.length})\n\n${txt}</blockquote>`, { parse_mode: 'HTML' });
  }

  if (command === 'searchproduk') {
    if (!isGroup) return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/searchproduk Kata Kunci</code></blockquote>`, { parse_mode: 'HTML' });
    const kw = text.toLowerCase(), groupID = xy.chat.id;
    const results = readJson(DB.LIST).filter(item => item.id === groupID && (item.key.toLowerCase().includes(kw) || item.response.toLowerCase().includes(kw)));
    if (!results.length) return reply(`<blockquote>${E.cross} Tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    let txt = results.map((item, i) => `${i+1}. <b>${item.key}</b>`).join('\n');
    return reply(`<blockquote>${E.bolt} <b>HASIL PENCARIAN</b> (${results.length})\n\n${txt}\n\n${E.dot} Ketik key untuk detail.</blockquote>`, { parse_mode: 'HTML' });
  }
}

module.exports = { commands: GROUP_COMMANDS, handle };
