/**
 * SC-CPANEL VIP V5.5 - Main Command Router
 * Upgraded from legacy v2 monolithic to modular v5.5 premium architecture
 * 
 * Features:
 * - All replies wrapped in <blockquote> + <b> bold + parse_mode HTML
 * - editMessage pattern in callback handlers
 * - Role system integration (canCreatePanel, canCreateAdminPanel, canAccessKeys)
 * - Modular handler architecture
 */

const fs = require('fs');
const axios = require('axios');
const { E, readJson, writeJson, editReply, getPanelConfig, getServerStatus, stopServer, DB } = require('./handlers/utils');
const { checkUserRole } = require('../src/lib/roles');

// Import handler modules
const settingsHandler = require('./handlers/settings');
const panelHandler = require('./handlers/panel');
const usermgmtHandler = require('./handlers/usermgmt');
const groupHandler = require('./handlers/group');
const downloaderHandler = require('./handlers/downloader');
const aiHandler = require('./handlers/ai');
const toolsHandler = require('./handlers/tools');
const serverHandler = require('./handlers/server');

// Build command-to-handler map
const handlerMap = new Map();

function registerHandler(module) {
  for (const cmd of module.commands) {
    handlerMap.set(cmd, module.handle);
  }
}

registerHandler(settingsHandler);
registerHandler(panelHandler);
registerHandler(usermgmtHandler);
registerHandler(groupHandler);
registerHandler(downloaderHandler);
registerHandler(aiHandler);
registerHandler(toolsHandler);
registerHandler(serverHandler);


// ===================== AUTO CPU CHECK (Background Task) =====================

async function checkAndStopAbnormalCpu(botInstance) {
  const statusData = readJson(DB.CPU_CHECK, {});
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
      const loadingMsg = await botInstance.api.sendMessage(recipientId,
        `<blockquote>${E.bolt} <b>AUTO-CHECK CPU - ${serverVersion.toUpperCase()}</b>\n${E.dot} Memulai pengecekan...</blockquote>`,
        { parse_mode: 'HTML' }
      );
      initialMessageId = loadingMsg.message_id;

      while (hasMore) {
        const response = await axios.get(`${panelDomain}/api/application/servers?page=${page}`, {
          headers: { 'Authorization': `Bearer ${pltaKey}` },
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
            headers: { 'Authorization': `Bearer ${pltcKey}` },
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
        if (stopTime && (now - stopTime < 5 * 60 * 1000)) { serversSkippedStop++; continue; }
        const isStopped = await stopServer(srv.serverUuid, panelDomain, pltcKey);
        if (isStopped) {
          const notification =
            `<blockquote>${E.bolt} <b>AUTO-STOP CPU - ${serverVersion.toUpperCase()}</b>\n` +
            `${E.dot} Server: <b>${srv.serverName}</b> (ID: <code>${srv.serverId}</code>)\n` +
            `${E.dot} CPU: ${srv.cpuUsage.toFixed(2)}% (Limit: ${srv.cpuLimit}%)</blockquote>`;
          try { await botInstance.api.sendMessage(recipientId, notification, { parse_mode: 'HTML' }); } catch (e) {}
          statusData[serverVersion].auto_stop[srv.serverId] = now;
        } else { serversFailedToStop++; }
      }

      const finalMessage =
        `<blockquote>${E.check} <b>AUTO-CHECK SELESAI - ${serverVersion.toUpperCase()}</b>\n` +
        `${E.dot} Dicek: <b>${totalServersChecked}</b>\n` +
        `${E.dot} Dihentikan: <b>${abnormalCpuServers.length - serversFailedToStop - serversSkippedStop}</b>\n` +
        `${E.dot} Gagal: <b>${serversFailedToStop}</b>\n` +
        `${E.dot} Dilewati: <b>${serversSkippedStop}</b></blockquote>`;
      await botInstance.api.editMessageText(recipientId, initialMessageId, finalMessage, { parse_mode: 'HTML' });

    } catch (err) {
      console.error(`Error auto-check CPU ${serverVersion}:`, err.message);
      const errorMsg = `<blockquote>${E.cross} <b>AUTO-CHECK GAGAL - ${serverVersion.toUpperCase()}</b>\n${E.dot} ${err.message}</blockquote>`;
      try {
        if (initialMessageId) await botInstance.api.editMessageText(recipientId, initialMessageId, errorMsg, { parse_mode: 'HTML' });
        else await botInstance.api.sendMessage(recipientId, errorMsg, { parse_mode: 'HTML' });
      } catch (e) {}
    }
  }
  writeJson(DB.CPU_CHECK, statusData);
}


// ===================== MAIN MESSAGE HANDLER =====================

async function handleMessage(xy, command, sleep, isOwner, isSeller, isPartner, isReseller, reply, owners, seller, sellerPath, q, text, InlineKeyboard, paket, isGroupAdmins, mess, warnDB, saveWarnDB, pendingWarns, InputFile, botToken, CatBox, sender, db_respon_list, generateReadableString, isBotGroupAdmins) {

  const userId = xy.from.id;

  // Context object passed to all handlers
  const ctx = {
    command,
    text,
    q,
    reply,
    mess,
    isOwner,
    isSeller,
    isPartner,
    isReseller,
    isGroupAdmins,
    isBotGroupAdmins,
    owners,
    seller,
    sellerPath,
    warnDB,
    saveWarnDB,
    pendingWarns,
    InputFile,
    InlineKeyboard,
    botToken,
    CatBox,
    sender,
    paket,
    db_respon_list,
    generateReadableString,
    sleep,
  };

  // Route to appropriate handler
  const handler = handlerMap.get(command);
  if (handler) {
    return await handler(xy, ctx);
  }

  // No handler found - command not recognized (silent)
}

module.exports = { handleMessage, checkAndStopAbnormalCpu };
