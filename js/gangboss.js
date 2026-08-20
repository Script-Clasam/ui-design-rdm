/* ================================================
   GANG BOSS-MENU — logique NUI dédiée (IIFE)
   Réutilise _T() pour les traductions. Ne touche pas au boss-menu jobs.
   ================================================ */
(function () {
    'use strict';

    const RES = 'cactus_ultimate';
    let $menu = null;

    let state = {
        gang: null,
        perms: {},
        grades: [],
        bankMode: 'dirty',
        bankBalance: 0,
        memberCount: 0,
        onlineCount: 0,
        activityCount: 0,
    };

    // --- Helpers ---------------------------------
    function t(key, fallback) {
        if (typeof _T === 'function') {
            const v = _T(key);
            if (v && v !== key) return v;
        }
        return fallback || key;
    }

    function post(cb, data) {
        return fetch('https://' + RES + '/' + cb, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(data || {}),
        }).catch(function () {});
    }

    function money(n) {
        n = Number(n) || 0;
        return '$' + n.toLocaleString('fr-FR');
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    let toastTimer = null;
    function toast(msg, type) {
        let el = document.getElementById('gcbossToast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gcbossToast';
            el.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);z-index:60000;' +
                'padding:12px 22px;border-radius:10px;font:600 14px "Segoe UI",sans-serif;color:#fff;' +
                'box-shadow:0 8px 24px rgba(0,0,0,.5);transition:opacity .2s ease;';
            document.body.appendChild(el);
        }
        el.style.background = type === 'error' ? '#a50101' : (type === 'success' ? '#9a948a' : '#9a948a');
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.style.opacity = '0'; }, 2600);
    }

    // --- Translate static labels -----------------
    function applyStaticTranslations() {
        $menu.querySelectorAll('[data-gct]').forEach(function (node) {
            const key = node.getAttribute('data-gct');
            const v = t(key, node.textContent);
            if (v) node.textContent = v;
        });
    }

    // --- Open / Close ----------------------------
    function open(data) {
        state.gang = data.gang;
        state.perms = data.permissions || {};
        state.grades = data.grades || [];
        state.bankMode = data.bankMode || 'dirty';

        if (data.locale && typeof setLocale === 'function') {
            try { setLocale(data.locale); } catch (e) {}
        }
        applyStaticTranslations();

        document.getElementById('gcbossGangName').textContent = data.label || data.gang || 'Gang';
        const gradeBadge = document.getElementById('gcbossGradeLabel');
        gradeBadge.textContent = (data.isBoss ? t('gcboss_boss', 'Boss') + ' · ' : '') + (data.gradeLabel || '');

        // Permission gating
        document.getElementById('gcbossRecruitBtn').style.display = state.perms.canRecruit ? '' : 'none';
        setTabVisible('bank', !!state.perms.canManageMoney);
        setTabVisible('history', !!state.perms.canViewHistory);

        switchTab('members');
        $menu.style.display = 'flex';

        post('gcboss_getMembers', {});
        // Charge le solde d'argent sale pour la barre de stats (si autorisé)
        if (state.perms.canManageMoney) post('gcboss_getBank', {});
    }

    // --- Barre de stats (QG illégal) -------------
    function setStat(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function close() {
        $menu.style.display = 'none';
        post('gcboss_close', {});
    }

    function setTabVisible(tab, visible) {
        const btn = $menu.querySelector('.gcboss-tab[data-gcbtab="' + tab + '"]');
        if (btn) btn.style.display = visible ? '' : 'none';
    }

    function switchTab(tab) {
        $menu.querySelectorAll('.gcboss-tab').forEach(function (b) {
            b.classList.toggle('active', b.getAttribute('data-gcbtab') === tab);
        });
        const map = { members: 'gcbossMembersPanel', bank: 'gcbossBankPanel', notoriety: 'gcbossNotorietyPanel', history: 'gcbossHistoryPanel' };
        Object.keys(map).forEach(function (k) {
            const p = document.getElementById(map[k]);
            if (p) p.classList.toggle('active', k === tab);
        });
        if (tab === 'bank') {
            post('gcboss_getBank', {});
            post('gcboss_getHistory', { page: 1 });
        }
        if (tab === 'history') post('gcboss_getHistory', { page: 1 });
        if (tab === 'notoriety') {
            post('gcboss_getMembers', {});
            post('gcboss_getBank', {});
            post('gcboss_getHistory', { page: 1 });
            renderNotoriety();
        }
    }

    // --- Render members --------------------------
    function renderMembers(data) {
        const list = document.getElementById('gcbossMembersList');
        const members = (data && data.members) || [];
        if (state.grades && data && data.grades) state.grades = data.grades;

        const online = members.filter(function (m) { return m.online; }).length;
        state.memberCount = members.length;
        state.onlineCount = online;
        setStat('gcbossStatMembers', members.length);
        setStat('gcbossStatOnline', online);

        if (!members.length) {
            list.innerHTML = '<div class="gcboss-empty"><i class="fas fa-users-slash"></i><p>' +
                esc(t('gcboss_no_members', 'Aucun membre')) + '</p></div>';
            return;
        }

        let html = '';
        members.forEach(function (m) {
            const statusCls = m.online ? 'online' : 'offline';
            const initial = esc((m.name || '?').charAt(0).toUpperCase());
            const lastSeen = m.online
                ? '<span style="color:#f5f3ee;font-weight:600">' + esc(t('gcboss_online', 'En ligne')) + '</span>'
                : '<i class="fas fa-clock"></i> ' + esc(t('gcboss_offline', 'Hors ligne'));

            let actions = '';
            if (state.perms.canPromote) {
                let opts = '';
                state.grades.forEach(function (g) {
                    const sel = (Number(g.grade) === Number(m.grade)) ? ' selected' : '';
                    opts += '<option value="' + esc(g.grade) + '"' + sel + '>' + esc(g.label) + '</option>';
                });
                actions += '<select class="gcboss-grade-select" data-cid="' + esc(m.citizenid) + '">' + opts + '</select>';
            }
            if (state.perms.canFire) {
                actions += '<button class="gcboss-action-btn gcboss-fire-btn" data-fire="' + esc(m.citizenid) +
                    '"><i class="fas fa-times-circle"></i> ' + esc(t('gcboss_fire', 'Virer')) + '</button>';
            }

            html += '<div class="gcboss-member-card">' +
                '<div class="gcboss-member-avatar">' +
                    '<span class="gcboss-member-initial">' + initial + '</span>' +
                    '<div class="gcboss-member-status ' + statusCls + '"></div>' +
                '</div>' +
                '<div class="gcboss-member-details">' +
                    '<div class="gcboss-member-name-modern">' + esc(m.name) + '</div>' +
                    '<div class="gcboss-member-position">' + esc(m.gradeLabel || ('Grade ' + m.grade)) + '</div>' +
                    '<div class="gcboss-member-last-seen">' + lastSeen + '</div>' +
                '</div>' +
                '<div class="gcboss-member-actions-modern">' + actions + '</div>' +
            '</div>';
        });
        list.innerHTML = html;
    }

    // --- Render bank -----------------------------
    function renderBank(data) {
        const bal = Number((data && data.balance) || 0);
        state.bankBalance = bal;
        document.getElementById('gcbossBankAmount').textContent = money(bal);
        setStat('gcbossStatDirty', money(bal));
        renderNotoriety();
    }

    // --- Notoriété du gang -----------------------
    // Rangs cumulatifs (seuil minimal de score requis)
    const NOTO_RANKS = [
        { min: 0, key: 'gcboss_noto_rank_1', label: 'Petite frappe' },
        { min: 50, key: 'gcboss_noto_rank_2', label: 'Bande de hors-la-loi' },
        { min: 150, key: 'gcboss_noto_rank_3', label: 'Gang notoire' },
        { min: 350, key: 'gcboss_noto_rank_4', label: 'Syndicat du crime' },
        { min: 700, key: 'gcboss_noto_rank_5', label: 'Empire criminel' },
    ];

    function computeNotoScore() {
        const crew = (state.memberCount || 0) * 15;
        const treasure = Math.floor((state.bankBalance || 0) / 500);
        const activity = (state.activityCount || 0) * 3;
        return crew + treasure + activity;
    }

    function renderNotoriety() {
        const panel = document.getElementById('gcbossNotorietyPanel');
        if (!panel) return;
        const score = computeNotoScore();

        // Rang courant + suivant
        let idx = 0;
        for (let i = 0; i < NOTO_RANKS.length; i++) {
            if (score >= NOTO_RANKS[i].min) idx = i;
        }
        const cur = NOTO_RANKS[idx];
        const next = NOTO_RANKS[idx + 1] || null;

        setStat('gcbossNotoRank', t(cur.key, cur.label));
        setStat('gcbossNotoScore', (score).toLocaleString('fr-FR'));
        setStat('gcbossNotoMembers', state.memberCount || 0);
        setStat('gcbossNotoTreasure', money(state.bankBalance || 0));
        setStat('gcbossNotoActivity', state.activityCount || 0);

        const bar = document.getElementById('gcbossNotoBar');
        const nextEl = document.getElementById('gcbossNotoNext');
        if (next) {
            const span = next.min - cur.min;
            const done = Math.max(0, Math.min(1, (score - cur.min) / (span || 1)));
            if (bar) bar.style.width = Math.round(done * 100) + '%';
            if (nextEl) {
                nextEl.innerHTML = '<i class="fas fa-arrow-trend-up"></i> ' +
                    esc(t('gcboss_noto_next', 'Prochain rang')) + ' : <strong>' + esc(t(next.key, next.label)) +
                    '</strong> (' + Math.max(0, next.min - score).toLocaleString('fr-FR') + ' ' + esc(t('gcboss_noto_points_short', 'pts')) + ')';
            }
        } else {
            if (bar) bar.style.width = '100%';
            if (nextEl) nextEl.innerHTML = '<i class="fas fa-crown"></i> ' + esc(t('gcboss_noto_max', 'Rang maximal atteint'));
        }
    }

    // --- Render bank transactions (dépôts/retraits) ---
    function renderBankTx(rows) {
        const list = document.getElementById('gcbossBankTxList');
        if (!list) return;
        const tx = (rows || []).filter(function (r) {
            return r.actionType === 'gang_deposit' || r.actionType === 'gang_withdraw';
        });
        if (!tx.length) {
            list.innerHTML = '<div class="gcboss-empty gcboss-empty-sm"><i class="fas fa-receipt"></i><p>' +
                esc(t('gcboss_bank_no_tx', 'Aucune transaction')) + '</p></div>';
            return;
        }
        let html = '';
        tx.slice(0, 12).forEach(function (r) {
            const isDep = r.actionType === 'gang_deposit';
            const cls = isDep ? 'pos' : 'warn';
            const icon = isDep ? 'fa-arrow-down' : 'fa-arrow-up';
            const sign = isDep ? '+' : '-';
            const label = isDep ? t('gcboss_hist_deposit', 'Dépôt') : t('gcboss_hist_withdraw', 'Retrait');
            const amt = Number(r.amount) || 0;
            html += '<div class="gcboss-bank-tx-row">' +
                '<div class="gcboss-bank-tx-icon ' + cls + '"><i class="fas ' + icon + '"></i></div>' +
                '<div class="gcboss-bank-tx-main">' +
                    '<div class="gcboss-bank-tx-label">' + esc(label) + '</div>' +
                    '<div class="gcboss-bank-tx-meta">' + esc(r.actorName || t('gcboss_hist_system', 'Système')) + ' · ' + esc(r.timestamp || '') + '</div>' +
                '</div>' +
                '<div class="gcboss-bank-tx-amount ' + cls + '">' + sign + money(Math.abs(amt)) + '</div>' +
            '</div>';
        });
        list.innerHTML = html;
    }

    // --- Render history --------------------------
    // Métadonnées par type d'action : libellé + icône + classe couleur
    function actionMeta(type) {
        const map = {
            gang_recruit: { label: t('gcboss_hist_recruit', 'Recrutement'), icon: 'fa-user-plus', cls: 'pos' },
            gang_fire: { label: t('gcboss_hist_fire', 'Exclusion'), icon: 'fa-user-minus', cls: 'neg' },
            gang_promote: { label: t('gcboss_hist_promote', 'Changement de grade'), icon: 'fa-user-gear', cls: 'gold' },
            gang_deposit: { label: t('gcboss_hist_deposit', 'Dépôt d\'argent sale'), icon: 'fa-sack-dollar', cls: 'pos' },
            gang_withdraw: { label: t('gcboss_hist_withdraw', 'Retrait d\'argent sale'), icon: 'fa-hand-holding-dollar', cls: 'warn' },
            gang_update: { label: t('gcboss_hist_update', 'Gang modifié'), icon: 'fa-pen', cls: 'muted' },
            gang_create: { label: t('gcboss_hist_create', 'Gang créé'), icon: 'fa-skull', cls: 'gold' },
            gang_delete: { label: t('gcboss_hist_delete', 'Gang supprimé'), icon: 'fa-trash', cls: 'neg' },
            gang_toggle: { label: t('gcboss_hist_toggle', 'Gang activé/désactivé'), icon: 'fa-power-off', cls: 'muted' },
            gang_harvest: { label: t('gcboss_hist_harvest', 'Récolte'), icon: 'fa-cannabis', cls: 'pos' },
            gang_process: { label: t('gcboss_hist_process', 'Traitement'), icon: 'fa-flask', cls: 'gold' },
            gang_sell: { label: t('gcboss_hist_sell', 'Vente de rue'), icon: 'fa-hand-holding-dollar', cls: 'pos' },
        };
        return map[type] || { label: type, icon: 'fa-clock-rotate-left', cls: 'muted' };
    }

    function renderHistory(data) {
        const list = document.getElementById('gcbossHistoryList');
        const rows = (data && data.rows) || [];
        state.activityCount = rows.length;
        renderBankTx(rows);
        renderNotoriety();
        if (!rows.length) {
            list.innerHTML = '<div class="gcboss-empty"><i class="fas fa-book-skull"></i><p>' +
                esc(t('gcboss_no_history', 'Aucune activité enregistrée')) + '</p></div>';
            return;
        }
        let html = '';
        rows.forEach(function (r) {
            const meta = actionMeta(r.actionType);
            const detail = r.targetName ? ('<span class="gcboss-history-target"> · ' + esc(r.targetName) + '</span>') : '';
            const amt = Number(r.amount);
            let amountHtml = '';
            if (amt && amt !== 0) {
                const sign = r.actionType === 'gang_withdraw' ? '-' : '+';
                amountHtml = '<div class="gcboss-history-amount ' + meta.cls + '">' + sign + money(Math.abs(amt)) + '</div>';
            }
            html += '<div class="gcboss-history-row">' +
                '<div class="gcboss-history-icon ' + meta.cls + '"><i class="fas ' + meta.icon + '"></i></div>' +
                '<div class="gcboss-history-main">' +
                    '<div class="gcboss-history-action">' + esc(meta.label) + '</div>' +
                    '<div class="gcboss-history-time">' + esc(r.actorName || t('gcboss_hist_system', 'Système')) + detail + ' · ' + esc(r.timestamp || '') + '</div>' +
                '</div>' +
                amountHtml +
            '</div>';
        });
        list.innerHTML = html;
    }

    // --- Init (différée jusqu'au DOM prêt, car le script est chargé avant le HTML) ---
    function init() {
        $menu = document.getElementById('gangBossMenu');
        if (!$menu) return;

        document.getElementById('gcbossCloseBtn').addEventListener('click', close);

    $menu.querySelectorAll('.gcboss-tab').forEach(function (b) {
        b.addEventListener('click', function () { switchTab(b.getAttribute('data-gcbtab')); });
    });

    document.getElementById('gcbossRecruitBtn').addEventListener('click', function () {
        post('gcboss_recruit', {});
    });

    // Delegated: fire + grade change
    document.getElementById('gcbossMembersList').addEventListener('click', function (e) {
        const fire = e.target.closest('[data-fire]');
        if (fire) {
            post('gcboss_fire', { citizenid: fire.getAttribute('data-fire') });
        }
    });
    document.getElementById('gcbossMembersList').addEventListener('change', function (e) {
        const sel = e.target.closest('.gcboss-grade-select');
        if (sel) {
            post('gcboss_setGrade', { citizenid: sel.getAttribute('data-cid'), grade: sel.value });
        }
    });

    // Puces de montant rapide + MAX
    $menu.querySelectorAll('.gcboss-bank-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            const raw = chip.getAttribute('data-amt');
            const input = document.getElementById('gcbossBankInput');
            if (raw === 'max') {
                input.value = Math.max(0, Math.floor(state.bankBalance || 0)) || '';
            } else {
                input.value = (parseInt(input.value, 10) || 0) + parseInt(raw, 10);
            }
        });
    });

    document.getElementById('gcbossDepositBtn').addEventListener('click', function () {
        const v = parseInt(document.getElementById('gcbossBankInput').value, 10);
        if (!v || v <= 0) { toast(t('gcboss_invalid_amount', 'Montant invalide'), 'error'); return; }
        post('gcboss_deposit', { amount: v });
        document.getElementById('gcbossBankInput').value = '';
    });
    document.getElementById('gcbossWithdrawBtn').addEventListener('click', function () {
        const v = parseInt(document.getElementById('gcbossBankInput').value, 10);
        if (!v || v <= 0) { toast(t('gcboss_invalid_amount', 'Montant invalide'), 'error'); return; }
        post('gcboss_withdraw', { amount: v });
        document.getElementById('gcbossBankInput').value = '';
    });

    document.addEventListener('keyup', function (e) {
        if (e.key === 'Escape' && $menu.style.display !== 'none') close();
    });

    // --- NUI messages ----------------------------
    window.addEventListener('message', function (event) {
        const d = event.data || {};
        switch (d.action) {
            case 'openGangBossMenu':
                open(d.data || {});
                break;
            case 'gc_receiveMembers':
                if ($menu.style.display !== 'none') renderMembers(d.data);
                break;
            case 'gc_receiveBank':
                if ($menu.style.display !== 'none') renderBank(d.data);
                break;
            case 'gc_receiveHistory':
                if ($menu.style.display !== 'none') renderHistory(d.data);
                break;
            case 'gcboss_noPlayerNear':
                toast(t('gcboss_no_player_near', 'Aucun joueur à proximité'), 'error');
                break;
            case 'gcboss_toast':
                if (d.msg) toast(d.msg, d.type || 'error');
                break;
        }
    });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
