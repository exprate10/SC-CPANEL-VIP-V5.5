'use strict';

const E = global.E || {
    diamond: '💎', crown: '👑', fire: '⚡', star: '🌟', bolt: '🔥',
    rocket: '🚀', sparkles: '✨', target: '🎯', check: '✅', cross: '❌',
    trophy: '🏆', beginner: '🔙', artist: '🎨', tools: '🧰', store: '🛒',
    group: '👥', box: '📦', gem: '💠', hot: '♨️', dot: '•',
    lock: '🔒', money: '💰', card: '💳', bell: '🔔', globe: '🌐',
    shield: '🛡️', cpu: '🖥️', clock: '⏰', link: '🔗', pin: '📌',
};

global.specialmenu = `<blockquote>${E.sparkles} <b>SPECIAL MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.dot} /cekid — Cek ID Telegram
${E.dot} /info — Info user detail
${E.dot} /ai [teks] — Chat sama AI
${E.dot} /aiimg [prompt] — Generate gambar AI
${E.dot} /aivideo [prompt] — Generate video AI
${E.dot} /voiceai [teks] — Text to Speech AI
${E.dot} /aimusic [genre] — Generate musik AI
${E.dot} /remini [reply foto] — HD-kan foto</blockquote>`;

global.ownermenu_add_text = `<blockquote>${E.check} <b>ADD MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.crown} <b>Owner:</b>
${E.dot} /addowner [ID]
${E.dot} /addgrub [ID Grup]

${E.star} <b>Partner (V1-V10):</b>
${E.dot} /pt ~ /pt10 [reply]

${E.fire} <b>Reseller (V1-V10):</b>
${E.dot} /rt ~ /rt10 [reply]

${E.gem} <b>Premium:</b>
${E.dot} /addprem [reply]
${E.dot} /addallrt [reply]
${E.dot} /addallpt [reply]
${E.dot} /delallpt
${E.dot} /delallrt</blockquote>`;

global.ownermenu_delete_text = `<blockquote>${E.cross} <b>DELETE MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.crown} <b>Owner:</b>
${E.dot} /delowner [ID]
${E.dot} /delgrub [ID Grup]

${E.star} <b>Partner (V1-V10):</b>
${E.dot} /delpt ~ /delpt10 [reply]

${E.fire} <b>Reseller (V1-V10):</b>
${E.dot} /delrt ~ /delrt10 [reply]

${E.bolt} <b>Mass Delete:</b>
${E.dot} /delallpt — Hapus semua partner
${E.dot} /delallrt — Hapus semua reseller
${E.dot} /delusr [ID] — Hapus user panel V1~V10
${E.dot} /delsrv [ID] — Hapus server V1~V10
${E.dot} /delsrvoff [V] — Hapus server off
${E.dot} /clearall [ip,pw] — Clear VPS</blockquote>`;

global.ownermenu_setserver_text = `<blockquote>${E.tools} <b>SET SERVER</b>
━━━━━━━━━━━━━━━━━━━━

${E.globe} <b>Domain Panel (V1-V10):</b>
${E.dot} /seturl ~ /seturlv10 [domain]

${E.lock} <b>API Key PLTA (V1-V10):</b>
${E.dot} /setplta ~ /setpltav10 [key]

${E.shield} <b>API Key PLTC (V1-V10):</b>
${E.dot} /setpltc ~ /setpltcv10 [key]</blockquote>`;

global.ownermenu_panelmgmt_text = `<blockquote>${E.cpu} <b>PANEL MANAGEMENT</b>
━━━━━━━━━━━━━━━━━━━━

${E.target} <b>CPU Check:</b>
${E.dot} /servercpu [V1~V10]

${E.cross} <b>Mass Delete Server (V1-V10):</b>
${E.dot} /delallpanel ~ /delallpanelv10 [ID kecuali]

${E.cross} <b>Mass Delete User (V1-V10):</b>
${E.dot} /delallusr ~ /delallusrv10 [ID kecuali]

${E.check} <b>Auto CPU (V1-V10):</b>
${E.dot} /autocpuon ~ /autocpuonv10
${E.dot} /autocpuoff ~ /autocpuoffv10</blockquote>`;

global.ownermenu_wa_text = `<blockquote>${E.bell} <b>WHATSAPP MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.dot} /connectwa [nomor] — Sambungin WA
${E.dot} /disconnectwa [nomor] — Putusin WA
${E.dot} /send [nomor,pesan] — Kirim pesan WA</blockquote>`;

function generatePanelMenu(prefix, version, label) {
    const v = version === 1 ? '' : `v${version}`;
    return `<blockquote>${E.crown} <b>${label} V${version}</b>
━━━━━━━━━━━━━━━━━━━━

${E.box} <b>Create Server:</b>
${E.dot} /1gb${v} ~ /10gb${v}
${E.dot} /unli${v}

${E.tools} <b>Management:</b>
${E.dot} /cadp${v} — Create Admin
${E.dot} /listsrv${v} — List Server
${E.dot} /listusr${v} — List User
${E.dot} /listadmin${v} — List Admin
${E.dot} /delsrv${v} — Hapus Server
${E.dot} /deladmin${v} — Hapus Admin
${E.dot} /delusr${v} — Hapus User</blockquote>`;
}

function generateResellerMenu(version) {
    const v = version === 1 ? '' : `v${version}`;
    return `<blockquote>${E.fire} <b>RESELLER PANEL V${version}</b>
━━━━━━━━━━━━━━━━━━━━

${E.box} <b>Create Server:</b>
${E.dot} /1gb${v} ~ /10gb${v}
${E.dot} /unli${v}</blockquote>`;
}

for (let i = 1; i <= 10; i++) {
    const key = i === 1 ? 'partnerpanel' : `partnerpanelV${i}`;
    global[key] = generatePanelMenu('partner', i, 'PARTNER PANEL');
}

for (let i = 1; i <= 10; i++) {
    const key = i === 1 ? 'resellerpanel' : `resellerpanelV${i}`;
    global[key] = generateResellerMenu(i);
}

global.toolsmenu = `<blockquote>${E.tools} <b>TOOLS MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.dot} /cekid — Cek ID Telegram
${E.dot} /tourl [reply media] — Upload ke URL
${E.dot} /toqr [teks] — Bikin QR Code
${E.dot} /sticker [reply foto] — Bikin sticker
${E.dot} /toimg [reply sticker] — Sticker jadi gambar
${E.dot} /tovideo [reply sticker] — Sticker jadi video
${E.dot} /brat [teks] — Brat style text
${E.dot} /qc [teks] — Fake quoted chat
${E.dot} /cekserver — Cek status server</blockquote>`;

global.downloadermenu = `<blockquote>${E.box} <b>DOWNLOADER MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.dot} /tiktok [url] — Download TikTok
${E.dot} /tiktokslide [url] — TikTok slide
${E.dot} /igdl [url] — Download Instagram
${E.dot} /ytdl [url] — Download YouTube
${E.dot} /spotifydl [url] — Download Spotify
${E.dot} /ssweb [url] — Screenshot website
${E.dot} /pinterest [query] — Cari Pinterest</blockquote>`;

global.installermenu = `<blockquote>${E.rocket} <b>INSTALLER MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.shield} <b>Panel:</b>
${E.dot} /installpanel [ip,pw,domain]
${E.dot} /uninstallpanel [ip,pw]
${E.dot} /hbpanel [ip,pw] — Hackback
${E.dot} /startwings [ip,pw,token]

${E.artist} <b>Tema (8 pilihan):</b>
${E.dot} /installtemastellar
${E.dot} /installtemanebula
${E.dot} /installtemadarknate
${E.dot} /installtemaenigma
${E.dot} /installtemabilling
${E.dot} /installtemaiceminecraft
${E.dot} /installtemanook
${E.dot} /installtemanightcore
${E.dot} /uninstalltema

${E.globe} <b>Other:</b>
${E.dot} /subdo [host,ip] — Subdomain CF
${E.dot} /clearall [ip,pw] — Clear VPS</blockquote>`;

global.storemenu = `<blockquote>${E.store} <b>STORE MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.money} <b>Payment:</b>
${E.dot} /buy — Beli produk (auto QRIS)
${E.dot} /cekorder [ID] — Cek status order
${E.dot} /myorders — Riwayat order lo
${E.dot} /pay — Info pembayaran manual

${E.box} <b>Produk:</b>
${E.dot} /listproduk — Daftar produk
${E.dot} /searchproduk [kata] — Cari produk

${E.lock} <b>Owner Only:</b>
${E.dot} /addlist — Tambah produk
${E.dot} /dellist — Hapus produk
${E.dot} /updatelist — Update produk
${E.dot} /dellistall — Hapus semua
${E.dot} /orderstats — Statistik order</blockquote>`;

global.groupmenu = `<blockquote>${E.group} <b>GROUP MENU</b>
━━━━━━━━━━━━━━━━━━━━

${E.dot} /adduser — Tambah member
${E.dot} /kickuser — Kick member
${E.dot} /welcome — Set welcome msg
${E.dot} /leave — Set leave msg
${E.dot} /promoteuser — Promote admin
${E.dot} /demoteuser — Demote admin
${E.dot} /open — Buka grup
${E.dot} /close — Tutup grup
${E.dot} /antilink — Toggle anti-link
${E.dot} /changetitle [judul] — Ganti judul
${E.dot} /changedesk [desk] — Ganti deskripsi
${E.dot} /delete — Hapus pesan
${E.dot} /pinn — Pin pesan
${E.dot} /unpinn — Unpin pesan
${E.dot} /linkgroup — Link invite grup
${E.dot} /warnn — Kasih warning
${E.dot} /warns — Cek warning
${E.dot} /resetwarnn — Reset warning</blockquote>`;
