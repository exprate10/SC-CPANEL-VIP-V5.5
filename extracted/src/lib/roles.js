'use strict';

const fs = require('fs');
const path = require('path');

const ROLES_DB = path.join(__dirname, '../database/roles.json');

const ROLE_HIERARCHY = [
    'address',
    'admin',
    'pt',
    'ress',
    'own',
    'tk',
    'ceo',
    'dev',
    'vmanager',
    'pemilik',
];

const ROLE_LABELS = {
    address: 'Address',
    admin: 'Admin',
    pt: 'Partner',
    ress: 'Reseller',
    own: 'Owner',
    tk: 'TK',
    ceo: 'CEO',
    dev: 'Developer',
    vmanager: 'V-Manager',
    pemilik: 'Pemilik',
};

const AUTO_PROMOTE_ROLES = ['own', 'tk', 'ceo', 'dev', 'vmanager', 'pemilik'];

const CAN_USE_COMMANDS_ROLES = ['own', 'tk', 'ceo', 'dev', 'vmanager', 'pemilik'];

const CAN_CREATE_PANEL_ROLES = ['ress', 'pt', 'own', 'tk', 'ceo', 'dev', 'vmanager', 'pemilik'];

const CAN_CREATE_ADMIN_PANEL_ROLES = ['vmanager', 'pemilik'];

const CAN_ACCESS_KEYS_ROLES = ['own', 'tk', 'ceo', 'dev', 'vmanager', 'pemilik'];

const LIMITED_COMMAND_ROLES = ['ress', 'pt'];

const NO_COMMAND_ROLES = ['address', 'admin'];


function ensureRolesDB() {
    if (!fs.existsSync(ROLES_DB)) {
        fs.mkdirSync(path.dirname(ROLES_DB), { recursive: true });
        fs.writeFileSync(ROLES_DB, JSON.stringify([], null, 2));
    }
}

function readRoles() {
    ensureRolesDB();
    try {
        return JSON.parse(fs.readFileSync(ROLES_DB, 'utf8'));
    } catch {
        return [];
    }
}

function saveRoles(data) {
    ensureRolesDB();
    fs.writeFileSync(ROLES_DB, JSON.stringify(data, null, 2));
}

function addRole(userId, role, addedBy) {
    if (!ROLE_HIERARCHY.includes(role)) return { success: false, error: 'Role nggak valid.' };

    const roles = readRoles();
    const uid = String(userId);
    const existing = roles.find(r => r.userId === uid && r.role === role);

    if (existing) return { success: false, error: `User udah punya role ${ROLE_LABELS[role]}.` };

    roles.push({
        userId: uid,
        role,
        addedBy: String(addedBy),
        addedAt: Date.now(),
    });

    saveRoles(roles);
    return { success: true, role, label: ROLE_LABELS[role] };
}

function removeRole(userId, role) {
    if (!ROLE_HIERARCHY.includes(role)) return { success: false, error: 'Role nggak valid.' };

    const roles = readRoles();
    const uid = String(userId);
    const idx = roles.findIndex(r => r.userId === uid && r.role === role);

    if (idx === -1) return { success: false, error: `User nggak punya role ${ROLE_LABELS[role]}.` };

    roles.splice(idx, 1);
    saveRoles(roles);
    return { success: true };
}

function getUserRoles(userId) {
    const roles = readRoles();
    const uid = String(userId);
    return roles.filter(r => r.userId === uid).map(r => r.role);
}

function getHighestRole(userId) {
    const userRoles = getUserRoles(userId);
    if (userRoles.length === 0) return null;

    let highest = -1;
    for (const role of userRoles) {
        const idx = ROLE_HIERARCHY.indexOf(role);
        if (idx > highest) highest = idx;
    }

    return highest >= 0 ? ROLE_HIERARCHY[highest] : null;
}

function hasRole(userId, role) {
    return getUserRoles(userId).includes(role);
}

function hasMinRole(userId, minRole) {
    const minIdx = ROLE_HIERARCHY.indexOf(minRole);
    if (minIdx === -1) return false;

    const userRoles = getUserRoles(userId);
    for (const role of userRoles) {
        const idx = ROLE_HIERARCHY.indexOf(role);
        if (idx >= minIdx) return true;
    }
    return false;
}

function canUseCommands(userId) {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => CAN_USE_COMMANDS_ROLES.includes(r));
}

function canCreatePanel(userId) {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => CAN_CREATE_PANEL_ROLES.includes(r));
}

function canCreateAdminPanel(userId) {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => CAN_CREATE_ADMIN_PANEL_ROLES.includes(r));
}

function canAccessKeys(userId) {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => CAN_ACCESS_KEYS_ROLES.includes(r));
}

function shouldAutoPromote(userId) {
    const userRoles = getUserRoles(userId);
    return userRoles.some(r => AUTO_PROMOTE_ROLES.includes(r));
}

function isLimitedRole(userId) {
    const userRoles = getUserRoles(userId);
    const highest = getHighestRole(userId);
    return LIMITED_COMMAND_ROLES.includes(highest);
}

function isNoCommandRole(userId) {
    const userRoles = getUserRoles(userId);
    if (userRoles.length === 0) return true;
    const highest = getHighestRole(userId);
    return NO_COMMAND_ROLES.includes(highest);
}

function getRolesByType(role) {
    const roles = readRoles();
    return roles.filter(r => r.role === role);
}

function getAllRolesFormatted() {
    const roles = readRoles();
    const grouped = {};

    for (const r of roles) {
        if (!grouped[r.role]) grouped[r.role] = [];
        grouped[r.role].push(r);
    }

    return grouped;
}

function getRoleStats() {
    const roles = readRoles();
    const stats = {};

    for (const role of ROLE_HIERARCHY) {
        stats[role] = roles.filter(r => r.role === role).length;
    }

    stats.total = roles.length;
    return stats;
}


module.exports = {
    ROLE_HIERARCHY,
    ROLE_LABELS,
    AUTO_PROMOTE_ROLES,
    CAN_USE_COMMANDS_ROLES,
    CAN_CREATE_PANEL_ROLES,
    CAN_CREATE_ADMIN_PANEL_ROLES,
    CAN_ACCESS_KEYS_ROLES,
    LIMITED_COMMAND_ROLES,
    NO_COMMAND_ROLES,
    addRole,
    removeRole,
    getUserRoles,
    getHighestRole,
    hasRole,
    hasMinRole,
    canUseCommands,
    canCreatePanel,
    canCreateAdminPanel,
    canAccessKeys,
    shouldAutoPromote,
    isLimitedRole,
    isNoCommandRole,
    getRolesByType,
    getAllRolesFormatted,
    getRoleStats,
    readRoles,
    saveRoles,
};
