/**
 * SC-CPANEL VIP V5.5 - Utility Tools Handler
 * Commands: toqr, sticker, toimg, toimage, tovideo, ssweb, catbox, cekid, pay, hello, info
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { createCanvas, loadImage } = require('canvas');
const { E, editReply } = require('./utils');
const { checkUserRole } = require('../../src/lib/roles');

const TOOLS_COMMANDS = [
  'toqr', 'sticker', 'toimg', 'toimage', 'tovideo',
  'ssweb', 'catbox', 'cekid', 'pay', 'hello', 'info',
];


async function handle(xy, { command, text, q, reply, InputFile, botToken, CatBox, isOwner }) {
  const userId = xy.from.id;

  // ======================== HELLO ========================
  if (command === 'hello') {
    return reply(`<blockquote>${E.sparkles} <b>Hello!</b>\n${E.dot} Selamat datang di <b>SC-CPANEL VIP V5.5</b>!</blockquote>`, { parse_mode: 'HTML' });
  }

  // ======================== QR CODE ========================
  if (command === 'toqr') {
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/toqr teks atau link</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat QR Code...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
      await xy.api.sendPhoto(xy.chat.id, qrUrl, { caption: `<blockquote>${E.check} <b>QR Code</b>\n${E.dot} <code>${text}</code></blockquote>`, parse_mode: 'HTML' });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>QR Code berhasil!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }

  // ======================== SCREENSHOT WEB ========================
  if (command === 'ssweb') {
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/ssweb url</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Screenshot web...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const url = text.startsWith('http') ? text : 'https://' + text;
      const filename = path.join(__dirname, 'screenshot.jpg');
      const response = await axios.get(`https://image.thum.io/get/width/1900/crop/1000/fullpage/${url}`, { responseType: 'stream' });
      const writer = fs.createWriteStream(filename);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      await xy.api.sendPhoto(xy.chat.id, new InputFile(filename), { caption: `<blockquote>${E.check} <b>Screenshot:</b> ${url}</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(filename);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Screenshot berhasil!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }


  // ======================== STICKER / TOIMG / TOVIDEO ========================
  if (command === 'sticker') {
    if (!xy.message.reply_to_message || (!xy.message.reply_to_message.photo && !xy.message.reply_to_message.video))
      return reply(`<blockquote>${E.cross} Reply gambar/video dengan <code>/sticker</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat stiker...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      let fileId, isVideo = false;
      if (xy.message.reply_to_message.photo) fileId = xy.message.reply_to_message.photo.at(-1).file_id;
      else { fileId = xy.message.reply_to_message.video.file_id; isVideo = true; }
      const file = await xy.api.getFile(fileId);
      const filePath = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const inputPath = `./temp_input${isVideo ? '.mp4' : '.jpg'}`;
      const outputPath = `./temp_output.${isVideo ? 'webm' : 'webp'}`;
      const response = await axios.get(filePath, { responseType: 'arraybuffer' });
      fs.writeFileSync(inputPath, response.data);
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease" ${isVideo ? '-c:v libvpx-vp9 -b:v 500k -an' : ''} "${outputPath}"`, (err) => {
          fs.existsSync(inputPath) && fs.unlinkSync(inputPath);
          if (err) return reject(err);
          resolve();
        });
      });
      await xy.api.sendSticker(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath));
      fs.unlinkSync(outputPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Stiker berhasil!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }

  if (command === 'toimg' || command === 'toimage') {
    if (!xy.message.reply_to_message || !xy.message.reply_to_message.sticker)
      return reply(`<blockquote>${E.cross} Reply stiker dengan <code>/toimg</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Konversi stiker...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const fileId = xy.message.reply_to_message.sticker.file_id;
      const file = await xy.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const inputPath = `./temp_sticker.webp`, outputPath = `./temp_image.png`;
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(inputPath, response.data);
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${inputPath}" "${outputPath}"`, (err) => { fs.unlinkSync(inputPath); if (err) reject(err); else resolve(); });
      });
      await xy.api.sendPhoto(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath), { caption: `<blockquote>${E.check} <b>Berhasil!</b></blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(outputPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Selesai!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }

  if (command === 'tovideo') {
    if (!xy.message.reply_to_message || !xy.message.reply_to_message.sticker)
      return reply(`<blockquote>${E.cross} Reply stiker dengan <code>/tovideo</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Konversi ke video...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const sticker = xy.message.reply_to_message.sticker;
      const ext = sticker.is_video ? '.webm' : '.webp';
      const inputPath = `./sticker${ext}`, outputPath = `./video.mp4`;
      const file = await xy.api.getFile(sticker.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(inputPath, response.data);
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -i "${inputPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=512:512" "${outputPath}"`, (err) => { fs.unlinkSync(inputPath); if (err) reject(err); else resolve(); });
      });
      await xy.api.sendVideo(xy.chat.id, new InputFile(fs.readFileSync(outputPath), 'video.mp4'), { caption: `<blockquote>${E.check} <b>Berhasil!</b></blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(outputPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Selesai!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }


  // ======================== CATBOX UPLOAD ========================
  if (command === 'catbox') {
    if (!xy.message.reply_to_message || (!xy.message.reply_to_message.photo && !xy.message.reply_to_message.video))
      return reply(`<blockquote>${E.cross} Reply gambar/video dengan <code>/catbox</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunggah...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const fileId = xy.message.reply_to_message.photo ? xy.message.reply_to_message.photo.at(-1).file_id : xy.message.reply_to_message.video.file_id;
      const file = await xy.api.getFile(fileId);
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const filePath = path.join(__dirname, path.basename(file.file_path));
      const response = await axios({ url: fileUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      const uploaded = await CatBox(filePath);
      fs.unlinkSync(filePath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Upload Berhasil!</b>\n${E.dot} ${uploaded}</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal upload.</b></blockquote>`); }
    return;
  }

  // ======================== CEK ID ========================
  if (command === 'cekid') {
    let targetId = null, targetUser = null;
    const targetIdInput = (text || '').trim();
    const msg = xy.message;
    if (targetIdInput && /^\d+$/.test(targetIdInput)) targetId = targetIdInput;
    else if (msg.reply_to_message) { targetUser = msg.reply_to_message.forward_from || msg.reply_to_message.from; targetId = String(targetUser.id); }
    else { targetUser = xy.from; targetId = String(targetUser.id); }
    if (!targetId) return reply(`<blockquote>${E.cross} Format: <code>/cekid ID</code> atau reply pesan.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat ID Card...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      if (!targetUser) { try { targetUser = await xy.api.getChat(targetId); } catch (e) {} }
      const fullName = targetUser ? `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() : `ID: ${targetId}`;
      const username = targetUser?.username ? `@${targetUser.username}` : '-';
      const today = new Date().toISOString().split('T')[0];
      let photoUrl = null;
      try {
        const photos = await xy.api.getUserProfilePhotos(targetId, { limit: 1 });
        if (photos.total_count > 0) { const f = await xy.api.getFile(photos.photos[0][0].file_id); photoUrl = `https://api.telegram.org/file/bot${botToken}/${f.file_path}`; }
      } catch (e) {}
      const isSellerRole = checkUserRole(targetId, ['seller'], '');
      const isOwnerRole = checkUserRole(targetId, ['owner'], '');
      const botRole = isOwnerRole ? '👑 OWNER' : isSellerRole ? '🌟 SELLER' : '👤 USER';
      const canvas = createCanvas(900, 520);
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#0d1117'); gradient.addColorStop(0.5, '#161b22'); gradient.addColorStop(1, '#0d1117');
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 4; ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1; ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);
      ctx.fillStyle = '#d4af37'; ctx.font = 'bold 28px Arial'; ctx.textAlign = 'center'; ctx.fillText('SC-CPANEL VIP V5.5', canvas.width / 2, 60);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Arial'; ctx.fillText('PREMIUM ID CARD', canvas.width / 2, 90);
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(50, 110); ctx.lineTo(canvas.width - 50, 110); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.arc(140, 220, 70, 0, Math.PI * 2, true); ctx.closePath(); ctx.clip();
      if (photoUrl) { try { const r = await axios.get(photoUrl, { responseType: 'arraybuffer' }); const avatar = await loadImage(Buffer.from(r.data)); ctx.drawImage(avatar, 70, 150, 140, 140); } catch (e) { ctx.fillStyle = '#1a1a2e'; ctx.fill(); } }
      else { ctx.fillStyle = '#1a1a2e'; ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(140, 220, 70, 0, Math.PI * 2, true); ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = '#d4af37'; ctx.font = 'bold 22px Arial'; ctx.fillText('INFORMASI PENGGUNA', 260, 155);
      ctx.fillStyle = '#ffffff'; ctx.font = '18px Arial';
      ctx.fillText(`Nama      : ${fullName}`, 260, 195);
      ctx.fillText(`User ID   : ${targetId}`, 260, 230);
      ctx.fillText(`Username  : ${username}`, 260, 265);
      ctx.fillText(`Tanggal   : ${today}`, 260, 300);
      ctx.fillText(`Role Bot  : ${botRole}`, 260, 335);
      ctx.textAlign = 'center'; ctx.font = 'italic 16px Arial'; ctx.fillStyle = '#d4af37';
      ctx.fillText(`SC-CPANEL VIP V5.5 Premium`, canvas.width / 2, 470);
      const buffer = canvas.toBuffer('image/png');
      const caption = `<blockquote>${E.diamond} <b>PREMIUM ID CARD</b>\n\n${E.crown} <b>Nama:</b> ${fullName}\n${E.star} <b>ID:</b> <code>${targetId}</code>\n${E.fire} <b>Username:</b> ${username}\n${E.bolt} <b>Role:</b> ${botRole}</blockquote>`;
      await xy.api.sendPhoto(xy.chat.id, new InputFile(buffer, 'id_card.png'), { caption, parse_mode: 'HTML', reply_to_message_id: xy.message.message_id });
      await xy.api.deleteMessage(xy.chat.id, sentMessage.message_id);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }


  // ======================== PAY ========================
  if (command === 'pay') {
    const metode = (text || '').trim().toLowerCase();
    const payData = global.payment || {};
    const metodeList = {};
    if (payData.dana) metodeList.dana = { ...payData.dana, icon: '💙' };
    if (payData.gopay) metodeList.gopay = { ...payData.gopay, icon: '💚' };
    if (payData.ovo) metodeList.ovo = { ...payData.ovo, icon: '💜' };
    if (payData.qris) metodeList.qris = { ...payData.qris, icon: '🔲' };
    if (!metode || !metodeList[metode]) {
      let methods = '';
      if (metodeList.dana) methods += `\n${E.dot} <code>/pay dana</code>`;
      if (metodeList.gopay) methods += `\n${E.dot} <code>/pay gopay</code>`;
      if (metodeList.ovo) methods += `\n${E.dot} <code>/pay ovo</code>`;
      if (metodeList.qris) methods += `\n${E.dot} <code>/pay qris</code>`;
      return reply(
        `<blockquote>${E.diamond} <b>PEMBAYARAN SC-CPANEL VIP</b>\n\n` +
        `${E.star} <b>Pilih Metode:</b>${methods}\n\n` +
        `${E.bolt} <b>Proses 1-3 Menit</b></blockquote>`, { parse_mode: 'HTML' }
      );
    }
    const pilih = metodeList[metode];
    if (metode === 'qris' && pilih.image) {
      return reply(
        `<blockquote>${E.diamond} <b>PEMBAYARAN QRIS</b>\n${E.dot} Scan QR di bawah ini</blockquote>`,
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [[{ text: '📱 Lihat QRIS', url: pilih.image }]] } }
      );
    }
    return reply(
      `<blockquote>${E.diamond} <b>PEMBAYARAN ${pilih.name}</b>\n\n` +
      `${E.dot} Nomor: <code>${pilih.no}</code>\n` +
      `${E.dot} A/N: <b>${pilih.an}</b>\n\n` +
      `${E.bolt} <b>Setelah transfer, konfirmasi ke Owner.</b></blockquote>`, { parse_mode: 'HTML' }
    );
  }

  // ======================== INFO ========================
  if (command === 'info') {
    if (xy.chat.type === 'private') return reply(`<blockquote>${E.cross} <b>Khusus Grup!</b></blockquote>`, { parse_mode: 'HTML' });
    let targetId = null, targetUser = null;
    const targetIdInput = (text || '').trim();
    if (targetIdInput && /^\d+$/.test(targetIdInput)) targetId = targetIdInput;
    else if (xy.message.reply_to_message) { targetUser = xy.message.reply_to_message.from; targetId = String(targetUser.id); }
    else { targetUser = xy.from; targetId = String(targetUser.id); }
    if (!targetId) return reply(`<blockquote>${E.cross} ID tidak valid.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengecek status ${targetId}...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      if (!targetUser) { try { targetUser = await xy.api.getChat(targetId); } catch (e) {} }
      const nameToDisplay = targetUser ? (targetUser.first_name + (targetUser.last_name ? ' ' + targetUser.last_name : '')) : `ID: ${targetId}`;
      const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
      const statusList = servers.map(v => {
        const has = checkUserRole(targetId, ['owner','partner','reseller'], v);
        return `${E.dot} ${v.toUpperCase()}: ${has ? E.check : E.cross}`;
      });
      const isSellerR = checkUserRole(targetId, ['seller'], '');
      const isOwnerR = checkUserRole(targetId, ['owner'], '');
      const globalRole = isOwnerR ? '👑 Owner' : isSellerR ? '🌟 Seller' : '👤 User';
      let botChat = false;
      try { await xy.api.sendMessage(targetId, `${E.check} Cek koneksi!`); botChat = true; } catch (e) {}
      await editReply(xy, sentMessage.message_id,
        `<blockquote>${E.crown} <b>${nameToDisplay}</b>\n\n` +
        `${E.dot} ID: <code>${targetId}</code>\n` +
        `${E.dot} Username: @${targetUser?.username || '-'}\n` +
        `${E.dot} Status: <b>${globalRole}</b>\n\n` +
        `${E.fire} <b>Akses Panel:</b>\n${statusList.join('\n')}\n\n` +
        `${E.dot} Chat Bot: ${botChat ? E.check + ' Aktif' : E.cross + ' Belum'}</blockquote>`
      );
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal.</b></blockquote>`); }
    return;
  }
}

module.exports = { commands: TOOLS_COMMANDS, handle };
