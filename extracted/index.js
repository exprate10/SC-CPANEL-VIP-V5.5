'use strict';

require('./config/settings');
require('./src/lib/menu');

const fs = require('fs');
const path = require('path');
const { Bot, InlineKeyboard, InputFile } = require('grammy');
const ora = require('ora');
const axios = require('axios');
const readlineSync = require('readline-sync');
const os = require('os');
const connectwa = require('./src/lib/connectwa');
const { setBotInstance, restoreWhatsAppSessions } = require('./src/lib/connectwa');
const { handleMessage, checkAndStopAbnormalCpu } = require('./config/xy');
const { createPayment, checkPaymentStatus, getOrderByOrderId, getOrdersByUserId, getOrderStats, startPaymentChecker, expireOldOrders } = require('./src/lib/payment');

const E = global.E;

const tokenPath = path.join(__dirname, './src/database/token.json');
const warnFile = path.join(__dirname, './src/database/warns.json');
const partnerFile = path.join(__dirname, './src/database/partner.json');
const resellerFile = path.join(__dirname, './src/database/reseller.json');
const sellerFile = path.join(__dirname, './src/database/seller.json');
const ownerFile = path.join(__dirname, './owner.json');
const userFile = path.join(__dirname, './src/database/user.json');
const premiumFile = path.join(__dirname, './src/database/premium.json');
const allowedGroupsFile = path.join(__dirname, './src/database/allowed_groups.json');


function ensureDatabaseFiles() {
    const files = [
        { path: partnerFile, def: '[]' },
        { path: resellerFile, def: '[]' },
        { path: sellerFile, def: '[]' },
        { path: ownerFile, def: '[]' },
        { path: userFile, def: '[]' },
        { path: premiumFile, def: '[]' },
        { path: allowedGroupsFile, def: '[]' },
        { path: warnFile, def: '{}' },
        { path: './src/database/list.json', def: '[]' },
        { path: './src/database/weleave.json', def: '[]' },
        { path: './src/database/antilink.json', def: '[]' },
        { path: './src/database/orders.json', def: '[]' },
        { path: './src/database/transactions.json', def: '[]' },
    ];
    for (const f of files) {
        if (!fs.existsSync(f.path)) {
            try {
                fs.mkdirSync(path.dirname(f.path), { recursive: true });
                fs.writeFileSync(f.path, f.def, 'utf8');
            } catch {}
        }
    }
}

ensureDatabaseFiles();


function readJson(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUserStatus(userId) {
    const uid = String(userId);
    const owners = readJson(ownerFile);
    const sellers = readJson(sellerFile);
    const partners = readJson(partnerFile);
    const resellers = readJson(resellerFile);
    const premiums = readJson(premiumFile);
    if (owners.includes(uid)) return 'owner';
    if (premiums.includes(uid)) return 'premium';
    if (sellers.some(s => String(s.id) === uid)) return 'seller';
    if (partners.some(p => String(p.id) === uid)) return 'partner';
    if (resellers.some(r => String(r.id) === uid)) return 'reseller';
    return 'user';
}

function checkIsOwner(userId) {
    return readJson(ownerFile).includes(String(userId));
}

global.startTime = Date.now();

function formatDuration(ms) {
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / (1000 * 60)) % 60;
    const h = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const d = Math.floor(ms / (1000 * 60 * 60 * 24));
    return `${d}h ${h}j ${m}m ${s}s`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getVpsInfo() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const cpus = os.cpus();
    return {
        runtime: formatDuration(os.uptime() * 1000),
        memory: `${formatBytes(used)} / ${formatBytes(total)}`,
        cpu: cpus[0].model.trim(),
        cores: cpus.length,
    };
}

function readWarnDB() {
    try {
        return readJson(warnFile, {});
    } catch {
        return {};
    }
}

function saveWarnDB(data) {
    writeJson(warnFile, data);
}

let warnDB = readWarnDB();
let pendingWarns = new Map();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function loadUsers() {
    return readJson(userFile);
}

function saveUsers(users) {
    writeJson(userFile, users);
}

function loadAllowedGroups() {
    try {
        return readJson(allowedGroupsFile).map(g => String(g.id));
    } catch {
        return [];
    }
}


function askToken() {
    console.log(`${E.lock} Masukkan Token Bot Telegram:`);
    return readlineSync.question('> ').trim();
}

function getToken() {
    if (fs.existsSync(tokenPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));
            if (data.token && data.token.trim() !== '') return data.token.trim();
        } catch {}
    }
    const token = askToken();
    if (!token) {
        console.log(`${E.cross} Token kosong!`);
        process.exit(1);
    }
    fs.mkdirSync(path.dirname(tokenPath), { recursive: true });
    writeJson(tokenPath, { token });
    console.log(`${E.check} Token disimpan.`);
    return token;
}

const botToken = getToken();
const bot = new Bot(botToken);

setBotInstance(bot);




function getMainMenuKeyboard() {
    return new InlineKeyboard()
        .text(`${E.sparkles} Special`, 'specialmenu').text(`${E.fire} Reseller`, 'resellerpanel').row()
        .text(`${E.crown} Partner`, 'partnerpanel').text(`${E.store} Store`, 'storemenu').row()
        .text(`${E.tools} Tools`, 'toolsmenu').text(`${E.box} Downloader`, 'downloadermenu').row()
        .text(`${E.rocket} Installer`, 'installermenu').text(`${E.group} Group`, 'groupmenu').row()
        .text(`${E.trophy} Owner`, 'ownermenu').text(`${E.money} Buy Script`, 'buyscript').row();
}

function getOwnerMenuKeyboard() {
    return new InlineKeyboard()
        .text(`${E.check} Add`, 'ownermenu_add').text(`${E.cross} Delete`, 'ownermenu_delete').row()
        .text(`${E.tools} Set Server`, 'ownermenu_setserver').text(`${E.star} List`, 'ownermenu_list').row()
        .text(`${E.cpu} Panel Mgmt`, 'ownermenu_panelmgmt').text(`${E.bell} WA`, 'ownermenu_wa').row()
        .text(`${E.beginner} Kembali`, 'mainmenu');
}

function getOwnerListKeyboard() {
    return new InlineKeyboard()
        .text(`${E.crown} Owner`, 'cmd_listowner').text(`${E.star} Seller`, 'cmd_listseller').row()
        .text(`${E.diamond} Partner`, 'cmd_listpt').text(`${E.fire} Reseller`, 'cmd_listrt').row()
        .text(`${E.bolt} Total V1`, 'cmd_totalserver').text(`${E.rocket} Total V2`, 'cmd_totalserverv2').row()
        .text(`${E.sparkles} Cek ID`, 'cmd_cekid').text(`${E.target} Cek Server`, 'cmd_cekserver').row()
        .text(`${E.beginner} Kembali`, 'ownermenu');
}

function getPartnerPanelKeyboard() {
    const kb = new InlineKeyboard();
    kb.text(`${E.diamond} V1`, 'partnerpanel_v1').text(`${E.fire} V2`, 'partnerpanel_v2').text(`${E.bolt} V3`, 'partnerpanel_v3').row();
    kb.text(`${E.star} V4`, 'partnerpanel_v4').text(`${E.crown} V5`, 'partnerpanel_v5').text(`${E.rocket} V6`, 'partnerpanel_v6').row();
    kb.text(`${E.sparkles} V7`, 'partnerpanel_v7').text(`${E.target} V8`, 'partnerpanel_v8').text(`${E.trophy} V9`, 'partnerpanel_v9').row();
    kb.text(`${E.check} V10`, 'partnerpanel_v10').row();
    kb.text(`${E.beginner} Kembali`, 'mainmenu');
    return kb;
}

function getResellerPanelKeyboard() {
    const kb = new InlineKeyboard();
    kb.text(`${E.diamond} V1`, 'resellerpanel_v1').text(`${E.fire} V2`, 'resellerpanel_v2').text(`${E.bolt} V3`, 'resellerpanel_v3').row();
    kb.text(`${E.star} V4`, 'resellerpanel_v4').text(`${E.crown} V5`, 'resellerpanel_v5').text(`${E.rocket} V6`, 'resellerpanel_v6').row();
    kb.text(`${E.sparkles} V7`, 'resellerpanel_v7').text(`${E.target} V8`, 'resellerpanel_v8').text(`${E.trophy} V9`, 'resellerpanel_v9').row();
    kb.text(`${E.check} V10`, 'resellerpanel_v10').row();
    kb.text(`${E.beginner} Kembali`, 'mainmenu');
    return kb;
}

function getBuyScriptKeyboard() {
    return new InlineKeyboard()
        .text(`${E.box} ENC — Rp 5.000`, 'buy_enc').row()
        .text(`${E.diamond} NO ENC — Rp 8.000`, 'buy_noenc').row()
        .text(`${E.crown} FULL UP — Rp 25.000`, 'buy_fullup').row()
        .text(`${E.beginner} Kembali`, 'mainmenu');
}


async function sendMainMenu(ctx) {
    const uptime = formatDuration(Date.now() - global.startTime);
    const vps = getVpsInfo();
    const status = getUserStatus(ctx.from.id);

    const info = `<blockquote>${E.diamond} <b>CPANEL VIP V5.5</b>
━━━━━━━━━━━━━━━━━━━━
${E.crown} Bot: ${namabot}
${E.star} Status: ${status}
${E.fire} ID: <code>${ctx.from.id}</code>
${E.bolt} User: @${ctx.from.username || '-'}
${E.rocket} Versi: ${global.botVersion}
${E.sparkles} Uptime: ${uptime}
${E.cpu} VPS: ${vps.cores} Cores / ${vps.memory}
━━━━━━━━━━━━━━━━━━━━
${E.target} Pilih menu di bawah:</blockquote>`;

    try {
        if (ctx.callbackQuery) {
            if (ctx.callbackQuery.message?.photo) {
                await ctx.api.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id).catch(() => {});
                await ctx.reply(info, { parse_mode: 'HTML', reply_markup: getMainMenuKeyboard() });
            } else {
                await ctx.editMessageText(info, { parse_mode: 'HTML', reply_markup: getMainMenuKeyboard() });
            }
        } else {
            await ctx.reply(info, { parse_mode: 'HTML', reply_markup: getMainMenuKeyboard() });
        }
    } catch {
        await ctx.reply(info, { parse_mode: 'HTML', reply_markup: getMainMenuKeyboard() }).catch(() => {});
    }
}


bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const users = new Set(loadUsers());
    users.add(userId);
    saveUsers([...users]);

    const uptime = formatDuration(Date.now() - global.startTime);
    const vps = getVpsInfo();

    const caption = `<blockquote>${E.sparkles} <b>CPANEL VIP V5.5</b> ${E.sparkles}
━━━━━━━━━━━━━━━━━━━━
${E.crown} <b>Bot:</b> ${namabot}
${E.fire} <b>Runtime:</b> ${uptime}
${E.star} <b>User:</b> @${ctx.from.username || '-'}
${E.bolt} <b>VPS:</b> ${vps.runtime}
${E.diamond} <b>Spek:</b> ${vps.cores} Cores / ${formatBytes(os.totalmem())}
━━━━━━━━━━━━━━━━━━━━
${E.target} Klik menu buat mulai.</blockquote>`;

    const keyboard = new InlineKeyboard()
        .text(`${E.rocket} Channel`, 'testi').text(`${E.crown} Developer`, 'owner_info').row()
        .text(`${E.diamond} Buka Menu`, 'mainmenu').row()
        .text(`${E.money} Buy Script`, 'buyscript').row();

    try {
        await ctx.api.sendPhoto(ctx.chat.id, global.startMenuPhoto, {
            caption,
            parse_mode: 'HTML',
            reply_markup: keyboard,
        });
    } catch {
        await ctx.reply(caption, { parse_mode: 'HTML', reply_markup: keyboard });
    }
});

bot.command('menu', sendMainMenu);




bot.callbackQuery('mainmenu', async (ctx) => {
    await ctx.answerCallbackQuery();
    await sendMainMenu(ctx);
});

bot.callbackQuery('owner_info', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.crown} <b>Developer:</b>\n<a href="https://t.me/ZexcOfficial">@ZexcOfficial</a>\n\n${E.dot} Mau tanya-tanya atau order? Langsung chat aja.</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, 'mainmenu'),
    }).catch(() => {});
});

bot.callbackQuery('testi', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.rocket} <b>Channel Resmi:</b>\n@ZexcOfficiall\n\n${E.dot} Wajib join buat dapet info update terbaru.</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().url(`${E.link} Join Channel`, 'https://t.me/ZexcOfficiall').row().text(`${E.beginner} Kembali`, 'mainmenu'),
    }).catch(() => {});
});


const menuCallbacks = {
    specialmenu: global.specialmenu,
    toolsmenu: global.toolsmenu,
    downloadermenu: global.downloadermenu,
    storemenu: global.storemenu,
    installermenu: global.installermenu,
    groupmenu: global.groupmenu,
};

for (const [key, text] of Object.entries(menuCallbacks)) {
    bot.callbackQuery(key, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(text, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, 'mainmenu'),
        }).catch(() => {});
    });
}


bot.callbackQuery('ownermenu', async (ctx) => {
    if (!checkIsOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Owner.`, show_alert: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.crown} <b>OWNER MENU</b>\n━━━━━━━━━━━━━━━━━━━━\n${E.target} Pilih kategori di bawah:</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: getOwnerMenuKeyboard(),
    }).catch(() => {});
});

const ownerSubMenus = {
    ownermenu_add: { text: global.ownermenu_add_text, back: 'ownermenu' },
    ownermenu_delete: { text: global.ownermenu_delete_text, back: 'ownermenu' },
    ownermenu_setserver: { text: global.ownermenu_setserver_text, back: 'ownermenu' },
    ownermenu_panelmgmt: { text: global.ownermenu_panelmgmt_text, back: 'ownermenu' },
    ownermenu_wa: { text: global.ownermenu_wa_text, back: 'ownermenu' },
};

for (const [key, config] of Object.entries(ownerSubMenus)) {
    bot.callbackQuery(key, async (ctx) => {
        if (!checkIsOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Owner.`, show_alert: true });
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(config.text, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, config.back),
        }).catch(() => {});
    });
}

bot.callbackQuery('ownermenu_list', async (ctx) => {
    if (!checkIsOwner(ctx.from.id)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Owner.`, show_alert: true });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.star} <b>LIST & STATUS</b>\n━━━━━━━━━━━━━━━━━━━━\n${E.target} Klik tombol di bawah:</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: getOwnerListKeyboard(),
    }).catch(() => {});
});


bot.callbackQuery('partnerpanel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.crown} <b>Partner Panel</b>\n━━━━━━━━━━━━━━━━━━━━\n${E.target} Pilih server:</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: getPartnerPanelKeyboard(),
    }).catch(() => {});
});

bot.callbackQuery('resellerpanel', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`<blockquote>${E.fire} <b>Reseller Panel</b>\n━━━━━━━━━━━━━━━━━━━━\n${E.target} Pilih server:</blockquote>`, {
        parse_mode: 'HTML',
        reply_markup: getResellerPanelKeyboard(),
    }).catch(() => {});
});

for (let i = 1; i <= 10; i++) {
    const pKey = i === 1 ? 'partnerpanel' : `partnerpanelV${i}`;
    const rKey = i === 1 ? 'resellerpanel' : `resellerpanelV${i}`;

    bot.callbackQuery(`partnerpanel_v${i}`, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(global[pKey], {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, 'partnerpanel'),
        }).catch(() => {});
    });

    bot.callbackQuery(`resellerpanel_v${i}`, async (ctx) => {
        await ctx.answerCallbackQuery();
        await ctx.editMessageText(global[rKey], {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, 'resellerpanel'),
        }).catch(() => {});
    });
}




bot.callbackQuery('buyscript', async (ctx) => {
    await ctx.answerCallbackQuery();
    const products = global.products;
    let list = '';
    for (const [key, prod] of Object.entries(products)) {
        list += `${E.dot} <b>${prod.name}</b> — Rp ${prod.price.toLocaleString('id-ID')}\n`;
        list += `   ${prod.features.slice(0, 3).join(', ')}\n\n`;
    }

    const caption = `<blockquote>${E.money} <b>BUY SCRIPT CPANEL VIP V5.5</b>
━━━━━━━━━━━━━━━━━━━━

${list}${E.card} <b>Pembayaran otomatis via QRIS</b>
${E.check} Produk langsung dikirim setelah bayar

${E.target} Pilih paket:</blockquote>`;

    await ctx.editMessageText(caption, {
        parse_mode: 'HTML',
        reply_markup: getBuyScriptKeyboard(),
    }).catch(() => {});
});

for (const [productKey, product] of Object.entries(global.products)) {
    bot.callbackQuery(`buy_${productKey}`, async (ctx) => {
        await ctx.answerCallbackQuery();
        const userId = ctx.from.id;
        const username = ctx.from.username || ctx.from.first_name || '';

        await ctx.editMessageText(`<blockquote>${E.clock} <b>Membuat invoice...</b>\n\nProduk: ${product.name}\nHarga: Rp ${product.price.toLocaleString('id-ID')}\n\nTunggu sebentar...</blockquote>`, {
            parse_mode: 'HTML',
        }).catch(() => {});

        const result = await createPayment(productKey, userId, username);

        if (result.success) {
            const order = result.order;
            const expiryTime = new Date(order.expiresAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            let paymentText = `<blockquote>${E.money} <b>INVOICE PEMBAYARAN</b>
━━━━━━━━━━━━━━━━━━━━

${E.pin} <b>Order ID:</b> <code>${order.orderId}</code>
${E.box} <b>Produk:</b> ${order.productName}
${E.card} <b>Nominal:</b> Rp ${order.amount.toLocaleString('id-ID')}
${E.clock} <b>Expired:</b> ${expiryTime}

${E.target} <b>Cara Bayar:</b>
1. Scan QRIS di bawah atau klik link
2. Bayar sesuai nominal
3. Tunggu verifikasi otomatis (15 detik)
4. Produk dikirim otomatis ke chat ini`;

            if (result.qrisUrl) {
                paymentText += `\n\n${E.link} <b>QRIS:</b> <a href="${result.qrisUrl}">Klik disini</a>`;
            }
            if (result.paymentUrl) {
                paymentText += `\n${E.globe} <b>Payment:</b> <a href="${result.paymentUrl}">Bayar disini</a>`;
            }

            paymentText += `\n\n${E.bell} Status akan di-update otomatis.</blockquote>`;

            const kb = new InlineKeyboard();
            if (result.paymentUrl) {
                kb.url(`${E.card} Bayar Sekarang`, result.paymentUrl).row();
            }
            kb.text(`${E.target} Cek Status`, `cekorder_${order.orderId}`).row();
            kb.text(`${E.beginner} Kembali`, 'buyscript');

            await ctx.editMessageText(paymentText, {
                parse_mode: 'HTML',
                reply_markup: kb,
                link_preview_options: { is_disabled: true },
            }).catch(() => {});
        } else {
            const manualPayment = global.payment;
            let manualText = `<blockquote>${E.cross} <b>Auto payment gagal</b>\n${E.dot} ${result.error}\n\n${E.money} <b>Bayar manual:</b>\n`;
            for (const [, info] of Object.entries(manualPayment)) {
                manualText += `${E.dot} ${info.name}: <code>${info.no}</code> (${info.an})\n`;
            }
            manualText += `\n${E.pin} Nominal: <b>Rp ${product.price.toLocaleString('id-ID')}</b>\n${E.bell} Setelah TF, kirim bukti ke @ZexcOfficial</blockquote>`;

            await ctx.editMessageText(manualText, {
                parse_mode: 'HTML',
                reply_markup: new InlineKeyboard()
                    .url(`${E.card} Chat Owner`, 'https://t.me/ZexcOfficial').row()
                    .text(`${E.beginner} Kembali`, 'buyscript'),
            }).catch(() => {});
        }
    });
}

bot.callbackQuery(/^cekorder_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const orderId = ctx.match[1];
    const order = getOrderByOrderId(orderId);

    if (!order) {
        return ctx.editMessageText(`<blockquote>${E.cross} Order <code>${orderId}</code> nggak ditemukan.</blockquote>`, {
            parse_mode: 'HTML',
            reply_markup: new InlineKeyboard().text(`${E.beginner} Kembali`, 'buyscript'),
        }).catch(() => {});
    }

    const statusEmoji = {
        pending: E.clock,
        paid: E.check,
        delivered: E.box,
        expired: E.cross,
    };

    const statusLabel = {
        pending: 'Menunggu Pembayaran',
        paid: 'Sudah Dibayar',
        delivered: 'Produk Terkirim',
        expired: 'Expired',
    };

    const emoji = statusEmoji[order.status] || E.target;
    const label = statusLabel[order.status] || order.status;

    let text = `<blockquote>${emoji} <b>STATUS ORDER</b>
━━━━━━━━━━━━━━━━━━━━

${E.pin} <b>Order:</b> <code>${order.orderId}</code>
${E.box} <b>Produk:</b> ${order.productName}
${E.card} <b>Nominal:</b> Rp ${order.amount.toLocaleString('id-ID')}
${E.target} <b>Status:</b> ${label}`;

    if (order.paidAt) {
        text += `\n${E.check} <b>Dibayar:</b> ${new Date(order.paidAt).toLocaleString('id-ID')}`;
    }
    if (order.deliveredAt) {
        text += `\n${E.box} <b>Dikirim:</b> ${new Date(order.deliveredAt).toLocaleString('id-ID')}`;
    }
    text += `</blockquote>`;

    const kb = new InlineKeyboard();
    if (order.status === 'pending') {
        kb.text(`${E.target} Refresh Status`, `cekorder_${orderId}`).row();
    }
    kb.text(`${E.beginner} Kembali`, 'buyscript');

    await ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: kb }).catch(() => {});
});

bot.command('cekorder', async (ctx) => {
    const args = (ctx.message.text || '').split(' ').slice(1);
    if (!args[0]) return ctx.reply(`<blockquote>${E.cross} Format: /cekorder [ORDER_ID]</blockquote>`, { parse_mode: 'HTML' });

    const order = getOrderByOrderId(args[0]);
    if (!order) return ctx.reply(`<blockquote>${E.cross} Order nggak ditemukan.</blockquote>`, { parse_mode: 'HTML' });

    const label = { pending: 'Menunggu', paid: 'Dibayar', delivered: 'Terkirim', expired: 'Expired' };
    await ctx.reply(`<blockquote>${E.pin} <b>${order.orderId}</b>\n${E.box} ${order.productName}\n${E.card} Rp ${order.amount.toLocaleString('id-ID')}\n${E.target} Status: ${label[order.status] || order.status}</blockquote>`, { parse_mode: 'HTML' });
});

bot.command('myorders', async (ctx) => {
    const orders = getOrdersByUserId(ctx.from.id);
    if (orders.length === 0) return ctx.reply(`<blockquote>${E.cross} Belum ada order.</blockquote>`, { parse_mode: 'HTML' });

    const recent = orders.slice(-10).reverse();
    let text = `<blockquote>${E.money} <b>Order Kamu (${orders.length} total)</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const o of recent) {
        const status = { pending: '⏳', paid: '✅', delivered: '📦', expired: '❌' };
        text += `${status[o.status] || '❓'} <code>${o.orderId}</code> — ${o.productName}\n`;
    }
    text += `</blockquote>`;
    await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('orderstats', async (ctx) => {
    if (!checkIsOwner(ctx.from.id)) return ctx.reply(global.mess.owner, { parse_mode: 'HTML' });
    const stats = getOrderStats();
    await ctx.reply(`<blockquote>${E.trophy} <b>Order Statistics</b>
━━━━━━━━━━━━━━━━━━━━
${E.pin} Total: ${stats.total}
${E.check} Paid: ${stats.paid}
${E.clock} Pending: ${stats.pending}
${E.cross} Expired: ${stats.expired}
${E.money} Revenue: Rp ${stats.revenue.toLocaleString('id-ID')}</blockquote>`, { parse_mode: 'HTML' });
});




const { addRole, removeRole, getUserRoles, getHighestRole, canUseCommands, canCreatePanel, canCreateAdminPanel, canAccessKeys, shouldAutoPromote, isLimitedRole, isNoCommandRole, getRolesByType, getRoleStats, ROLE_LABELS, ROLE_HIERARCHY } = require('./src/lib/roles');

const ROLE_COMMANDS = {
    addaddress: 'address',
    addadmin: 'admin',
    addpt: 'pt',
    addown: 'own',
    addtk: 'tk',
    addceo: 'ceo',
    adddev: 'dev',
    addvmanager: 'vmanager',
    addpemilik: 'pemilik',
};

for (const [cmd, role] of Object.entries(ROLE_COMMANDS)) {
    bot.command(cmd, async (ctx) => {
        if (!checkIsOwner(ctx.from.id) && !canUseCommands(ctx.from.id)) {
            return ctx.reply(`<blockquote>${E.cross} Lo nggak punya akses buat command ini.</blockquote>`, { parse_mode: 'HTML' });
        }

        const args = (ctx.message.text || '').split(' ').slice(1);
        let targetId = args[0];

        if (ctx.message.reply_to_message) {
            targetId = String(ctx.message.reply_to_message.from.id);
        }

        if (!targetId) {
            return ctx.reply(`<blockquote>${E.cross} Format: /${cmd} [ID] atau reply pesan user.</blockquote>`, { parse_mode: 'HTML' });
        }

        targetId = String(targetId).trim();
        const result = addRole(targetId, role, ctx.from.id);

        if (!result.success) {
            return ctx.reply(`<blockquote>${E.cross} Gagal: ${result.error}</blockquote>`, { parse_mode: 'HTML' });
        }

        let response = `<blockquote>${E.check} <b>Role Ditambahkan!</b>
━━━━━━━━━━━━━━━━━━━━
${E.pin} <b>User:</b> <code>${targetId}</code>
${E.crown} <b>Role:</b> ${result.label}
${E.target} <b>Oleh:</b> <code>${ctx.from.id}</code>`;

        if (shouldAutoPromote(targetId)) {
            response += `\n${E.check} <b>Auto-promote:</b> Aktif di grup`;
            if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
                try {
                    await ctx.api.promoteChatMember(ctx.chat.id, Number(targetId), {
                        can_manage_chat: true,
                        can_delete_messages: true,
                        can_restrict_members: true,
                        can_promote_members: false,
                        can_change_info: true,
                        can_invite_users: true,
                        can_pin_messages: true,
                        can_manage_video_chats: true,
                    });
                    response += `\n${E.rocket} <b>Promoted</b> di grup ini!`;
                } catch (err) {
                    response += `\n${E.cross} Gagal promote: ${err.message}`;
                }
            }
        } else {
            response += `\n${E.cross} <b>Auto-promote:</b> Tidak`;
        }

        response += `</blockquote>`;
        await ctx.reply(response, { parse_mode: 'HTML' });
    });
}

const DEL_ROLE_COMMANDS = {
    deladdress: 'address',
    deladmin_role: 'admin',
    delpt_role: 'pt',
    delown: 'own',
    deltk: 'tk',
    delceo: 'ceo',
    deldev: 'dev',
    delvmanager: 'vmanager',
    delpemilik: 'pemilik',
};

for (const [cmd, role] of Object.entries(DEL_ROLE_COMMANDS)) {
    bot.command(cmd, async (ctx) => {
        if (!checkIsOwner(ctx.from.id) && !canUseCommands(ctx.from.id)) {
            return ctx.reply(`<blockquote>${E.cross} Akses ditolak.</blockquote>`, { parse_mode: 'HTML' });
        }

        const args = (ctx.message.text || '').split(' ').slice(1);
        let targetId = args[0];
        if (ctx.message.reply_to_message) targetId = String(ctx.message.reply_to_message.from.id);
        if (!targetId) return ctx.reply(`<blockquote>${E.cross} Format: /${cmd} [ID] atau reply.</blockquote>`, { parse_mode: 'HTML' });

        const result = removeRole(targetId.trim(), role);
        if (!result.success) return ctx.reply(`<blockquote>${E.cross} ${result.error}</blockquote>`, { parse_mode: 'HTML' });

        await ctx.reply(`<blockquote>${E.check} Role <b>${ROLE_LABELS[role]}</b> dihapus dari <code>${targetId}</code>.</blockquote>`, { parse_mode: 'HTML' });
    });
}

bot.command('listroles', async (ctx) => {
    if (!checkIsOwner(ctx.from.id) && !canUseCommands(ctx.from.id)) {
        return ctx.reply(`<blockquote>${E.cross} Akses ditolak.</blockquote>`, { parse_mode: 'HTML' });
    }

    const stats = getRoleStats();
    let text = `<blockquote>${E.crown} <b>ROLE STATISTICS</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const role of ROLE_HIERARCHY) {
        text += `${E.dot} <b>${ROLE_LABELS[role]}:</b> ${stats[role]}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n${E.pin} <b>Total:</b> ${stats.total}</blockquote>`;
    await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('myrole', async (ctx) => {
    const roles = getUserRoles(ctx.from.id);
    if (roles.length === 0) {
        return ctx.reply(`<blockquote>${E.cross} Lo belum punya role apapun.</blockquote>`, { parse_mode: 'HTML' });
    }

    const highest = getHighestRole(ctx.from.id);
    let text = `<blockquote>${E.crown} <b>ROLE KAMU</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const r of roles) {
        text += `${E.dot} ${ROLE_LABELS[r]}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━\n${E.target} <b>Tertinggi:</b> ${ROLE_LABELS[highest]}`;
    text += `\n${E.check} <b>Commands:</b> ${canUseCommands(ctx.from.id) ? 'Aktif' : 'Terbatas'}`;
    text += `\n${E.box} <b>Create Panel:</b> ${canCreatePanel(ctx.from.id) ? 'Ya' : 'Tidak'}`;
    text += `\n${E.shield} <b>CADP:</b> ${canCreateAdminPanel(ctx.from.id) ? 'Ya' : 'Tidak'}`;
    text += `\n${E.lock} <b>Keys Access:</b> ${canAccessKeys(ctx.from.id) ? 'Ya' : 'Tidak'}`;
    text += `</blockquote>`;
    await ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('cekrole', async (ctx) => {
    if (!checkIsOwner(ctx.from.id) && !canUseCommands(ctx.from.id)) {
        return ctx.reply(`<blockquote>${E.cross} Akses ditolak.</blockquote>`, { parse_mode: 'HTML' });
    }

    const args = (ctx.message.text || '').split(' ').slice(1);
    let targetId = args[0];
    if (ctx.message.reply_to_message) targetId = String(ctx.message.reply_to_message.from.id);
    if (!targetId) return ctx.reply(`<blockquote>${E.cross} Format: /cekrole [ID] atau reply.</blockquote>`, { parse_mode: 'HTML' });

    const roles = getUserRoles(targetId.trim());
    if (roles.length === 0) return ctx.reply(`<blockquote>${E.cross} User <code>${targetId}</code> nggak punya role.</blockquote>`, { parse_mode: 'HTML' });

    const highest = getHighestRole(targetId.trim());
    let text = `<blockquote>${E.crown} <b>ROLE USER</b>\n${E.pin} ID: <code>${targetId}</code>\n━━━━━━━━━━━━━━━━━━━━\n`;
    for (const r of roles) {
        text += `${E.dot} ${ROLE_LABELS[r]}\n`;
    }
    text += `${E.target} Tertinggi: <b>${ROLE_LABELS[highest]}</b></blockquote>`;
    await ctx.reply(text, { parse_mode: 'HTML' });
});


bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const userId = ctx.from.id;

    if (data.startsWith('subdo')) {
        if (!checkIsOwner(userId)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Owner.`, show_alert: true });
        const parts = data.split(' ');
        const domainIndex = Number(parts[1]);
        const [host, ip] = parts[2].split('|').map(s => s.trim());
        const dom = Object.keys(global.subdomain || {});
        if (domainIndex < 0 || domainIndex >= dom.length) return ctx.answerCallbackQuery({ text: 'Domain nggak ada!', show_alert: true });
        const tldnya = dom[domainIndex];
        const loadingMsg = await ctx.reply(`<blockquote>${E.clock} Membuat subdomain ${host}.${tldnya}...</blockquote>`, { parse_mode: 'HTML' });
        try {
            const subdomainConfig = global.subdomain[tldnya];
            const response = await axios.post(`https://api.cloudflare.com/client/v4/zones/${subdomainConfig.zone}/dns_records`, {
                type: 'A', name: `${host}.${tldnya}`, content: ip, ttl: 1, proxied: false
            }, { headers: { 'Authorization': `Bearer ${subdomainConfig.apitoken}`, 'Content-Type': 'application/json' } });
            const res = response.data;
            if (res.success) {
                await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `<blockquote>${E.check} Sukses!\n${E.globe} ${res.result.name}\n${E.pin} ${res.result.content}</blockquote>`, { parse_mode: 'HTML' });
            } else {
                throw new Error(res.errors[0]?.message || 'Gagal');
            }
        } catch (e) {
            await ctx.api.editMessageText(ctx.chat.id, loadingMsg.message_id, `<blockquote>${E.cross} Gagal: ${e.message}</blockquote>`, { parse_mode: 'HTML' });
        }
        return ctx.answerCallbackQuery();
    }

    if (data.startsWith('cmd_')) {
        await ctx.answerCallbackQuery();
        const command = data.slice(4);
        const xy = { message: ctx.callbackQuery.message, from: ctx.from, chat: ctx.callbackQuery.message.chat, reply: (text, extra) => ctx.reply(text, extra), api: ctx.api, me: ctx.me };
        const owners = readJson(ownerFile);
        const seller = readJson(sellerFile);
        const partner = readJson(partnerFile);
        const reseller = readJson(resellerFile);
        const isOwner = owners.includes(String(userId));
        const isSeller = seller.some(s => String(s.id) === String(userId));
        const isPartner = partner.some(p => String(p.id) === String(userId));
        const isReseller = reseller.some(r => String(r.id) === String(userId));
        const { CatBox } = require('./src/lib/uploader');
        function generateReadableString() {
            const words = ['sky', 'cloud', 'wind', 'fire', 'storm', 'light', 'wave', 'stone', 'shadow', 'earth'];
            return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
        }
        await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, xy.reply, owners, seller, sellerFile, '', '', InlineKeyboard, global.paket, false, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, userId, readJson('./src/database/list.json'), generateReadableString, false);
        return;
    }

    if (data.startsWith('listsrv') || data.startsWith('listadmin') || data.startsWith('listusr')) {
        await ctx.answerCallbackQuery();
        const parts = data.split(' ');
        const command = parts[0];
        const page = parts[1];
        const xy = { message: ctx.callbackQuery.message, from: ctx.from, chat: ctx.callbackQuery.message.chat, reply: (text, extra) => ctx.editMessageText(text, extra), api: ctx.api, me: ctx.me };
        const owners = readJson(ownerFile);
        const seller = readJson(sellerFile);
        const partner = readJson(partnerFile);
        const reseller = readJson(resellerFile);
        const isOwner = owners.includes(String(userId));
        const isSeller = seller.some(s => String(s.id) === String(userId));
        const isPartner = partner.some(p => String(p.id) === String(userId));
        const isReseller = reseller.some(r => String(r.id) === String(userId));
        const { CatBox } = require('./src/lib/uploader');
        function generateReadableString2() {
            const words = ['sky', 'cloud', 'wind', 'fire', 'storm', 'light', 'wave', 'stone', 'shadow', 'earth'];
            return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
        }
        await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, xy.reply, owners, seller, sellerFile, '', page, InlineKeyboard, global.paket, false, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, userId, readJson('./src/database/list.json'), generateReadableString2, false);
        return;
    }

    if (data.startsWith('cancel_warn_')) {
        try {
            const admins = await ctx.getChatAdministrators();
            if (!admins.some(a => a.user.id === userId)) return ctx.answerCallbackQuery({ text: `${E.cross} Khusus Admin.`, show_alert: true });
        } catch {
            return ctx.answerCallbackQuery({ text: `${E.cross} Error.`, show_alert: true });
        }
        const warnedUserId = data.split('_')[2];
        if (!warnDB[warnedUserId]?.length) return ctx.answerCallbackQuery({ text: 'Nggak ada peringatan.', show_alert: true });
        warnDB[warnedUserId].pop();
        saveWarnDB(warnDB);
        const count = warnDB[warnedUserId].length;
        await ctx.editMessageText(`<blockquote>${E.bell} Peringatan diperbarui!\n${E.pin} Total: ${count}/3</blockquote>`, {
            parse_mode: 'HTML',
            reply_markup: count > 0 ? new InlineKeyboard().text(`${E.cross} Batalkan`, `cancel_warn_${warnedUserId}`) : undefined,
        }).catch(() => {});
        return ctx.answerCallbackQuery({ text: `${E.check} Dibatalkan.`, show_alert: true });
    }
});


bot.on('my_chat_member', async (ctx) => {
    const chat = ctx.chat;
    const oldStatus = ctx.myChatMember.old_chat_member.status;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    if ((newStatus === 'member' || newStatus === 'administrator') && (oldStatus === 'left' || oldStatus === 'kicked')) {
        const isAllowed = loadAllowedGroups().includes(String(chat.id));
        if (!isAllowed) {
            await ctx.api.sendMessage(chat.id, `<blockquote>${E.cross} Bot nggak terdaftar di grup ini. Auto leave.\nPake /addgrub [ID] di private.</blockquote>`, { parse_mode: 'HTML' }).catch(() => {});
            await ctx.api.leaveChat(chat.id).catch(() => {});
        } else {
            await ctx.api.sendMessage(chat.id, `<blockquote>${E.check} <b>Bot aktif!</b>\n\n${E.dot} Grup: ${chat.title}\n${E.dot} Ketik /menu buat mulai.</blockquote>`, { parse_mode: 'HTML' }).catch(() => {});
        }
    }
});

bot.on('message:new_chat_members', async (ctx) => {
    const listData = readJson('./src/database/weleave.json');
    const found = listData.find(item => item.id === ctx.chat.id);
    if (!found?.welcome) return;
    for (const user of ctx.message.new_chat_members) {
        await ctx.reply(`<blockquote>${E.sparkles} Welcome, <b>${user.first_name || 'User'}</b>!</blockquote>`, { parse_mode: 'HTML' }).catch(() => {});
    }
});

bot.on('message:left_chat_member', async (ctx) => {
    const listData = readJson('./src/database/weleave.json');
    const found = listData.find(item => item.id === ctx.chat.id);
    if (!found?.leave) return;
    await ctx.reply(`<blockquote>${E.fire} Bye, <b>${ctx.message.left_chat_member?.first_name || 'User'}</b>!</blockquote>`, { parse_mode: 'HTML' }).catch(() => {});
});


bot.on('message', async (xy) => {
    const msg = xy.message;
    if (!msg) return;

    const user = xy.from;
    const waktu = new Date().toLocaleTimeString('id-ID');
    process.stdout.clearLine?.(0);
    process.stdout.cursorTo?.(0);
    console.log(`${E.clock} ${waktu} | ${user.id} | @${user.username || '-'} | ${(msg.text || '').substring(0, 50)}`);

    const seller = readJson(sellerFile);
    const partner = readJson(partnerFile);
    const reseller = readJson(resellerFile);
    const owners = readJson(ownerFile);
    const isOwner = owners.includes(String(user.id));
    const now = Date.now();
    const validSellers = seller.filter(item => item.expiresAt > now);
    if (validSellers.length !== seller.length) writeJson(sellerFile, validSellers);
    const isSeller = validSellers.some(item => item.id === String(user.id));
    const isPartner = partner.some(item => String(item.id) === String(user.id));
    const isReseller = reseller.some(item => String(item.id) === String(user.id));
    const isGroup = ['group', 'supergroup'].includes(xy.chat.type);

    let isGroupAdmins = false;
    let isBotGroupAdmins = false;
    if (isGroup) {
        try {
            const participants = await xy.getChatAdministrators();
            const adminIds = participants.map(a => a.user.id);
            isGroupAdmins = adminIds.includes(user.id);
            isBotGroupAdmins = adminIds.includes(xy.me.id);
        } catch {}
    }

    const reply = (teks, extra) => xy.reply(teks, extra);
    const { CatBox } = require('./src/lib/uploader');
    function generateReadableString3() {
        const words = ['sky', 'cloud', 'wind', 'fire', 'storm', 'light', 'wave', 'stone', 'shadow', 'earth'];
        return words[Math.floor(Math.random() * words.length)] + Math.floor(100 + Math.random() * 900);
    }

    let body = msg.text || msg.caption || '';
    const prefix = global.prefix || '/';
    const command = body.startsWith(prefix) ? body.slice(prefix.length).trim().split(' ')[0].split('@')[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');
    const sender = xy.message.chat.id;
    const db_respon_list = readJson('./src/database/list.json');

    if (isGroup && !isGroupAdmins) {
        const antilinkData = readJson('./src/database/antilink.json');
        const groupAntilink = antilinkData.find(item => item.id === xy.chat.id);
        if (groupAntilink?.active && body && (body.includes('http://') || body.includes('https://') || body.includes('t.me/') || body.includes('wa.me/'))) {
            try {
                await xy.api.deleteMessage(xy.chat.id, xy.message.message_id);
                const warning = await reply(`<blockquote>${E.cross} <b>Anti-link aktif!</b>\n${E.dot} ${user.first_name}, jangan kirim link di sini.</blockquote>`, { parse_mode: 'HTML' });
                setTimeout(() => xy.api.deleteMessage(xy.chat.id, warning.message_id).catch(() => {}), 5000);
            } catch {}
            return;
        }
    }

    if (body && xy.chat.type !== 'private') {
        const matched = db_respon_list.find(item => item.id === xy.chat.id && item.key.toLowerCase() === body.trim().toLowerCase());
        if (matched) {
            if (matched.isImage && matched.image_url) {
                try {
                    const response = await axios.get(matched.image_url, { responseType: 'arraybuffer' });
                    const tempPath = './temp_respon.jpg';
                    fs.writeFileSync(tempPath, response.data);
                    await xy.api.sendPhoto(xy.chat.id, new InputFile(tempPath), {
                        caption: `<blockquote><b>${matched.key}</b>\n\n${matched.response}</blockquote>`,
                        parse_mode: 'HTML',
                    });
                    fs.unlinkSync(tempPath);
                } catch {}
            } else {
                reply(`<blockquote><b>${matched.key}</b>\n\n${matched.response}</blockquote>`, { parse_mode: 'HTML' });
            }
        }
    }

    if (!global.groupMembers) global.groupMembers = {};
    if (msg.from && xy.chat.type !== 'private') {
        const chatId = xy.chat.id;
        if (!global.groupMembers[chatId]) global.groupMembers[chatId] = [];
        const idx = global.groupMembers[chatId].findIndex(m => m.id === user.id);
        const newData = { id: user.id, first_name: user.first_name || '', username: user.username || '', last_seen: new Date().toISOString() };
        if (idx === -1) global.groupMembers[chatId].push(newData);
        else global.groupMembers[chatId][idx].last_seen = newData.last_seen;
    }

    await handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, reply, owners, validSellers, sellerFile, q, q, InlineKeyboard, global.paket, isGroupAdmins, global.mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, sender, db_respon_list, generateReadableString3, isBotGroupAdmins);
});


const spinner = ora({ text: 'Menghubungkan bot...', spinner: 'bouncingBar' }).start();

bot.api.getMe().then((me) => {
    console.clear();
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    spinner.succeed(`${E.check} Bot terhubung!`);
    console.log(`${E.crown} Nama  : ${me.first_name}`);
    console.log(`${E.star} User  : @${me.username}`);
    console.log(`${E.rocket} Versi : ${global.botVersion}`);
    console.log(`${E.fire} Status: Aktif`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    (async () => {
        await restoreWhatsAppSessions().catch(() => {});
        console.log(`${E.check} Sesi WA direstore.`);
    })();

    startPaymentChecker(bot);

    const cpuCheckInterval = 5 * 60 * 1000;
    setInterval(() => {
        checkAndStopAbnormalCpu(bot).catch(() => {});
    }, cpuCheckInterval);

    setInterval(() => {
        expireOldOrders();
    }, 60 * 1000);

    bot.start();
}).catch((err) => {
    spinner.fail(`${E.cross} Gagal: ${err.message}`);
    process.exit(1);
});

