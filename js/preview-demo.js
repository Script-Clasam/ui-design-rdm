/* ==========================================================================
   APERCU HORS JEU — donnees de demonstration
   --------------------------------------------------------------------------
   Ce fichier ne sert qu'a regarder l'interface dans un navigateur : il se
   desactive completement des que la page tourne dans RedM (CEF expose
   invokeNative / GetParentResourceName). Aucun appel reseau, aucune ecriture
   d'etat : il ne fait qu'envoyer a la page les memes messages que le client
   Lua enverrait, avec des donnees fictives.

   Supprimez ce fichier et sa ligne <script> dans index.html si vous ne
   voulez pas l'embarquer dans la ressource.
   ========================================================================== */
(function () {
    'use strict';

    var inGame = !!(window.invokeNative || window.GetParentResourceName);
    if (inGame) return;

    /* Le NUI parle a la page par window.postMessage : on fait pareil. */
    function send(payload) { window.postMessage(payload, '*'); }

    var now = Math.floor(Date.now() / 1000);
    var hoursAgo = function (h) { return now - h * 3600; };

    var GRADES = [
        { grade: 4, name: 'Patron',        label: 'Patron',        salary: 480, permissions: { canRecruit: true, canFire: true, canManageMoney: true, canViewAccounts: true, canManageGold: true, canViewMembers: true, canViewHistory: true, canEditGrades: true, canUpgradeStorage: true, canAccessInventory: true } },
        { grade: 3, name: 'Contremaitre',  label: 'Contremaitre',  salary: 260, permissions: { canRecruit: true, canFire: true, canViewAccounts: true, canViewMembers: true, canViewHistory: true, canAccessInventory: true } },
        { grade: 2, name: 'Compagnon',     label: 'Compagnon',     salary: 155, permissions: { canViewMembers: true, canAccessInventory: true } },
        { grade: 1, name: 'Apprenti',      label: 'Apprenti',      salary: 90,  permissions: { canViewMembers: true } },
        { grade: 0, name: 'Journalier',    label: 'Journalier',    salary: 45,  permissions: {} }
    ];

    var EMPLOYEES = [
        { identifier: 'char:1', charidentifier: 1, name: 'Abigail Marston',  grade: 3, gradeName: 'Contremaitre', online: true,  lastSeenTimestamp: hoursAgo(0) },
        { identifier: 'char:2', charidentifier: 2, name: 'Josiah Trelawny',  grade: 2, gradeName: 'Compagnon',    online: true,  lastSeenTimestamp: hoursAgo(1) },
        { identifier: 'char:3', charidentifier: 3, name: 'Sadie Adler',      grade: 2, gradeName: 'Compagnon',    online: false, lastSeenTimestamp: hoursAgo(9) },
        { identifier: 'char:4', charidentifier: 4, name: 'Charles Smith',    grade: 1, gradeName: 'Apprenti',     online: true,  lastSeenTimestamp: hoursAgo(2) },
        { identifier: 'char:5', charidentifier: 5, name: 'Tilly Jackson',    grade: 1, gradeName: 'Apprenti',     online: false, lastSeenTimestamp: hoursAgo(31) },
        { identifier: 'char:6', charidentifier: 6, name: 'Uncle Jeremiah',   grade: 0, gradeName: 'Journalier',   online: false, lastSeenTimestamp: hoursAgo(74) },
        { identifier: 'char:7', charidentifier: 7, name: 'Karen Jones',      grade: 0, gradeName: 'Journalier',   online: true,  lastSeenTimestamp: hoursAgo(0) },
        { identifier: 'char:8', charidentifier: 8, name: 'Lenny Summers',    grade: 2, gradeName: 'Compagnon',    online: false, lastSeenTimestamp: hoursAgo(17) }
    ];

    var HISTORY = [
        { id: 1, actionType: 'deposit',        actorName: 'Abigail Marston', targetName: '', amount: 1250.00, timestamp: hoursAgo(1) },
        { id: 2, actionType: 'withdraw',       actorName: 'Josiah Trelawny', targetName: '', amount: 340.50,  timestamp: hoursAgo(3) },
        { id: 3, actionType: 'hire',           actorName: 'Abigail Marston', targetName: 'Karen Jones',   timestamp: hoursAgo(6) },
        { id: 4, actionType: 'promote',        actorName: 'Abigail Marston', targetName: 'Charles Smith', oldValue: 'Journalier', newValue: 'Apprenti', timestamp: hoursAgo(11) },
        { id: 5, actionType: 'deposit_gold',   actorName: 'Sadie Adler',     targetName: '', amount: 12.75,   timestamp: hoursAgo(20) },
        { id: 6, actionType: 'salary',         actorName: 'Systeme',         targetName: '', amount: 1030.00, timestamp: hoursAgo(24) },
        { id: 7, actionType: 'upgrade_storage', actorName: 'Abigail Marston', targetName: '', amount: 750.00, timestamp: hoursAgo(38) },
        { id: 8, actionType: 'fire',           actorName: 'Abigail Marston', targetName: 'Micah Bell',    timestamp: hoursAgo(52) },
        { id: 9, actionType: 'withdraw_gold',  actorName: 'Abigail Marston', targetName: '', amount: 4.00,   timestamp: hoursAgo(61) },
        { id: 10, actionType: 'bonus',         actorName: 'Abigail Marston', targetName: 'Tilly Jackson', amount: 80.00, timestamp: hoursAgo(70) }
    ];

    var COMPANY = {
        name: 'smithy',
        label: 'Forge de Valentine',
        grade: 4,
        gradeName: 'Patron',
        onDuty: true,
        charidentifier: 1,
        paymentInterval: 60,
        storageSlots: 25,
        money: 48260.40,
        gold: 132.25,
        grades: GRADES,
        employees: EMPLOYEES,
        history: HISTORY,
        permissions: GRADES[0].permissions
    };

    var STATS = {
        totalEmployees: EMPLOYEES.length,
        onlineEmployees: EMPLOYEES.filter(function (e) { return e.online; }).length,
        onDutyEmployees: 3,
        money: COMPANY.money,
        gold: COMPANY.gold,
        gradeDistribution: GRADES.map(function (g) {
            return { grade: g.grade, name: g.name, count: EMPLOYEES.filter(function (e) { return e.grade === g.grade; }).length };
        }).reverse(),
        recentActivity: HISTORY.slice(0, 6).map(function (h) {
            return { actionType: h.actionType, actorName: h.actorName, targetName: h.targetName, amount: h.amount, timestamp: h.timestamp };
        })
    };

    var NEARBY = [
        { id: 12, serverId: 12, name: 'Arthur Morgan',   identifier: 'steam:110000100000001', distance: 3.4,  job: 'unemployed' },
        { id: 27, serverId: 27, name: 'Mary-Beth Gaskill', identifier: 'steam:110000100000002', distance: 7.1,  job: 'unemployed' },
        { id: 31, serverId: 31, name: 'Bill Williamson', identifier: 'steam:110000100000003', distance: 12.8, job: 'butcher' }
    ];

    function boot() {
        send({ action: 'openMenu', data: COMPANY });
        send({ action: 'updateData', data: COMPANY });
        send({ action: 'updateEmployees', employees: EMPLOYEES });
        send({ action: 'updateCompanyData', money: COMPANY.money, gold: COMPANY.gold, grades: GRADES });
        send({ action: 'receiveGrades', grades: GRADES });
        send({ action: 'updateHistory', history: HISTORY });
        send({ action: 'updateDashboardStats', stats: STATS });
        send({ action: 'updateNearbyPlayers', players: NEARBY });
        send({ action: 'updateStorageSlots', slots: COMPANY.storageSlots });
    }

    if (document.readyState === 'complete') {
        setTimeout(boot, 120);
    } else {
        window.addEventListener('load', function () { setTimeout(boot, 120); });
    }
})();
