/**
 * SC-CPANEL VIP V5.5 - Role System
 * Modern role-based access control for panel operations
 */

const fs = require('fs');

const ROLE_FILES = {
  owner: './owner.json',
  partner: './src/database/partner.json',
  reseller: './src/database/reseller.json',
  seller: './src/database/seller.json',
  premium: './src/database/premium.json',
};

function loadRoleData() {
  const data = {};
  for (const [key, filePath] of Object.entries(ROLE_FILES)) {
    try {
      if (fs.existsSync(filePath)) {
        data[key] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } else {
        data[key] = [];
      }
    } catch (e) {
      data[key] = [];
    }
  }
  return data;
}

function getUserRole(userId) {
  const userIdStr = String(userId);
  const data = loadRoleData();

  if (Array.isArray(data.owner) && data.owner.includes(userIdStr)) return 'owner';
  if (Array.isArray(data.premium) && data.premium.includes(userIdStr)) return 'premium';
  if (Array.isArray(data.seller) && data.seller.some(s => String(s.id) === userIdStr)) return 'seller';
  if (Array.isArray(data.partner) && data.partner.some(p => String(p.id) === userIdStr)) return 'partner';
  if (Array.isArray(data.reseller) && data.reseller.some(r => String(r.id) === userIdStr)) return 'reseller';
  return 'user';
}

/**
 * Check if user can create panel (1gb-10gb, unli) on a specific server version
 * Allowed: owner, premium, seller, partner (on that server), reseller (on that server)
 */
function canCreatePanel(userId, serverVersion) {
  const userIdStr = String(userId);
  const data = loadRoleData();

  if (data.owner.includes(userIdStr)) return true;
  if (data.premium.includes(userIdStr)) return true;
  if (data.seller.some(s => String(s.id) === userIdStr)) return true;
  if (data.partner.some(p => String(p.id) === userIdStr && p.server === serverVersion)) return true;
  if (data.reseller.some(r => String(r.id) === userIdStr && r.server === serverVersion)) return true;

  return false;
}

/**
 * Check if user can create admin panel / manage server resources
 * Allowed: owner, partner (on that server)
 */
function canCreateAdminPanel(userId, serverVersion) {
  const userIdStr = String(userId);
  const data = loadRoleData();

  if (data.owner.includes(userIdStr)) return true;
  if (data.partner.some(p => String(p.id) === userIdStr && p.server === serverVersion)) return true;

  return false;
}

/**
 * Check if user can access panel keys/credentials (list server, list user, etc.)
 * Allowed: owner, partner (on that server), reseller (on that server), premium
 */
function canAccessKeys(userId, serverVersion) {
  const userIdStr = String(userId);
  const data = loadRoleData();

  if (data.owner.includes(userIdStr)) return true;
  if (data.premium.includes(userIdStr)) return true;
  if (data.partner.some(p => String(p.id) === userIdStr && p.server === serverVersion)) return true;
  if (data.reseller.some(r => String(r.id) === userIdStr && r.server === serverVersion)) return true;

  return false;
}

/**
 * Check if user is owner
 */
function isOwnerRole(userId) {
  const userIdStr = String(userId);
  const data = loadRoleData();
  return data.owner.includes(userIdStr);
}

/**
 * Legacy compatibility - checkUserRole
 */
function checkUserRole(userId, requiredRoles, serverVersion) {
  const userIdStr = String(userId);
  const data = loadRoleData();

  if (requiredRoles.includes('owner') && data.owner.includes(userIdStr)) return true;
  if ((requiredRoles.includes('reseller') || requiredRoles.includes('seller')) && data.premium.includes(userIdStr)) return true;
  if (requiredRoles.includes('partner') && data.partner.some(p => String(p.id) === userIdStr && p.server === serverVersion)) return true;
  if (requiredRoles.includes('reseller') && data.reseller.some(r => String(r.id) === userIdStr && r.server === serverVersion)) return true;
  if (requiredRoles.includes('seller') && data.seller.some(s => String(s.id) === userIdStr)) return true;

  return false;
}

module.exports = {
  getUserRole,
  canCreatePanel,
  canCreateAdminPanel,
  canAccessKeys,
  isOwnerRole,
  checkUserRole,
  loadRoleData,
  ROLE_FILES,
};
