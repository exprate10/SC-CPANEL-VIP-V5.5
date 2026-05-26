require('./config/settings')
require('./src/lib/menu')
const fs = require('fs');
const path = require('path');
const { Bot, Markup, InlineKeyboard, InputFile } = require("grammy");
const ora = require('ora');
const axios = require('axios');
const readlineSync = require('readline-sync');
const connectwa = require("./src/lib/connectwa");
const os = require('os');
const { setBotInstance, restoreWhatsAppSessions } = require('./src/lib/connectwa');
const { handleMessage, checkAndStopAbnormalCpu } = require("./config/xy"); 

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

const tokenPath = path.join(__dirname, './src/database/token.json');
const warnFile = path.join(__dirname, "./src/database/warns.json");
const partnerFile = path.join(__dirname, "./src/database/partner.json");
const resellerFile = path.join(__dirname, "./src/database/reseller.json");
const sellerFile = path.join(__dirname, "./src/database/seller.json");
const ownerFile = path.join(__dirname, "./owner.json");
const userFile = path.join(__dirname, "./src/database/user.json");
const premiumFile = path.join(__dirname, "./src/database/premium.json");
const allowedGroupsFile = path.join(__dirname, "./src/database/allowed_groups.json");

function ensureDatabaseFiles() {
  const files = [
    { path: partnerFile, defaultContent: "[]" }, { path: resellerFile, defaultContent: "[]" },
    { path: sellerFile, defaultContent: "[]" }, { path: ownerFile, defaultContent: "[]" },
    { path: userFile, defaultContent: "[]" }, { path: premiumFile, defaultContent: "[]" },
    { path: allowedGroupsFile, defaultContent: "[]" }, { path: warnFile, defaultContent: "{}" },
    { path: './src/database/list.json', defaultContent: "[]" },
    { path: './src/database/weleave.json', defaultContent: "[]" },
    { path: './src/database/antilink.json', defaultContent: "[]" }
  ];
  for (const file of files) {
    if (!fs.existsSync(file.path)) {
      try { fs.writeFileSync(file.path, file.defaultContent, 'utf8'); } catch (e) {}
    }
  }
}
ensureDatabaseFiles();

global.mess = {
    owner: `${E.cross} Khusus Owner!`,
    seller: `${E.cross} Khusus Owner/Partner/Reseller!`,
    group: `${E.cross} Khusus di grup!`,
    admin: `${E.cross} Khusus Admin Grup!`,
    botAdmin: `${E.cross} Bot harus jadi Admin!`,
};

function getUserStatus(userId) {
  const userIdStr = String(userId);
  const ownerList = JSON.parse(fs.readFileSync(ownerFile));
  const sellerList = JSON.parse(fs.readFileSync(sellerFile));
  const partnerList = JSON.parse(fs.readFileSync(partnerFile));
  const resellerList = JSON.parse(fs.readFileSync(resellerFile));
  const premiumList = JSON.parse(fs.readFileSync(premiumFile));
  if (ownerList.includes(userIdStr)) return "owner";
  if (premiumList.includes(userIdStr)) return "premium";
  if (sellerList.some(seller => String(seller.id) === userIdStr)) return "seller";
  if (Array.isArray(partnerList) && partnerList.some(partner => String(partner.id) === userIdStr)) return "partner";
  if (Array.isArray(resellerList) && resellerList.some(reseller => String(reseller.id) === userIdStr)) return "reseller";
  return "user";
}

global.startTime = Date.now();

function formatDuration(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (1000 * 60)) % 60;
  const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  return `${d} hari ${h} jam ${m} menit ${s} detik`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function readJson(filePath, defaultValue = []) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return defaultValue; }
}

function getVpsInfo() {
    const systemUptimeSeconds = os.uptime();
    const vpsRuntime = formatDuration(systemUptimeSeconds * 1000);
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = `${formatBytes(usedMemory)} / ${formatBytes(totalMemory)}`;
    const cpus = os.cpus();
    const cpuModel = cpus[0].model.trim();
    const cpuCores = cpus.length;
    return { vpsRuntime, memoryUsage, cpuModel, cpuCores };
}

function readWarnDB() {
  try { if (fs.existsSync(warnFile)) return JSON.parse(fs.readFileSync(warnFile, "utf8")); return {}; } 
  catch (error) { console.error(`${E.cross} Error baca warnDB:`, error); return {}; }
}

function saveWarnDB(data) {
  try { fs.writeFileSync(warnFile, JSON.stringify(data, null, 2)); } 
  catch (error) { console.error(`${E.cross} Error simpan warnDB:`, error); }
}

let warnDB = readWarnDB();
let pendingWarns = new Map();
const sleep = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function askToken() {
  console.log('🔑 Masukkan Token Bot Telegram:');
  return readlineSync.question('> ').trim();
}

function getToken() {
  if (fs.existsSync(tokenPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
      if (data.token && data.token.trim() !== '') return data.token.trim();
    } catch (err) { console.log('⚠️ Gagal baca token.json, minta token baru...'); }
  }
  const token = askToken();
  if (!token) { console.log(`${E.cross} Token kosong! Program dihentikan.`); process.exit(1); }
  fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
  fs.writeFileSync(tokenPath, JSON.stringify({ token }, null, 2));
  console.log(`${E.check} Token berhasil disimpan!`);
  return token;
}

const botToken = getToken();
const bot = new Bot(botToken);

function loadUsers() { if (!fs.existsSync(userFile)) return []; return JSON.parse(fs.readFileSync(userFile, "utf8")); }
function saveUsers(users) { fs.writeFileSync(userFile, JSON.stringify(users, null, 2)); }

setBotInstance(bot);

bot.command("start", async (xy) => {
  const userId = xy.from.id;
  const users = new Set(loadUsers());
  users.add(userId);
  saveUsers([...users]);

  const uptime = formatDuration(Date.now() - global.startTime);
  const vpsInfo = getVpsInfo();
  const totalMemoryOnly = vpsInfo.memoryUsage.split('/')[1].trim(); 
  
  const caption = `<blockquote>${E.sparkles} <b>ZEXC OFFC | CPANEL VIP</b> ${E.sparkles}
━━━━━━━━━━━━━━━━━━━━
${E.crown} <b>Name Bot</b>    : ${namabot}
${E.fire} <b>Runtime</b>     : ${uptime}
${E.star} <b>Username</b>    : @${xy.from.username || "-"}
${E.bolt} <b>Runtime Vps</b> : ${vpsInfo.vpsRuntime}
${E.diamond} <b>Spek Vps</b> : ${totalMemoryOnly} / ${vpsInfo.cpuCores} Cores
</blockquote>`;
  
  const keyboard = {
  inline_keyboard: [
    [{ text: `${E.rocket} ᴄʜᴀɴɴᴇʟ`, callback_data: 'testi' }, { text: `${E.crown} ᴅᴇᴠᴇʟᴏᴘᴇʀ`, callback_data: 'owner' }],
    [{ text: `${E.diamond} ʙᴜᴋᴀ ᴍᴇɴᴜ`, callback_data: 'mainmenu' }],
    [{ text: `${E.store} ʙᴜʏ ꜱᴄʀɪᴘᴛ ᴄᴘᴀɴᴇʟ ᴠɪᴘ ᴢᴇxᴄ`, callback_data: 'buyscript' }]
  ]
};

  try {
    await xy.api.sendPhoto(xy.chat.id, global.startMenuPhoto, {
      caption: caption,
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } catch (e) {
    await xy.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
});

bot.callbackQuery("owner", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(`<blockquote>${E.crown} <b>ZEXC OFFC DEVELOPER:</b>\n<a href="https://t.me/ZexcOfficial">@ZexcOfficial</a></blockquote>`, {
    parse_mode: "HTML"
  });
});

bot.callbackQuery("testi", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(`<blockquote>${E.rocket} <b>Wajib Join Channel:</b>\n@ZexcOfficiall</blockquote>`, {
    parse_mode: "HTML"
  });
});

bot.callbackQuery("buyscript", async (ctx) => {
  await ctx.answerCallbackQuery();
  const caption = `<blockquote>💎 <b>BUY SCRIPT CPANEL VIP ZEXC</b> 💎
━━━━━━━━━━━━━━━━━━━━━━━
🌟 <b>Nama Script:</b> CPANEL VIP ZEXC OFFC
⚡ <b>Versi:</b> 2.0.0 VIP
🔥 <b>Fitur Unggulan:</b>

🔹 Create Panel Otomatis V1-V10
🔹 Create Admin Panel (CADP)
🔹 Auto CPU Check & Auto Stop
🔹 WhatsApp Connect (Pairing Code)
🔹 Kirim Pesan WhatsApp (/send)
🔹 Anti-Link & Group Management
🔹 Welcome & Leave Message
🔹 Downloader (TikTok, YT, IG, Spotify, Pinterest)
🔹 AI Menu (GPT, Image, Video, Music, Voice)
🔹 Sticker Maker & Converter
🔹 QR Code Generator
🔹 Screenshot Web
🔹 Installer Panel & 8 Tema via SSH
🔹 Uninstall Panel & Clear All
🔹 Hackback Panel
🔹 Subdomain Cloudflare
🔹 ID Card Premium (Canvas)
🔹 Payment Info (DANA, GOPAY, OVO, QRIS)
🔹 Store Produk (Add, Delete, Update, Search)
🔹 Warn System & Kick User
🔹 Pin/Unpin, Open/Close, Polling
🔹 Group Stats & Group Link
🔹 Cek ID Telegram & Info User
🔹 Cek Status Semua Server
🔹 60+ Command Siap Pakai

━━━━━━━━━━━━━━━━━━━━━━━
📦 <b>YANG LO DAPET:</b>

🔹 <b>ENC (Rp 5.000):</b>
  • Script Encrypted Siap Run
  • No Up
  • Bantuan Installasi
  • Garansi 3 Hari

🔹 <b>NO ENC (Rp 8.000):</b>
  • Script No Encrypt
  • No Up
  • Bisa Edit Semua
  • Bantuan Installasi
  • Garansi 7 Hari
  • Bisa Dijual Kembali

🔹 <b>FULL UP (Rp 25.000):</b>
  • Bisa Edit Semua
  • Free Update Seumur Hidup
  • Bantuan Installasi
  • Prioritas Bantuan
  • Bisa Dijual Kembali

━━━━━━━━━━━━━━━━━━━━━━━
👑 <b>Minat? Langsung Chat:</b>
@ZexcOfficial

🚀 <b>Channel Resmi:</b>
@ZexcOfficiall

💎 <b>CPANEL VIP ZEXC OFFC</b></blockquote>`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '💎 ᴏʀᴅᴇʀ ꜱᴇᴋᴀʀᴀɴɢ', url: 'https://t.me/ZexcOfficial' }],
      [{ text: '🚀 ᴄʜᴀɴɴᴇʟ', url: 'https://t.me/ZexcOfficiall' }],
      [{ text: `${E.beginner} ᴋᴇᴍʙᴀʟɪ`, callback_data: 'mainmenu' }]
    ]
  };

  try {
    await ctx.editMessageText(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  } catch (e) {
    await ctx.reply(caption, {
      parse_mode: 'HTML',
      reply_markup: keyboard
    });
  }
});

function getMainMenuKeyboard() {
  return new InlineKeyboard()
    .text(`${E.artist} ꜱᴘᴇᴄɪᴀʟ`, "specialmenu").text(`${E.fire} ʀᴇꜱᴇʟʟᴇʀ`, "resellerpanel").row() 
    .text(`${E.crown} ᴘᴀʀᴛɴᴇʀ`, "partnerpanel").text(`${E.store} ꜱᴛᴏʀᴇ`, "storemenu").row() 
    .text(`${E.tools} ᴛᴏᴏʟꜱ`, "toolsmenu").text(`${E.box} ᴅᴏᴡɴʟᴏᴀᴅᴇʀ`, "downloadermenu").row()
    .text(`${E.bolt} ɪɴꜱᴛᴀʟʟᴇʀ`, "installermenu").text(`${E.group} ɢʀᴏᴜᴘ`, "groupmenu").row()
    .text(`${E.trophy} ᴏᴡɴᴇʀ`, "ownermenu");
}

function getOwnerMenuKeyboard() {
  return new InlineKeyboard()
    .text(`${E.check} ᴀᴅᴅ`, "ownermenu_add").text(`${E.cross} ᴅᴇʟᴇᴛᴇ`, "ownermenu_delete").row()
    .text(`${E.tools} ꜱᴇᴛᴛɪɴɢ`, "ownermenu_setserver").text(`${E.star} ʟɪꜱᴛ`, "ownermenu_list").row()
    .text(`${E.diamond} ᴘᴀɴᴇʟ`, "ownermenu_panelmgmt").text(`${E.bolt} ᴡᴀ`, "ownermenu_wa").row()
    .text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "mainmenu");
}

function getOwnerMenu_ListKeyboard() {
  return new InlineKeyboard()
    .text(`${E.crown} ᴏᴡɴᴇʀ`, "cmd_listowner").text(`${E.star} ꜱᴇʟʟᴇʀ`, "cmd_listseller").row()
    .text(`${E.diamond} ᴘᴀʀᴛɴᴇʀ`, "cmd_listpt").text(`${E.fire} ʀᴇꜱᴇʟʟᴇʀ`, "cmd_listrt").row()
    .text(`${E.bolt} ᴛᴏᴛᴀʟ V1`, "cmd_totalserver").text(`${E.rocket} ᴛᴏᴛᴀʟ V2`, "cmd_totalserverv2").row()
    .text(`${E.sparkles} ᴄᴇᴋ ID`, "cmd_cekid").text(`${E.target} ᴄᴇᴋ ꜱᴇʀᴠᴇʀ`, "cmd_cekserver").row()
    .text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "ownermenu");
}

function getPartnerPanelKeyboard() {
  return new InlineKeyboard()
    .text(`${E.diamond} V1`, "partnerpanel_v1").text(`${E.fire} V2`, "partnerpanel_v2").text(`${E.bolt} V3`, "partnerpanel_v3").row()
    .text(`${E.star} V4`, "partnerpanel_v4").text(`${E.crown} V5`, "partnerpanel_v5").text(`${E.rocket} V6`, "partnerpanel_v6").row()
    .text(`${E.sparkles} V7`, "partnerpanel_v7").text(`${E.target} V8`, "partnerpanel_v8").text(`${E.trophy} V9`, "partnerpanel_v9").row()
    .text(`${E.check} V10`, "partnerpanel_v10").row()
    .text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "mainmenu");
}

function getResellerPanelKeyboard() {
  return new InlineKeyboard()
    .text(`${E.diamond} V1`, "resellerpanel_v1").text(`${E.fire} V2`, "resellerpanel_v2").text(`${E.bolt} V3`, "resellerpanel_v3").row()
    .text(`${E.star} V4`, "resellerpanel_v4").text(`${E.crown} V5`, "resellerpanel_v5").text(`${E.rocket} V6`, "resellerpanel_v6").row()
    .text(`${E.sparkles} V7`, "resellerpanel_v7").text(`${E.target} V8`, "resellerpanel_v8").text(`${E.trophy} V9`, "resellerpanel_v9").row()
    .text(`${E.check} V10`, "resellerpanel_v10").row()
    .text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "mainmenu");
}

["partnerpanel_v5","partnerpanel_v6","partnerpanel_v7","partnerpanel_v8","partnerpanel_v9","partnerpanel_v10"].forEach(cb => {
  bot.callbackQuery(cb, async (ctx) => {
    await ctx.answerCallbackQuery();
    const version = cb.replace('partnerpanel_', '');
    const dataMap = { v5: partnerpanelV5, v6: partnerpanelV6, v7: partnerpanelV7, v8: partnerpanelV8, v9: partnerpanelV9, v10: partnerpanelV10 };
    await ctx.editMessageText(dataMap[version], {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "partnerpanel"),
    });
  });
});

["resellerpanel_v5","resellerpanel_v6","resellerpanel_v7","resellerpanel_v8","resellerpanel_v9","resellerpanel_v10"].forEach(cb => {
  bot.callbackQuery(cb, async (ctx) => {
    await ctx.answerCallbackQuery();
    const version = cb.replace('resellerpanel_', '');
    const dataMap = { v5: resellerpanelV5, v6: resellerpanelV6, v7: resellerpanelV7, v8: resellerpanelV8, v9: resellerpanelV9, v10: resellerpanelV10 };
    await ctx.editMessageText(dataMap[version], {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "resellerpanel"),
    });
  });
});

async function sendMainMenu(ctx) {
  const uptime = formatDuration(Date.now() - global.startTime);
  const info = `<blockquote> ${E.diamond} <b>ZEXC OFFC | CPANEL VIP</b> ${E.diamond} 
━━━━━━━━━━━━━━━━━━━━
${E.crown} Nama Bot  : ${namabot}
${E.star} Status    : ${getUserStatus(ctx.from.id)}
${E.fire} ID Kamu   : ${ctx.from.id}
${E.bolt} Username  : @${ctx.from.username || "-"}
${E.rocket} Versi Bot  : 2.0.0 VIP 
${E.sparkles} Uptime    : ${uptime}
${E.trophy} Developer : <a href="tg://user?id=1311431740">ZEXC OFFC</a>
━━━━━━━━━━━━━━━━━━━━
${E.artist} <b>Silakan pilih menu:</b>
</blockquote>`;
  try {
    if (ctx.update.callback_query && ctx.callbackQuery.message.photo) {
      try { await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id); } catch (e) {}
      await ctx.reply(info, { parse_mode: "HTML", reply_markup: getMainMenuKeyboard() });
    } else if (ctx.update.message) {
      await ctx.reply(info, { parse_mode: "HTML", reply_markup: getMainMenuKeyboard() });
    } else if (ctx.update.callback_query) {
      await ctx.editMessageText(info, { parse_mode: "HTML", reply_markup: getMainMenuKeyboard() });
    }
  } catch (error) {
    console.error(`${E.cross} Gagal kirim menu:`, error);
  }
}

const menus = { specialmenu: specialmenu, toolsmenu: toolsmenu, downloadermenu: downloadermenu, storemenu: storemenu, installermenu: installermenu, groupmenu: groupmenu };

bot.command("menu", sendMainMenu);
for (const key in menus) {
  bot.callbackQuery(key, async (ctx) => {
    try {
      await ctx.answerCallbackQuery();
      await ctx.editMessageText(menus[key], {
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "mainmenu")
      });
    } catch (error) {}
  });
}

const checkIsOwner = (userId) => {
    const owners = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
    return owners.includes(String(userId));
};

bot.callbackQuery("ownermenu", async (ctx) => {
  if (!checkIsOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: `${E.cross} Bukan Owner.`, show_alert: true });
  await ctx.answerCallbackQuery();
  const info = `<blockquote>${E.crown} <b>OWNER MENU</b>\n\n${E.diamond} Pilih kategori:</blockquote>`;
  try {
    await ctx.editMessageText(info, { parse_mode: "HTML", reply_markup: getOwnerMenuKeyboard() });
  } catch (error) {
    await ctx.reply(info, { parse_mode: "HTML", reply_markup: getOwnerMenuKeyboard() });
  }
});

// Submenu owner handlers (add, delete, set, list, panel, wa)
["ownermenu_add", "ownermenu_delete", "ownermenu_setserver", "ownermenu_panelmgmt", "ownermenu_wa", "ownermenu_list"].forEach(cb => {
  bot.callbackQuery(cb, async (ctx) => {
    if (!checkIsOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: `${E.cross} Bukan Owner.`, show_alert: true });
    await ctx.answerCallbackQuery();
    const textMap = {
      ownermenu_add: global.ownermenu_add_text,
      ownermenu_delete: global.ownermenu_delete_text,
      ownermenu_setserver: global.ownermenu_setserver_text,
      ownermenu_panelmgmt: global.ownermenu_panelmgmt_text,
      ownermenu_wa: global.ownermenu_wa_text,
      ownermenu_list: `<blockquote>${E.star} <b>LIST & STATUS</b>\n\n${E.diamond} Klik tombol di bawah.</blockquote>`,
    };
    const keyboardMap = {
      ownermenu_list: getOwnerMenu_ListKeyboard(),
    };
    await ctx.editMessageText(textMap[cb], {
      parse_mode: "HTML",
      reply_markup: keyboardMap[cb] || new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "ownermenu")
    });
  });
});

bot.callbackQuery("mainmenu", async (ctx) => { await sendMainMenu(ctx); });
bot.callbackQuery("partnerpanel", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`<blockquote>${E.crown} <b>Partner Panel</b>\n\n${E.diamond} Pilih server:</blockquote>`, {
    parse_mode: "HTML", reply_markup: getPartnerPanelKeyboard()
  });
});
bot.callbackQuery("resellerpanel", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`<blockquote>${E.fire} <b>Reseller Panel</b>\n\n${E.diamond} Pilih server:</blockquote>`, {
    parse_mode: "HTML", reply_markup: getResellerPanelKeyboard()
  });
});

["partnerpanel_v1","partnerpanel_v2","partnerpanel_v3","partnerpanel_v4"].forEach(cb => {
  bot.callbackQuery(cb, async (ctx) => {
    await ctx.answerCallbackQuery();
    const dataMap = { partnerpanel_v1: partnerpanel, partnerpanel_v2: partnerpanelV2, partnerpanel_v3: partnerpanelV3, partnerpanel_v4: partnerpanelV4 };
    await ctx.editMessageText(dataMap[cb], { parse_mode: "HTML", reply_markup: new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "partnerpanel") });
  });
});

["resellerpanel_v1","resellerpanel_v2","resellerpanel_v3","resellerpanel_v4"].forEach(cb => {
  bot.callbackQuery(cb, async (ctx) => {
    await ctx.answerCallbackQuery();
    const dataMap = { resellerpanel_v1: resellerpanel, resellerpanel_v2: resellerpanelV2, resellerpanel_v3: resellerpanelV3, resellerpanel_v4: resellerpanelV4 };
    await ctx.editMessageText(dataMap[cb], { parse_mode: "HTML", reply_markup: new InlineKeyboard().text(`${E.beginner} ᴋᴇᴍʙᴀʟɪ`, "resellerpanel") });
  });
});

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  
  if (data.startsWith("subdo")) {
    if (!checkIsOwner(userId)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Owner.`, show_alert: true });
    const parts = data.split(" ");
    const domainIndex = Number(parts[1]);
    const [host, ip] = parts[2].split("|").map(item => item.trim());
    const dom = Object.keys(global.subdomain || {});
    if (domainIndex < 0 || domainIndex >= dom.length) return ctx.answerCallbackQuery({ text: "Domain gak ada!", show_alert: true });
    const tldnya = dom[domainIndex];
    const loadingMsg = await ctx.reply(`<blockquote>${E.fire} Membuat subdomain ${host}.${tldnya}...</blockquote>`, { parse_mode: "HTML" });
    try {
        const subdomainConfig = global.subdomain[tldnya];
        const response = await axios.post(`https://api.cloudflare.com/client/v4/zones/${subdomainConfig.zone}/dns_records`, {
            type: "A", name: `${host}.${tldnya}`, content: ip, ttl: 1, proxied: false
        }, { headers: { "Authorization": `Bearer ${subdomainConfig.apitoken}`, "Content-Type": "application/json" } });
        const res = response.data;
        if (res.success) {
            await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `<blockquote>${E.check} Sukses!\n🌐 ${res.result.name}\n📌 ${res.result.content}</blockquote>`, { parse_mode: "HTML" });
        } else { throw new Error(res.errors[0]?.message || "Gagal"); }
    } catch (e) {
        await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `<blockquote>${E.cross} Gagal: ${e.message}</blockquote>`, { parse_mode: "HTML" });
    }
    return ctx.answerCallbackQuery({ text: "Selesai.", show_alert: false });
  }

  if ((xy.chat.type === 'group' || xy.chat.type === 'supergroup') && !isGroupAdmins) {
  const antilinkData = readJson('./src/database/antilink.json', []);
  const groupAntilink = antilinkData.find(item => item.id === xy.chat.id);
  if (groupAntilink?.active && body && (body.includes('http://') || body.includes('https://') || body.includes('t.me/') || body.includes('wa.me/'))) {
    try {
      await xy.api.deleteMessage(xy.chat.id, xy.message.message_id);
      const warning = await reply(`<blockquote>${E.cross} <b>ANTILINK AKTIF!</b>\n\n${E.dot} <b>${xy.from.first_name}</b>, jangan kirim link di grup ini!\n${E.fire} Kalo admin sih boleh...</blockquote>`, { parse_mode: 'HTML' });
      setTimeout(() => xy.api.deleteMessage(xy.chat.id, warning.message_id), 5000);
    } catch (e) {}
    return;
  }
}

  if (data.startsWith("cmd_")) {
      await ctx.answerCallbackQuery(`Proses: ${data.slice(4)}...`);
      const command = data.slice(4); 
      const xy = { message: ctx.callbackQuery.message, from: ctx.callbackQuery.from, chat: ctx.callbackQuery.message.chat, reply: (text, extra) => ctx.reply(text, extra), api: ctx.api, me: ctx.me };
      const owners = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
      const seller = JSON.parse(fs.readFileSync(sellerFile));
      const partner = JSON.parse(fs.readFileSync(partnerFile));
      const reseller = JSON.parse(fs.readFileSync(resellerFile));
      const isOwner = owners.includes(String(xy.from.id));
      const isSeller = seller.some(s => String(s.id) === String(xy.from.id));
      const isPartner = partner.some(p => String(p.id) === String(xy.from.id));
      const isReseller = reseller.some(r => String(r.id) === String(xy.from.id));
      const { CatBox, InputFile } = require('./src/lib/uploader');
      function generateReadableString(length) {
          const words = ["sky", "cloud", "wind", "fire", "storm", "light", "wave", "stone", "shadow", "earth"];
          return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
      }
      await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, xy.reply, owners, seller, sellerFile, '', '', InlineKeyboard, global.paket, false, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, userId, JSON.parse(fs.readFileSync('./src/database/list.json')), generateReadableString, false);
      return;
  }
  
  if (data.startsWith("listsrv") || data.startsWith("listadmin") || data.startsWith("listusr")) {
    await ctx.answerCallbackQuery();
    const parts = data.split(" ");
    const command = parts[0];
    const page = parts[1];
    const xy = { message: ctx.callbackQuery.message, from: ctx.callbackQuery.from, chat: ctx.callbackQuery.message.chat, reply: (text, extra) => ctx.editMessageText(text, extra), api: ctx.api, me: ctx.me };
    const owners = JSON.parse(fs.readFileSync(ownerFile, 'utf8'));
    const seller = JSON.parse(fs.readFileSync(sellerFile));
    const partner = JSON.parse(fs.readFileSync(partnerFile));
    const reseller = JSON.parse(fs.readFileSync(resellerFile));
    const isOwner = owners.includes(String(xy.from.id));
    const isSeller = seller.some(s => String(s.id) === String(xy.from.id));
    const isPartner = partner.some(p => String(p.id) === String(xy.from.id));
    const isReseller = reseller.some(r => String(r.id) === String(xy.from.id));
    const { CatBox, InputFile } = require('./src/lib/uploader');
    function generateReadableString(length) {
      const words = ["sky", "cloud", "wind", "fire", "storm", "light", "wave", "stone", "shadow", "earth"];
      return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
    }
    await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, xy.reply, owners, seller, sellerFile, '', page, InlineKeyboard, global.paket, false, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, userId, JSON.parse(fs.readFileSync('./src/database/list.json')), generateReadableString, false);
  }
  
  if (data.startsWith("cancel_warn_")) {
    try {
      const admins = await ctx.getChatAdministrators();
      if (!admins.some((admin) => admin.user.id === userId)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Admin.`, show_alert: true });
    } catch (e) { return ctx.answerCallbackQuery({ text: `${E.cross} Error.`, show_alert: true }); }
    const warnedUserId = data.split("_")[2];
    if (!warnDB[warnedUserId]?.length) return ctx.answerCallbackQuery({ text: "⚠️ Gak ada peringatan.", show_alert: true });
    warnDB[warnedUserId].pop();
    saveWarnDB(warnDB);
    const warnCount = warnDB[warnedUserId].length;
    await ctx.editMessageText(`<blockquote>⚠️ Peringatan diperbarui!\n📌 Total: ${warnCount}/3</blockquote>`, {
      parse_mode: 'HTML',
      reply_markup: warnCount > 0 ? { inline_keyboard: [[{ text: `${E.cross} Batalkan`, callback_data: `cancel_warn_${warnedUserId}` }]] } : undefined
    });
    await ctx.answerCallbackQuery({ text: `${E.check} Dibatalkan!`, show_alert: true });
  }
});

const spinner = ora({ text: 'Menghubungkan bot...', spinner: 'bouncingBar' }).start();

function animateWaitingText() {
  let dots = '';
  return setInterval(() => {
    dots = dots.length < 3 ? dots + '.' : '';
    process.stdout.write(`\r⌛ Menunggu pesan${dots} `);
  }, 500);
}

bot.api.getMe().then((me) => {
  console.clear();
  console.log("==================================");
  spinner.succeed(`${E.check} Bot terhubung!`);
  console.log(`🤖 Nama  : ${me.first_name}`);
  console.log(`📛 User  : @${me.username}`);
  console.log(`${E.fire} Bot aktif!`);
  console.log("==================================");
  animateWaitingText();
  (async () => {
    await connectwa.restoreWhatsAppSessions();
    console.log(`${E.check} Sesi WA direstore.`);
  })();
  const checkInterval = 5 * 60 * 1000;
  setInterval(() => { console.log(`\n[AUTO-CHECK] CPU...`); checkAndStopAbnormalCpu(bot); }, checkInterval);
  bot.start();
}).catch((err) => {
  console.error(`${E.cross} Gagal:`, err.message);
  process.exit(1);
});

function loadAllowedGroups() {
    try { if (fs.existsSync(allowedGroupsFile)) return JSON.parse(fs.readFileSync(allowedGroupsFile, 'utf8')).map(g => String(g.id)); return []; } 
    catch (e) { return []; }
}

bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.chat;
    const oldStatus = ctx.myChatMember.old_chat_member.status;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    if ((newStatus === 'member' || newStatus === 'administrator') && (oldStatus === 'left' || oldStatus === 'kicked')) {
        const isAllowed = loadAllowedGroups().includes(String(chat.id));
        if (!isAllowed) {
            try {
                await ctx.api.sendMessage(chat.id, `<blockquote>${E.cross} Bot tidak terdaftar. Keluar otomatis.\nGunakan /addgrub [ID] di PC.</blockquote>`, { parse_mode: 'HTML' });
                await ctx.api.leaveChat(chat.id);
            } catch(e) {}
        } else {
             const welcomeMessage = `<blockquote>${E.check} <b>TERIMA KASIH!</b>\n\n✅ ${chat.title} terdaftar.\n🤖 /menu untuk mulai.</blockquote>`;
             await ctx.api.sendMessage(chat.id, welcomeMessage, { parse_mode: 'HTML' });
        }
    }
});

bot.on("message:new_chat_members", async (ctx) => {
  let listData = [];
  try { listData = JSON.parse(fs.readFileSync('./src/database/weleave.json', 'utf8')); } catch (e) {}
  const found = listData.find(item => item.id === ctx.chat.id);
  if (!found?.welcome) return;
  for (const user of ctx.message.new_chat_members) {
    await ctx.reply(`<blockquote>${E.sparkles} Selamat datang, <b>${user.first_name || "Pengguna"}</b>!</blockquote>`, { parse_mode: "HTML" });
  }
});

bot.on("message:left_chat_member", async (ctx) => {
  let listData = [];
  try { listData = JSON.parse(fs.readFileSync('./src/database/weleave.json', 'utf8')); } catch (e) {}
  const found = listData.find(item => item.id === ctx.chat.id);
  if (!found?.leave) return;
  await ctx.reply(`<blockquote>${E.fire} Selamat tinggal, <b>${ctx.message.left_chat_member?.first_name || "Pengguna"}</b>!</blockquote>`, { parse_mode: "HTML" });
});

bot.on("message", async (xy, next) => {
  const msg = xy.message;
  process.stdout.clearLine(0); process.stdout.cursorTo(0);
  const user = xy.from;
  const nama = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const username = user.username ? `@${user.username}` : '(tanpa)';
  const waktu = new Date().toLocaleTimeString();
  console.log(`⏰ ${waktu}\n🆔 ${user.id}\n📩 ${username} (${nama})\n📝 ${msg.text}\n=========================`);

  const seller = JSON.parse(fs.readFileSync('./src/database/seller.json'));
  const partner = JSON.parse(fs.readFileSync('./src/database/partner.json'));
  const reseller = JSON.parse(fs.readFileSync('./src/database/reseller.json')); 
  const sellerPath = './src/database/seller.json';
  const owners = JSON.parse(fs.readFileSync('./owner.json', 'utf8'));
  const db_respon_list = JSON.parse(fs.readFileSync('./src/database/list.json'));
  const isOwner = owners.includes(String(xy.from.id));
  const now = Date.now();
  const validSellers = seller.filter(item => item.expiresAt > now);
  const { CatBox, fileIO, pomfCDN } = require('./src/lib/uploader');
  if (validSellers.length !== seller.length) fs.writeFileSync(sellerPath, JSON.stringify(validSellers, null, 2));
  const isSeller = validSellers.some(item => item.id === String(xy.from.id));
  const isPartner = Array.isArray(partner) && partner.some(item => item.id === String(item.id));
  const isReseller = Array.isArray(reseller) && reseller.some(item => item.id === String(item.id));
  const isGroup = ['group', 'supergroup'].includes(xy.chat.type);
  let groupAdmins = [], isGroupAdmins = false, isBotGroupAdmins = false;
  if (isGroup) {
    try {
      const participants = await xy.getChatAdministrators();
      groupAdmins = participants.map(admin => admin.user.id);
      isGroupAdmins = groupAdmins.includes(xy.from.id);
      isBotGroupAdmins = groupAdmins.includes(xy.me.id);
    } catch(e) {}
  }
  const reply = (teks, extra) => xy.reply(teks, extra);
  function generateReadableString(length) {
    const words = ["sky", "cloud", "wind", "fire", "storm", "light", "wave", "stone", "shadow", "earth"];
    return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
  }
  const paket = global.paket;
  let body = msg.text || msg.caption || '';
  const prefix = global.prefix || "/"; 
  const command = body.startsWith(prefix) ? body.slice(prefix.length).trim().split(" ")[0].split("@")[0].toLowerCase() : "";
  const args = body.trim().split(/ +/).slice(1);
  const q = text = args.join(" ");
  const sender = xy.message.chat.id;

  if (body && xy.chat && xy.chat.type !== 'private') {
    let userInput = body.trim();
    let matchedProduct = db_respon_list.find(item => item.id === xy.chat.id && item.key.toLowerCase() === userInput.toLowerCase());
    if (matchedProduct) {
      if (matchedProduct.isImage && matchedProduct.image_url) {
        const response = await axios.get(matchedProduct.image_url, { responseType: "arraybuffer" });
        const imagePath = `./temp.jpg`;
        fs.writeFileSync(imagePath, response.data);
        await xy.api.sendPhoto(xy.chat.id, new InputFile(imagePath), { caption: `<blockquote><b>${matchedProduct.key}</b>\n\n${matchedProduct.response}</blockquote>`, parse_mode: "HTML" });
        fs.unlinkSync(imagePath);
      } else { reply(`<blockquote><b>${matchedProduct.key}</b>\n\n${matchedProduct.response}</blockquote>`, { parse_mode: "HTML" }); }
    }
  }

  if (!global.groupMembers) global.groupMembers = {};
  if (xy.message && xy.message.from && xy.message.chat && xy.message.chat.type !== 'private') {
    const chatId = xy.message.chat.id;
    const user = xy.message.from;
    try {
      if (!global.groupMembers[chatId]) global.groupMembers[chatId] = [];
      const idx = global.groupMembers[chatId].findIndex(m => m.id === user.id);
      const newData = { id: user.id, first_name: user.first_name || '', last_name: user.last_name || '', username: user.username || '', is_bot: user.is_bot || false, last_seen: new Date().toISOString() };
      if (idx === -1) global.groupMembers[chatId].push(newData);
      else global.groupMembers[chatId][idx].last_seen = new Date().toISOString();
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      global.groupMembers[chatId] = global.groupMembers[chatId].filter(m => new Date(m.last_seen) > thirtyDaysAgo);
    } catch (error) {}
  }
  await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, reply, owners, seller, sellerPath, q, text, InlineKeyboard, paket, isGroupAdmins, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, sender, db_respon_list, generateReadableString, isBotGroupAdmins);
});