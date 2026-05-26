# SC-CPANEL VIP V5.5 Premium

Telegram Bot untuk manajemen panel Pterodactyl (grammY framework).

## Upgrade dari V2 ke V5.5

### Perubahan Utama:
- **Modular Architecture** - `config/xy.js` (2000+ baris) dipecah jadi 9 handler modules
- **Role System** - `src/lib/roles.js` dengan `canCreatePanel`, `canCreateAdminPanel`, `canAccessKeys`
- **Modern Reply Pattern** - Semua reply dibungkus `<blockquote>` + `<b>` bold + `parse_mode: 'HTML'`
- **editMessage Pattern** - Callback handler pakai `editMessageText` untuk UX yang smooth
- **Clean Code** - Shared utilities di `config/handlers/utils.js`

### Struktur File:
```
config/
  xy.js                    # Main entry point & command router
  settings.js              # Bot configuration
  handlers/
    utils.js               # Shared utilities (E, readJson, writeJson, editReply, getPanelConfig)
    settings.js            # seturl/setplta/setpltc commands
    panel.js               # Panel creation (1gb-10gb, unli, v1-v10)
    usermgmt.js            # User management (owner/seller/partner/reseller/premium)
    group.js               # Group management (open/close/kick/warn/welcome/antilink)
    downloader.js          # Downloaders (tiktok/yt/spotify/ig/pinterest)
    ai.js                  # AI features (gpt/aiimg/aimusic/brat)
    tools.js               # Utility tools (qr/sticker/toimg/ssweb/cekid/pay)
    server.js              # Server management (SSH/install/cpu/subdomain)
src/
  lib/
    roles.js               # Role-based access control system
    connectwa.js           # WhatsApp session manager
    menu.js                # Menu display
    ...                    # Other libs
  database/
    *.json                 # JSON databases
```

### Role System (`src/lib/roles.js`):
- `canCreatePanel(userId, serverVersion)` - Panel creation access
- `canCreateAdminPanel(userId, serverVersion)` - Admin panel management
- `canAccessKeys(userId, serverVersion)` - View credentials/server lists
- `isOwnerRole(userId)` - Owner check
- `checkUserRole(userId, roles[], serverVersion)` - Legacy compatibility

### Requirements:
- Node.js >= 18.0.0
- Dependencies: grammy, axios, canvas, ssh2, dll

### Install:
```bash
npm install
npm start
```
