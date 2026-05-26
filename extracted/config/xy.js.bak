const fs = require('fs');
const axios = require('axios');
const path = require('path');
const { exec, spawn } = require("child_process");
const qr = require('qr-image');
const Tiktok = require("@tobyg74/tiktok-api-dl");
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const crypto = require('crypto');
const { createCanvas, loadImage } = require('canvas');
const { igdl } = require('btch-downloader');
const { Client } = require('ssh2');
const tiktok2 = require('../src/lib/tiktok');
const CPU_CHECK_STATUS_FILE = './src/database/cpu_check_status.json';
const genmusic = require('../src/lib/aimusic');
const generateQRAndUpload = require("../src/lib/uploader");
const toqrcode = require('../src/lib/qrcode');
const { startWhatsAppSession, sessions, restoreWhatsAppSessions, updateActiveSessions } = require("../src/lib/connectwa");
const { addResponList1, delResponList1, isAlreadyResponList1, isAlreadyResponList1Group, sendResponList1, updateResponList1, getDataResponList1 } = require('../src/lib/addlist');

global.serverOfflineStatus = new Map();

const WELEAVE_FILE = './src/database/weleave.json';
const ANTILINK_FILE = './src/database/antilink.json';
const LIST_FILE = './src/database/list.json';
const WARN_FILE = './src/database/warns.json';
const PREMIUM_FILE = './src/database/premium.json';
const ALLOWED_GROUPS_FILE = './src/database/allowed_groups.json';

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

function readJson(filePath, defaultValue = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (e) {
        console.error(`${E.cross} Error reading ${filePath}:`, e);
        return defaultValue;
    }
}

function writeJson(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error(`${E.cross} Error writing to ${filePath}:`, e);
        return false;
    }
}

function checkUserRole(userId, requiredRoles, serverVersion) {
  const ownerFile = './owner.json';
  const partnerFile = './src/database/partner.json';
  const resellerFile = './src/database/reseller.json';
  const sellerFile = './src/database/seller.json';
  const premiumFile = PREMIUM_FILE;

  let owners = [];
  let partners = [];
  let resellers = [];
  let sellers = [];
  let premiums = [];

  try {
    owners = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
    partners = JSON.parse(fs.readFileSync(partnerFile, 'utf8'));
    resellers = JSON.parse(fs.readFileSync(resellerFile, 'utf8'));
    sellers = JSON.parse(fs.readFileSync(sellerFile, 'utf8'));
    premiums = JSON.parse(fs.readFileSync(premiumFile, 'utf8'));
  } catch (e) {
    console.error("Error reading role files:", e);
  }

  const userIdStr = String(userId);
  const isOwner = owners.includes(userIdStr);
  const isPremium = premiums.includes(userIdStr);

  if (isOwner && requiredRoles.includes('owner')) return true;
  if (isPremium && (requiredRoles.includes('reseller') || requiredRoles.includes('seller'))) return true;

  if (requiredRoles.includes('partner') && Array.isArray(partners)) {
    const isPartner = partners.some(p => String(p.id) === userIdStr && p.server === serverVersion);
    if (isPartner) return true;
  }

  if (requiredRoles.includes('reseller') && Array.isArray(resellers)) {
    const isReseller = resellers.some(r => String(r.id) === userIdStr && r.server === serverVersion);
    if (isReseller) return true;
  }

  if (requiredRoles.includes('seller') && Array.isArray(sellers)) {
    const isSeller = sellers.some(s => String(s.id) === userIdStr);
    if (isSeller) return true;
  }

  return false;
}

async function getServerStatus(serverUuid, panelConfig) {
  try {
    const response = await axios.get(`${panelConfig.panelDomain}/api/client/servers/${serverUuid}/resources`, {
      headers: { 'Authorization': `Bearer ${panelConfig.pltcKey}` }
    });
    return response.data.attributes.current_state;
  } catch (error) {
    return 'error';
  }
}

async function checkAndStopAbnormalCpu(botInstance) {
    const statusData = readJson(CPU_CHECK_STATUS_FILE, {});
    const now = Date.now();

    for (const key in statusData) {
        if (!key.startsWith('v') || !statusData[key].active) continue;

        const serverVersion = key;
        const panelConfig = getPanelConfig(serverVersion);
        const { panelDomain, pltaKey, pltcKey } = panelConfig;
        const targetChatId = statusData[serverVersion].chat_id;
        const recipientId = targetChatId || global.idowner;

        if (!panelDomain || !pltaKey || !pltcKey || !recipientId) continue;

        let servers = [];
        let page = 1;
        let hasMore = true;
        let abnormalCpuServers = [];
        let totalServersChecked = 0;
        let serversFailedToStop = 0;
        let serversSkippedStop = 0;
        let initialMessageId = null;

        try {
            const loadingMsg = await botInstance.api.sendMessage(recipientId, `<blockquote>${E.bolt} <b>AUTO-CHECK CPU - ${serverVersion.toUpperCase()}</b>\n${E.dot} Memulai pengecekan...</blockquote>`, { parse_mode: 'HTML' });
            initialMessageId = loadingMsg.message_id;

            while (hasMore) {
                const response = await axios.get(`${panelDomain}/api/application/servers?page=${page}`, {
                    headers: { 'Authorization': `Bearer ${pltaKey}` }
                });
                const result = response.data;
                servers = servers.concat(result.data);
                hasMore = result.meta.pagination.current_page < result.meta.pagination.total_pages;
                page++;
            }

            for (const server of servers) {
                const { id: serverId, name: serverName, uuid: serverUuid } = server.attributes;
                try {
                    const resourceResponse = await axios.get(`${panelDomain}/api/client/servers/${serverUuid}/resources`, {
                        headers: { 'Authorization': `Bearer ${pltcKey}` }
                    });
                    const resources = resourceResponse.data.attributes.resources;
                    if (resources && resources.cpu_absolute !== undefined) {
                        const cpuUsage = resources.cpu_absolute;
                        const cpuLimit = resources.cpu_limit;
                        const limitToCompare = cpuLimit > 400 ? (cpuLimit * 0.8) : 320;
                        totalServersChecked++;
                        if (cpuUsage > limitToCompare) {
                            abnormalCpuServers.push({ serverId, serverName, serverUuid, cpuUsage, cpuLimit, limitToCompare });
                        }
                    }
                } catch (error) {}
            }

            for (const srv of abnormalCpuServers) {
                const stopTime = statusData[serverVersion].auto_stop[srv.serverId];
                if (stopTime && (now - stopTime < 5 * 60 * 1000)) {
                    serversSkippedStop++;
                    continue;
                }
                const isStopped = await stopServer(srv.serverUuid, panelDomain, pltcKey);
                if (isStopped) {
                    const notification = `<blockquote>${E.fire} <b>AUTO-STOP CPU - ${serverVersion.toUpperCase()}</b>\nServer <b>${srv.serverName}</b> (ID: <code>${srv.serverId}</code>) dihentikan!\n${E.bolt} CPU: ${srv.cpuUsage.toFixed(2)}% (Limit: ${srv.cpuLimit}%)</blockquote>`;
                    try {
                        await botInstance.api.sendMessage(recipientId, notification, { parse_mode: 'HTML' });
                    } catch (e) {}
                    statusData[serverVersion].auto_stop[srv.serverId] = now;
                } else {
                    serversFailedToStop++;
                }
            }

            let finalMessage = `<blockquote>${E.check} <b>AUTO-CHECK SELESAI - ${serverVersion.toUpperCase()}</b>\n${E.dot} Dicek: <b>${totalServersChecked}</b>\n${E.check} Dihentikan: <b>${abnormalCpuServers.length - serversFailedToStop - serversSkippedStop}</b>\n${E.cross} Gagal: <b>${serversFailedToStop}</b>\n${E.beginner} Dilewati: <b>${serversSkippedStop}</b></blockquote>`;
            await botInstance.api.editMessageText(recipientId, initialMessageId, finalMessage, { parse_mode: 'HTML' });

        } catch (err) {
            console.error(`Error auto-check CPU ${serverVersion}:`, err.message);
            const errorNotification = `<blockquote>${E.cross} <b>AUTO-CHECK GAGAL - ${serverVersion.toUpperCase()}</b>\n${err.message}</blockquote>`;
            try {
                if (initialMessageId) await botInstance.api.editMessageText(recipientId, initialMessageId, errorNotification, { parse_mode: 'HTML' });
                else await botInstance.api.sendMessage(recipientId, errorNotification, { parse_mode: 'HTML' });
            } catch (e) {}
        }
    }
    writeJson(CPU_CHECK_STATUS_FILE, statusData);
}

function getPanelConfig(version) {
  switch (version) {
    case 'v1': return { name: 'Server V1', panelDomain: global.domain, pltaKey: global.plta, pltcKey: global.pltc, nests: global.nests, eggs: global.eggs, loc: global.loc };
    case 'v2': return { name: 'Server V2', panelDomain: global.domainV2, pltaKey: global.pltaV2, pltcKey: global.pltcV2, nests: global.nestsV2, eggs: global.eggsV2, loc: global.locV2 };
    case 'v3': return { name: 'Server V3', panelDomain: global.domainV3, pltaKey: global.pltaV3, pltcKey: global.pltcV3, nests: global.nestsV3, eggs: global.eggsV3, loc: global.locV3 };
    case 'v4': return { name: 'Server V4', panelDomain: global.domainV4, pltaKey: global.pltaV4, pltcKey: global.pltcV4, nests: global.nestsV4, eggs: global.eggsV4, loc: global.locV4 };
    case 'v5': return { name: 'Server V5', panelDomain: global.domainV5, pltaKey: global.pltaV5, pltcKey: global.pltcV5, nests: global.nestsV5, eggs: global.eggsV5, loc: global.locV5 };
    case 'v6': return { name: 'Server V6', panelDomain: global.domainV6, pltaKey: global.pltaV6, pltcKey: global.pltcV6, nests: global.nestsV6, eggs: global.eggsV6, loc: global.locV6 };
    case 'v7': return { name: 'Server V7', panelDomain: global.domainV7, pltaKey: global.pltaV7, pltcKey: global.pltcV7, nests: global.nestsV7, eggs: global.eggsV7, loc: global.locV7 };
    case 'v8': return { name: 'Server V8', panelDomain: global.domainV8, pltaKey: global.pltaV8, pltcKey: global.pltcV8, nests: global.nestsV8, eggs: global.eggsV8, loc: global.locV8 };
    case 'v9': return { name: 'Server V9', panelDomain: global.domainV9, pltaKey: global.pltaV9, pltcKey: global.pltcV9, nests: global.nestsV9, eggs: global.eggsV9, loc: global.locV9 };
    case 'v10': return { name: 'Server V10', panelDomain: global.domainV10, pltaKey: global.pltaV10, pltcKey: global.pltcV10, nests: global.nestsV10, eggs: global.eggsV10, loc: global.locV10 };
    default: return {};
  }
}

async function editReply(xy, messageId, text) {
  try {
    await xy.api.editMessageText(xy.chat.id, messageId, text, { parse_mode: 'HTML' });
  } catch (e) {
    console.error(`Gagal mengedit pesan ${messageId}:`, e.message);
    await xy.api.sendMessage(xy.chat.id, text, { parse_mode: 'HTML' });
  }
}

async function stopServer(serverUuid, panelDomain, pltcKey) {
  try {
    await axios.post(`${panelDomain}/api/client/servers/${serverUuid}/power`, { signal: 'stop' }, {
      headers: { 'Authorization': `Bearer ${pltcKey}`, 'Content-Type': 'application/json' }
    });
    return true;
  } catch (error) {
    console.error(`Gagal menghentikan server ${serverUuid}:`, error.message);
    return false;
  }
}

async function handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, reply, owners, seller, sellerPath, q, text, InlineKeyboard, paket, isGroupAdmins, mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, sender, db_respon_list, generateReadableString, isBotGroupAdmins) {

  const userId = xy.from.id;

  switch (command) {
  case "seturl": case "seturlv2": case "seturlv3": case "seturlv4": case "seturlv5":
case "seturlv6": case "seturlv7": case "seturlv8": case "seturlv9": case "seturlv10":
case "setplta": case "setpltav2": case "setpltav3": case "setpltav4": case "setpltav5":
case "setpltav6": case "setpltav7": case "setpltav8": case "setpltav9": case "setpltav10":
case "setpltc": case "setpltcv2": case "setpltcv3": case "setpltcv4": case "setpltcv5":
case "setpltcv6": case "setpltcv7": case "setpltcv8": case "setpltcv9": case "setpltcv10": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  const match = command.match(/v(\d)$/);
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
    return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan:\n<code>${global.prefix + command} [nilai_baru]</code>\n${E.dot} Contoh:\n<code>${global.prefix + command} https://panel.zexc.my.id</code></blockquote>`, { parse_mode: 'HTML' });
  }

  let settingsContent = fs.readFileSync(configPath, 'utf8');
  const regex = new RegExp(`${key}\\s*=\\s*['"].*?['"]`, 's');

  if (regex.test(settingsContent)) {
    settingsContent = settingsContent.replace(regex, `${key} = '${text}'`);
    fs.writeFileSync(configPath, settingsContent, 'utf8');
    const globalVarName = key.replace('global.', '');
    if (command.startsWith('seturl')) global[globalVarName] = text;
    else if (command.startsWith('setplta')) global[globalVarName] = text;
    else if (command.startsWith('setpltc')) global[globalVarName] = text;
    reply(`<blockquote>${E.check} Nilai <b>${key}</b> berhasil diubah menjadi: <code>${text}</code></blockquote>`, { parse_mode: 'HTML' });
  } else {
    reply(`<blockquote>${E.cross} Variabel <b>${key}</b> tidak ditemukan di settings.js.</blockquote>`, { parse_mode: 'HTML' });
  }
}
break;

case "hello":
  reply(`<blockquote>${E.sparkles} Hello juga! Selamat datang di <b>ZEXC OFFC CPANEL VIP</b>!</blockquote>`, { parse_mode: 'HTML' });
  break;

case "autocpuon": case "autocpuonv2": case "autocpuonv3": case "autocpuonv4": case "autocpuonv5":
case "autocpuonv6": case "autocpuonv7": case "autocpuonv8": case "autocpuonv9": case "autocpuonv10":
case "autocpuoff": case "autocpuoffv2": case "autocpuoffv3": case "autocpuoffv4": case "autocpuoffv5":
case "autocpuoffv6": case "autocpuoffv7": case "autocpuoffv8": case "autocpuoffv9": case "autocpuoffv10": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  const match = command.match(/v(\d+)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const action = command.includes('on');
  const file = CPU_CHECK_STATUS_FILE;
  let statusData = readJson(file, {});

  if (!statusData[serverVersion]) {
      statusData[serverVersion] = { active: false, auto_stop: {}, chat_id: null };
  }

  if (action) {
      if (xy.chat.type === 'group' || xy.chat.type === 'supergroup') {
          statusData[serverVersion].chat_id = xy.chat.id;
      } else if (!statusData[serverVersion].chat_id) {
          return reply(`<blockquote>${E.cross} Fitur Auto-Check CPU untuk <b>Server ${serverVersion.toUpperCase()}</b> tidak dapat diaktifkan tanpa ID Grup. Harap jalankan di dalam Grup.</blockquote>`, { parse_mode: 'HTML' });
      }
  } else {
      statusData[serverVersion].chat_id = null;
  }

  statusData[serverVersion].active = action;
  writeJson(file, statusData);

  const statusText = action ? 'DIAKTIFKAN' : 'DINONAKTIFKAN';
  const emoji = action ? E.check : E.cross;

  reply(`<blockquote>${emoji} Fitur Auto-Check CPU untuk <b>Server ${serverVersion.toUpperCase()}</b> berhasil <b>${statusText}</b>!\n${E.dot} Bot akan mengecek CPU setiap 5 menit dan menghentikan server yang melebihi batas wajar secara otomatis.</blockquote>`, { parse_mode: 'HTML' });
  break;
}

case 'cekid': {
  let targetId = null;
  let targetUser = null;
  const targetIdInput = text.trim();
  const msg = xy.message;

  if (targetIdInput && /^\d+$/.test(targetIdInput)) {
    targetId = targetIdInput;
  } else if (msg.reply_to_message) {
    targetUser = msg.reply_to_message.from;
    targetId = String(targetUser.id);
    if (msg.reply_to_message.forward_from) {
         targetUser = msg.reply_to_message.forward_from;
         targetId = String(targetUser.id);
    }
  } else {
    targetUser = xy.from;
    targetId = String(targetUser.id);
  }

  if (!targetId) {
      return reply(`<blockquote>${E.cross} ID target tidak valid. Gunakan: <code>/cekid ID_TELEGRAM</code> atau reply pesan pengguna.</blockquote>`, { parse_mode: 'HTML' });
  }

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat Kartu ID Premium untuk ${targetId}...</b></blockquote>`, { parse_mode: 'HTML' });

  (async () => {
    const userIdStr = String(targetId);
    let fullName = '';
    let username = '-';
    let today = new Date().toISOString().split('T')[0];
    let photoUrl = null;

    if (!targetUser) {
        try {
            targetUser = await xy.api.getChat(targetId);
        } catch (e) {}
    }

    if (targetUser) {
        fullName = `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim();
        username = targetUser.username ? `@${targetUser.username}` : '-';
        try {
            const photos = await xy.api.getUserProfilePhotos(targetId, { limit: 1 });
            if (photos.total_count > 0) {
                const fileId = photos.photos[0][0].file_id;
                const file = await xy.api.getFile(fileId);
                photoUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
            }
        } catch (e) {
            console.log('Gagal ambil foto profil:', e.message);
        }
    } else {
        fullName = `ID: ${targetId}`;
    }

    const isSellerRole = checkUserRole(targetId, ['seller'], '');
    const isOwnerRole = checkUserRole(targetId, ['owner'], '');
    const isPremiumRole = checkUserRole(targetId, ['premium'], '');
    const botRole = isOwnerRole ? '👑 OWNER' : isPremiumRole ? '💎 PREMIUM' : isSellerRole ? '🌟 SELLER' : '👤 USER';

    const canvas = createCanvas(900, 520);
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(0.5, '#161b22');
    gradient.addColorStop(1, '#0d1117');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZEXC OFFC', canvas.width / 2, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillText('PREMIUM ID CARD', canvas.width / 2, 90);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(50, 110);
    ctx.lineTo(canvas.width - 50, 110);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.arc(140, 220, 70, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    if (photoUrl) {
        try {
            const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
            const avatar = await loadImage(Buffer.from(response.data));
            ctx.drawImage(avatar, 70, 150, 140, 140);
        } catch (e) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fill();
        }
    } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(140, 220, 70, 0, Math.PI * 2, true);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
    ctx.fillText('INFORMASI PENGGUNA', 260, 155);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`Nama      : ${fullName}`, 260, 195);
    ctx.fillText(`User ID   : ${targetId}`, 260, 230);
    ctx.fillText(`Username  : ${username}`, 260, 265);
    ctx.fillText(`Tanggal   : ${today}`, 260, 300);
    ctx.fillText(`Role Bot  : ${botRole}`, 260, 335);

    ctx.textAlign = 'center';
    ctx.font = 'italic 16px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#d4af37';
    ctx.fillText(`ZEXC OFFC © ${new Date().getFullYear()} | CPANEL VIP`, canvas.width / 2, 470);

    ctx.font = '12px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('@ZexcOfficial | @ZexcOfficiall', canvas.width / 2, 495);

    const buffer = canvas.toBuffer('image/png');

    const caption = `<blockquote>💎 <b>ZEXC OFFC PREMIUM ID CARD</b>\n\n👑 <b>Nama :</b> ${fullName}\n🌟 <b>User ID :</b> <code>${targetId}</code>\n⚡ <b>Username :</b> ${username}\n🔥 <b>Role Bot :</b> ${botRole}</blockquote>`;

    await xy.api.sendPhoto(xy.chat.id, new InputFile(buffer, 'id_card.png'), {
        caption,
        parse_mode: "HTML",
        reply_to_message_id: xy.message.message_id,
        reply_markup: {
            inline_keyboard: [
                [{ text: '💎 ᴅᴇᴠᴇʟᴏᴘᴇʀ', url: 'https://t.me/ZexcOfficial' }],
                [{ text: '🚀 ᴄʜᴀɴɴᴇʟ', url: 'https://t.me/ZexcOfficiall' }]
            ]
        }
    });

    await xy.api.deleteMessage(xy.chat.id, sentMessage.message_id);
  })();
  break;
}

case 'addgrub': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  const targetId = text.trim();
  if (!targetId || !/^-?\d+$/.test(targetId)) {
    return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addgrub [ID Grup]</code>\n${E.dot} Contoh: <code>/addgrub -1001234567890</code></blockquote>`, { parse_mode: 'HTML' });
  }

  const file = ALLOWED_GROUPS_FILE;
  let listData = readJson(file);

  if (listData.some(g => String(g.id) === targetId)) {
    return reply(`<blockquote>${E.cross} Grup ID <b>${targetId}</b> sudah terdaftar.</blockquote>`, { parse_mode: 'HTML' });
  }

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mencoba mengambil nama grup untuk ID ${targetId}...</b></blockquote>`, { parse_mode: 'HTML' });

  let groupName = `ID: ${targetId}`;
  try {
      const chatInfo = await xy.api.getChat(targetId);
      groupName = chatInfo.title || `Grup Tanpa Nama (ID: ${targetId})`;
  } catch (e) {
      console.error(`Gagal mendapatkan info grup ${targetId}:`, e.message);
      groupName = `Grup Tidak Dikenal (ID: ${targetId})`;
  }

  listData.push({ id: targetId, name: groupName, added_by: xy.from.id, date: new Date().toISOString() });
  writeJson(file, listData);

  await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Grup <b>${groupName}</b> (ID: <code>${targetId}</code>) berhasil ditambahkan ke daftar grup yang diizinkan.</blockquote>`);
}
break;

case 'delgrub': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  const targetId = text.trim();
  if (!targetId || !/^-?\d+$/.test(targetId)) {
    return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delgrub [ID Grup]</code></blockquote>`, { parse_mode: 'HTML' });
  }

  const file = ALLOWED_GROUPS_FILE;
  let listData = readJson(file);

  const initialLength = listData.length;
  listData = listData.filter(g => String(g.id) !== targetId);

  if (listData.length === initialLength) {
    return reply(`<blockquote>${E.cross} ID Grup <b>${targetId}</b> tidak ditemukan dalam daftar.</blockquote>`, { parse_mode: 'HTML' });
  }

  writeJson(file, listData);

  let finalMsg = `${E.check} Grup ID <b>${targetId}</b> telah dihapus dari daftar yang diizinkan.`;

  try {
    await xy.api.leaveChat(targetId);
    finalMsg += `\n${E.check} Bot berhasil keluar dari grup <b>${targetId}</b>.`;
  } catch (e) {
    console.error(`Gagal keluar paksa dari grup ${targetId}:`, e.message);
    finalMsg += `\n${E.cross} Gagal memaksa bot keluar dari grup <b>${targetId}</b>.`;
  }
  reply(`<blockquote>${finalMsg}</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'listgrub': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  const file = ALLOWED_GROUPS_FILE;
  const listData = readJson(file);

  if (listData.length === 0) return reply(`<blockquote>${E.cross} Belum ada grup yang diizinkan.</blockquote>`, { parse_mode: 'HTML' });

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Grup yang Diizinkan...</b></blockquote>`, { parse_mode: 'HTML' });

  (async () => {
    let list = [];
    for (let g of listData) {
      list.push(`🆔 <b>ID:</b> <code>${g.id}</code>\n📁 <b>Nama:</b> ${g.name || 'Tidak Dikenal'}\n`);
    }

    const daftar = `🌟 <b>Daftar Grup yang Diizinkan:</b> (${listData.length} grup)\n\n${list.join('\n')}`;
    await editReply(xy, sentMessage.message_id, `<blockquote>${daftar}</blockquote>`);
  })();
  break;
}

case 'addowner': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addowner ID_Telegram</code></blockquote>`, { parse_mode: 'HTML' });

  if (owners.includes(text)) {
    return reply(`<blockquote>${E.cross} ID Telegram <b>${text}</b> sudah menjadi Owner.</blockquote>`, { parse_mode: 'HTML' });
  }

  owners.push(text);
  fs.writeFileSync('./owner.json', JSON.stringify(owners, null, 2));
  return reply(`<blockquote>${E.check} ID Telegram <b>${text}</b> telah ditambahkan ke daftar Owner!</blockquote>`, { parse_mode: 'HTML' });
}

case 'delowner': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delowner ID_Telegram</code></blockquote>`, { parse_mode: 'HTML' });

  const index = owners.indexOf(text);
  if (index !== -1) {
    owners.splice(index, 1);
    fs.writeFileSync('./owner.json', JSON.stringify(owners, null, 2));
    return reply(`<blockquote>${E.check} ID Telegram <b>${text}</b> telah dihapus dari daftar Owner.</blockquote>`, { parse_mode: 'HTML' });
  } else {
    return reply(`<blockquote>${E.cross} ID Telegram <b>${text}</b> tidak ditemukan dalam daftar Owner.</blockquote>`, { parse_mode: 'HTML' });
  }
}

case 'listowner': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (owners.length === 0) return reply(`<blockquote>${E.cross} Belum ada Owner yang terdaftar.</blockquote>`, { parse_mode: 'HTML' });

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Owner...</b></blockquote>`, { parse_mode: 'HTML' });

  (async () => {
    let list = [];
    for (let id of owners) {
      try {
        const user = await xy.api.getChat(id);
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
        list.push(`🆔 <b>ID:</b> ${id}\n👑 <b>Nama:</b> ${name}`);
      } catch (e) {
        list.push(`🆔 <b>ID:</b> ${id}\n👑 <b>Nama:</b> Tidak ditemukan`);
      }
    }

    const daftar = `👑 <b>Daftar Owner:</b>\n\n${list.join('\n\n')}`;
    await editReply(xy, sentMessage.message_id, `<blockquote>${daftar}</blockquote>`);
  })();
  break;
}

case 'addseller': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);

  if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/addseller ID,durasi,waktu</code>\n${E.dot} Contoh: <code>/addseller 123456789,1,jam</code>\n${E.dot} Waktu: menit, jam, hari, bulan</blockquote>`, { parse_mode: 'HTML' });

  const [id, dur, unit] = text.split(',');
  if (!id || !dur || !unit) return reply(`<blockquote>${E.cross} Format salah! Contoh: /addseller 123456789,1,jam</blockquote>`, { parse_mode: 'HTML' });

  const ms = { menit: 60000, jam: 3600000, hari: 86400000, bulan: 2592000000 };
  const durasi = parseInt(dur);
  if (isNaN(durasi) || !ms[unit]) return reply(`<blockquote>${E.cross} Durasi tidak valid atau waktu tidak dikenali.</blockquote>`, { parse_mode: 'HTML' });

  if (seller.some(s => s.id === id)) return reply(`<blockquote>${E.cross} ID <b>${id}</b> sudah jadi Seller.</blockquote>`, { parse_mode: 'HTML' });

  seller.push({ id, expiresAt: Date.now() + durasi * ms[unit] });
  fs.writeFileSync('./src/database/seller.json', JSON.stringify(seller, null, 2));
  return reply(`<blockquote>${E.check} ID <b>${id}</b> ditambahkan sebagai Seller selama <b>${durasi} ${unit}</b>.</blockquote>`, { parse_mode: 'HTML' });
  break;
}

case 'delseller': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delseller ID</code></blockquote>`, { parse_mode: 'HTML' });

  const idx = seller.findIndex(s => s.id === text);
  if (idx === -1) return reply(`<blockquote>${E.cross} ID <b>${text}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });

  seller.splice(idx, 1);
  fs.writeFileSync('./src/database/seller.json', JSON.stringify(seller, null, 2));
  return reply(`<blockquote>${E.check} ID <b>${text}</b> telah dihapus dari daftar Seller.</blockquote>`, { parse_mode: 'HTML' });
  break;
}

case 'listseller': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!seller.length) return reply(`<blockquote>${E.cross} Belum ada Seller yang terdaftar.</blockquote>`, { parse_mode: 'HTML' });

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Seller...</b></blockquote>`, { parse_mode: 'HTML' });

  (async () => {
    let list = [];
    let updatedSeller = [...seller];

    for (let s of updatedSeller) {
      const sisa = s.expiresAt - Date.now();
      if (sisa <= 0) {
        updatedSeller = updatedSeller.filter(x => x.id !== s.id);
        continue;
      }

      const jam = Math.floor(sisa / 3600000);
      const menit = Math.floor((sisa % 3600000) / 60000);
      const sisaWaktu = jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`;

      try {
        const user = await xy.api.getChat(s.id);
        const nama = user.first_name + (user.last_name ? ' ' + user.last_name : '');
        list.push(`🆔 <b>ID:</b> ${s.id}\n🌟 <b>Nama:</b> ${nama}\n🔥 <b>Waktu Tersisa:</b> ${sisaWaktu}`);
      } catch {
        list.push(`🆔 <b>ID:</b> ${s.id}\n🌟 <b>Nama:</b> Tidak ditemukan\n🔥 <b>Waktu Tersisa:</b> ${sisaWaktu}`);
      }
    }

    fs.writeFileSync('./src/database/seller.json', JSON.stringify(updatedSeller, null, 2));

    if (list.length === 0) {
      return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Belum ada Seller yang aktif.</blockquote>`);
    }

    const responseText = `🌟 <b>Daftar Seller:</b>\n\n${list.join('\n\n')}`;
    await editReply(xy, sentMessage.message_id, `<blockquote>${responseText}</blockquote>`);
  })();
  break;
}

case 'pt': case 'pt2': case 'pt3': case 'pt4': case 'pt5':
case 'pt6': case 'pt7': case 'pt8': case 'pt9': case 'pt10':
case 'rt': case 'rt2': case 'rt3': case 'rt4': case 'rt5':
case 'rt6': case 'rt7': case 'rt8': case 'rt9': case 'rt10': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const isResellerCommand = command.startsWith('rt');
  const file = isResellerCommand ? './src/database/reseller.json' : './src/database/partner.json';
  const panelName = isResellerCommand ? 'Reseller Panel' : 'Partner Panel';
  const match = command.match(/(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  if (!xy.message.reply_to_message) {
    return reply(`<blockquote>${E.cross} Balas pesan pengguna yang ingin di-add ke <b>${panelName}</b>.</blockquote>`, { parse_mode: 'HTML' });
  }
  const userIdTarget = xy.message.reply_to_message.from.id;
  const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
  let listData = [];
  try {
    if (fs.existsSync(file)) { const fc = fs.readFileSync(file, 'utf8'); listData = JSON.parse(fc); if (!Array.isArray(listData)) listData = []; }
  } catch (e) {}
  if (listData.findIndex(u => u.id === userIdTarget && u.server === serverVersion) !== -1) {
    return reply(`<blockquote>${E.cross} Pengguna <b>${userName}</b> sudah terdaftar di ${panelName} server <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
  }
  listData.push({ id: userIdTarget, server: serverVersion });
  fs.writeFileSync(file, JSON.stringify(listData, null, 2));
  return reply(`<blockquote>${E.check} Pengguna <b>${userName}</b> berhasil ditambahkan ke <b>${panelName}</b> server <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'addallrt': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Balas pesan pengguna yang ingin di-add ke semua <b>Reseller Panel</b>.</blockquote>`, { parse_mode: 'HTML' });
  const userIdTarget = xy.message.reply_to_message.from.id;
  const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
  const resellerFile = './src/database/reseller.json';
  const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
  let addedCount = 0;
  let listData = [];
  try { if (fs.existsSync(resellerFile)) { const fc = fs.readFileSync(resellerFile, 'utf8'); listData = JSON.parse(fc); if (!Array.isArray(listData)) listData = []; } } catch (e) {}
  for (const server of servers) {
    if (listData.findIndex(u => u.id === userIdTarget && u.server === server) === -1) {
      listData.push({ id: userIdTarget, server: server });
      addedCount++;
    }
  }
  if (addedCount > 0) { fs.writeFileSync(resellerFile, JSON.stringify(listData, null, 2)); return reply(`<blockquote>${E.check} Pengguna <b>${userName}</b> berhasil ditambahkan ke <b>${addedCount} Reseller Panel</b>!</blockquote>`, { parse_mode: 'HTML' }); }
  else return reply(`<blockquote>${E.cross} Pengguna <b>${userName}</b> sudah terdaftar di semua Reseller Panel.</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'addallpt': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Balas pesan pengguna yang ingin di-add ke semua <b>Partner Panel</b>.</blockquote>`, { parse_mode: 'HTML' });
  const userIdTarget = xy.message.reply_to_message.from.id;
  const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
  const partnerFile = './src/database/partner.json';
  const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
  let addedCount = 0;
  let listData = [];
  try { if (fs.existsSync(partnerFile)) { const fc = fs.readFileSync(partnerFile, 'utf8'); listData = JSON.parse(fc); if (!Array.isArray(listData)) listData = []; } } catch (e) {}
  for (const server of servers) {
    if (listData.findIndex(u => u.id === userIdTarget && u.server === server) === -1) {
      listData.push({ id: userIdTarget, server: server });
      addedCount++;
    }
  }
  if (addedCount > 0) { fs.writeFileSync(partnerFile, JSON.stringify(listData, null, 2)); return reply(`<blockquote>${E.check} Pengguna <b>${userName}</b> berhasil ditambahkan ke <b>${addedCount} Partner Panel</b>!</blockquote>`, { parse_mode: 'HTML' }); }
  else return reply(`<blockquote>${E.cross} Pengguna <b>${userName}</b> sudah terdaftar di semua Partner Panel.</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'addprem': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Balas pesan pengguna yang ingin di-add sebagai <b>Premium</b>.</blockquote>`, { parse_mode: 'HTML' });
  const userIdTarget = String(xy.message.reply_to_message.from.id);
  const userName = xy.message.reply_to_message.from.first_name || 'Pengguna';
  const file = PREMIUM_FILE;
  let listData = readJson(file);
  if (listData.includes(userIdTarget)) return reply(`<blockquote>${E.cross} Pengguna <b>${userName}</b> sudah terdaftar sebagai Premium.</blockquote>`, { parse_mode: 'HTML' });
  listData.push(userIdTarget);
  writeJson(file, listData);
  return reply(`<blockquote>${E.crown} Pengguna <b>${userName}</b> (ID: ${userIdTarget}) berhasil diangkat sebagai <b>PREMIUM</b>!\n${E.dot} Mereka kini memiliki akses Reseller di semua Panel (v1-v10).</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'delprem': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text && !xy.message.reply_to_message) return reply(`<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan: <code>/delprem ID_Telegram</code> atau balas pesan pengguna.</blockquote>`, { parse_mode: 'HTML' });
  let targetId, targetName;
  if (xy.message.reply_to_message) { targetId = String(xy.message.reply_to_message.from.id); targetName = xy.message.reply_to_message.from.first_name || 'Pengguna'; }
  else { targetId = text.trim(); targetName = targetId; }
  const file = PREMIUM_FILE;
  let listData = readJson(file);
  const initialLength = listData.length;
  listData = listData.filter(id => id !== targetId);
  if (listData.length === initialLength) return reply(`<blockquote>${E.cross} ID Telegram ${targetId} tidak ditemukan dalam daftar Premium.</blockquote>`, { parse_mode: 'HTML' });
  writeJson(file, listData);
  return reply(`<blockquote>${E.check} ID Telegram <b>${targetName}</b> (ID: ${targetId}) telah dihapus dari daftar Premium.</blockquote>`, { parse_mode: 'HTML' });
}
break;

case 'listprem': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const file = PREMIUM_FILE;
  const listData = readJson(file);
  if (listData.length === 0) return reply(`<blockquote>${E.cross} Belum ada pengguna Premium yang terdaftar.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memuat daftar Premium...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let list = [];
    for (let id of listData) {
      try { const user = await xy.api.getChat(id); const name = [user.first_name, user.last_name].filter(Boolean).join(' '); list.push(`🆔 <b>ID:</b> ${id}\n${E.crown} <b>Nama:</b> ${name}`); }
      catch (e) { list.push(`🆔 <b>ID:</b> ${id}\n${E.crown} <b>Nama:</b> Tidak ditemukan`); }
    }
    await editReply(xy, sentMessage.message_id, `<blockquote>${E.crown} <b>Daftar Pengguna Premium:</b>\n\n${list.join('\n\n')}</blockquote>`);
  })();
  break;
}

case 'delpt': case 'delpt2': case 'delpt3': case 'delpt4': case 'delpt5':
case 'delpt6': case 'delpt7': case 'delpt8': case 'delpt9': case 'delpt10':
case 'delrt': case 'delrt2': case 'delrt3': case 'delrt4': case 'delrt5':
case 'delrt6': case 'delrt7': case 'delrt8': case 'delrt9': case 'delrt10': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const isResellerCommand = command.startsWith('delrt');
  const file = isResellerCommand ? './src/database/reseller.json' : './src/database/partner.json';
  const panelName = isResellerCommand ? 'Reseller Panel' : 'Partner Panel';
  const match = command.match(/(\d+)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const replyToMessage = xy.message.reply_to_message;
  if (!replyToMessage) return reply(`<blockquote>${E.cross} Harap balas pesan pengguna yang ingin dihapus dari <b>${panelName}</b>.</blockquote>`, { parse_mode: 'HTML' });
  const userIdTarget = replyToMessage.from.id;
  const userName = replyToMessage.from.first_name || 'Pengguna';
  let listData = [];
  try { if (fs.existsSync(file)) { const fc = fs.readFileSync(file, 'utf8'); listData = JSON.parse(fc); if (!Array.isArray(listData)) listData = []; } } catch (e) {}
  const initialLength = listData.length;
  listData = listData.filter(u => u.id !== userIdTarget || u.server !== serverVersion);
  if (listData.length === initialLength) return reply(`<blockquote>${E.cross} Pengguna <b>${userName}</b> tidak ditemukan di ${panelName} server <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
  fs.writeFileSync(file, JSON.stringify(listData, null, 2));
  return reply(`<blockquote>${E.check} Pengguna <b>${userName}</b> berhasil dihapus dari <b>${panelName}</b> server <b>${serverVersion}</b>.</blockquote>`, { parse_mode: 'HTML' });
}
break;

case "1gb": case "2gb": case "3gb": case "4gb": case "5gb": case "6gb": case "7gb": case "8gb": case "9gb": case "10gb": case "unli":
case "1gbv2": case "2gbv2": case "3gbv2": case "4gbv2": case "5gbv2": case "6gbv2": case "7gbv2": case "8gbv2": case "9gbv2": case "10gbv2": case "unliv2":
case "1gbv3": case "2gbv3": case "3gbv3": case "4gbv3": case "5gbv3": case "6gbv3": case "7gbv3": case "8gbv3": case "9gbv3": case "10gbv3": case "unliv3":
case "1gbv4": case "2gbv4": case "3gbv4": case "4gbv4": case "5gbv4": case "6gbv4": case "7gbv4": case "8gbv4": case "9gbv4": case "10gbv4": case "unliv4":
case "1gbv5": case "2gbv5": case "3gbv5": case "4gbv5": case "5gbv5": case "6gbv5": case "7gbv5": case "8gbv5": case "9gbv5": case "10gbv5": case "unliv5":
case "1gbv6": case "2gbv6": case "3gbv6": case "4gbv6": case "5gbv6": case "6gbv6": case "7gbv6": case "8gbv6": case "9gbv6": case "10gbv6": case "unliv6":
case "1gbv7": case "2gbv7": case "3gbv7": case "4gbv7": case "5gbv7": case "6gbv7": case "7gbv7": case "8gbv7": case "9gbv7": case "10gbv7": case "unliv7":
case "1gbv8": case "2gbv8": case "3gbv8": case "4gbv8": case "5gbv8": case "6gbv8": case "7gbv8": case "8gbv8": case "9gbv8": case "10gbv8": case "unliv8":
case "1gbv9": case "2gbv9": case "3gbv9": case "4gbv9": case "5gbv9": case "6gbv9": case "7gbv9": case "8gbv9": case "9gbv9": case "10gbv9": case "unliv9":
case "1gbv10": case "2gbv10": case "3gbv10": case "4gbv10": case "5gbv10": case "6gbv10": case "7gbv10": case "8gbv10": case "9gbv10": case "10gbv10": case "unliv10": {
  if (xy.chat.type === 'private') return reply(`<blockquote>${mess.group}</blockquote>`);
  const match = command.match(/v(\d+)/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  if (!checkUserRole(userId, ['owner', 'seller', 'partner', 'reseller'], serverVersion)) return reply(`<blockquote>${mess.seller}</blockquote>`);
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Sedang membuat Panel ${command.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const userInput = text;
    const commandType = command.replace(serverVersion, '');
    const panelConfig = getPanelConfig(serverVersion);
    const { panelDomain, pltaKey, pltcKey, nests, eggs, loc } = panelConfig;
    let ram, disk, cpu;
    switch (commandType) {
      case "1gb": ram = "1024"; disk = "1024"; cpu = "40"; break;
      case "2gb": ram = "2048"; disk = "2048"; cpu = "60"; break;
      case "3gb": ram = "3072"; disk = "3072"; cpu = "80"; break;
      case "4gb": ram = "4096"; disk = "4096"; cpu = "100"; break;
      case "5gb": ram = "5120"; disk = "5120"; cpu = "120"; break;
      case "6gb": ram = "6144"; disk = "6144"; cpu = "140"; break;
      case "7gb": ram = "7168"; disk = "7168"; cpu = "160"; break;
      case "8gb": ram = "8192"; disk = "8192"; cpu = "180"; break;
      case "9gb": ram = "9216"; disk = "9216"; cpu = "200"; break;
      case "10gb": ram = "10240"; disk = "10240"; cpu = "220"; break;
      case "unli": ram = "0"; disk = "0"; cpu = "0"; break;
      default: return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Perintah tidak valid.</blockquote>`);
    }
    let t = userInput.split(",");
    if (t.length < 3) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Format salah!</b>\n${E.dot} Penggunaan:\n<code>${global.prefix + command} sendwa/sendtele,username,nowa/idtele</code></blockquote>`);
    let [sendType, username, targetNumberRaw] = t.map(a => a.trim());
    const targetNumber = targetNumberRaw.replace(/\D/g, "");
    if (!["sendwa","sendtele"].includes(sendType)) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Pilihan pengiriman hanya boleh 'sendwa' atau 'sendtele'.</blockquote>`);
    if (!targetNumber.match(/^\d+$/)) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} ID tele / No. WA tujuan tidak valid.</blockquote>`);
    let email = `${username}@buyer.zexc`;
    let password = Math.random().toString(36).slice(-8);
    let user, server;
    try {
      try {
        const checkResponse = await fetch(`${panelDomain}/api/application/users/email/${email}`, { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${pltaKey}` } });
        if (checkResponse.ok) throw new Error("Email atau Username sudah digunakan!");
      } catch (error) { if (error.message !== "Email atau Username sudah digunakan!") throw error; else throw new Error("Email atau Username sudah digunakan!"); }
      let f = await fetch(`${panelDomain}/api/application/users`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${pltaKey}` }, body: JSON.stringify({ email: email, username: username, first_name: username, last_name: username, language: "en", password: password.toString() }) });
      let userData = await f.json();
      if (userData.errors) throw new Error(`API Error: ${userData.errors[0].detail}`);
      user = userData.attributes;
      let f2 = await fetch(`${panelDomain}/api/application/nests/${nests}/eggs/${eggs}`, { method: "GET", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${pltcKey}` } });
      let data2 = await f2.json();
      let startup_cmd = data2.attributes.startup;
      let f3 = await fetch(`${panelDomain}/api/application/servers`, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${pltcKey}` }, body: JSON.stringify({ name: username, description: "ZEXC OFFC | CPANEL VIP", user: user.id, egg: parseInt(eggs), docker_image: "ghcr.io/parkervcp/yolks:nodejs_20", startup: startup_cmd, environment: { INST: "npm", USER_UPLOAD: "0", AUTO_UPDATE: "0", CMD_RUN: "npm start", STARTUP_CMD: "pip install -r requirements.txt" }, limits: { memory: ram, swap: 0, disk: disk, io: 500, cpu: cpu }, feature_limits: { databases: 5, backups: 5, allocations: 5 }, deploy: { locations: [parseInt(loc)], dedicated_ip: false, port_range: [] } }) });
      let res = await f3.json();
      if (res.errors) throw new Error(`API Error: ${res.errors[0].detail}`);
      server = res.attributes;
      let messageToTarget = `<blockquote>💎 <b>Panel Berhasil Dibuat!</b>\n\n👑 <b>ID User</b>: ${user.id}\n🌟 <b>ID Server</b>: ${server.id}\n⚡ <b>EMAIL</b>: ${user.email}\n🔥 <b>USERNAME</b>: <code>${user.username}</code>\n✨ <b>PASSWORD</b>: <code>${password.toString()}</code>\n🚀 <b>LOGIN</b>: <a href="${panelDomain}">Klik untuk login</a>\n\n❌ <b>PERHATIAN:</b> Simpan informasi ini!</blockquote>`;
      if (sendType === "sendtele") await xy.api.sendMessage(targetNumber, messageToTarget, { parse_mode: 'HTML' });
      else if (sendType === "sendwa") {
        const sessionNumber = Array.from(sessions.keys())[0];
        const waClient = sessions.get(sessionNumber);
        if (!waClient) throw new Error(`Sesi WhatsApp tidak ditemukan.`);
        await waClient.sendMessage(targetNumber.includes("@") ? targetNumber : `${targetNumber}@s.whatsapp.net`, { text: messageToTarget });
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Panel <b>${username}</b> berhasil dibuat dan dikirim ke <b>${sendType === "sendtele" ? "Telegram" : "WhatsApp"}</b> ${targetNumber}.\n🌟 <b>ID Server:</b> <code>${server.id}</code></blockquote>`);
    } catch (error) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal membuat Panel: ${error.message}</blockquote>`); }
  })();
  break;
}

case "totalserver": case "totalserverv2": case "totalserverv3": case "totalserverv4": case "totalserverv5":
case "totalserverv6": case "totalserverv7": case "totalserverv8": case "totalserverv9": case "totalserverv10": {
  const match = command.match(/v(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const panelConfig = getPanelConfig(serverVersion);
  const hasPanelAccess = checkUserRole(xy.from.id, ['owner', 'partner', 'reseller'], serverVersion);
  const domainDisplay = hasPanelAccess ? panelConfig.panelDomain : '***Disembunyikan***';
  if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} Konfigurasi <b>Server ${serverVersion.toUpperCase()}</b> tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menghitung total server di Panel ${serverVersion.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let currentServerCount = 0;
    let page = 1;
    let hasMore = true;
    try {
      while (hasMore) {
        const response = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
        const result = response.data;
        currentServerCount += result.data.length;
        hasMore = result.meta.pagination.current_page < result.meta.pagination.total_pages;
        page++;
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>🌟 <b>Total Server Panel ${serverVersion.toUpperCase()}</b>\n\n💎 <b>Domain:</b> ${domainDisplay}\n⚡ <b>Total Server:</b> <code>${currentServerCount} Server</code></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal mengambil total server. API Panel tidak merespons.</blockquote>`); }
  })();
  break;
}

case 'info': {
  if (xy.chat.type === 'private') return reply(`<blockquote>${E.cross} Perintah ini hanya bisa digunakan di dalam grup.</blockquote>`, { parse_mode: 'HTML' });
  let targetId = null;
  let targetUser = null;
  const targetIdInput = text.trim();
  if (targetIdInput && /^\d+$/.test(targetIdInput)) targetId = targetIdInput;
  else if (xy.message.reply_to_message) { targetUser = xy.message.reply_to_message.from; targetId = String(targetUser.id); }
  else { targetUser = xy.from; targetId = String(targetUser.id); }
  if (!targetId) return reply(`<blockquote>${E.cross} ID target tidak valid.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengecek status pengguna ID ${targetId}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let nameToDisplay = `ID: ${targetId}`;
    if (!targetUser) { try { targetUser = await xy.api.getChat(targetId); nameToDisplay = targetUser.first_name + (targetUser.last_name ? ' ' + targetUser.last_name : ''); } catch (e) {} }
    else nameToDisplay = targetUser.first_name + (targetUser.last_name ? ' ' + targetUser.last_name : '');
    const statusV1 = checkUserRole(targetId, ['owner','partner','reseller'], 'v1');
    const statusV2 = checkUserRole(targetId, ['owner','partner','reseller'], 'v2');
    const statusV3 = checkUserRole(targetId, ['owner','partner','reseller'], 'v3');
    const statusV4 = checkUserRole(targetId, ['owner','partner','reseller'], 'v4');
    const statusV5 = checkUserRole(targetId, ['owner','partner','reseller'], 'v5');
    const statusV6 = checkUserRole(targetId, ['owner','partner','reseller'], 'v6');
    const statusV7 = checkUserRole(targetId, ['owner','partner','reseller'], 'v7');
    const statusV8 = checkUserRole(targetId, ['owner','partner','reseller'], 'v8');
    const statusV9 = checkUserRole(targetId, ['owner','partner','reseller'], 'v9');
    const statusV10 = checkUserRole(targetId, ['owner','partner','reseller'], 'v10');
    const isSellerRole = checkUserRole(targetId, ['seller'], '');
    const isOwnerRole = checkUserRole(targetId, ['owner'], '');
    let isBotStarted = false;
    let startBotMessage = 'ℹ️ Sedang mencoba menghubungi user...';
    try { await xy.api.sendMessage(targetId, `${E.check} Cek koneksi dari ZEXC OFFC!`); isBotStarted = true; } catch (error) { isBotStarted = false; }
    if (isBotStarted) startBotMessage = `${E.check} User sudah pernah chat bot!`;
    else startBotMessage = `${E.cross} User belum chat bot di Private!`;
    const infoMessage = `<blockquote>👑 <b>${nameToDisplay} | INFO</b>\n\n🌟 <b>ID:</b> <code>${targetId}</code>\n⚡ <b>Username:</b> @${targetUser?.username || '-'}\n💎 <b>Status Global:</b> ${isOwnerRole ? '👑 Owner' : isSellerRole ? '🌟 Seller' : '👤 User'}\n\n🔥 <b>Status Panel Akses:</b>\n• V1: ${statusV1 ? E.check : E.cross}\n• V2: ${statusV2 ? E.check : E.cross}\n• V3: ${statusV3 ? E.check : E.cross}\n• V4: ${statusV4 ? E.check : E.cross}\n• V5: ${statusV5 ? E.check : E.cross}\n• V6: ${statusV6 ? E.check : E.cross}\n• V7: ${statusV7 ? E.check : E.cross}\n• V8: ${statusV8 ? E.check : E.cross}\n• V9: ${statusV9 ? E.check : E.cross}\n• V10: ${statusV10 ? E.check : E.cross}\n\n🚀 <b>Status Chat Bot:</b>\n${startBotMessage}</blockquote>`;
    await editReply(xy, sentMessage.message_id, infoMessage);
  })();
  break;
}

case 'cekserver': {
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengecek Server V1-V10...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const servers = ['v1','v2','v3','v4','v5','v6','v7','v8','v9','v10'];
    let serverStatuses = [];
    for (const version of servers) {
      const panelConfig = getPanelConfig(version);
      const serverName = `SERVER ${version.slice(1)}`;
      if (!panelConfig.panelDomain || !panelConfig.pltaKey) { serverStatuses.push(`${E.cross} ${serverName} OFF`); continue; }
      try {
        const response = await axios.get(`${panelConfig.panelDomain}/api/application/servers?per_page=1`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` }, timeout: 5000 });
        serverStatuses.push(response.status === 200 ? `${E.check} ${serverName} ON` : `${E.cross} ${serverName} OFF`);
      } catch (err) { serverStatuses.push(`${E.cross} ${serverName} OFF`); }
    }
    await editReply(xy, sentMessage.message_id, `<blockquote>⚡ <b>STATUS SERVER ZEXC OFFC</b>\n\n${serverStatuses.join('\n')}\n\n💎 <b>ZEXC OFFC | CPANEL VIP</b></blockquote>`);
  })();
  break;
}

case 'toqr': {
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>/toqr teks atau link</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat QR Code...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
      await xy.api.sendPhoto(xy.chat.id, qrUrl, {
        caption: `<blockquote>${E.check} <b>QR Code untuk:</b>\n<code>${text}</code></blockquote>`,
        parse_mode: 'HTML'
      });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} QR Code berhasil dibuat!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'groupstats': {
  if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengambil statistik grup...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const chat = await xy.api.getChat(xy.chat.id);
      const memberCount = await xy.api.getChatMemberCount(xy.chat.id);
      const admins = await xy.getChatAdministrators();
      const info = `<blockquote>🌟 <b>STATISTIK GRUP</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n📁 <b>Nama Grup:</b> ${chat.title}\n🆔 <b>ID Grup:</b> <code>${xy.chat.id}</code>\n👥 <b>Total Anggota:</b> ${memberCount}\n👑 <b>Total Admin:</b> ${admins.length}\n📝 <b>Deskripsi:</b> ${chat.description || 'Tidak ada'}\n🔗 <b>Tipe Grup:</b> ${chat.type}\n\n💎 <b>ZEXC OFFC | CPANEL VIP</b></blockquote>`;
      await editReply(xy, sentMessage.message_id, info);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal mengambil statistik.</blockquote>`); }
  })();
  break;
}

case 'createpolling': {
  if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
  if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
  if (!text || !text.includes('|')) return reply(`<blockquote>${E.cross} Format: <code>/createpolling Pertanyaan | Pilihan1,Pilihan2,...</code>\n${E.dot} Contoh: <code>/createpolling Makan apa? | Nasi,Goreng,Mie</code></blockquote>`, { parse_mode: 'HTML' });
  const [question, optionsRaw] = text.split('|').map(s => s.trim());
  const options = optionsRaw.split(',').map(s => s.trim()).filter(s => s);
  if (!question || options.length < 2) return reply(`<blockquote>${E.cross} Minimal 2 pilihan.</blockquote>`, { parse_mode: 'HTML' });
  try {
    await xy.api.sendPoll(xy.chat.id, question, options, { is_anonymous: true });
    reply(`<blockquote>${E.check} Polling berhasil dibuat!</blockquote>`, { parse_mode: 'HTML' });
  } catch (e) { reply(`<blockquote>${E.cross} Gagal membuat polling.</blockquote>`, { parse_mode: 'HTML' }); }
  break;
}

case 'changeppgc': {
  if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
  if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
  if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
  if (!xy.message.reply_to_message || !xy.message.reply_to_message.photo) return reply(`<blockquote>${E.cross} Reply gambar untuk dijadikan foto profil grup.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengganti foto profil grup...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
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
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Foto profil grup berhasil diganti!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal mengganti foto profil.</blockquote>`); }
  })();
  break;
}

case 'pay': {
  const metode = text.trim().toLowerCase();
  const payData = global.payment || {};
  const metodeList = {};
  if (payData.dana) metodeList.dana = { ...payData.dana, icon: '💙' };
  if (payData.gopay) metodeList.gopay = { ...payData.gopay, icon: '💚' };
  if (payData.ovo) metodeList.ovo = { ...payData.ovo, icon: '💜' };
  if (payData.qris) metodeList.qris = { ...payData.qris, icon: '🔲' };

  if (!metode || !metodeList[metode]) {
    let availableMethods = '';
    if (metodeList.dana) availableMethods += '\n🔹 /pay dana';
    if (metodeList.gopay) availableMethods += '\n🔹 /pay gopay';
    if (metodeList.ovo) availableMethods += '\n🔹 /pay ovo';
    if (metodeList.qris) availableMethods += '\n🔹 /pay qris';
    return reply(`<blockquote>💎 <b>PEMBAYARAN ZEXC OFFC</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n🌟 <b>Pilih Metode Pembayaran:</b>${availableMethods}\n\n⚡ <b>Fitur Pembayaran Lengkap:</b> Zexc Official\n🔥 <b>Proses Otomatis 1-3 Menit</b>\n\n👑 <b>Konfirmasi:</b> @ZexcOfficial\n🚀 <b>Channel:</b> @ZexcOfficiall</blockquote>`, { parse_mode: 'HTML' });
  }

  const pilih = metodeList[metode];
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses pembayaran ${pilih.name}...</b></blockquote>`, { parse_mode: 'HTML' });

  (async () => {
    try {
      if (metode === 'qris' && pilih.image) {
        await xy.api.sendPhoto(xy.chat.id, pilih.image, {
          caption: `<blockquote>${pilih.icon} <b>PEMBAYARAN ${pilih.name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n🌟 <b>Metode:</b> ${pilih.name}\n👤 <b>Atas Nama:</b> <b>${pilih.an}</b>\n\n⚡ <b>Scan QR di atas untuk membayar</b>\n\n🔥 <b>Proses Otomatis 1-3 Menit</b>\n👑 <b>Konfirmasi:</b> @ZexcOfficial</blockquote>`,
          parse_mode: 'HTML'
        });
      } else {
        await xy.api.sendMessage(xy.chat.id, `<blockquote>${pilih.icon} <b>PEMBAYARAN ${pilih.name}</b>\n━━━━━━━━━━━━━━━━━━━━━━━\n🌟 <b>Metode:</b> ${pilih.name}\n📱 <b>Nomor:</b> <code>${pilih.no}</code>\n👤 <b>Atas Nama:</b> <b>${pilih.an}</b>\n\n⚡ <b>Kirim pembayaran ke nomor di atas</b>\n🔥 <b>Proses Otomatis 1-3 Menit</b>\n\n👑 <b>Konfirmasi:</b> @ZexcOfficial\n🚀 <b>Channel:</b> @ZexcOfficiall</blockquote>`, { parse_mode: 'HTML' });
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Info pembayaran berhasil dikirim!</blockquote>`);
    } catch (err) {
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal memproses pembayaran.</blockquote>`);
    }
  })();
  break;
}

case "clearall": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text || !text.includes(',')) return reply(`<blockquote>${E.cross} <b>Format:</b> <code>/clearall ipvps,pwvps</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.fire} <b>Memulai proses Clear All via SSH...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let [vpsIP, vpsPassword] = text.split(',').map(a => a.trim());
    const ssh = new Client();
    const connSettings = { host: vpsIP, port: 22, username: 'root', password: vpsPassword };
    let connectionError = null;
    try {
      await new Promise((resolve, reject) => { ssh.on('ready', resolve).on('error', reject).connect(connSettings); });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.bolt} <b>Menghapus semua User dan Server...</b></blockquote>`);
      const cleanupCommand = `cd /var/www/pterodactyl && php artisan tinker --execute="DB::statement('SET FOREIGN_KEY_CHECKS=0;'); \\\\Pterodactyl\\\\Models\\\\User::query()->forceDelete(); \\\\Pterodactyl\\\\Models\\\\Server::query()->forceDelete(); DB::statement('SET FOREIGN_KEY_CHECKS=1;'); echo 'Clear all berhasil!';"`;
      await new Promise((resolve, reject) => { ssh.exec(cleanupCommand, (err, stream) => { if (err) return reject(err); stream.on('close', (code) => { code !== 0 ? reject(new Error(`Code ${code}`)) : resolve(); }).on('data', () => {}).stderr.on('data', () => {}); }); });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Panel di VPS ${vpsIP} berhasil DIBERSIHKAN!</b></blockquote>`);
    } catch (err) { connectionError = err; } finally { ssh.end(); }
    if (connectionError) await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${connectionError.message}</blockquote>`);
  })();
  break;
}

case "connectwa": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>/connectwa nomor</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Menghubungkan WhatsApp ${text}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const number = text.trim();
    if (sessions.has(number)) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} WhatsApp ${number} sudah terhubung.</blockquote>`);
    try { await startWhatsAppSession(number, xy.chat.id, sentMessage.message_id); }
    catch (e) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${e.message}</blockquote>`); }
  })();
  break;
}

case "disconnectwa": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>/disconnectwa nomor</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memutuskan WhatsApp ${text}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const number = text.trim();
    if (!sessions.has(number)) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Session ${number} tidak ditemukan.</blockquote>`);
    try {
      const waClient = sessions.get(number);
      if (waClient && waClient.ws.readyState === waClient.ws.OPEN) await waClient.logout();
      sessions.delete(number);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Session ${number} berhasil diputus.</blockquote>`);
    } catch (error) { sessions.delete(number); await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Dihapus paksa.</blockquote>`); }
  })();
  break;
}

case 'send': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (text.length < 2) return reply(`<blockquote>${E.cross} Format: <code>/send nomor, pesan</code></blockquote>`, { parse_mode: 'HTML' });
  const sendSentMessage = await reply(`<blockquote>${E.bolt} <b>Mengirim pesan WhatsApp...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
      let [tNum, tMsg] = text.split(",").map(a => a.trim());
      tNum = tNum.replace(/\D/g, '');
      if (!tNum || !tMsg) return editReply(xy, sendSentMessage.message_id, `<blockquote>${E.cross} Format tidak valid.</blockquote>`);
      if (sessions.size === 0) return editReply(xy, sendSentMessage.message_id, `<blockquote>${E.cross} Tidak ada sesi WA aktif.</blockquote>`);
      const waClient = sessions.get(Array.from(sessions.keys())[0]);
      if (!waClient) return editReply(xy, sendSentMessage.message_id, `<blockquote>${E.cross} Sesi tidak ditemukan.</blockquote>`);
      try {
        await waClient.sendMessage(tNum.includes("@") ? tNum : `${tNum}@s.whatsapp.net`, { text: tMsg });
        await editReply(xy, sendSentMessage.message_id, `<blockquote>${E.check} Pesan terkirim ke ${tNum}</blockquote>`);
      } catch (error) { await editReply(xy, sendSentMessage.message_id, `<blockquote>${E.cross} Gagal: ${error.message}</blockquote>`); }
  })();
  break;
}

case 'tourl': {
  if (!xy.message?.reply_to_message || (!xy.message.reply_to_message.photo && !xy.message.reply_to_message.video))
    return reply(`<blockquote>${E.cross} Reply gambar/video dengan <code>${global.prefix + command}</code></blockquote>`, { parse_mode: "HTML" });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunggah file...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const fileId = xy.message.reply_to_message.photo ? xy.message.reply_to_message.photo.at(-1).file_id : xy.message.reply_to_message.video.file_id;
    try {
      const file = await xy.api.getFile(fileId);
      if (!file.file_path) throw new Error('Gagal mengambil file');
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const filePath = path.join(__dirname, path.basename(file.file_path));
      const response = await axios({ url: fileUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      try {
        const uploaded = await CatBox(filePath);
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Berhasil!</b>\n🚀 ${uploaded}</blockquote>`);
        fs.unlinkSync(filePath);
      } catch (e) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal upload.</blockquote>`); }
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case "sticker": {
  if (!xy.message.reply_to_message || (!xy.message.reply_to_message.photo && !xy.message.reply_to_message.video))
    return reply(`<blockquote>${E.cross} Reply gambar/video dengan <code>${global.prefix + command}</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat stiker...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let fileId, isVideo = false;
    if (xy.message.reply_to_message.photo) fileId = xy.message.reply_to_message.photo.at(-1).file_id;
    else if (xy.message.reply_to_message.video) { fileId = xy.message.reply_to_message.video.file_id; isVideo = true; }
    try {
      const file = await xy.api.getFile(fileId);
      if (!file.file_path) throw new Error('Gagal');
      const filePath = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const inputPath = `./temp_input${isVideo ? ".mp4" : ".jpg"}`;
      const outputPath = `./temp_output.${isVideo ? "webm" : "webp"}`;
      const response = await axios.get(filePath, { responseType: "arraybuffer" });
      fs.writeFileSync(inputPath, response.data);
      exec(`ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease" ${isVideo ? '-c:v libvpx-vp9 -b:v 500k -an' : ''} "${outputPath}"`, async (err) => {
        fs.unlinkSync(inputPath);
        if (err) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal konversi.</blockquote>`);
        try {
          await xy.api.sendSticker(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath));
          await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Stiker berhasil!</blockquote>`);
        } catch (e) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal kirim.</blockquote>`); }
        fs.unlinkSync(outputPath);
      });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Error.</blockquote>`); }
  })();
  break;
}

case "toimg": case "toimage": {
  if (!xy.message.reply_to_message || !xy.message.reply_to_message.sticker)
    return reply(`<blockquote>${E.cross} Reply stiker dengan <code>${global.prefix + command}</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Konversi stiker ke gambar...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const fileId = xy.message.reply_to_message.sticker.file_id;
    try {
      const file = await xy.api.getFile(fileId);
      if (!file.file_path) throw new Error("Gagal");
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const inputPath = `./temp_sticker.webp`, outputPath = `./temp_image.png`;
      const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(inputPath, response.data);
      exec(`ffmpeg -i "${inputPath}" "${outputPath}"`, async (err) => {
        fs.unlinkSync(inputPath);
        if (err) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`);
        try {
          await xy.api.sendPhoto(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath), { caption: `<blockquote>${E.check} <b>Berhasil!</b></blockquote>`, parse_mode: 'HTML' });
          await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Selesai.</blockquote>`);
        } catch (e) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
        fs.unlinkSync(outputPath);
      });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Error.</blockquote>`); }
  })();
  break;
}

case "tovideo": {
  if (!xy.message.reply_to_message || !xy.message.reply_to_message.sticker)
    return reply(`<blockquote>${E.cross} Reply stiker dengan <code>${global.prefix + command}</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Konversi stiker ke video...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const sticker = xy.message.reply_to_message.sticker;
    const fileId = sticker.file_id;
    const ext = sticker.is_video ? ".webm" : ".webp";
    const inputPath = `./sticker${ext}`, outputPath = `./video.mp4`;
    try {
      const file = await xy.api.getFile(fileId);
      if (!file.file_path) throw new Error("Gagal");
      const fileUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(inputPath, response.data);
      exec(`ffmpeg -i "${inputPath}" -movflags faststart -pix_fmt yuv420p -vf "scale=512:512" "${outputPath}"`, async (err) => {
        fs.unlinkSync(inputPath);
        if (err) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`);
        try {
          await xy.api.sendVideo(xy.chat.id, new InputFile(fs.readFileSync(outputPath), "video.mp4"), { caption: `<blockquote>${E.check} <b>Berhasil!</b></blockquote>`, parse_mode: 'HTML' });
          await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Selesai.</blockquote>`);
        } catch (e) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
        fs.unlinkSync(outputPath);
      });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Error.</blockquote>`); }
  })();
  break;
}

case 'qc': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const teks = xy.message.reply_to_message?.text || text;
  if (!teks) return reply(`<blockquote>${E.cross} Format: /qc teks (atau reply pesan)</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Membuat QC...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const targetUser = xy.message.reply_to_message?.from || xy.from;
    let avatarUrl = "https://telegra.ph/file/134ccbbd0dfc434a910ab.png";
    try {
      const photos = await xy.api.getUserProfilePhotos(targetUser.id);
      if (photos.total_count > 0) {
        const file = await xy.api.getFile(photos.photos[0][0].file_id);
        if (file?.file_path) avatarUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
      }
      const { data } = await axios.post("https://bot.lyo.su/quote/generate", { type: "quote", format: "png", backgroundColor: "#1a1a2e", width: 700, height: 580, scale: 2, messages: [{ from: { id: 1, name: targetUser.first_name, photo: { url: avatarUrl } }, text: teks, replyMessage: {} }] }, { headers: { "Content-Type": "application/json" } });
      const pngBuffer = Buffer.from(data.result.image, "base64");
      const inputPath = './qc_input.png', outputPath = './qc_output.webp';
      fs.writeFileSync(inputPath, pngBuffer);
      exec(`ffmpeg -y -i "${inputPath}" -vf "scale=512:-1" "${outputPath}"`, async (err) => {
        fs.unlinkSync(inputPath);
        if (err) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`);
        await xy.api.sendSticker(xy.chat.id, new InputFile(fs.readFileSync(outputPath), outputPath));
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} QC berhasil!</blockquote>`);
        fs.unlinkSync(outputPath);
      });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'tiktok': {
  if (!text || !text.includes('tiktok')) return reply(`<blockquote>${E.cross} Link tidak valid.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses TikTok...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const data = await tiktok2(text);
      if (data.no_watermark) await xy.api.sendVideo(xy.chat.id, data.no_watermark, { caption: `<blockquote>⚡ <b>Tanpa Watermark</b>\n${data.title || ''}</blockquote>`, parse_mode: "HTML" });
      if (data.music?.startsWith('http')) { const ab = await axios.get(data.music, { responseType: "arraybuffer" }); await xy.api.sendAudio(xy.chat.id, new InputFile(Buffer.from(ab.data), "audio.mp3"), { caption: `<blockquote>✨ Audio TikTok</blockquote>`, parse_mode: "HTML" }); }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berhasil!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'ytdl': {
  if (!text || !ytdl.validateURL(text)) return reply(`<blockquote>${E.cross} Link tidak valid!</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunduh YouTube...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const link = text;
    const videoPath = './yt_video.mp4', audioPath = './yt_audio.mp3';
    try {
      const info = await ytdl.getInfo(link);
      if (!info?.videoDetails) throw new Error('Gagal!');
      const { title, author } = info.videoDetails;
      await new Promise((resolve, reject) => { const vs = ytdl(link, { quality: 'highestvideo' }); vs.pipe(fs.createWriteStream(videoPath)).on('finish', resolve).on('error', reject); });
      await new Promise((resolve, reject) => { ffmpeg(ytdl(link, { quality: 'highestaudio' })).audioCodec('libmp3lame').save(audioPath).on('end', resolve).on('error', reject); });
      await xy.api.sendAudio(xy.chat.id, await CatBox(audioPath), { caption: `<blockquote>✨ Audio YT</blockquote>`, parse_mode: 'HTML' });
      await xy.api.sendVideo(xy.chat.id, await CatBox(videoPath), { caption: `<blockquote>⚡ <b>Video YT:</b>\n🌟 ${title}\n💎 ${author.name}</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(videoPath); fs.unlinkSync(audioPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Selesai!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'spo': case 'spotify': case 'spotifydl': case 'playspotify': {
  if (!q || !q.includes('spotify.com')) return reply(`<blockquote>${E.cross} URL Spotify tidak valid!</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunduh Spotify...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const res = await fetch(`https://api.nekorinn.my.id/downloader/spotify?url=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.status) throw new Error('Lagu tidak ditemukan!');
      const { title, artist, downloadUrl } = data.result;
      const filePath = path.join('./temp', `${title.replace(/[^\w\s]/gi, '')}.mp3`);
      if (!fs.existsSync('./temp')) fs.mkdirSync('./temp', { recursive: true });
      const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      await xy.api.sendAudio(xy.chat.id, new InputFile(filePath), { caption: `<blockquote>✨ <b>${title}</b>\n🌟 ${artist}</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(filePath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berhasil!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${err.message}</blockquote>`); }
  })();
  break;
}

case "igdl": {
  if (!text || !text.includes("instagram.com/")) return reply(`<blockquote>${E.cross} Link IG tidak valid!</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses Instagram...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const data = await igdl(text);
      if (!data?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Tidak ditemukan.</blockquote>`);
      let sent = 0;
      for (const item of data) {
        if (!item.url) continue;
        const filePath = `./igmedia.${item.url.includes("video") ? "mp4" : "jpg"}`;
        const response = await axios({ url: item.url, method: "GET", responseType: "stream" });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on("finish", resolve); writer.on("error", reject); });
        const uploadedUrl = await CatBox(filePath);
        if (item.url.includes("video")) await xy.api.sendVideo(xy.chat.id, uploadedUrl, { caption: `<blockquote>⚡ Video IG</blockquote>`, parse_mode: "HTML" });
        else await xy.api.sendPhoto(xy.chat.id, uploadedUrl, { caption: `<blockquote>✨ Foto IG</blockquote>`, parse_mode: "HTML" });
        fs.existsSync(filePath) && fs.unlinkSync(filePath);
        sent++;
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} ${sent} file berhasil!</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'pinterest': case 'pins': {
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>${global.prefix + command} kata kunci</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} Mencari gambar Pinterest...</blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const pinterest = require('../src/lib/pinterest');
      let images = await pinterest(text);
      if (!images?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Tidak ditemukan.</blockquote>`);
      images = images.sort(() => Math.random() - 0.5).slice(0, 5);
      for (const url of images) await xy.api.sendPhoto(xy.chat.id, url, { caption: `<blockquote>✨ Pinterest: ${text}</blockquote>`, parse_mode: 'HTML' });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berikut hasil untuk "${text}".</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'ssweb': {
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>/ssweb url</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengambil Screenshot...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    const url = text.startsWith('http') ? text : 'https://' + text;
    const filename = path.join(__dirname, 'screenshot.jpg');
    try {
      const response = await axios.get(`https://image.thum.io/get/width/1900/crop/1000/fullpage/${url}`, { responseType: 'stream' });
      const writer = fs.createWriteStream(filename);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      await xy.api.sendPhoto(xy.chat.id, new InputFile(filename), { caption: `<blockquote>${E.check} Screenshot berhasil!</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(filename);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Selesai.</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case 'ai': case 'gpt': case 'nekogpt': case 'aivid': case 'aiimg': case 'aimusic': case 'brat': case 'voiceai': {
  if (!q) return reply(`<blockquote>${E.cross} Masukkan teks!</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses AI...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      if (command === 'ai' || command === 'gpt' || command === 'nekogpt') {
        const res = await fetch(`https://api.nekorinn.my.id/ai/gpt-4.1-mini?text=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data?.result) await editReply(xy, sentMessage.message_id, `<blockquote>${data.result}</blockquote>`);
      } else if (command === 'aiimg') {
        await xy.replyWithPhoto(`https://api.nekorinn.my.id/ai-img/ai4chat?text=${encodeURIComponent(q)}&ratio=16%3A9`, { caption: `<blockquote>✨ ${q}</blockquote>`, parse_mode: 'HTML' });
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berhasil!</blockquote>`);
      } else if (command === 'aimusic') {
        const result = await genmusic(q);
        if (result?.[0]?.audio_url) {
          const fp = path.join(__dirname, 'music_ai.mp3');
          const res = await axios.get(result[0].audio_url, { responseType: 'stream' });
          res.data.pipe(fs.createWriteStream(fp));
          await new Promise((resolve, reject) => { fs.createWriteStream(fp).on('finish', resolve).on('error', reject); });
          await xy.api.sendAudio(xy.chat.id, await CatBox(fp), { caption: `<blockquote>✨ ${result[0].title || 'AI Music'}</blockquote>`, parse_mode: "HTML" });
          fs.unlinkSync(fp);
          await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berhasil!</blockquote>`);
        }
      } else if (command === 'brat') {
        const fp = './tmp_brat.png';
        const res = await axios.get(`https://api.hanggts.xyz/imagecreator/brat?text=${encodeURIComponent(q)}`, { responseType: 'arraybuffer' });
        fs.writeFileSync(fp, res.data);
        await xy.api.sendSticker(xy.chat.id, new InputFile(fp));
        fs.unlinkSync(fp);
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Berhasil!</blockquote>`);
      }
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${err.message}</blockquote>`); }
  })();
  break;
}

case 'installpanel': case 'uninstallpanel': case 'startwings': case 'hbpanel':
case "installtemanebula": case "installtemastellar": case "installtemadarknate":
case "installtemaenigma": case "installtemabilling": case "installtemaiceminecraft":
case "installtemanook": case "installtemanightcore": case "uninstalltema": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text) return reply(`<blockquote>${E.cross} Format: <code>/${command} ipvps,pwvps</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.fire} <b>Memulai SSH ${command.toUpperCase()}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    let [vpsIP, vpsPassword, arg3] = text.split(',').map(a => a.trim());
    const ssh = new Client();
    const connSettings = { host: vpsIP, port: 22, username: 'root', password: vpsPassword };
    const rand = Math.floor(1000 + Math.random() * 9000);
    const temaMap = {
        "installtemanebula": 2, "installtemastellar": 3, "installtemadarknate": 4,
        "installtemaenigma": 5, "installtemabilling": 6, "installtemaiceminecraft": 10,
        "installtemanook": 11, "installtemanightcore": 12,
    };
    let connectionError = null, sshCommand = '', finalMessage = '';
    try {
      await new Promise((resolve, reject) => { ssh.on('ready', resolve).on('error', reject).connect(connSettings); });
      if (temaMap[command]) {
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh) <<EOF\n${temaMap[command]}\n\n\nEOF`;
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.bolt} <b>Install tema...</b></blockquote>`);
        finalMessage = `<blockquote>${E.check} Tema berhasil diinstall!</blockquote>`;
      } else if (command === 'uninstalltema') {
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/KiwamiXq1031/installer-premium/refs/heads/main/zero.sh) <<EOF\n9\nEOF`;
        finalMessage = `<blockquote>${E.check} Tema dihapus!</blockquote>`;
      } else if (command === 'installpanel') {
        if (!arg3) throw new Error("Domain diperlukan!");
        const namaAcak = `admin${rand}`, emailAcak = `admin${rand}@zexc.my.id`, passPanel = `${rand}`;
        sshCommand = `bash <(curl -s https://pterodactyl-installer.se) <<EOF\n0\n${namaAcak}\n${namaAcak}\n\nAsia/Jakarta\n${emailAcak}\n${emailAcak}\n${namaAcak}\n${namaAcak}\n${namaAcak}\n${passPanel}\n${arg3}\ny\nyes\nEOF`;
        finalMessage = `<blockquote>${E.check} Panel terinstall!\n🚀 https://${arg3}\n👤 ${namaAcak}\n🔑 ${passPanel}</blockquote>`;
      } else if (command === 'uninstallpanel') {
        sshCommand = `bash <(curl -s https://pterodactyl-installer.se) <<EOF\n6\ny\ny\ny\n\n\nEOF`;
        finalMessage = `<blockquote>${E.check} Panel dihapus!</blockquote>`;
      } else if (command === 'hbpanel') {
        const newuser = 'admin' + generateReadableString(4), newpw = 'Admin' + generateReadableString(4);
        sshCommand = `bash <(curl -s https://raw.githubusercontent.com/iLyxxDev/hosting/refs/heads/main/install.sh) <<EOF\nnaelganteng\n7\n${newuser}\n${newpw}\nEOF`;
        finalMessage = `<blockquote>${E.check} Hackback berhasil!\n👤 ${newuser}\n🔑 ${newpw}</blockquote>`;
      } else if (command === 'startwings') {
        if (!arg3) throw new Error("Token node diperlukan!");
        sshCommand = `${arg3} && sudo systemctl restart wings`;
        finalMessage = `<blockquote>${E.check} Wings direstart!</blockquote>`;
      }
      await new Promise((resolve, reject) => { ssh.exec(sshCommand, (err, stream) => { if (err) return reject(err); stream.on('close', (code) => { code !== 0 ? reject(new Error(`Code ${code}`)) : resolve(); }).on('data', () => {}).stderr.on('data', () => {}); }); });
    } catch (err) { connectionError = err; } finally { ssh.end(); }
    if (connectionError) await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${connectionError.message}</blockquote>`);
    else await editReply(xy, sentMessage.message_id, finalMessage);
  })();
  break;
}

case 'subdo': {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  if (!text || !text.includes(',')) return reply(`<blockquote>${E.cross} Format: <code>/subdo host,ip</code></blockquote>`, { parse_mode: 'HTML' });
  const [host, ip] = text.split(',').map(a => a.trim());
  const dom = Object.keys(global.subdomain || {});
  if (!dom.length) return reply(`<blockquote>${E.cross} Tidak ada subdomain tersedia.</blockquote>`, { parse_mode: 'HTML' });
  const keyboard = dom.map((d, i) => [{ text: d, callback_data: `subdo ${i} ${host}|${ip}` }]);
  await reply(`<blockquote>💎 <b>Pilih Domain:</b>\n🌟 ${host}\n⚡ ${ip}</blockquote>`, { reply_markup: { inline_keyboard: keyboard }, parse_mode: "HTML" });
  break;
}

case 'listsrv': case 'listsrvv2': case 'listsrvv3': case 'listsrvv4': case 'listsrvv5':
case 'listsrvv6': case 'listsrvv7': case 'listsrvv8': case 'listsrvv9': case 'listsrvv10':
case 'listusr': case 'listusrv2': case 'listusrv3': case 'listusrv4': case 'listusrv5':
case 'listusrv6': case 'listusrv7': case 'listusrv8': case 'listusrv9': case 'listusrv10':
case 'listadmin': case 'listadminv2': case 'listadminv3': case 'listadminv4': case 'listadminv5':
case 'listadminv6': case 'listadminv7': case 'listadminv8': case 'listadminv9': case 'listadminv10': {
  const match = command.match(/v(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  if (!checkUserRole(userId, ['owner', 'partner'], serverVersion)) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const panelConfig = getPanelConfig(serverVersion);
  if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} Konfigurasi tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  const halaman = parseInt(text) || 1;
  const sentMessage = await reply(`<blockquote>${E.bolt} Mengambil daftar halaman ${halaman}...</blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      const isServerList = command.includes('srv'), isAdminList = command.includes('admin');
      const endpoint = isServerList ? 'servers' : 'users';
      let resp = await fetch(`${panelConfig.panelDomain}/api/application/${endpoint}?page=${halaman}&per_page=25`, { headers: { Authorization: `Bearer ${panelConfig.pltaKey}` } });
      let hasil = await resp.json();
      if (!hasil.data?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Tidak ada data.</blockquote>`);
      let filtered = isAdminList ? hasil.data.filter(u => u.attributes.root_admin) : hasil.data;
      if (!filtered.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Tidak ada data.</blockquote>`);
      let txt = `🌟 <b>${isServerList ? 'Server' : isAdminList ? 'Admin' : 'User'} (${serverVersion})</b>\n💎 ${panelConfig.panelDomain}\n━━━━━━━━━━━━\n`;
      for (let item of filtered) {
        let i = item.attributes;
        txt += `• <code>${i.id}</code> - ${i.name || i.username}\n`;
      }
      txt += `\n⚡ Hal ${hasil.meta.pagination.current_page}/${hasil.meta.pagination.total_pages} | Total: ${hasil.meta.pagination.total}`;
      let btns = new InlineKeyboard();
      if (hasil.meta.pagination.current_page > 1) btns.text('🔙 Sebelumnya', `${command} ${halaman - 1}`);
      if (hasil.meta.pagination.current_page < hasil.meta.pagination.total_pages) btns.text('Berikutnya 🚀', `${command} ${halaman + 1}`);
      await xy.api.editMessageText(xy.chat.id, sentMessage.message_id, `<blockquote>${txt}</blockquote>`, { parse_mode: "HTML", reply_markup: btns.row() });
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Error: ${err.message}</blockquote>`); }
  })();
  break;
}

case "delusr": case "delusrv2": case "delusrv3": case "delusrv4": case "delusrv5":
case "delusrv6": case "delusrv7": case "delusrv8": case "delusrv9": case "delusrv10":
case "deladmin": case "deladminv2": case "deladminv3": case "deladminv4": case "deladminv5":
case "deladminv6": case "deladminv7": case "deladminv8": case "deladminv9": case "deladminv10":
case "delsrv": case "delsrvv2": case "delsrvv3": case "delsrvv4": case "delsrvv5":
case "delsrvv6": case "delsrvv7": case "delsrvv8": case "delsrvv9": case "delsrvv10": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const match = command.match(/v(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const panelConfig = getPanelConfig(serverVersion);
  const targetType = command.includes('srv') ? 'server' : 'user';
  if (!text || !/^\d+$/.test(text)) return reply(`<blockquote>${E.cross} Format: <code>${global.prefix + command} ID</code></blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.fire} Menghapus ${targetType} ID ${text}...</blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      let f = await fetch(`${panelConfig.panelDomain}/api/application/${targetType}s/${text}`, { method: "DELETE", headers: { Authorization: `Bearer ${panelConfig.pltaKey}` } });
      if (f.status === 204) await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} ${targetType} ID ${text} berhasil dihapus.</blockquote>`);
      else { let d = await f.json(); throw new Error(d.errors[0].detail); }
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal: ${err.message}</blockquote>`); }
  })();
  break;
}

case "delallpanel": case "delallpanelv2": case "delallpanelv3": case "delallpanelv4": case "delallpanelv5":
case "delallpanelv6": case "delallpanelv7": case "delallpanelv8": case "delallpanelv9": case "delallpanelv10": {
    if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
    const match = command.match(/v(\d+)$/);
    const serverVersion = match ? `v${match[1]}` : 'v1';
    const excludedIds = text.trim().split(',').map(id => id.trim()).filter(id => /^\d+$/.test(id));
    if (!excludedIds.length) return reply(`<blockquote>${E.cross} Format: <code>/${command} id1,id2</code></blockquote>`, { parse_mode: 'HTML' });
    const panelConfig = getPanelConfig(serverVersion);
    if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} Konfigurasi tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.fire} Menghapus server kecuali: ${excludedIds.join(', ')}...</blockquote>`, { parse_mode: 'HTML' });
    (async () => {
      try {
        let all = [], page = 1, more = true;
        while (more) {
          const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
          all = all.concat(r.data.data);
          more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages;
          page++;
        }
        let del = 0, fail = 0;
        for (const item of all) {
          if (!excludedIds.includes(String(item.attributes.id))) {
            try { await axios.delete(`${panelConfig.panelDomain}/api/application/servers/${item.attributes.id}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); del++; }
            catch (e) { fail++; }
          }
        }
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Dihapus: ${del}\n${E.cross} Gagal: ${fail}\n🔙 Kecuali: ${excludedIds.join(', ')}</blockquote>`);
      } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
    })();
    break;
}

case "delallusr": case "delallusrv2": case "delallusrv3": case "delallusrv4": case "delallusrv5":
case "delallusrv6": case "delallusrv7": case "delallusrv8": case "delallusrv9": case "delallusrv10": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const match = command.match(/v(\d+)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const excludedId = text.trim();
  if (!excludedId || isNaN(excludedId)) return reply(`<blockquote>${E.cross} Format: <code>/${command} ID_Kecuali</code></blockquote>`, { parse_mode: 'HTML' });
  const panelConfig = getPanelConfig(serverVersion);
  if (!panelConfig.panelDomain || !panelConfig.pltaKey) return reply(`<blockquote>${E.cross} Konfigurasi tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.fire} Menghapus user kecuali ID ${excludedId}...</blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      let all = [], page = 1, more = true;
      while (more) {
        const r = await axios.get(`${panelConfig.panelDomain}/api/application/users?page=${page}&include=servers`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
        all = all.concat(r.data.data);
        more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages;
        page++;
      }
      let del = 0, skip = 0, fail = 0;
      for (const item of all) {
        if (String(item.attributes.id) !== excludedId) {
          if (item.attributes.relationships.servers.data.length === 0) {
            try { await axios.delete(`${panelConfig.panelDomain}/api/application/users/${item.attributes.id}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); del++; }
            catch (e) { fail++; }
          } else skip++;
        }
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Dihapus: ${del}\n🔙 Dilewati (ada server): ${skip}\n${E.cross} Gagal: ${fail}</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case "servercpu": {
  const match = text.match(/v(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  if (!checkUserRole(userId, ['owner', 'partner'], serverVersion)) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const panelConfig = getPanelConfig(serverVersion);
  if (!panelConfig.panelDomain || !panelConfig.pltaKey || !panelConfig.pltcKey) return reply(`<blockquote>${E.cross} Konfigurasi tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memeriksa CPU Server ${serverVersion}...</b></blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      let servers = [], page = 1, more = true;
      while (more) {
        const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
        servers = servers.concat(r.data.data);
        more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages;
        page++;
      }
      let abnormal = [];
      for (const s of servers) {
        try {
          const rr = await axios.get(`${panelConfig.panelDomain}/api/client/servers/${s.attributes.uuid}/resources`, { headers: { 'Authorization': `Bearer ${panelConfig.pltcKey}` } });
          const cpu = rr.data.attributes.resources.cpu_absolute;
          if (cpu > 320) abnormal.push({ id: s.attributes.id, name: s.attributes.name, usage: cpu });
        } catch (e) {}
      }
      if (!abnormal.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Semua server normal.</blockquote>`);
      let msg = `🔥 <b>CPU Abnormal (${serverVersion})</b>\n`;
      abnormal.forEach(s => msg += `• <code>${s.id}</code> ${s.name} - ${s.usage.toFixed(2)}%\n`);
      await editReply(xy, sentMessage.message_id, `<blockquote>${msg}</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

case "delsrvoff": case "delsrvoffv2": case "delsrvoffv3": case "delsrvoffv4": case "delsrvoffv5":
case "delsrvoffv6": case "delsrvoffv7": case "delsrvoffv8": case "delsrvoffv9": case "delsrvoffv10": {
  if (!isOwner) return reply(`<blockquote>${mess.owner}</blockquote>`);
  const match = command.match(/v(\d)$/);
  const serverVersion = match ? `v${match[1]}` : 'v1';
  const panelConfig = getPanelConfig(serverVersion);
  if (!panelConfig.panelDomain || !panelConfig.pltaKey || !panelConfig.pltcKey) return reply(`<blockquote>${E.cross} Konfigurasi tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
  const sentMessage = await reply(`<blockquote>${E.fire} Mencari server offline di ${serverVersion}...</blockquote>`, { parse_mode: 'HTML' });
  (async () => {
    try {
      let all = [], page = 1, more = true;
      while (more) {
        const r = await axios.get(`${panelConfig.panelDomain}/api/application/servers?page=${page}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } });
        all = all.concat(r.data.data);
        more = r.data.meta.pagination.current_page < r.data.meta.pagination.total_pages;
        page++;
      }
      let offline = [];
      for (const s of all) {
        const status = await getServerStatus(s.attributes.uuid, panelConfig);
        if (status === 'offline' || status === 'stopped') offline.push({ id: s.attributes.id, name: s.attributes.name });
      }
      if (!offline.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.check} Tidak ada server offline.</blockquote>`);
      let del = 0;
      for (const s of offline) {
        try { await axios.delete(`${panelConfig.panelDomain}/api/application/servers/${s.id}`, { headers: { 'Authorization': `Bearer ${panelConfig.pltaKey}` } }); del++; } catch (e) {}
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} ${del} server offline dihapus.</blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} Gagal.</blockquote>`); }
  })();
  break;
}

    case 'open': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      try {
        await xy.api.setChatPermissions(xy.chat.id, { can_send_messages: true, can_send_audios: true, can_send_photos: true, can_send_videos: true, can_send_other_messages: true });
        reply(`<blockquote>${E.check} Grup <b>${xy.chat.title}</b> berhasil <b>DIBUKA</b>!</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal membuka grup.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'close': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      try {
        await xy.api.setChatPermissions(xy.chat.id, { can_send_messages: false });
        reply(`<blockquote>${E.cross} Grup <b>${xy.chat.title}</b> berhasil <b>DITUTUP</b>!</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal menutup grup.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'changetitle': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      if (!text) return reply(`<blockquote>${E.cross} Format: <code>/${command} [Judul Baru]</code></blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.setChatTitle(xy.chat.id, text);
        reply(`<blockquote>${E.check} Nama grup berhasil diubah menjadi: <b>${text}</b></blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal mengubah nama grup.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'changedesk': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      const newDesc = text.trim() || "Tidak ada deskripsi.";
      try {
        await xy.api.setChatDescription(xy.chat.id, newDesc);
        reply(`<blockquote>${E.check} Deskripsi grup berhasil diubah:\n\n<i>${newDesc}</i></blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal mengubah deskripsi.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'pinn': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Harap balas pesan yang ingin <b>disematkan</b>.</blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.pinChatMessage(xy.chat.id, xy.message.reply_to_message.message_id, { disable_notification: true });
        reply(`<blockquote>${E.check} Pesan berhasil <b>disematkan</b>.</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal menyematkan pesan.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'unpinn': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      try {
        if (xy.message.reply_to_message) {
          await xy.api.unpinChatMessage(xy.chat.id, xy.message.reply_to_message.message_id);
          reply(`<blockquote>${E.check} Sematan pesan berhasil <b>dilepaskan</b>.</blockquote>`, { parse_mode: 'HTML' });
        } else {
          await xy.api.unpinAllChatMessages(xy.chat.id);
          reply(`<blockquote>${E.check} Semua sematan berhasil <b>dilepaskan</b>.</blockquote>`, { parse_mode: 'HTML' });
        }
      } catch (e) { reply(`<blockquote>${E.cross} Gagal.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'adduser': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota yang ingin ditambahkan.</blockquote>`, { parse_mode: 'HTML' });
      reply(`<blockquote>${E.star} Untuk menambahkan <b>${targetUser.first_name}</b>, kirim link undangan grup ini kepadanya.</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'kickuser': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota yang ingin dikick.</blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.banChatMember(xy.chat.id, targetUser.id);
        reply(`<blockquote>${E.check} Anggota <b>${targetUser.first_name}</b> telah dikeluarkan dari grup.</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal mengeluarkan anggota.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'promoteuser': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota yang ingin dipromote.</blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.promoteChatMember(xy.chat.id, targetUser.id, {
          can_change_info: true, can_delete_messages: true, can_invite_users: true,
          can_restrict_members: true, can_pin_messages: true, can_manage_topics: true,
          can_manage_video_chats: true, can_promote_members: false
        });
        reply(`<blockquote>${E.crown} Anggota <b>${targetUser.first_name}</b> telah diangkat menjadi Admin.</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'demoteuser': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota yang ingin didemote.</blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.promoteChatMember(xy.chat.id, targetUser.id, {
          can_change_info: false, can_delete_messages: false, can_invite_users: false,
          can_restrict_members: false, can_pin_messages: false, can_manage_topics: false,
          can_manage_video_chats: false, can_promote_members: false
        });
        reply(`<blockquote>${E.check} Admin <b>${targetUser.first_name}</b> telah diturunkan menjadi anggota biasa.</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'welcome': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const groupID = xy.chat.id;
      let listData = readJson(WELEAVE_FILE, []);
      let found = listData.findIndex(item => item.id === groupID);
      const action = text.toLowerCase().trim();
      if (action === 'on') {
        if (found === -1) listData.push({ id: groupID, welcome: true, leave: false });
        else listData[found].welcome = true;
        writeJson(WELEAVE_FILE, listData);
        reply(`<blockquote>${E.check} Pesan Welcome <b>DIAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else if (action === 'off') {
        if (found !== -1) { listData[found].welcome = false; writeJson(WELEAVE_FILE, listData); }
        reply(`<blockquote>${E.cross} Pesan Welcome <b>DINONAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else reply(`<blockquote>${E.star} Penggunaan: <code>/${command} on/off</code></blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'leave': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const groupID = xy.chat.id;
      let listData = readJson(WELEAVE_FILE, []);
      let found = listData.findIndex(item => item.id === groupID);
      const action = text.toLowerCase().trim();
      if (action === 'on') {
        if (found === -1) listData.push({ id: groupID, welcome: false, leave: true });
        else listData[found].leave = true;
        writeJson(WELEAVE_FILE, listData);
        reply(`<blockquote>${E.check} Pesan Leave <b>DIAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else if (action === 'off') {
        if (found !== -1) { listData[found].leave = false; writeJson(WELEAVE_FILE, listData); }
        reply(`<blockquote>${E.cross} Pesan Leave <b>DINONAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else reply(`<blockquote>${E.star} Penggunaan: <code>/${command} on/off</code></blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'antilink': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const groupID = xy.chat.id;
      let listData = readJson(ANTILINK_FILE, []);
      let found = listData.findIndex(item => item.id === groupID);
      const action = text.toLowerCase().trim();
      if (action === 'on') {
        if (found === -1) listData.push({ id: groupID, active: true });
        else listData[found].active = true;
        writeJson(ANTILINK_FILE, listData);
        reply(`<blockquote>${E.check} Anti-Link <b>DIAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else if (action === 'off') {
        if (found !== -1) { listData[found].active = false; writeJson(ANTILINK_FILE, listData); }
        reply(`<blockquote>${E.cross} Anti-Link <b>DINONAKTIFKAN</b>.</blockquote>`, { parse_mode: 'HTML' });
      } else {
        const status = found !== -1 && listData[found].active ? 'AKTIF' : 'NONAKTIF';
        reply(`<blockquote>${E.star} Status Anti-Link: <b>${status}</b>\n${E.bolt} <code>/${command} on/off</code></blockquote>`, { parse_mode: 'HTML' });
      }
      break;
    }

    case 'linkgroup': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      try {
        const link = await xy.api.exportChatInviteLink(xy.chat.id);
        reply(`<blockquote>${E.rocket} <b>Link Undangan:</b>\n${link}</blockquote>`, { parse_mode: 'HTML' });
      } catch (e) { reply(`<blockquote>${E.cross} Gagal mendapatkan link.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'delete': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      if (!isBotGroupAdmins) return reply(`<blockquote>${mess.botAdmin}</blockquote>`);
      if (!xy.message.reply_to_message) return reply(`<blockquote>${E.cross} Harap balas pesan yang ingin <b>dihapus</b>.</blockquote>`, { parse_mode: 'HTML' });
      try {
        await xy.api.deleteMessage(xy.chat.id, xy.message.reply_to_message.message_id);
        await xy.api.deleteMessage(xy.chat.id, xy.message.message_id);
      } catch (e) { reply(`<blockquote>${E.cross} Gagal menghapus.</blockquote>`, { parse_mode: 'HTML' }); }
      break;
    }

    case 'warnn': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota.</blockquote>`, { parse_mode: 'HTML' });
      const targetId = String(targetUser.id), groupID = String(xy.chat.id), maxWarn = 5;
      let groupWarns = warnDB[groupID] || {};
      let userWarns = (groupWarns[targetId] || 0) + 1;
      groupWarns[targetId] = userWarns;
      warnDB[groupID] = groupWarns;
      saveWarnDB(warnDB);
      if (userWarns >= maxWarn) {
        try {
          await xy.api.banChatMember(xy.chat.id, targetUser.id);
          delete groupWarns[targetId];
          saveWarnDB(warnDB);
          reply(`<blockquote>${E.fire} <b>${targetUser.first_name}</b> dikeluarkan! (${userWarns}/${maxWarn})</blockquote>`, { parse_mode: 'HTML' });
        } catch (e) { reply(`<blockquote>${E.fire} <b>${targetUser.first_name}</b> mencapai batas, tapi gagal dikeluarkan.</blockquote>`, { parse_mode: 'HTML' }); }
      } else reply(`<blockquote>${E.fire} <b>${targetUser.first_name}</b> diperingatkan! (${userWarns}/${maxWarn})</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'warns': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from || xy.from;
      const groupWarns = warnDB[String(xy.chat.id)] || {};
      const userWarns = groupWarns[String(targetUser.id)] || 0;
      reply(`<blockquote>${E.star} <b>${targetUser.first_name}</b>\n${E.fire} Peringatan: <b>${userWarns}/5</b></blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'resetwarnn': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!isGroupAdmins) return reply(`<blockquote>${mess.admin}</blockquote>`);
      const targetUser = xy.message.reply_to_message?.from;
      if (!targetUser) return reply(`<blockquote>${E.cross} Harap balas pesan anggota.</blockquote>`, { parse_mode: 'HTML' });
      const targetId = String(targetUser.id), groupID = String(xy.chat.id);
      let groupWarns = warnDB[groupID] || {};
      if (groupWarns[targetId]) {
        delete groupWarns[targetId];
        warnDB[groupID] = groupWarns;
        saveWarnDB(warnDB);
        reply(`<blockquote>${E.check} Peringatan <b>${targetUser.first_name}</b> di-reset.</blockquote>`, { parse_mode: 'HTML' });
      } else reply(`<blockquote>${E.cross} Tidak ada peringatan.</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'addlist': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      const info = text.split('|');
      if (info.length < 2) return reply(`<blockquote>${E.cross} Format: <code>/addlist Key | Respon</code></blockquote>`, { parse_mode: 'HTML' });
      const [key, resp] = info.map(s => s.trim());
      const groupID = xy.chat.id;
      let listData = readJson(LIST_FILE);
      if (listData.some(item => item.id === groupID && item.key.toLowerCase() === key.toLowerCase())) {
        return reply(`<blockquote>${E.cross} Key "<b>${key}</b>" sudah ada.</blockquote>`, { parse_mode: 'HTML' });
      }
      listData.push({ id: groupID, key, response: resp, isImage: false, image_url: '' });
      writeJson(LIST_FILE, listData);
      reply(`<blockquote>${E.check} Produk <b>${key}</b> berhasil ditambahkan!</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'dellist': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!text) return reply(`<blockquote>${E.cross} Format: <code>/dellist Key</code></blockquote>`, { parse_mode: 'HTML' });
      const key = text.trim(), groupID = xy.chat.id;
      let listData = readJson(LIST_FILE);
      const init = listData.length;
      listData = listData.filter(item => !(item.id === groupID && item.key.toLowerCase() === key.toLowerCase()));
      if (listData.length < init) { writeJson(LIST_FILE, listData); reply(`<blockquote>${E.check} <b>${key}</b> dihapus.</blockquote>`, { parse_mode: 'HTML' }); }
      else reply(`<blockquote>${E.cross} Key "<b>${key}</b>" tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'updatelist': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      const info = text.split('|');
      if (info.length < 2) return reply(`<blockquote>${E.cross} Format: <code>/updatelist Key | Respon Baru</code></blockquote>`, { parse_mode: 'HTML' });
      const [key, resp] = info.map(s => s.trim()), groupID = xy.chat.id;
      let listData = readJson(LIST_FILE);
      const idx = listData.findIndex(item => item.id === groupID && item.key.toLowerCase() === key.toLowerCase());
      if (idx === -1) return reply(`<blockquote>${E.cross} Key "<b>${key}</b>" tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
      listData[idx].response = resp;
      writeJson(LIST_FILE, listData);
      reply(`<blockquote>${E.check} <b>${key}</b> berhasil diperbarui!</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'dellistall': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      const groupID = xy.chat.id;
      let listData = readJson(LIST_FILE);
      const init = listData.length;
      listData = listData.filter(item => item.id !== groupID);
      writeJson(LIST_FILE, listData);
      reply(`<blockquote>${E.check} ${init - listData.length} produk dihapus.</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'listproduk': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      const groupID = xy.chat.id;
      const list = readJson(LIST_FILE).filter(item => item.id === groupID);
      if (!list.length) return reply(`<blockquote>${E.cross} Tidak ada produk.</blockquote>`, { parse_mode: 'HTML' });
      let txt = `${E.star} <b>DAFTAR PRODUK</b> (${list.length})\n\n`;
      list.forEach((item, i) => { txt += `${i+1}. <b>${item.key}</b>\n`; });
      reply(`<blockquote>${txt}</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    case 'searchproduk': {
      if (xy.chat.type !== 'group' && xy.chat.type !== 'supergroup') return reply(`<blockquote>${mess.group}</blockquote>`);
      if (!text) return reply(`<blockquote>${E.cross} Format: <code>/searchproduk Kata Kunci</code></blockquote>`, { parse_mode: 'HTML' });
      const kw = text.toLowerCase(), groupID = xy.chat.id;
      const results = readJson(LIST_FILE).filter(item => item.id === groupID && (item.key.toLowerCase().includes(kw) || item.response.toLowerCase().includes(kw)));
      if (!results.length) return reply(`<blockquote>${E.cross} Tidak ditemukan.</blockquote>`, { parse_mode: 'HTML' });
      let txt = `${E.fire} <b>HASIL PENCARIAN</b> (${results.length})\n\n`;
      results.forEach((item, i) => { txt += `${i+1}. <b>${item.key}</b>\n`; });
      txt += `\n💎 Ketik <b>Key</b> untuk detail.`;
      reply(`<blockquote>${txt}</blockquote>`, { parse_mode: 'HTML' });
      break;
    }

    default:
  }
}

module.exports = { handleMessage, checkAndStopAbnormalCpu };