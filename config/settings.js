const fs = require('fs');
const E = {
  diamond: '💠',
  crown: '⚜️',
  fire: '🔶',
  star: '🌐',
  bolt: '⚡',
  rocket: '🛡️',
  sparkles: '🫧',
  target: '🔘',
  check: '🟢',
  cross: '🔴',
  trophy: '🏆',
  beginner: '🔰',
  gem: '💎',
  hot: '♨️',
  dot: '🔹',
};

global.prefix = '/';

// ==================== KONFIGURASI BOT ====================
global.namabot = 'CPANEL VIP ZEXC OFFC'
global.idowner = '1311431740'
global.apikeyhost = `` // Isi sendiri jika ada
global.payment = {
    dana: { name: 'DANA', no: '085385502255', an: 'TF AJA DAH BENER' },
    gopay: { name: 'GOPAY', no: '08xxxxxxxxxx', an: 'ZEXC OFFC' },
    ovo: { name: 'OVO', no: '08xxxxxxxxxx', an: 'ZEXC OFFC' },
    qris: { name: 'QRIS', image: 'https://files.catbox.moe/xxxxx.jpg', an: 'ZEXC OFFC' },
};
// ==================== KONFIGURASI SERVER 1 ====================
global.domain = 'https://panelserver.pterodactylvvip.dpdns.org' // Isi domain panel
global.plta = 'ptla_mnVPMimbFm1AFZMvQFHixxQv11dxzkrzN6Z4RUZaVK4' // Isi API Key PLTA
global.pltc = 'ptlc_QIaqMbNsGVP0HJbv87oANodOd2BlGneSXJnOkGVSheo' // Isi API Key PLTC
global.loc = '1' // Lokasi default
global.eggs = '15' // Egg default 
global.nests = '5' // Nests Default 

// ==================== KONFIGURASI SERVER 2 ====================
global.domainV2 = '' // Isi domain panel V2
global.pltaV2 = '' // Isi API Key PLTA V2
global.pltcV2 = '' // Isi API Key PLTC V2
global.locV2 = '1'
global.eggsV2 = '15'
global.nestsV2 = '5'

// ==================== KONFIGURASI SERVER 3 ====================
global.domainV3 = ''
global.pltaV3 = ''
global.pltcV3 = ''
global.locV3 = '1' 
global.eggsV3 = '15'
global.nestsV3 = '5'

// ==================== KONFIGURASI SERVER 4 ====================
global.domainV4 = ''
global.pltaV4 = ''
global.pltcV4 = ''
global.locV4 = '1' 
global.eggsV4 = '15' 
global.nestsV4 = '5'

// ==================== KONFIGURASI SERVER 5 ====================
global.domainV5 = ''
global.pltaV5 = ''
global.pltcV5 = ''
global.locV5 = '1' 
global.eggsV5 = '15' 
global.nestsV5 = '5'

// ==================== KONFIGURASI SERVER 6 ====================
global.domainV6 = ''
global.pltaV6 = ''
global.pltcV6 = ''
global.locV6 = '1' 
global.eggsV6 = '15' 
global.nestsV6 = '5'

// ==================== KONFIGURASI SERVER 7 ====================
global.domainV7 = ''
global.pltaV7 = ''
global.pltcV7 = ''
global.locV7 = '1' 
global.eggsV7 = '15' 
global.nestsV7 = '5'

// ==================== KONFIGURASI SERVER 8 ====================
global.domainV8 = ''
global.pltaV8 = ''
global.pltcV8 = ''
global.locV8 = '1' 
global.eggsV8 = '15' 
global.nestsV8 = '5'

// ==================== KONFIGURASI SERVER 9 ====================
global.domainV9 = ''
global.pltaV9 = ''
global.pltcV9 = ''
global.locV9 = '1' 
global.eggsV9 = '15' 
global.nestsV9 = '5'

// ==================== KONFIGURASI SERVER 10 ====================
global.domainV10 = ''
global.pltaV10 = ''
global.pltcV10 = ''
global.locV10 = '1' 
global.eggsV10 = '15' 
global.nestsV10 = '5'

// ==================== MEDIA ====================
global.thumbnailPath = "https://files.catbox.moe/t5xwkz.jpg"
global.paket = "https://files.catbox.moe/t5xwkz.jpg"
global.startMenuPhoto = "https://files.catbox.moe/t5xwkz.jpg" 

// ==================== SUBDOMAIN CONFIG ====================
global.subdomain = { 
    "pterodactylvvip.dpdns.org": {
        zone: "6c7cfe5db9de1c82f145438a0092da0a",
        apitoken: '-cfut_6lqm2sdGMnNxEudelPipMohdBofRZQysrPPKC67Rce18b02f',
    },
    "jhonaley.web.id": {
        zone: "dd00b76d94af1e8d5f37f4253f77861f",
        apitoken: 'MHXAKlSaWbFcCLDqo7t-A-KFx1N89vUOwjvSgVTt',
    },
    "naell.my.id": { 
        zone: "090a81422da7b258cdf3ef02de1e4ca3",
        apitoken: 'HTLdfWAdDalNoz5x3-Pe4MLWGVgxKRq6ZMVz4vl0',
    },
    "naell.cloud": { 
        zone: "1b662cae2a8214a8468c97fb552070d0",
        apitoken: 'EX4ezkgaSvD3JeXeKoDQzfmqI_Mh0yUek7WmDO0u',
    },
    "privateeserverr.my.id": {
        zone: "2b47743c5a3afecde36ffa0f52073270",
        apitoken: '2ltJMUmL2QZ-H3IQ0NGM8n84zxoJlU1D8Wwj26AB',
    },
    "publicserverr.my.id": {
        zone: "b23d82b98aa932317c93571a3846240a",
        apitoken: '2ltJMUmL2QZ-H3IQ0NGM8n84zxoJlU1D8Wwj26AB',
    },
}; 

// ==================== GLOBAL MESSAGES ====================
global.mess = {
    wait: `${E.bolt} Sabar ya... lagi diproses, jangan ditinggal dulu!`,
    success: `${E.check} Mantap! Permintaan kamu berhasil diproses.`,
    on: `${E.check} Oke! Fitur ini sekarang aktif, silakan gunakan.`,
    off: `${E.cross} Sip! Fitur ini dimatikan sementara.`,
    text: `${E.cross} Ups! Kamu belum kasih teks, coba isi dulu ya.`,
    link: `${E.cross} Hmmm... link-nya mana? Kirim dulu yang valid ya.`,
    fitur: `${E.cross} Wah, fitur ini lagi error. Sabar dulu atau lapor ke owner ya!`,
    seller: `${E.cross} Eits! Fitur ini khusus buat Seller & Owner aja ya.`,
    atmin: `${E.cross} Maaf, fitur ini hanya dapat digunakan oleh Admin atau Owner!`,
    private: `${E.cross} Fitur ini cuma bisa dipakai di chat pribadi, kirim lewat private dong!`,
    owner: `${E.crown} Waduh! Cuma yang punya bot alias owner yang bisa akses ini.`,
    admin: `${E.cross} Fitur ini hanya bisa digunakan oleh admin grup!`,
    group: `${E.cross} Fitur ini hanya bisa digunakan dalam grup!`
};