'use strict';

const fs = require('fs');
const path = require('path');

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
    gem: '💠',
    hot: '♨️',
    dot: '•',
    lock: '🔒',
    money: '💰',
    card: '💳',
    bell: '🔔',
    globe: '🌐',
    shield: '🛡️',
    cpu: '🖥️',
    clock: '⏰',
    link: '🔗',
    pin: '📌',
    wave: '〰️',
};

global.E = E;
global.prefix = '/';


global.botVersion = '5.5.0';
global.namabot = 'CPANEL VIP V5.5';
global.idowner = '1311431740';
global.apikeyhost = '';


global.payment = {
    dana: { name: 'DANA', no: '085385502255', an: 'ZEXC OFFC' },
    gopay: { name: 'GOPAY', no: '08xxxxxxxxxx', an: 'ZEXC OFFC' },
    ovo: { name: 'OVO', no: '08xxxxxxxxxx', an: 'ZEXC OFFC' },
    qris: { name: 'QRIS', image: 'https://files.catbox.moe/xxxxx.jpg', an: 'ZEXC OFFC' },
};


global.pakasir = {
    enabled: true,
    apiKey: '',
    merchantId: '',
    baseUrl: 'https://pakasir.com/api/v1',
    webhookSecret: '',
    callbackUrl: '',
    expiry: 30,
    autoVerify: true,
    checkInterval: 15,
};


global.products = {
    enc: {
        id: 'cpanel-enc',
        name: 'CPANEL VIP V5.5 (ENC)',
        price: 5000,
        description: 'Script Encrypted Siap Run',
        file: './products/cpanel-enc.zip',
        features: [
            'Script Encrypted Siap Run',
            'Bantuan Installasi',
            'Garansi 3 Hari',
        ],
    },
    noenc: {
        id: 'cpanel-noenc',
        name: 'CPANEL VIP V5.5 (NO ENC)',
        price: 8000,
        description: 'Script No Encrypt Bisa Edit',
        file: './products/cpanel-noenc.zip',
        features: [
            'Script No Encrypt',
            'Bisa Edit Semua',
            'Bantuan Installasi',
            'Garansi 7 Hari',
            'Bisa Dijual Kembali',
        ],
    },
    fullup: {
        id: 'cpanel-fullup',
        name: 'CPANEL VIP V5.5 (FULL UP)',
        price: 25000,
        description: 'Full Update Seumur Hidup',
        file: './products/cpanel-fullup.zip',
        features: [
            'Bisa Edit Semua',
            'Free Update Seumur Hidup',
            'Bantuan Installasi',
            'Prioritas Bantuan',
            'Bisa Dijual Kembali',
        ],
    },
};


global.domain = 'https://panelserver.pterodactylvvip.dpdns.org';
global.plta = 'ptla_mnVPMimbFm1AFZMvQFHixxQv11dxzkrzN6Z4RUZaVK4';
global.pltc = 'ptlc_QIaqMbNsGVP0HJbv87oANodOd2BlGneSXJnOkGVSheo';
global.loc = '1';
global.eggs = '15';
global.nests = '5';

global.domainV2 = '';
global.pltaV2 = '';
global.pltcV2 = '';
global.locV2 = '1';
global.eggsV2 = '15';
global.nestsV2 = '5';

global.domainV3 = '';
global.pltaV3 = '';
global.pltcV3 = '';
global.locV3 = '1';
global.eggsV3 = '15';
global.nestsV3 = '5';

global.domainV4 = '';
global.pltaV4 = '';
global.pltcV4 = '';
global.locV4 = '1';
global.eggsV4 = '15';
global.nestsV4 = '5';

global.domainV5 = '';
global.pltaV5 = '';
global.pltcV5 = '';
global.locV5 = '1';
global.eggsV5 = '15';
global.nestsV5 = '5';

global.domainV6 = '';
global.pltaV6 = '';
global.pltcV6 = '';
global.locV6 = '1';
global.eggsV6 = '15';
global.nestsV6 = '5';

global.domainV7 = '';
global.pltaV7 = '';
global.pltcV7 = '';
global.locV7 = '1';
global.eggsV7 = '15';
global.nestsV7 = '5';

global.domainV8 = '';
global.pltaV8 = '';
global.pltcV8 = '';
global.locV8 = '1';
global.eggsV8 = '15';
global.nestsV8 = '5';

global.domainV9 = '';
global.pltaV9 = '';
global.pltcV9 = '';
global.locV9 = '1';
global.eggsV9 = '15';
global.nestsV9 = '5';

global.domainV10 = '';
global.pltaV10 = '';
global.pltcV10 = '';
global.locV10 = '1';
global.eggsV10 = '15';
global.nestsV10 = '5';


global.thumbnailPath = 'https://files.catbox.moe/t5xwkz.jpg';
global.paket = 'https://files.catbox.moe/t5xwkz.jpg';
global.startMenuPhoto = 'https://files.catbox.moe/t5xwkz.jpg';


global.subdomain = {
    'pterodactylvvip.dpdns.org': {
        zone: '6c7cfe5db9de1c82f145438a0092da0a',
        apitoken: '-cfut_6lqm2sdGMnNxEudelPipMohdBofRZQysrPPKC67Rce18b02f',
    },
    'jhonaley.web.id': {
        zone: 'dd00b76d94af1e8d5f37f4253f77861f',
        apitoken: 'MHXAKlSaWbFcCLDqo7t-A-KFx1N89vUOwjvSgVTt',
    },
    'naell.my.id': {
        zone: '090a81422da7b258cdf3ef02de1e4ca3',
        apitoken: 'HTLdfWAdDalNoz5x3-Pe4MLWGVgxKRq6ZMVz4vl0',
    },
    'naell.cloud': {
        zone: '1b662cae2a8214a8468c97fb552070d0',
        apitoken: 'EX4ezkgaSvD3JeXeKoDQzfmqI_Mh0yUek7WmDO0u',
    },
    'privateeserverr.my.id': {
        zone: '2b47743c5a3afecde36ffa0f52073270',
        apitoken: '2ltJMUmL2QZ-H3IQ0NGM8n84zxoJlU1D8Wwj26AB',
    },
    'publicserverr.my.id': {
        zone: 'b23d82b98aa932317c93571a3846240a',
        apitoken: '2ltJMUmL2QZ-H3IQ0NGM8n84zxoJlU1D8Wwj26AB',
    },
};


global.mess = {
    wait: `${E.clock} Bentar ya, lagi diproses...`,
    success: `${E.check} Berhasil! Udah selesai diproses.`,
    on: `${E.check} Fitur aktif sekarang.`,
    off: `${E.cross} Fitur dimatiin.`,
    text: `${E.cross} Teks-nya mana? Kirim bareng command-nya.`,
    link: `${E.cross} Link-nya mana? Kasih yang valid.`,
    fitur: `${E.cross} Fitur lagi error, coba lagi nanti atau lapor owner.`,
    seller: `${E.lock} Khusus Seller & Owner.`,
    atmin: `${E.lock} Khusus Admin & Owner.`,
    private: `${E.cross} Pake di private chat aja.`,
    owner: `${E.crown} Khusus Owner doang.`,
    admin: `${E.cross} Khusus Admin grup.`,
    group: `${E.cross} Cuma bisa dipake di grup.`,
    premium: `${E.gem} Khusus user Premium.`,
    partner: `${E.star} Khusus Partner.`,
    reseller: `${E.fire} Khusus Reseller.`,
    notfound: `${E.cross} Command nggak ditemukan. Cek /menu.`,
    cooldown: `${E.clock} Sabar, jangan spam. Tunggu bentar.`,
    maintenance: `${E.tools} Bot lagi maintenance, balik lagi nanti.`,
    payment_success: `${E.money} Pembayaran berhasil! Produk sedang dikirim...`,
    payment_pending: `${E.clock} Menunggu pembayaran...`,
    payment_expired: `${E.cross} Pembayaran expired. Buat order baru.`,
    payment_failed: `${E.cross} Pembayaran gagal. Coba lagi.`,
};


global.orderDatabase = path.join(__dirname, '../src/database/orders.json');
global.transactionLog = path.join(__dirname, '../src/database/transactions.json');

const ordersPath = global.orderDatabase;
const transPath = global.transactionLog;

if (!fs.existsSync(ordersPath)) {
    fs.writeFileSync(ordersPath, JSON.stringify([], null, 2));
}

if (!fs.existsSync(transPath)) {
    fs.writeFileSync(transPath, JSON.stringify([], null, 2));
}
