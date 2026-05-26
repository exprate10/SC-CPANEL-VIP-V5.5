'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const ORDERS_FILE = path.join(__dirname, '../database/orders.json');
const TRANSACTIONS_FILE = path.join(__dirname, '../database/transactions.json');

function ensureFile(filePath, defaultData = '[]') {
    if (!fs.existsSync(filePath)) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, defaultData);
    }
}

function readOrders() {
    ensureFile(ORDERS_FILE);
    try {
        return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveOrders(data) {
    ensureFile(ORDERS_FILE);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(data, null, 2));
}

function readTransactions() {
    ensureFile(TRANSACTIONS_FILE);
    try {
        return JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, 'utf8'));
    } catch {
        return [];
    }
}

function saveTransactions(data) {
    ensureFile(TRANSACTIONS_FILE);
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2));
}

function generateOrderId() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().split('-')[0].toUpperCase();
    return `ORD-${timestamp}-${random}`;
}

function generateSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}


async function createPayment(productId, userId, username) {
    const config = global.pakasir;
    const product = global.products[productId];

    if (!product) return { success: false, error: 'Produk nggak ditemukan.' };
    if (!config || !config.enabled) return { success: false, error: 'Payment gateway belum dikonfigurasi.' };
    if (!config.apiKey || !config.merchantId) return { success: false, error: 'API Key atau Merchant ID kosong.' };

    const orderId = generateOrderId();
    const expiryMinutes = config.expiry || 30;
    const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);

    const payload = {
        merchant_id: config.merchantId,
        order_id: orderId,
        amount: product.price,
        item_name: product.name,
        customer_name: username || String(userId),
        customer_id: String(userId),
        expiry_minutes: expiryMinutes,
        payment_method: 'qris',
        callback_url: config.callbackUrl || '',
    };

    try {
        const signature = generateSignature(payload, config.apiKey);

        const response = await axios.post(`${config.baseUrl}/transaction/create`, payload, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json',
                'X-Signature': signature,
                'X-Merchant-Id': config.merchantId,
            },
            timeout: 30000,
        });

        const data = response.data;

        if (!data || !data.success) {
            return { success: false, error: data?.message || 'Gagal buat transaksi.' };
        }

        const order = {
            orderId,
            transactionId: data.data?.transaction_id || orderId,
            userId: String(userId),
            username: username || '',
            productId,
            productName: product.name,
            amount: product.price,
            status: 'pending',
            paymentUrl: data.data?.payment_url || '',
            qrisUrl: data.data?.qris_url || data.data?.qr_url || '',
            qrisString: data.data?.qris_string || '',
            createdAt: Date.now(),
            expiresAt,
            paidAt: null,
            deliveredAt: null,
        };

        const orders = readOrders();
        orders.push(order);
        saveOrders(orders);

        return {
            success: true,
            order,
            qrisUrl: order.qrisUrl,
            paymentUrl: order.paymentUrl,
        };
    } catch (err) {
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        return { success: false, error: `[${status || 'ERR'}] ${msg}` };
    }
}


async function checkPaymentStatus(orderId) {
    const config = global.pakasir;
    if (!config || !config.enabled || !config.apiKey) {
        return { success: false, error: 'Payment gateway belum dikonfigurasi.' };
    }

    try {
        const response = await axios.get(`${config.baseUrl}/transaction/status/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'X-Merchant-Id': config.merchantId,
            },
            timeout: 15000,
        });

        const data = response.data;
        if (!data || !data.success) {
            return { success: false, error: data?.message || 'Gagal cek status.' };
        }

        return {
            success: true,
            status: data.data?.status || 'unknown',
            paidAt: data.data?.paid_at || null,
            amount: data.data?.amount || 0,
        };
    } catch (err) {
        return { success: false, error: err.response?.data?.message || err.message };
    }
}


function updateOrderStatus(orderId, status, extra = {}) {
    const orders = readOrders();
    const idx = orders.findIndex(o => o.orderId === orderId);
    if (idx === -1) return false;

    orders[idx].status = status;
    if (extra.paidAt) orders[idx].paidAt = extra.paidAt;
    if (extra.deliveredAt) orders[idx].deliveredAt = extra.deliveredAt;

    saveOrders(orders);

    const transactions = readTransactions();
    transactions.push({
        orderId,
        status,
        timestamp: Date.now(),
        ...extra,
    });
    saveTransactions(transactions);

    return true;
}


function getOrderByOrderId(orderId) {
    const orders = readOrders();
    return orders.find(o => o.orderId === orderId) || null;
}


function getOrdersByUserId(userId) {
    const orders = readOrders();
    return orders.filter(o => o.userId === String(userId));
}


function getPendingOrders() {
    const orders = readOrders();
    const now = Date.now();
    return orders.filter(o => o.status === 'pending' && o.expiresAt > now);
}


function expireOldOrders() {
    const orders = readOrders();
    const now = Date.now();
    let changed = false;

    for (let i = 0; i < orders.length; i++) {
        if (orders[i].status === 'pending' && orders[i].expiresAt <= now) {
            orders[i].status = 'expired';
            changed = true;
        }
    }

    if (changed) saveOrders(orders);
    return changed;
}


function verifyWebhookSignature(payload, signature, secret) {
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}


function getProductFile(productId) {
    const product = global.products[productId];
    if (!product || !product.file) return null;

    const filePath = path.resolve(__dirname, '../../', product.file);
    if (!fs.existsSync(filePath)) return null;

    return filePath;
}


function getOrderStats() {
    const orders = readOrders();
    const total = orders.length;
    const paid = orders.filter(o => o.status === 'paid' || o.status === 'delivered').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const expired = orders.filter(o => o.status === 'expired').length;
    const revenue = orders
        .filter(o => o.status === 'paid' || o.status === 'delivered')
        .reduce((sum, o) => sum + (o.amount || 0), 0);

    return { total, paid, pending, expired, revenue };
}


async function autoVerifyPendingOrders(bot) {
    const config = global.pakasir;
    if (!config || !config.enabled || !config.autoVerify) return;

    const pending = getPendingOrders();
    if (pending.length === 0) return;

    for (const order of pending) {
        try {
            const result = await checkPaymentStatus(order.orderId);
            if (!result.success) continue;

            if (result.status === 'paid' || result.status === 'success' || result.status === 'settled') {
                updateOrderStatus(order.orderId, 'paid', { paidAt: result.paidAt || Date.now() });

                const productFile = getProductFile(order.productId);

                if (bot && order.userId) {
                    const E = global.E || {};
                    const msg = `<blockquote><b>${E.money || '💰'} Pembayaran Berhasil!</b>

<b>Order:</b> <code>${order.orderId}</code>
<b>Produk:</b> ${order.productName}
<b>Nominal:</b> Rp ${order.amount.toLocaleString('id-ID')}

${E.check || '✅'} Produk sedang dikirim...</blockquote>`;

                    await bot.api.sendMessage(order.userId, msg, { parse_mode: 'HTML' });

                    if (productFile) {
                        const { InputFile } = require('grammy');
                        await bot.api.sendDocument(order.userId, new InputFile(productFile), {
                            caption: `<blockquote>${E.box || '📦'} <b>${order.productName}</b>\n\nTerima kasih udah order! Kalo ada masalah langsung hubungi owner.</blockquote>`,
                            parse_mode: 'HTML',
                        });
                        updateOrderStatus(order.orderId, 'delivered', { deliveredAt: Date.now() });
                    } else {
                        await bot.api.sendMessage(order.userId, `<blockquote>${E.cross || '❌'} File produk belum tersedia. Hubungi owner buat dapetin file-nya.</blockquote>`, { parse_mode: 'HTML' });
                        updateOrderStatus(order.orderId, 'paid');
                    }
                }
            }
        } catch (err) {
            console.error(`[PAYMENT] Error verify order ${order.orderId}:`, err.message);
        }
    }

    expireOldOrders();
}


function startPaymentChecker(bot) {
    const config = global.pakasir;
    if (!config || !config.enabled || !config.autoVerify) return null;

    const interval = (config.checkInterval || 15) * 1000;

    const timer = setInterval(() => {
        autoVerifyPendingOrders(bot).catch(err => {
            console.error('[PAYMENT] Auto-verify error:', err.message);
        });
    }, interval);

    console.log(`[PAYMENT] Auto-verify aktif, cek setiap ${config.checkInterval || 15} detik`);
    return timer;
}


module.exports = {
    createPayment,
    checkPaymentStatus,
    updateOrderStatus,
    getOrderByOrderId,
    getOrdersByUserId,
    getPendingOrders,
    expireOldOrders,
    verifyWebhookSignature,
    getProductFile,
    getOrderStats,
    autoVerifyPendingOrders,
    startPaymentChecker,
    generateOrderId,
    readOrders,
    saveOrders,
    readTransactions,
    saveTransactions,
};
