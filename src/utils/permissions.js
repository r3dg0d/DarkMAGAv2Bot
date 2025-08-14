const { roles } = require('../config');

// Extra staff roles
const EXTRA_STAFF_ROLE_IDS = [
    '1386639558636208228', // custom staff role 1
    '1377575771073417257'  // custom staff role 2
];

function hasExtraStaffRole(member) {
    return EXTRA_STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

// Permission check functions
function hasRole(member, roleId) {
    return member.roles.cache.has(roleId);
}

function hasTrialModRole(member) {
    return hasRole(member, roles.trialMod) || 
           hasRole(member, roles.mod) || 
           hasRole(member, roles.executiveMod) || 
           hasRole(member, roles.coFounder) || 
           hasRole(member, roles.founder) ||
           hasExtraStaffRole(member);
}

function hasModRole(member) {
    return hasRole(member, roles.mod) || 
           hasRole(member, roles.executiveMod) || 
           hasRole(member, roles.coFounder) || 
           hasRole(member, roles.founder) ||
           hasExtraStaffRole(member);
}

function hasExecutiveModRole(member) {
    return hasRole(member, roles.executiveMod) || 
           hasRole(member, roles.coFounder) || 
           hasRole(member, roles.founder) ||
           hasExtraStaffRole(member);
}

function hasStaffRole(member) {
    return hasRole(member, roles.trialMod) || 
           hasRole(member, roles.mod) || 
           hasRole(member, roles.executiveMod) || 
           hasRole(member, roles.minecraftStaff) || 
           hasRole(member, roles.coFounder) || 
           hasRole(member, roles.founder) ||
           hasExtraStaffRole(member);
}

function hasFounderRole(member) {
    return hasRole(member, roles.founder);
}

function hasMagaRole(member) {
    return hasRole(member, roles.maga);
}

// Permission decorators for slash commands
function requireTrialMod() {
    return {
        type: 'permission',
        check: hasTrialModRole
    };
}

function requireMod() {
    return {
        type: 'permission',
        check: hasModRole
    };
}

function requireExecutiveMod() {
    return {
        type: 'permission',
        check: hasExecutiveModRole
    };
}

function requireStaff() {
    return {
        type: 'permission',
        check: hasStaffRole
    };
}

function requireFounder() {
    return {
        type: 'permission',
        check: hasFounderRole
    };
}

module.exports = {
    hasRole,
    hasTrialModRole,
    hasModRole,
    hasExecutiveModRole,
    hasStaffRole,
    hasFounderRole,
    hasMagaRole,
    requireTrialMod,
    requireMod,
    requireExecutiveMod,
    requireStaff,
    requireFounder
}; 