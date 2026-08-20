(function($) {
    'use strict';

    // ================================================
    //  GANG CREATOR - Front-end (SPA)
    //  Miroir allégé du Job Creator, dédié aux gangs.
    //  Réutilise les classes visuelles jc-* ; utilise des classes
    //  interactives gc-* pour ne pas déclencher les handlers du jobcreator.
    // ================================================

    let allGangs = [];
    let selectedGang = null;
    let editingGang = null;
    let isCreatingNew = false;
    let activeSection = 'general';
    let currentView = 'list';   // 'list' | 'editor'
    let activePage = 'gangs';   // 'gangs' | 'history' | 'activities'
    let coordPicking = false;
    let gcPickerContext = null;  // sélecteurs cibles du picker (x/y/z/heading/rot/gizmo)
    let blipsList = [];          // liste des sprites de blips (blips/blips_list.json)
    // Activités illégales
    let allActivities = {};      // {actId: activity}
    let allGangsList = [];       // [{name, label}] pour picker de gangs
    let editingActivity = null;
    let selectedActivity = null;

    fetch('blips/blips_list.json').then(r => r.json()).then(list => { blipsList = list || []; }).catch(() => { blipsList = []; });

    function blipLabel(name) {
        return String(name || '').replace(/^blip_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    const PAGES = [
        { id: 'gangs',      label: 'gc_page_gangs',       icon: 'fa-skull' },
        { id: 'activities', label: 'gc_page_activities',  icon: 'fa-flask' },
        { id: 'history',    label: 'gc_page_history',     icon: 'fa-history' },
    ];

    const SECTIONS = [
        { id: 'general',     labelKey: 'jc_section_general',     icon: 'fa-info-circle' },
        { id: 'location',    labelKey: 'gc_section_location',    icon: 'fa-map-marker-alt' },
        { id: 'grades',      labelKey: 'jc_section_grades',      icon: 'fa-layer-group' },
        { id: 'permissions', labelKey: 'jc_section_permissions', icon: 'fa-shield-alt' },
        { id: 'stashes',     labelKey: 'gc_section_stashes',     icon: 'fa-box' },
        { id: 'props',       labelKey: 'gc_section_props',       icon: 'fa-cube' },
        { id: 'blips',       labelKey: 'gc_section_blips',       icon: 'fa-map-pin' },
        { id: 'harvest',     labelKey: 'gc_section_harvest',     icon: 'fa-cannabis' },
        { id: 'process',     labelKey: 'gc_section_process',     icon: 'fa-flask' },
        { id: 'sell',        labelKey: 'gc_section_sell',        icon: 'fa-hand-holding-dollar' },
        { id: 'steal',       labelKey: 'gc_section_steal',       icon: 'fa-hand' },
    ];

    const PERM_DEFS = [
        { key: 'openBossMenu',    label: 'jc_perm_open_boss_menu',   icon: 'fa-door-open',    def: 0 },
        { key: 'recruit',         label: 'jc_perm_recruit',          icon: 'fa-user-plus',    def: 3 },
        { key: 'promote',         label: 'jc_perm_promote',          icon: 'fa-arrow-up',     def: 3 },
        { key: 'fire',            label: 'jc_perm_fire',             icon: 'fa-user-times',   def: 3 },
        { key: 'manageMoney',     label: 'jc_perm_manage_money',     icon: 'fa-dollar-sign',  def: 3 },
        { key: 'viewHistory',     label: 'jc_perm_view_history',     icon: 'fa-history',      def: 0 },
        { key: 'editGrades',      label: 'jc_perm_edit_grades',      icon: 'fa-edit',         def: 3 },
        { key: 'accessInventory', label: 'jc_perm_access_inventory', icon: 'fa-box',          def: 0 },
    ];

    // ------------------------------------------------
    //  Helpers
    // ------------------------------------------------
    function esc(s) {
        if (s === null || s === undefined) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function T(key) {
        // Utilise le système de trad NUI global si dispo, sinon renvoie la clé.
        if (typeof _T === 'function') {
            return arguments.length > 1 ? _T.apply(null, arguments) : _T(key);
        }
        return key;
    }

    function showToast(msg, type) {
        const existing = $('.gc-toast');
        if (existing.length) existing.remove();
        const cls = type === 'error' ? 'jc-toast-error' : 'jc-toast-success';
        const $t = $('<div class="jc-toast gc-toast ' + cls + '">' + msg + '</div>');
        $('#gangCreatorContainer').append($t);
        setTimeout(() => $t.addClass('jc-toast-show'), 10);
        setTimeout(() => { $t.removeClass('jc-toast-show'); setTimeout(() => $t.remove(), 300); }, 3000);
    }

    function showConfirm(title, msg, onYes) {
        const ov = $('<div class="jc-confirm-overlay">'
            + '<div class="jc-confirm-box">'
            + '<h3>' + title + '</h3>'
            + '<p>' + msg + '</p>'
            + '<div class="jc-confirm-actions">'
            + '<button class="jc-btn jc-btn-delete gc-yes"><i class="fas fa-check"></i> ' + T('jc_btn_confirm') + '</button>'
            + '<button class="jc-btn jc-btn-toggle gc-no"><i class="fas fa-times"></i> ' + T('jc_btn_cancel') + '</button>'
            + '</div></div></div>');
        $('body').append(ov);
        ov.find('.gc-yes').on('click', () => { ov.remove(); onYes(); });
        ov.find('.gc-no').on('click', () => { ov.remove(); });
    }

    // ------------------------------------------------
    //  Messages NUI
    // ------------------------------------------------
    window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.action) return;

        if (data.action === 'openGangCreator') {
            if (data.locale && typeof setLocale === 'function') setLocale(data.locale);
            allGangs = data.gangs || [];
            selectedGang = null;
            editingGang = null;
            isCreatingNew = false;
            currentView = 'list';
            activePage = 'gangs';
            showUI();
            switchToPage('gangs');
        }

        if (data.action === 'refreshGangCreator') {
            allGangs = data.gangs || [];
            const selName = data.selectedName || (selectedGang ? selectedGang.name : null);
            if (currentView === 'list') {
                if (selName) selectedGang = allGangs.find(g => g.name === selName) || null;
                renderGangList($('.gc-search-input').val());
                renderPreview();
            } else if (currentView === 'editor') {
                if (selName) {
                    const fresh = allGangs.find(g => g.name === selName);
                    if (fresh) {
                        editingGang = JSON.parse(JSON.stringify(fresh));
                        selectedGang = fresh;
                        $('#gcEditingName').text(editingGang.label || editingGang.name);
                        renderSection(activeSection);
                    }
                }
            }
        }

        if (data.action === 'gc_receivePos') {
            if (data.coords) {
                const c = data.coords;
                if (gcPickerContext) {
                    const ctx = gcPickerContext;
                    if (ctx.xSel) $(ctx.xSel).val(c.x);
                    if (ctx.ySel) $(ctx.ySel).val(c.y);
                    if (ctx.zSel) $(ctx.zSel).val(c.z);
                    if (ctx.hSel && c.heading !== undefined) $(ctx.hSel).val(c.heading);
                    if (ctx.rotXSel && c.rotX !== undefined) $(ctx.rotXSel).val(c.rotX);
                    if (ctx.rotYSel && c.rotY !== undefined) $(ctx.rotYSel).val(c.rotY);
                    if (ctx.gizmoPlacedSel && c.gizmoPlaced !== undefined) $(ctx.gizmoPlacedSel).val(c.gizmoPlaced);
                    if (ctx.hoSel && c.heightOffset !== undefined) $(ctx.hoSel).val(c.heightOffset);
                } else {
                    $('#gcCoordX').val(c.x);
                    $('#gcCoordY').val(c.y);
                    $('#gcCoordZ').val(c.z);
                }
                $('#gangCreatorContainer').css('display', 'flex');
                $('.gc-minimize-banner').hide();
                coordPicking = false;
                if (editingGang) collectFormIntoEditing();
                gcPickerContext = null;
            }
        }

        if (data.action === 'gc_restore') {
            $('#gangCreatorContainer').css('display', 'flex');
            $('.gc-minimize-banner').hide();
            coordPicking = false;
        }

        if (data.action === 'gc_receiveHistory') {
            if (typeof window._gcHistoryHandler === 'function') {
                window._gcHistoryHandler(data.data || {});
            }
        }

        if (data.action === 'ga_openActivities') {
            if (data.locale && typeof setLocale === 'function') setLocale(data.locale);
            allActivities = data.activities || {};
            allGangsList = data.gangs || [];
            editingActivity = null;
            selectedActivity = null;
            showUI();
            switchToPage('activities');
        }

        if (data.action === 'ga_refreshActivities') {
            allActivities = data.activities || {};
            allGangsList = data.gangs || [];
            if (activePage === 'activities') renderActivitiesPage();
        }
    });

    // ------------------------------------------------
    //  UI show / hide
    // ------------------------------------------------
    function showUI() {
        $('#gangCreatorContainer').css('display', 'flex');
        $('.gc-minimize-banner').hide();
        renderMainNav();
        $('#gcMainNav .jc-logo-row span').text(T('gc_ui_title'));
        $('.gc-search-input').attr('placeholder', T('gc_ui_search_placeholder'));
        $('#gcNewGangBtn').html('<i class="fas fa-plus"></i> ' + T('gc_ui_create_new'));
        $('#gcCloseBtn').html('<i class="fas fa-times"></i> ' + T('jc_btn_close_panel'));
        $('#gcSwitchJobBtn').html('<i class="fas fa-hammer"></i> <span>' + T('jc_title') + '</span>');
        $('#gcPageGangs .jc-preview-empty p').text(T('gc_ui_select_preview'));
        $('#gcEditingIndicator .jc-editing-label').text(T('jc_editing_label'));
        $('#gcGoBackBtn').html('<i class="fas fa-arrow-left"></i> ' + T('jc_btn_go_back'));
        $('.gc-minimize-banner span').html('<i class="fas fa-skull" style="margin-right:6px;"></i>' + T('gc_ui_minimize_banner'));
    }

    function hideUI() {
        $('#gangCreatorContainer').hide();
        $('.gc-minimize-banner').hide();
        $.post('https://cactus_ultimate/gc_close', JSON.stringify({}));
    }

    function renderMainNav() {
        const nav = $('#gcMainNavItems');
        nav.empty();
        PAGES.forEach(p => {
            nav.append('<div class="gc-main-nav-item ' + (p.id === activePage ? 'active' : '') + '" data-page="' + p.id + '">'
                + '<i class="fas ' + p.icon + '"></i><span>' + T(p.label) + '</span></div>');
        });
    }

    function switchToPage(pageId) {
        activePage = pageId;
        currentView = 'list';
        $('#gcMainContent .jc-page').hide();
        $('.gc-main-nav-item').removeClass('active');
        $('.gc-main-nav-item[data-page="' + pageId + '"]').addClass('active');

        if (pageId === 'gangs') {
            $('#gcPageGangs').show();
            renderGangList();
            renderPreview();
        } else if (pageId === 'history') {
            $('#gcPageHistory').show();
            renderHistoryPage();
        } else if (pageId === 'activities') {
            $('#gcPageActivities').show();
            renderActivitiesPage();
        }
    }

    function switchToEditorView(gang, creating) {
        isCreatingNew = creating || false;
        editingGang = JSON.parse(JSON.stringify(gang));
        selectedGang = gang;
        currentView = 'editor';
        activeSection = 'general';
        $('#gcMainContent .jc-page').hide();
        $('#gcPageEditor').show();
        $('.gc-main-nav-item').removeClass('active');
        $('.gc-main-nav-item[data-page="gangs"]').addClass('active');
        $('#gcEditingName').text(editingGang.label || editingGang.name || T('gc_ui_new_gang'));
        renderNavItems();
        renderSection('general');
    }

    // ------------------------------------------------
    //  Liste + aperçu
    // ------------------------------------------------
    function renderGangList(filter) {
        const container = $('.gc-gang-list');
        container.empty();
        let gangs = allGangs;
        if (filter && filter.trim()) {
            const f = filter.toLowerCase();
            gangs = allGangs.filter(g => (g.label || '').toLowerCase().includes(f) || (g.name || '').toLowerCase().includes(f));
        }
        if (gangs.length === 0) {
            container.html('<div style="text-align:center;color:rgba(255,255,255,0.18);padding:2rem;font-size:0.78rem;font-family:Hapna,sans-serif;">' + T('gc_ui_no_gangs') + '</div>');
            return;
        }
        gangs.forEach(function(gang) {
            const isActive = selectedGang && selectedGang.name === gang.name;
            const off = !gang.enabled ? '<span class="jc-badge jc-badge-disabled">OFF</span>' : '';
            const mem = '<span class="jc-badge jc-badge-employees"><i class="fas fa-users" style="margin-right:2px;font-size:0.5rem;"></i>' + (gang.memberCount || 0) + '</span>';
            container.append('<div class="gc-gang-item ' + (isActive ? 'active' : '') + '" data-gang="' + esc(gang.name) + '">'
                + '<div class="jc-job-item-label">' + esc(gang.label) + '</div>'
                + '<div class="jc-job-item-name">' + esc(gang.name) + '</div>'
                + '<div class="jc-job-item-meta"><span class="jc-badge jc-badge-db">DB</span>' + off + mem + '</div>'
                + '</div>');
        });
    }

    function renderPreview() {
        const el = $('#gcListPreview');
        if (!selectedGang) {
            el.html('<div class="jc-preview-empty"><i class="fas fa-skull"></i><p>' + T('gc_ui_select_preview') + '</p></div>');
            return;
        }
        const g = selectedGang;
        const coordsOk = g.coords && g.coords.x !== undefined && g.coords.x !== null;
        const gradeCount = (g.grades || []).length;
        const bossGrade = (g.grades || []).find(gr => gr.isboss);
        const okIcon = '<i class="fas fa-check" style="color:#f5f3ee;font-size:1rem;"></i>';
        const noIcon = '<i class="fas fa-times" style="color:#cb0101;font-size:1rem;"></i>';

        el.html(
            '<div class="jc-preview-card">'
            + '<div class="jc-preview-header">'
            + '<div><div class="jc-preview-title">' + esc(g.label) + '</div>'
            + '<div class="jc-preview-name">' + esc(g.name) + ' · ' + T('jc_source_database') + '</div></div>'
            + '<div class="jc-preview-actions">'
            + '<button class="jc-btn jc-btn-edit" id="gcEditBtn"><i class="fas fa-pen"></i> ' + T('jc_btn_edit') + '</button>'
            + '<button class="jc-btn jc-btn-toggle" id="gcToggleBtn"><i class="fas fa-power-off"></i> ' + (g.enabled ? T('jc_btn_disable') : T('jc_btn_enable')) + '</button>'
            + '<button class="jc-btn jc-btn-delete" id="gcDeleteBtn"><i class="fas fa-trash"></i> ' + T('jc_btn_delete') + '</button>'
            + '</div></div>'
            + '<div class="jc-preview-stats">'
            + '<div class="jc-stat-card"><div class="jc-stat-card-value">' + (g.memberCount || 0) + '</div><div class="jc-stat-card-label">' + T('gc_field_members') + '</div></div>'
            + '<div class="jc-stat-card"><div class="jc-stat-card-value">' + gradeCount + '</div><div class="jc-stat-card-label">' + T('jc_field_grades') + '</div></div>'
            + '<div class="jc-stat-card"><div class="jc-stat-card-value">' + (coordsOk ? okIcon : noIcon) + '</div><div class="jc-stat-card-label">' + T('jc_field_location') + '</div></div>'
            + '<div class="jc-stat-card"><div class="jc-stat-card-value">' + (g.enabled ? okIcon : noIcon) + '</div><div class="jc-stat-card-label">' + T('jc_field_active') + '</div></div>'
            + '</div>'
            + '<div class="jc-preview-info-grid">'
            + '<div class="jc-info-box"><div class="jc-info-box-title">' + T('jc_field_location') + '</div><div class="jc-info-box-value">' + (coordsOk ? (g.coords.x.toFixed(1) + ', ' + g.coords.y.toFixed(1) + ', ' + g.coords.z.toFixed(1)) : T('jc_not_set')) + '</div></div>'
            + '<div class="jc-info-box"><div class="jc-info-box-title">' + T('jc_field_storage') + '</div><div class="jc-info-box-value">' + (g.storage && g.storage.id ? esc(g.storage.name || g.storage.id) : T('jc_none')) + '</div></div>'
            + '<div class="jc-info-box"><div class="jc-info-box-title">' + T('gc_field_dirty_money') + '</div><div class="jc-info-box-value">$' + (Number(g.dirtyMoney || 0).toLocaleString()) + '</div></div>'
            + '<div class="jc-info-box"><div class="jc-info-box-title">' + T('gc_field_boss_grade') + '</div><div class="jc-info-box-value">' + (bossGrade ? esc(bossGrade.label) : T('jc_na')) + '</div></div>'
            + '</div>'
            + '</div>'
        );
    }

    // ------------------------------------------------
    //  Editeur : nav sections + rendu
    // ------------------------------------------------
    function renderNavItems() {
        const nav = $('#gcNavItems');
        nav.empty();
        SECTIONS.forEach(s => {
            nav.append('<div class="gc-nav-item ' + (s.id === activeSection ? 'active' : '') + '" data-section="' + s.id + '">'
                + '<i class="fas ' + s.icon + '"></i><span>' + T(s.labelKey) + '</span></div>');
        });
    }

    function renderSection(sectionId) {
        activeSection = sectionId;
        const el = $('#gcEditorContent');
        const g = editingGang;
        $('.gc-nav-item').removeClass('active');
        $('.gc-nav-item[data-section="' + sectionId + '"]').addClass('active');

        let html = '';
        switch (sectionId) {
            case 'general':     html += buildGeneral(g); break;
            case 'location':    html += buildLocation(g); break;
            case 'grades':      html += buildGrades(g); break;
            case 'permissions': html += buildPermissions(g); break;
            case 'stashes':     html += buildStashes(g); break;
            case 'props':       html += buildProps(g); break;
            case 'blips':       html += buildBlips(g); break;
            case 'harvest':     html += buildHarvest(g); break;
            case 'process':     html += buildProcess(g); break;
            case 'sell':        html += buildSell(g); break;
            case 'steal':       html += buildSteal(g); break;
        }
        html += '<div class="jc-save-bar"><button class="jc-btn jc-btn-save" id="gcSaveBtn"><i class="fas fa-save"></i> ' + T('jc_btn_save') + '</button></div>';
        el.html(html);
        bindSectionEvents(sectionId);
    }

    function buildGeneral(g) {
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-info-circle"></i><h2>' + T('jc_section_general') + '</h2></div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_name') + '</span>'
            + '<input type="text" class="jc-input" id="gcGangName" value="' + esc(g.name) + '" placeholder="' + T('gc_placeholder_name') + '" ' + (!isCreatingNew ? 'disabled' : '') + '>'
            + '<span class="jc-field-hint">' + (isCreatingNew ? T('gc_hint_name_new') : T('gc_hint_name_locked')) + '</span></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_label') + '</span>'
            + '<input type="text" class="jc-input" id="gcGangLabel" value="' + esc(g.label) + '" placeholder="' + T('gc_placeholder_label') + '">'
            + '<span class="jc-field-hint">' + T('gc_hint_label') + '</span></div>'
            + '</div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('gc_field_min_grade_edit') + '</span>'
            + '<input type="number" class="jc-input" id="gcMinGradeEdit" value="' + (g.minGradeToEditGrades != null ? g.minGradeToEditGrades : 3) + '" min="0">'
            + '<span class="jc-field-hint">' + T('gc_hint_min_grade_edit') + '</span></div>'
            + '</div>';
    }

    function buildLocation(g) {
        const c = g.coords || {};
        const s = g.storage || {};
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-map-marker-alt"></i><h2>' + T('gc_section_location') + '</h2></div>'
            + '<div class="jc-coords-grid">'
            + '<div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span><input type="number" step="0.0001" class="jc-input" id="gcCoordX" value="' + (c.x != null ? c.x : '') + '" placeholder="0.0"></div>'
            + '<div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span><input type="number" step="0.0001" class="jc-input" id="gcCoordY" value="' + (c.y != null ? c.y : '') + '" placeholder="0.0"></div>'
            + '<div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span><input type="number" step="0.0001" class="jc-input" id="gcCoordZ" value="' + (c.z != null ? c.z : '') + '" placeholder="0.0"></div>'
            + '<div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">' + T('jc_field_distance') + '</span><input type="number" step="0.1" class="jc-input" id="gcDistance" value="' + (g.distance || 2.0) + '" min="0.5"></div>'
            + '</div>'
            + '<div style="display:flex;gap:0.5rem;margin-top:1rem;">'
            + '<button class="jc-action-btn jc-action-btn-gold gc-pick-coords"><i class="fas fa-crosshairs"></i> ' + T('jc_btn_my_position') + '</button>'
            + '<button class="jc-action-btn jc-action-btn-blue gc-tp-btn"><i class="fas fa-location-arrow"></i> ' + T('jc_btn_teleport') + '</button>'
            + '</div>'
            + '<span class="jc-field-hint" style="margin-top:0.5rem;">' + T('gc_hint_my_position') + '</span>'
            + '<div class="jc-section-icon-title" style="margin-top:2rem;"><i class="fas fa-box"></i><h2>' + T('jc_section_storage') + '</h2></div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_storage_id') + '</span>'
            + '<input type="text" class="jc-input" id="gcStorageId" value="' + esc(s.id || '') + '" placeholder="e.g. gang_storage"><span class="jc-field-hint">' + T('jc_hint_storage_id') + '</span></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_storage_name') + '</span>'
            + '<input type="text" class="jc-input" id="gcStorageName" value="' + esc(s.name || '') + '" placeholder="e.g. Gang Stash"><span class="jc-field-hint">' + T('jc_hint_storage_name') + '</span></div>'
            + '</div>';
    }

    function buildGrades(g) {
        const grades = g.grades || [];
        let rows = '';
        grades.forEach(gr => {
            const lvl = gr.grade != null ? gr.grade : 0;
            rows += '<tr data-level="' + lvl + '">'
                + '<td><span class="jc-grade-level">' + lvl + '</span></td>'
                + '<td><input type="text" value="' + esc(gr.label) + '" class="gc-grade-name"></td>'
                + '<td class="gc-grade-boss-cell"><input type="checkbox" class="jc-checkbox gc-grade-boss" ' + (gr.isboss ? 'checked' : '') + '></td>'
                + '<td><button class="gc-grade-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></td>'
                + '</tr>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-layer-group"></i><h2>' + T('jc_section_grades') + '</h2></div>'
            + '<table class="jc-grades-table"><thead><tr>'
            + '<th style="width:55px;">' + T('jc_field_level') + '</th>'
            + '<th>' + T('jc_field_name') + '</th>'
            + '<th style="width:80px;text-align:center;">' + T('gc_field_is_boss') + '</th>'
            + '<th style="width:40px;"></th>'
            + '</tr></thead><tbody id="gcGradesBody">' + rows + '</tbody></table>'
            + '<button class="jc-add-grade-btn" id="gcAddGradeBtn"><i class="fas fa-plus"></i> ' + T('jc_btn_add_grade') + '</button>';
    }

    function buildPermissions(g) {
        const perms = g.defaultPermissions || {};
        let items = '';
        PERM_DEFS.forEach(p => {
            const val = perms[p.key] !== undefined ? perms[p.key] : p.def;
            const num = (val === true) ? 0 : (val === false ? 99 : (parseInt(val) || 0));
            items += '<div class="jc-perm-item"><i class="fas ' + p.icon + '"></i><label>' + T(p.label) + '</label>'
                + '<input type="number" min="0" max="99" value="' + num + '" data-perm="' + p.key + '" class="jc-perm-input gc-perm-input"></div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-shield-alt"></i><h2>' + T('jc_section_permissions') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_permissions') + '</div>'
            + '<div class="jc-perms-grid">' + items + '</div>';
    }

    // Bloc coordonnées XYZ indexé, avec bouton de placement (gizmo si prop).
    // prefix ex: 'gc-prop' ; i = index ; opts { heading, headingVal, transform{ho,rotX,rotY,gizmoPlaced}, propsel }
    function coordRow(prefix, i, x, y, z, opts) {
        opts = opts || {};
        const sel = s => '.' + prefix + '-' + s + "[data-idx='" + i + "']";
        let extra = '';
        if (opts.heading) {
            extra = '<input type="number" step="0.1" class="jc-input ' + prefix + '-heading" data-idx="' + i + '" title="' + T('gc_prop_heading') + '" placeholder="' + T('gc_prop_heading') + '" value="' + (opts.headingVal != null ? opts.headingVal : 0) + '" style="max-width:90px;">';
        }
        let hidden = '';
        if (opts.transform) {
            const tr = opts.transform;
            hidden = '<input type="hidden" class="' + prefix + '-ho" data-idx="' + i + '" value="' + (tr.ho || 0) + '">'
                   + '<input type="hidden" class="' + prefix + '-rotx" data-idx="' + i + '" value="' + (tr.rotX || 0) + '">'
                   + '<input type="hidden" class="' + prefix + '-roty" data-idx="' + i + '" value="' + (tr.rotY || 0) + '">'
                   + '<input type="hidden" class="' + prefix + '-gizmoplaced" data-idx="' + i + '" value="' + (tr.gizmoPlaced || 0) + '">';
        }
        let data = 'data-xsel="' + sel('x') + '" data-ysel="' + sel('y') + '" data-zsel="' + sel('z') + '"';
        if (opts.heading) data += ' data-hsel="' + sel('heading') + '"';
        if (opts.transform) data += ' data-hosel="' + sel('ho') + '" data-rotxsel="' + sel('rotx') + '" data-rotysel="' + sel('roty') + '" data-gizmoplacedsel="' + sel('gizmoplaced') + '"';
        if (opts.propsel) data += ' data-propsel="' + opts.propsel + '"';
        if (opts.isPed) data += ' data-isped="1"';
        const btnLabel = opts.propsel ? T('gc_btn_place') : T('jc_btn_my_position');
        return ''
            + '<div class="gc-entry-coords">'
            + '<input type="number" step="0.0001" class="jc-input ' + prefix + '-x" data-idx="' + i + '" placeholder="X" value="' + (x != null ? x : '') + '">'
            + '<input type="number" step="0.0001" class="jc-input ' + prefix + '-y" data-idx="' + i + '" placeholder="Y" value="' + (y != null ? y : '') + '">'
            + '<input type="number" step="0.0001" class="jc-input ' + prefix + '-z" data-idx="' + i + '" placeholder="Z" value="' + (z != null ? z : '') + '">'
            + extra + hidden
            + '<button class="jc-action-btn jc-action-btn-gold gc-place-btn" ' + data + '><i class="fas fa-crosshairs"></i> ' + btnLabel + '</button>'
            + '</div>';
    }

    // Sélecteur d'icône de blip (grille d'images + recherche), style Job Creator
    function blipPicker(i, curSprite) {
        curSprite = curSprite || 'blip_ambient_agent';
        const gridItems = (blipsList || []).map(name =>
            '<div class="gc-blip-option' + (name === curSprite ? ' selected' : '') + '" data-value="' + name + '" title="' + name + '"><img src="blips/' + name + '.webp" alt="" loading="lazy"></div>'
        ).join('');
        return ''
            + '<div class="gc-blip-picker" data-idx="' + i + '">'
            + '<div class="gc-blip-picker-current">'
            + '<img src="blips/' + curSprite + '.webp" class="gc-blip-preview-img" alt="">'
            + '<span class="gc-blip-picker-label">' + blipLabel(curSprite) + '</span>'
            + '<i class="fas fa-chevron-down gc-blip-picker-arrow"></i>'
            + '</div>'
            + '<input type="hidden" class="gc-blip-sprite" data-idx="' + i + '" value="' + curSprite + '">'
            + '<div class="gc-blip-picker-dropdown">'
            + '<input type="text" class="gc-blip-search" placeholder="' + T('gc_blip_search') + '" autocomplete="off">'
            + '<div class="gc-blip-grid">' + gridItems + '</div>'
            + '</div>'
            + '</div>';
    }

    function buildStashes(g) {
        const stashes = g.stashes || [];
        let rows = '';
        stashes.forEach((s, i) => {
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-stash-label" placeholder="' + T('gc_stash_label') + '" value="' + esc(s.label || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_stash_slots') + '</span><input type="number" class="jc-input gc-stash-slots" min="1" value="' + (s.slots || 50) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_stash_weight') + '</span><input type="number" class="jc-input gc-stash-weight" min="1000" value="' + (s.maxWeight || 200000) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_stash_mingrade') + '</span><input type="number" class="jc-input gc-stash-mingrade" min="0" value="' + (s.minGrade || 0) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_distance') + '</span><input type="number" step="0.1" class="jc-input gc-stash-distance" min="0.5" value="' + (s.distance || 2.0) + '"></div>'
                + '</div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_stash_prop') + '</span><input type="text" class="jc-input gc-stash-propmodel" data-idx="' + i + '" placeholder="' + T('gc_stash_prop_ph') + '" value="' + esc(s.propModel || '') + '"></div>'
                + coordRow('gc-stash', i, s.x, s.y, s.z, {
                    heading: true, headingVal: s.heading,
                    transform: { ho: s.heightOffset, rotX: s.rotX, rotY: s.rotY, gizmoPlaced: s.gizmoPlaced },
                    propsel: ".gc-stash-propmodel[data-idx='" + i + "']"
                })
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-box"></i><h2>' + T('gc_section_stashes') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_stashes') + '</div>'
            + '<div id="gcStashesBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddStashBtn"><i class="fas fa-plus"></i> ' + T('gc_add_stash') + '</button>';
    }

    function buildProps(g) {
        const props = g.props || [];
        let rows = '';
        props.forEach((p, i) => {
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-prop-model" data-idx="' + i + '" placeholder="' + T('gc_prop_model_ph') + '" value="' + esc(p.model || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + coordRow('gc-prop', i, p.x, p.y, p.z, {
                    heading: true, headingVal: p.heading,
                    transform: { ho: p.heightOffset, rotX: p.rotX, rotY: p.rotY, gizmoPlaced: p.gizmoPlaced },
                    propsel: ".gc-prop-model[data-idx='" + i + "']"
                })
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-cube"></i><h2>' + T('gc_section_props') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_props') + '</div>'
            + '<div id="gcPropsBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddPropBtn"><i class="fas fa-plus"></i> ' + T('gc_add_prop') + '</button>';
    }

    function buildBlips(g) {
        const blips = g.blips || [];
        let rows = '';
        blips.forEach((b, i) => {
            const vis = b.visibility === 'all' ? 'all' : 'gang';
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-blip-name" placeholder="' + T('gc_blip_name') + '" value="' + esc(b.name || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_blip_sprite') + '</span>' + blipPicker(i, b.sprite) + '</div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_blip_scale') + '</span><input type="number" step="0.05" class="jc-input gc-blip-scale" min="0.1" value="' + (b.scale || 0.2) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_blip_visibility') + '</span><select class="jc-input gc-blip-visibility">'
                + '<option value="gang"' + (vis === 'gang' ? ' selected' : '') + '>' + T('gc_blip_vis_gang') + '</option>'
                + '<option value="all"' + (vis === 'all' ? ' selected' : '') + '>' + T('gc_blip_vis_all') + '</option>'
                + '</select></div>'
                + '</div>'
                + coordRow('gc-blip', i, b.x, b.y, b.z)
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-map-pin"></i><h2>' + T('gc_section_blips') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_blips') + '</div>'
            + '<div id="gcBlipsBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddBlipBtn"><i class="fas fa-plus"></i> ' + T('gc_add_blip') + '</button>';
    }

    // ------------------------------------------------
    //  Sections illégales : récolte / labo / vente de rue
    // ------------------------------------------------
    // Presets d'animations (identiques au Job Creator)
    const GC_ANIMATIONS = [
        {id: 'craft',          label: 'Crafting',           dict: 'mech_inventory@crafting@fallbacks', name: 'full_craft_and_stow', flag: 27},
        {id: 'campfire',       label: 'Campfire Cooking',   dict: 'amb_camp@world_camp_fire_cooking@male_d@wip_base', name: 'wip_base', flag: 17},
        {id: 'hammercraft',    label: 'Hammering',          dict: 'amb_work@world_human_hammer@beam_joint@male_a@wip_base', name: 'wip_base', flag: 17},
        {id: 'knifecooking',   label: 'Knife Cooking',      dict: 'amb_camp@world_player_fire_cook_knife@male_a@wip_base', name: 'wip_base', flag: 17},
        {id: 'riverwash',      label: 'River Washing',      dict: 'amb_misc@world_human_wash_kneel_river@female_a@idle_a', name: 'idle_c', flag: 17},
        {id: 'hoeing',         label: 'Hoeing / Raking',    dict: 'amb_work@world_human_farmer_hoe@male_a@base', name: 'base', flag: 17},
        {id: 'gravedigging',   label: 'Digging',            dict: 'amb_work@world_human_gravedig@working@male_b@base', name: 'base', flag: 17},
        {id: 'campfire_light', label: 'Lighting Fire',      dict: 'script_campfire@lighting_fire@male_male', name: 'light_fire_b_p2_male_b', flag: 17},
        {id: 'carry_box',      label: 'Carrying (Box)',     dict: 'mech_carry_box', name: 'idle', flag: 31},
        {id: 'custom',         label: '⚙ Custom (dict/name)', dict: '', name: '', flag: 17},
    ];

    // Champ Animation (dropdown jc-csel, réutilise les handlers globaux du jobcreator)
    // kind: 'hv' | 'pz' | 'sz' ; retourne { sel, custom }
    function gcAnimField(kind, i, obj, defId) {
        const curId = obj.animId || (obj.animDict ? 'custom' : defId);
        const isCustom = curId === 'custom';
        let selLabel = '';
        GC_ANIMATIONS.forEach(a => { if (a.id === curId) selLabel = a.label; });
        if (!selLabel) selLabel = GC_ANIMATIONS[0].label;
        const optsHtml = GC_ANIMATIONS.map(a =>
            '<div class="jc-csel-opt' + (a.id === curId ? ' jc-csel-selected' : '') + '" data-val="' + a.id + '">' + a.label + '</div>'
        ).join('');
        const sel = '<div class="jc-csel gc-anim-sel gc-' + kind + '-animid" data-kind="' + kind + '" data-idx="' + i + '" data-value="' + curId + '">'
            + '<div class="jc-csel-display">' + selLabel + '</div>'
            + '<div class="jc-csel-opts">' + optsHtml + '</div></div>';
        const custom = '<div class="gc-entry-grid gc-anim-custom-row" data-kind="' + kind + '" data-idx="' + i + '" style="' + (isCustom ? '' : 'display:none;') + '">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_anim_dict') + '</span><input type="text" class="jc-input gc-' + kind + '-animdict" data-idx="' + i + '" placeholder="' + T('jc_placeholder_anim_dict') + '" value="' + esc(obj.animDict || '') + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_anim_name') + '</span><input type="text" class="jc-input gc-' + kind + '-animname" data-idx="' + i + '" placeholder="' + T('jc_placeholder_anim_name') + '" value="' + esc(obj.animName || '') + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_flag') + '</span><input type="number" class="jc-input gc-' + kind + '-animflag" data-idx="' + i + '" min="0" value="' + (obj.animFlag || 17) + '"></div>'
            + '</div>';
        return { sel: sel, custom: custom };
    }

    function buildHarvest(g) {
        const zones = g.harvestZones || [];
        let rows = '';
        zones.forEach((h, i) => {
            // Compat v1 : points était un NOMBRE ; centre unique -> premier point
            let pts = Array.isArray(h.points) ? h.points : [];
            if (pts.length === 0 && h.x != null && h.y != null) pts = [{ x: h.x, y: h.y, z: h.z }];
            let ptRows = '';
            pts.forEach((pt, pi) => {
                const key = i + '_' + pi;
                ptRows += '<div class="gc-hv-point" data-zone="' + i + '" data-pt="' + pi + '">'
                    + '<div class="gc-hv-point-head"><span class="gc-hv-point-num">#' + (pi + 1) + '</span>'
                    + '<button class="gc-entry-remove gc-hv-point-remove" data-zone="' + i + '" data-pt="' + pi + '" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                    + coordRow('gc-hvp', key, pt.x, pt.y, pt.z, {
                        heading: true, headingVal: pt.heading,
                        transform: { ho: pt.heightOffset, rotX: pt.rotX, rotY: pt.rotY, gizmoPlaced: pt.gizmoPlaced },
                        propsel: ".gc-hv-prop[data-idx='" + i + "']"
                    })
                    + '</div>';
            });
            const anim = gcAnimField('hv', i, h, 'hoeing');
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-hv-name" placeholder="' + T('gc_hv_name_ph') + '" value="' + esc(h.name || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_item') + '</span><input type="text" class="jc-input gc-hv-item" placeholder="herb_coca" value="' + esc(h.item || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_amount') + '</span><input type="number" class="jc-input gc-hv-amount" min="1" value="' + (h.amount || 1) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_prop') + '</span><input type="text" class="jc-input gc-hv-prop" data-idx="' + i + '" placeholder="' + T('gc_optional') + '" value="' + esc(h.propModel || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_tool') + '</span><input type="text" class="jc-input gc-hv-tool" placeholder="' + T('gc_optional') + '" value="' + esc(h.requiredItem || '') + '"></div>'
                + '</div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_duration') + '</span><input type="number" class="jc-input gc-hv-duration" min="1" value="' + (h.harvestSec || 5) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_respawn') + '</span><input type="number" class="jc-input gc-hv-respawn" min="10" value="' + (h.respawnSec || 120) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_animation') + '</span>' + anim.sel + '</div>'
                + '</div>'
                + anim.custom
                + '<div class="gc-hv-points-header"><span class="gc-hv-points-title"><i class="fas fa-map-marker-alt"></i> ' + T('gc_hv_points_title') + ' (' + pts.length + ')</span></div>'
                + '<div class="gc-hv-points-list">' + ptRows + '</div>'
                + '<button class="jc-add-grade-btn gc-hv-addpt" data-zone="' + i + '"><i class="fas fa-plus"></i> ' + T('gc_hv_add_point') + '</button>'
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-cannabis"></i><h2>' + T('gc_section_harvest') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_harvest') + '</div>'
            + '<div id="gcHarvestBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddHarvestBtn"><i class="fas fa-plus"></i> ' + T('gc_add_harvest') + '</button>';
    }

    function buildProcess(g) {
        const zones = g.processZones || [];
        let rows = '';
        zones.forEach((p, i) => {
            const anim = gcAnimField('pz', i, p, 'craft');
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-pz-name" placeholder="' + T('gc_pz_name_ph') + '" value="' + esc(p.name || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_input') + '</span><input type="text" class="jc-input gc-pz-input" placeholder="herb_coca" value="' + esc(p.inputItem || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_input_amt') + '</span><input type="number" class="jc-input gc-pz-inputamt" min="1" value="' + (p.inputAmount || 1) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_output') + '</span><input type="text" class="jc-input gc-pz-output" placeholder="cocaine" value="' + esc(p.outputItem || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_output_amt') + '</span><input type="number" class="jc-input gc-pz-outputamt" min="1" value="' + (p.outputAmount || 1) + '"></div>'
                + '</div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_duration') + '</span><input type="number" class="jc-input gc-pz-duration" min="1" value="' + (p.processSec || 8) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_mingrade') + '</span><input type="number" class="jc-input gc-pz-mingrade" min="0" value="' + (p.minGrade || 0) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_pz_prop') + '</span><input type="text" class="jc-input gc-pz-prop" data-idx="' + i + '" placeholder="' + T('gc_optional') + '" value="' + esc(p.propModel || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_distance') + '</span><input type="number" step="0.1" class="jc-input gc-pz-distance" min="0.5" value="' + (p.distance || 2.0) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_animation') + '</span>' + anim.sel + '</div>'
                + '</div>'
                + anim.custom
                + coordRow('gc-pz', i, p.x, p.y, p.z, {
                    heading: true, headingVal: p.heading,
                    transform: { ho: p.heightOffset, rotX: p.rotX, rotY: p.rotY, gizmoPlaced: p.gizmoPlaced },
                    propsel: ".gc-pz-prop[data-idx='" + i + "']"
                })
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-flask"></i><h2>' + T('gc_section_process') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_process') + '</div>'
            + '<div id="gcProcessBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddProcessBtn"><i class="fas fa-plus"></i> ' + T('gc_add_process') + '</button>';
    }

    function buildSell(g) {
        const zones = g.sellZones || [];
        let rows = '';
        zones.forEach((s, i) => {
            const anim = gcAnimField('sz', i, s, 'craft');
            rows += '<div class="gc-entry" data-idx="' + i + '">'
                + '<div class="gc-entry-head"><input type="text" class="jc-input gc-sz-name" placeholder="' + T('gc_sz_name_ph') + '" value="' + esc(s.name || '') + '">'
                + '<button class="gc-entry-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_item') + '</span><input type="text" class="jc-input gc-sz-item" placeholder="cocaine" value="' + esc(s.item || '') + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_price_min') + '</span><input type="number" class="jc-input gc-sz-pricemin" min="1" value="' + (s.priceMin || 5) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_price_max') + '</span><input type="number" class="jc-input gc-sz-pricemax" min="1" value="' + (s.priceMax || 15) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_radius') + '</span><input type="number" step="1" class="jc-input gc-sz-radius" min="5" value="' + (s.radius || 40) + '"></div>'
                + '</div>'
                + '<div class="gc-entry-grid">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_refuse') + '</span><input type="number" class="jc-input gc-sz-refuse" min="0" max="90" value="' + (s.refuseChance != null ? s.refuseChance : 15) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_sz_cooldown') + '</span><input type="number" class="jc-input gc-sz-cooldown" min="5" value="' + (s.cooldownSec || 30) + '"></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_animation') + '</span>' + anim.sel + '</div>'
                + '</div>'
                + anim.custom
                + coordRow('gc-sz', i, s.x, s.y, s.z)
                + '</div>';
        });
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-hand-holding-dollar"></i><h2>' + T('gc_section_sell') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_sell') + '</div>'
            + '<div id="gcSellBody" class="gc-entries">' + rows + '</div>'
            + '<button class="jc-add-grade-btn" id="gcAddSellBtn"><i class="fas fa-plus"></i> ' + T('gc_add_sell') + '</button>';
    }

    function buildSteal(g) {
        const st = g.stealConfig || {};
        const cond = st.conditions || {};
        const lim = st.limits || {};
        const bl = Array.isArray(st.blacklist) ? st.blacklist.join(', ') : '';
        const toggle = v => v ? 'checked' : '';
        return ''
            + '<div class="jc-section-icon-title"><i class="fas fa-hand"></i><h2>' + T('gc_section_steal') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('gc_hint_steal') + '</div>'
            + '<div class="gc-entry" style="padding:14px">'
            + '<div class="jc-field-row" style="margin-bottom:12px">'
            + '<label class="jc-toggle-label" style="display:flex;align-items:center;gap:10px;cursor:pointer">'
            + '<input type="checkbox" id="gcStealEnabled" ' + toggle(st.enabled) + '>'
            + '<span style="font-size:1.05em;font-weight:600">' + T('gc_steal_enabled') + '</span>'
            + '</label></div>'
            + '<div class="jc-section-icon-title" style="margin-top:16px"><i class="fas fa-list-check"></i><h2>' + T('gc_steal_conditions') + '</h2></div>'
            + '<div class="gc-entry-grid" style="gap:8px">'
            + '<label class="gc-perm-check"><input type="checkbox" id="gcStealHogtied" ' + toggle(cond.hogtied !== false) + '> ' + T('gc_steal_hogtied') + '</label>'
            + '<label class="gc-perm-check"><input type="checkbox" id="gcStealCuffed" ' + toggle(cond.cuffed !== false) + '> ' + T('gc_steal_cuffed') + '</label>'
            + '<label class="gc-perm-check"><input type="checkbox" id="gcStealHandsUp" ' + toggle(cond.handsUp !== false) + '> ' + T('gc_steal_handsup') + '</label>'
            + '<label class="gc-perm-check"><input type="checkbox" id="gcStealDead" ' + toggle(cond.dead) + '> ' + T('gc_steal_dead') + '</label>'
            + '</div>'
            + '<div class="jc-field-row" style="margin-top:12px">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('gc_steal_req_police') + '</span>'
            + '<input class="jc-input" id="gcStealReqPolice" type="number" min="0" value="' + (st.requirePolice || 0) + '">'
            + '<span class="jc-field-hint">' + T('gc_steal_req_police_hint') + '</span></div>'
            + '</div>'
            + '<div class="jc-section-icon-title" style="margin-top:16px"><i class="fas fa-scale-balanced"></i><h2>' + T('gc_steal_limits') + '</h2></div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('gc_steal_limit_money') + '</span>'
            + '<input class="jc-input" id="gcStealLimMoney" type="number" min="0" value="' + (lim.money || 0) + '">'
            + '<span class="jc-field-hint">' + T('gc_steal_limit_zero_disabled') + '</span></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('gc_steal_limit_items') + '</span>'
            + '<input class="jc-input" id="gcStealLimItems" type="number" min="0" value="' + (lim.items || 0) + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('gc_steal_limit_weapons') + '</span>'
            + '<input class="jc-input" id="gcStealLimWeapons" type="number" min="0" value="' + (lim.weapons || 1) + '"></div>'
            + '</div>'
            + '<div class="jc-field" style="margin-top:12px"><span class="jc-field-label">' + T('gc_steal_blacklist') + '</span>'
            + '<input class="jc-input" id="gcStealBlacklist" value="' + esc(bl) + '" placeholder="water, bandage, ...">'
            + '<span class="jc-field-hint">' + T('gc_steal_blacklist_hint') + '</span></div>'
            + '</div>';
    }

    function bindSectionEvents(sectionId) {
        $('#gcSaveBtn').off('click').on('click', function() { saveCurrentGang(); });

        if (sectionId === 'grades') {
            $('#gcAddGradeBtn').off('click').on('click', function() {
                const tbody = $('#gcGradesBody');
                const next = tbody.find('tr').length;
                tbody.append('<tr data-level="' + next + '">'
                    + '<td><span class="jc-grade-level">' + next + '</span></td>'
                    + '<td><input type="text" value="' + T('gc_default_new_grade') + '" class="gc-grade-name"></td>'
                    + '<td class="gc-grade-boss-cell"><input type="checkbox" class="jc-checkbox gc-grade-boss"></td>'
                    + '<td><button class="gc-grade-remove" title="' + T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></td>'
                    + '</tr>');
            });
        }

        if (sectionId === 'location') {
            $('.gc-tp-btn').off('click').on('click', function() {
                const x = parseFloat($('#gcCoordX').val());
                const y = parseFloat($('#gcCoordY').val());
                const z = parseFloat($('#gcCoordZ').val());
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    $.post('https://cactus_ultimate/gc_teleportTo', JSON.stringify({ x: x, y: y, z: z }));
                }
            });
        }

        if (sectionId === 'stashes') {
            $('#gcAddStashBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.stashes = editingGang.stashes || [];
                editingGang.stashes.push({ label: '', slots: 50, maxWeight: 200000, minGrade: 0, distance: 2.0 });
                renderSection('stashes');
            });
        }
        if (sectionId === 'props') {
            $('#gcAddPropBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.props = editingGang.props || [];
                editingGang.props.push({ model: '', heading: 0 });
                renderSection('props');
            });
        }
        if (sectionId === 'blips') {
            $('#gcAddBlipBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.blips = editingGang.blips || [];
                editingGang.blips.push({ name: '', sprite: 'blip_ambient_agent', scale: 0.2, visibility: 'gang' });
                renderSection('blips');
            });
        }
        if (sectionId === 'harvest') {
            $('#gcAddHarvestBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.harvestZones = editingGang.harvestZones || [];
                editingGang.harvestZones.push({ name: '', item: '', amount: 1, propModel: '', harvestSec: 5, respawnSec: 120, points: [{}] });
                renderSection('harvest');
            });
            $('#gcHarvestBody').off('click', '.gc-hv-addpt').on('click', '.gc-hv-addpt', function() {
                const zi = parseInt($(this).data('zone'));
                collectFormIntoEditing();
                if (!editingGang.harvestZones || !editingGang.harvestZones[zi]) return;
                editingGang.harvestZones[zi].points = editingGang.harvestZones[zi].points || [];
                editingGang.harvestZones[zi].points.push({});
                renderSection('harvest');
            });
        }
        if (sectionId === 'process') {
            $('#gcAddProcessBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.processZones = editingGang.processZones || [];
                editingGang.processZones.push({ name: '', inputItem: '', inputAmount: 1, outputItem: '', outputAmount: 1, processSec: 8, minGrade: 0, distance: 2.0 });
                renderSection('process');
            });
        }
        if (sectionId === 'sell') {
            $('#gcAddSellBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingGang.sellZones = editingGang.sellZones || [];
                editingGang.sellZones.push({ name: '', item: '', priceMin: 5, priceMax: 15, radius: 40, refuseChance: 15, cooldownSec: 30 });
                renderSection('sell');
            });
        }
    }

    // ------------------------------------------------
    //  Collecte du formulaire vers editingGang
    // ------------------------------------------------
    function collectFormIntoEditing() {
        if (!editingGang) return;

        const name = $('#gcGangName').val();
        if (name !== undefined && name !== '') editingGang.name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const label = $('#gcGangLabel').val();
        if (label !== undefined) editingGang.label = label.trim();
        const mge = $('#gcMinGradeEdit').val();
        if (mge !== undefined) editingGang.minGradeToEditGrades = parseInt(mge) || 3;

        const cx = $('#gcCoordX').val(), cy = $('#gcCoordY').val(), cz = $('#gcCoordZ').val();
        if (cx !== undefined) {
            const px = parseFloat(cx), py = parseFloat(cy), pz = parseFloat(cz);
            editingGang.coords = (!isNaN(px) && !isNaN(py) && !isNaN(pz)) ? { x: px, y: py, z: pz } : null;
        }
        const dist = $('#gcDistance').val();
        if (dist !== undefined) editingGang.distance = parseFloat(dist) || 2.0;

        const sid = $('#gcStorageId').val(), sname = $('#gcStorageName').val();
        if (sid !== undefined) {
            editingGang.storage = sid.trim() ? { id: sid.trim(), name: (sname || '').trim() || (editingGang.label + ' ' + T('gc_default_storage_suffix')) } : null;
        }

        if ($('#gcGradesBody').length) {
            const grades = [];
            $('#gcGradesBody tr').each(function(i) {
                grades.push({
                    grade: i,
                    label: ($(this).find('.gc-grade-name').val() || '').trim() || (T('gc_default_grade') + ' ' + i),
                    isboss: $(this).find('.gc-grade-boss').is(':checked')
                });
            });
            editingGang.grades = grades;
        }

        if ($('.gc-perm-input').length) {
            const perms = {};
            $('.gc-perm-input').each(function() {
                perms[$(this).data('perm')] = parseInt($(this).val()) || 0;
            });
            editingGang.defaultPermissions = perms;
        }

        if ($('#gcStashesBody').length) {
            const stashes = [];
            $('#gcStashesBody .gc-entry').each(function() {
                const x = parseFloat($(this).find('.gc-stash-x').val());
                const y = parseFloat($(this).find('.gc-stash-y').val());
                const z = parseFloat($(this).find('.gc-stash-z').val());
                if (isNaN(x) || isNaN(y) || isNaN(z)) return;
                stashes.push({
                    label: ($(this).find('.gc-stash-label').val() || '').trim() || (editingGang.label + ' ' + T('gc_default_storage_suffix')),
                    slots: parseInt($(this).find('.gc-stash-slots').val()) || 50,
                    maxWeight: parseInt($(this).find('.gc-stash-weight').val()) || 200000,
                    minGrade: parseInt($(this).find('.gc-stash-mingrade').val()) || 0,
                    distance: parseFloat($(this).find('.gc-stash-distance').val()) || 2.0,
                    propModel: ($(this).find('.gc-stash-propmodel').val() || '').trim(),
                    heading: parseFloat($(this).find('.gc-stash-heading').val()) || 0,
                    heightOffset: parseFloat($(this).find('.gc-stash-ho').val()) || 0,
                    rotX: parseFloat($(this).find('.gc-stash-rotx').val()) || 0,
                    rotY: parseFloat($(this).find('.gc-stash-roty').val()) || 0,
                    gizmoPlaced: parseInt($(this).find('.gc-stash-gizmoplaced').val()) || 0,
                    x: x, y: y, z: z
                });
            });
            editingGang.stashes = stashes;
        }

        if ($('#gcPropsBody').length) {
            const props = [];
            $('#gcPropsBody .gc-entry').each(function() {
                const model = ($(this).find('.gc-prop-model').val() || '').trim();
                const x = parseFloat($(this).find('.gc-prop-x').val());
                const y = parseFloat($(this).find('.gc-prop-y').val());
                const z = parseFloat($(this).find('.gc-prop-z').val());
                if (!model || isNaN(x) || isNaN(y) || isNaN(z)) return;
                props.push({
                    model: model,
                    heading: parseFloat($(this).find('.gc-prop-heading').val()) || 0,
                    heightOffset: parseFloat($(this).find('.gc-prop-ho').val()) || 0,
                    rotX: parseFloat($(this).find('.gc-prop-rotx').val()) || 0,
                    rotY: parseFloat($(this).find('.gc-prop-roty').val()) || 0,
                    gizmoPlaced: parseInt($(this).find('.gc-prop-gizmoplaced').val()) || 0,
                    x: x, y: y, z: z
                });
            });
            editingGang.props = props;
        }

        if ($('#gcBlipsBody').length) {
            const blips = [];
            $('#gcBlipsBody .gc-entry').each(function() {
                const x = parseFloat($(this).find('.gc-blip-x').val());
                const y = parseFloat($(this).find('.gc-blip-y').val());
                const z = parseFloat($(this).find('.gc-blip-z').val());
                if (isNaN(x) || isNaN(y) || isNaN(z)) return;
                blips.push({
                    name: ($(this).find('.gc-blip-name').val() || '').trim() || editingGang.label,
                    sprite: ($(this).find('.gc-blip-sprite').val() || '').trim() || 'blip_ambient_agent',
                    scale: parseFloat($(this).find('.gc-blip-scale').val()) || 0.2,
                    visibility: $(this).find('.gc-blip-visibility').val() === 'all' ? 'all' : 'gang',
                    x: x, y: y, z: z
                });
            });
            editingGang.blips = blips;
        }

        if ($('#gcHarvestBody').length) {
            const zones = [];
            $('#gcHarvestBody > .gc-entry').each(function() {
                const item = ($(this).find('.gc-hv-item').val() || '').trim();
                if (!item) return;
                const points = [];
                $(this).find('.gc-hv-point').each(function() {
                    const x = parseFloat($(this).find('.gc-hvp-x').val());
                    const y = parseFloat($(this).find('.gc-hvp-y').val());
                    const z = parseFloat($(this).find('.gc-hvp-z').val());
                    if (isNaN(x) || isNaN(y) || isNaN(z)) return;
                    points.push({
                        x: x, y: y, z: z,
                        heading: parseFloat($(this).find('.gc-hvp-heading').val()) || 0,
                        heightOffset: parseFloat($(this).find('.gc-hvp-ho').val()) || 0,
                        rotX: parseFloat($(this).find('.gc-hvp-rotx').val()) || 0,
                        rotY: parseFloat($(this).find('.gc-hvp-roty').val()) || 0,
                        gizmoPlaced: parseInt($(this).find('.gc-hvp-gizmoplaced').val()) || 0
                    });
                });
                zones.push(Object.assign({
                    name: ($(this).find('.gc-hv-name').val() || '').trim() || T('gc_hv_name_ph'),
                    item: item,
                    amount: parseInt($(this).find('.gc-hv-amount').val()) || 1,
                    propModel: ($(this).find('.gc-hv-prop').val() || '').trim(),
                    requiredItem: ($(this).find('.gc-hv-tool').val() || '').trim(),
                    harvestSec: parseInt($(this).find('.gc-hv-duration').val()) || 5,
                    respawnSec: parseInt($(this).find('.gc-hv-respawn').val()) || 120,
                    points: points
                }, gcCollectAnim($(this), 'hv', 'hoeing')));
            });
            editingGang.harvestZones = zones;
        }

        if ($('#gcProcessBody').length) {
            const zones = [];
            $('#gcProcessBody .gc-entry').each(function() {
                const x = parseFloat($(this).find('.gc-pz-x').val());
                const y = parseFloat($(this).find('.gc-pz-y').val());
                const z = parseFloat($(this).find('.gc-pz-z').val());
                const inp = ($(this).find('.gc-pz-input').val() || '').trim();
                const out = ($(this).find('.gc-pz-output').val() || '').trim();
                if (isNaN(x) || isNaN(y) || isNaN(z) || !inp || !out) return;
                zones.push(Object.assign({
                    name: ($(this).find('.gc-pz-name').val() || '').trim() || T('gc_pz_name_ph'),
                    inputItem: inp,
                    inputAmount: parseInt($(this).find('.gc-pz-inputamt').val()) || 1,
                    outputItem: out,
                    outputAmount: parseInt($(this).find('.gc-pz-outputamt').val()) || 1,
                    processSec: parseInt($(this).find('.gc-pz-duration').val()) || 8,
                    minGrade: parseInt($(this).find('.gc-pz-mingrade').val()) || 0,
                    propModel: ($(this).find('.gc-pz-prop').val() || '').trim(),
                    distance: parseFloat($(this).find('.gc-pz-distance').val()) || 2.0,
                    heading: parseFloat($(this).find('.gc-pz-heading').val()) || 0,
                    heightOffset: parseFloat($(this).find('.gc-pz-ho').val()) || 0,
                    rotX: parseFloat($(this).find('.gc-pz-rotx').val()) || 0,
                    rotY: parseFloat($(this).find('.gc-pz-roty').val()) || 0,
                    gizmoPlaced: parseInt($(this).find('.gc-pz-gizmoplaced').val()) || 0,
                    x: x, y: y, z: z
                }, gcCollectAnim($(this), 'pz', 'craft')));
            });
            editingGang.processZones = zones;
        }

        if ($('#gcSellBody').length) {
            const zones = [];
            $('#gcSellBody .gc-entry').each(function() {
                const x = parseFloat($(this).find('.gc-sz-x').val());
                const y = parseFloat($(this).find('.gc-sz-y').val());
                const z = parseFloat($(this).find('.gc-sz-z').val());
                const item = ($(this).find('.gc-sz-item').val() || '').trim();
                if (isNaN(x) || isNaN(y) || isNaN(z) || !item) return;
                zones.push(Object.assign({
                    name: ($(this).find('.gc-sz-name').val() || '').trim() || T('gc_sz_name_ph'),
                    item: item,
                    priceMin: parseInt($(this).find('.gc-sz-pricemin').val()) || 5,
                    priceMax: parseInt($(this).find('.gc-sz-pricemax').val()) || 15,
                    radius: parseFloat($(this).find('.gc-sz-radius').val()) || 40,
                    refuseChance: parseInt($(this).find('.gc-sz-refuse').val()) || 0,
                    cooldownSec: parseInt($(this).find('.gc-sz-cooldown').val()) || 30,
                    x: x, y: y, z: z
                }, gcCollectAnim($(this), 'sz', 'craft')));
            });
            editingGang.sellZones = zones;
        }

        if ($('#gcStealEnabled').length) {
            editingGang.stealConfig = {
                enabled: $('#gcStealEnabled').is(':checked'),
                conditions: {
                    hogtied: $('#gcStealHogtied').is(':checked'),
                    cuffed: $('#gcStealCuffed').is(':checked'),
                    handsUp: $('#gcStealHandsUp').is(':checked'),
                    dead: $('#gcStealDead').is(':checked'),
                },
                requirePolice: parseInt($('#gcStealReqPolice').val()) || 0,
                limits: {
                    money: parseInt($('#gcStealLimMoney').val()) || 0,
                    items: parseInt($('#gcStealLimItems').val()) || 0,
                    weapons: parseInt($('#gcStealLimWeapons').val()) || 1,
                },
                blacklist: ($('#gcStealBlacklist').val() || '').split(',').map(s => s.trim()).filter(Boolean),
            };
        }
    }

    // Champs animation d'une entrée (id + custom dict/name/flag)
    function gcCollectAnim($entry, kind, defId) {
        return {
            animId: $entry.find('.gc-' + kind + '-animid').attr('data-value') || defId,
            animDict: ($entry.find('.gc-' + kind + '-animdict').val() || '').trim(),
            animName: ($entry.find('.gc-' + kind + '-animname').val() || '').trim(),
            animFlag: parseInt($entry.find('.gc-' + kind + '-animflag').val()) || 17
        };
    }

    function saveCurrentGang() {
        collectFormIntoEditing();

        if (!editingGang.name || editingGang.name.length < 2) {
            showToast(T('gc_err_name_min'), 'error');
            return;
        }
        if (!editingGang.label) {
            showToast(T('gc_err_label_required'), 'error');
            return;
        }
        if (!editingGang.grades || editingGang.grades.length === 0) {
            showToast(T('gc_err_grade_required'), 'error');
            return;
        }
        if (!editingGang.grades.some(g => g.isboss)) {
            showToast(T('gc_err_boss_required'), 'error');
            return;
        }

        const data = {
            name: editingGang.name,
            label: editingGang.label,
            minGradeToEditGrades: editingGang.minGradeToEditGrades,
            coords: editingGang.coords,
            distance: editingGang.distance,
            storage: editingGang.storage,
            defaultPermissions: editingGang.defaultPermissions || {},
            grades: editingGang.grades || [],
            dirtyMoney: editingGang.dirtyMoney || 0,
            enabled: editingGang.enabled !== false,
            blips: editingGang.blips || [],
            stashes: editingGang.stashes || [],
            props: editingGang.props || [],
            harvestZones: editingGang.harvestZones || [],
            processZones: editingGang.processZones || [],
            sellZones: editingGang.sellZones || [],
            stealConfig: editingGang.stealConfig || { enabled: false },
            isNew: isCreatingNew
        };

        $.post('https://cactus_ultimate/gc_saveGang', JSON.stringify(data))
            .done(function() { showToast(T('gc_toast_saving'), 'success'); })
            .fail(function() { showToast(T('gc_toast_save_error'), 'error'); });
        isCreatingNew = false;
    }

    // ------------------------------------------------
    //  Historique
    // ------------------------------------------------
    function renderHistoryPage() {
        const el = $('#gcPageHistory');

        const actionTypes = [
            { key: 'gang_update',   icon: 'fa-edit',             color: '#9a948a' },
            { key: 'gang_delete',   icon: 'fa-trash',            color: '#cb0101' },
            { key: 'gang_toggle',   icon: 'fa-toggle-on',        color: '#9a948a' },
            { key: 'gang_recruit',  icon: 'fa-user-plus',        color: '#f5f3ee' },
            { key: 'gang_fire',     icon: 'fa-user-minus',       color: '#cb0101' },
            { key: 'gang_promote',  icon: 'fa-arrow-up',         color: '#9a948a' },
            { key: 'gang_deposit',  icon: 'fa-piggy-bank',       color: '#f5f3ee' },
            { key: 'gang_withdraw', icon: 'fa-hand-holding-usd', color: '#9a948a' },
            { key: 'gang_harvest',  icon: 'fa-cannabis',         color: '#f5f3ee' },
            { key: 'gang_process',  icon: 'fa-flask',            color: '#cb0101' },
            { key: 'gang_sell',     icon: 'fa-hand-holding-dollar', color: '#f5f3ee' },
        ];
        function getMeta(t) {
            const f = actionTypes.find(a => a.key === t);
            return f || { key: t, icon: 'fa-question-circle', color: 'rgba(255,255,255,0.4)' };
        }
        function getLabel(t) {
            const k = 'gc_hist_act_' + t;
            const v = T(k);
            return v !== k ? v : t;
        }

        let gangSelOpts = '<option value="">' + T('gc_hist_filter_all_gangs') + '</option>';
        (allGangs || []).forEach(g => {
            gangSelOpts += '<option value="' + esc(g.name) + '">' + esc(g.label || g.name) + '</option>';
        });

        el.html(''
            + '<div class="jc-generic-page-header">' + T('gc_page_history') + '</div>'
            + '<div class="jc-generic-page-sub">' + T('gc_history_desc') + '</div>'
            + '<div class="jc-hist-card">'
            + '<div class="jc-hist-filters">'
            + '<select class="jc-input gc-hist-filter-gang" style="max-width:260px;">' + gangSelOpts + '</select>'
            + '</div>'
            + '<div class="jc-hist-table-wrap"><table class="jc-hist-table"><thead><tr>'
            + '<th>' + T('jc_hist_col_date') + '</th>'
            + '<th>' + T('gc_hist_col_gang') + '</th>'
            + '<th>' + T('jc_hist_col_action') + '</th>'
            + '<th>' + T('jc_hist_col_actor') + '</th>'
            + '<th>' + T('jc_hist_col_target') + '</th>'
            + '<th>' + T('jc_hist_col_details') + '</th>'
            + '</tr></thead><tbody class="gc-hist-tbody"></tbody></table>'
            + '<div class="jc-hist-empty" style="display:none;"><i class="fas fa-inbox"></i> ' + T('jc_hist_no_data') + '</div>'
            + '<div class="jc-hist-loading"><i class="fas fa-spinner fa-spin"></i> ' + T('jc_hist_loading') + '</div>'
            + '</div>'
            + '<div class="jc-hist-pagination"><span class="gc-hist-total"></span>'
            + '<div class="jc-hist-page-controls">'
            + '<button class="jc-btn-sm gc-hist-prev" disabled><i class="fas fa-chevron-left"></i> ' + T('jc_hist_prev') + '</button>'
            + '<span class="gc-hist-page-info"></span>'
            + '<button class="jc-btn-sm gc-hist-next" disabled>' + T('jc_hist_next') + ' <i class="fas fa-chevron-right"></i></button>'
            + '</div></div></div>'
        );

        let histPage = 1;
        const perPage = 20;

        function loadHistory() {
            el.find('.jc-hist-loading').show();
            el.find('.jc-hist-empty').hide();
            el.find('.gc-hist-tbody').empty();
            el.find('.gc-hist-prev, .gc-hist-next').prop('disabled', true);
            $.post('https://cactus_ultimate/gc_getHistory', JSON.stringify({
                page: histPage,
                perPage: perPage,
                filterGang: el.find('.gc-hist-filter-gang').val() || ''
            }));
        }

        window._gcHistoryHandler = function(result) {
            el.find('.jc-hist-loading').hide();
            const rows = result.rows || [];
            const total = result.total || 0;
            const page = result.page || 1;
            const totalPages = result.totalPages || 1;
            histPage = page;
            el.find('.gc-hist-total').text(T('jc_hist_total', total));
            el.find('.gc-hist-page-info').text(T('jc_hist_page_info', page, totalPages));
            el.find('.gc-hist-prev').prop('disabled', page <= 1);
            el.find('.gc-hist-next').prop('disabled', page >= totalPages);
            if (rows.length === 0) { el.find('.jc-hist-empty').show(); return; }
            let html = '';
            rows.forEach(function(r) {
                const meta = getMeta(r.actionType);
                const label = getLabel(r.actionType);
                const ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
                const gangLabel = ((allGangs.find(g => g.name === r.job) || {}).label) || r.job || '';
                const amount = r.amount && parseFloat(r.amount) !== 0 ? ('$' + Number(r.amount).toLocaleString()) : '';
                const oldNew = (r.oldValue && r.newValue) ? (esc(r.oldValue) + ' → ' + esc(r.newValue)) : '';
                const detailText = [r.details || '', oldNew, amount].filter(Boolean).join(' · ');
                html += '<tr>'
                    + '<td class="jc-hist-td-date">' + esc(ts) + '</td>'
                    + '<td><span class="jc-hist-job-badge">' + esc(gangLabel) + '</span></td>'
                    + '<td><span class="jc-hist-action-badge" style="--act-color:' + meta.color + '"><i class="fas ' + meta.icon + '"></i> ' + esc(label) + '</span></td>'
                    + '<td>' + esc(r.actorName || '') + '</td>'
                    + '<td>' + esc(r.targetName || '') + '</td>'
                    + '<td class="jc-hist-td-details">' + esc(detailText) + '</td>'
                    + '</tr>';
            });
            el.find('.gc-hist-tbody').html(html);
        };

        el.find('.gc-hist-filter-gang').on('change', function() { histPage = 1; loadHistory(); });
        el.find('.gc-hist-prev').on('click', function() { if (histPage > 1) { histPage--; loadHistory(); } });
        el.find('.gc-hist-next').on('click', function() { histPage++; loadHistory(); });
        loadHistory();
    }

    // ------------------------------------------------
    //  Handlers délégués (classes gc- uniquement)
    // ------------------------------------------------
    $(document).off('click.gcClose').on('click.gcClose', '#gcCloseBtn', function() { hideUI(); });

    $(document).off('click.gcSwitchJob').on('click.gcSwitchJob', '#gcSwitchJobBtn', function() {
        $('#gangCreatorContainer').hide();
        $('.gc-minimize-banner').hide();
        $.post('https://cactus_ultimate/gc_switchToJobCreator', JSON.stringify({}));
    });

    $(document).off('keydown.gcEsc').on('keydown.gcEsc', function(e) {
        if (e.key === 'Escape' && $('#gangCreatorContainer').is(':visible') && !coordPicking) {
            if (currentView === 'editor') {
                collectFormIntoEditing();
                switchToPage('gangs');
            } else {
                hideUI();
            }
        }
    });

    $(document).off('input.gcSearch').on('input.gcSearch', '.gc-search-input', function() {
        renderGangList($(this).val());
    });

    $(document).off('click.gcNew').on('click.gcNew', '#gcNewGangBtn', function() {
        switchToEditorView({
            name: '', label: '', minGradeToEditGrades: 3,
            coords: null, distance: 2.0, storage: null,
            defaultPermissions: { openBossMenu: 0, recruit: 3, promote: 3, fire: 3, manageMoney: 3, viewHistory: 0, editGrades: 3, accessInventory: 0 },
            grades: [
                { grade: 0, label: T('gc_default_recruit'), isboss: false },
                { grade: 1, label: T('gc_default_soldier'), isboss: false },
                { grade: 2, label: T('gc_default_lieutenant'), isboss: false },
                { grade: 3, label: T('gc_default_boss'), isboss: true }
            ],
            dirtyMoney: 0, enabled: true, source: 'database', memberCount: 0
        }, true);
    });

    $(document).off('click.gcMainNav').on('click.gcMainNav', '.gc-main-nav-item', function() {
        const pageId = $(this).data('page');
        if (currentView === 'editor') collectFormIntoEditing();
        switchToPage(pageId);
        // Les activités sont stockées côté serveur : on les recharge à l'ouverture
        // de l'onglet (sinon la liste reste vide après un refresh/ensure).
        if (pageId === 'activities') {
            $.post('https://cactus_ultimate/ga_openActivities', JSON.stringify({}));
        }
    });

    $(document).off('click.gcSelect').on('click.gcSelect', '.gc-gang-item', function() {
        const name = $(this).data('gang');
        const gang = allGangs.find(g => g.name === name);
        if (gang) {
            selectedGang = gang;
            renderGangList($('.gc-search-input').val());
            renderPreview();
        }
    });

    $(document).off('click.gcEdit').on('click.gcEdit', '#gcEditBtn', function() {
        if (selectedGang) switchToEditorView(selectedGang, false);
    });

    $(document).off('click.gcToggle').on('click.gcToggle', '#gcToggleBtn', function() {
        if (!selectedGang) return;
        const newState = !selectedGang.enabled;
        $.post('https://cactus_ultimate/gc_toggleGang', JSON.stringify({ name: selectedGang.name, enabled: newState }));
    });

    $(document).off('click.gcDelete').on('click.gcDelete', '#gcDeleteBtn', function() {
        if (!selectedGang) return;
        showConfirm(T('jc_confirm_delete_title'), T('jc_confirm_delete_msg').replace('{name}', esc(selectedGang.label)), function() {
            $.post('https://cactus_ultimate/gc_deleteGang', JSON.stringify({ name: selectedGang.name }));
            selectedGang = null;
            renderPreview();
        });
    });

    $(document).off('click.gcNav').on('click.gcNav', '.gc-nav-item', function() {
        collectFormIntoEditing();
        renderSection($(this).data('section'));
    });

    $(document).off('click.gcBack').on('click.gcBack', '#gcGoBackBtn', function() {
        collectFormIntoEditing();
        switchToPage('gangs');
    });

    $(document).off('click.gcGradeRm').on('click.gcGradeRm', '.gc-grade-remove', function() {
        $(this).closest('tr').remove();
        $('#gcGradesBody tr').each(function(i) {
            $(this).attr('data-level', i);
            $(this).find('.jc-grade-level').text(i);
        });
    });

    $(document).off('click.gcPickCoords').on('click.gcPickCoords', '.gc-pick-coords', function() {
        collectFormIntoEditing();
        gcPickerContext = null;
        coordPicking = true;
        // Zone Target (sphère raycast) — identique au jobcreator
        $.post('https://cactus_ultimate/gc_startCoordPicker', JSON.stringify({ sphereRadius: 1.5 }));
        $('#gangCreatorContainer').hide();
        $('.gc-minimize-banner').css('display', 'flex');
    });

    $(document).off('click.gcPlaceBtn').on('click.gcPlaceBtn', '.gc-place-btn', function() {
        collectFormIntoEditing();
        const $b = $(this);
        gcPickerContext = {
            xSel: $b.data('xsel') || null,
            ySel: $b.data('ysel') || null,
            zSel: $b.data('zsel') || null,
            hSel: $b.data('hsel') || null,
            hoSel: $b.data('hosel') || null,
            rotXSel: $b.data('rotxsel') || null,
            rotYSel: $b.data('rotysel') || null,
            gizmoPlacedSel: $b.data('gizmoplacedsel') || null
        };
        const propSel = $b.data('propsel');
        const prop = propSel ? ($(propSel).val() || '').trim() : '';
        const isPed = !!$b.data('isped');
        coordPicking = true;
        // Avec prop -> preview fantôme/gizmo ; sans prop -> Zone Target sphère (identique jobcreator)
        const payload = prop ? { prop: prop, isPed: isPed } : { sphereRadius: 1.5 };
        $.post('https://cactus_ultimate/gc_startCoordPicker', JSON.stringify(payload));
        $('#gangCreatorContainer').hide();
        $('.gc-minimize-banner').css('display', 'flex');
    });

    $(document).off('click.gcEntryRemove').on('click.gcEntryRemove', '.gc-entry-remove', function() {
        if ($(this).hasClass('gc-hv-point-remove')) return; // géré par gcHvPtRemove
        collectFormIntoEditing();
        $(this).closest('.gc-entry').remove();
        collectFormIntoEditing();
    });

    // Suppression d'un point de récolte (pas de toute la zone)
    $(document).off('click.gcHvPtRemove').on('click.gcHvPtRemove', '.gc-hv-point-remove', function() {
        collectFormIntoEditing();
        $(this).closest('.gc-hv-point').remove();
        collectFormIntoEditing();
        renderSection('harvest');
    });

    // Changement d'animation : afficher/masquer la ligne custom
    $(document).off('jc-csel-change.gcAnim').on('jc-csel-change.gcAnim', '.gc-anim-sel', function() {
        const kind = $(this).data('kind');
        const idx = $(this).attr('data-idx');
        const val = $(this).attr('data-value');
        $(".gc-anim-custom-row[data-kind='" + kind + "'][data-idx='" + idx + "']").toggle(val === 'custom');
    });

    $(document).off('click.gcBanner').on('click.gcBanner', '.gc-minimize-banner', function() {
        $('#gangCreatorContainer').css('display', 'flex');
        $('.gc-minimize-banner').hide();
        coordPicking = false;
        $.post('https://cactus_ultimate/gc_restore', JSON.stringify({}));
    });

    // --- Sélecteur d'icône de blip (grille + recherche) ---
    $(document).off('click.gcBlipToggle').on('click.gcBlipToggle', '.gc-blip-picker-current', function(e) {
        e.stopPropagation();
        const dd = $(this).closest('.gc-blip-picker').find('.gc-blip-picker-dropdown');
        const wasOpen = dd.hasClass('open');
        $('.gc-blip-picker-dropdown').removeClass('open');
        if (!wasOpen) {
            dd.addClass('open');
            dd.find('.gc-blip-search').val('').trigger('input').focus();
        }
    });

    $(document).off('input.gcBlipSearch').on('input.gcBlipSearch', '.gc-blip-search', function(e) {
        e.stopPropagation();
        const q = ($(this).val() || '').toLowerCase();
        $(this).closest('.gc-blip-picker-dropdown').find('.gc-blip-option').each(function() {
            const v = ($(this).data('value') || '').toString().toLowerCase();
            $(this).toggle(v.indexOf(q) !== -1);
        });
    });

    $(document).off('click.gcBlipOption').on('click.gcBlipOption', '.gc-blip-option', function(e) {
        e.stopPropagation();
        const val = $(this).data('value');
        const picker = $(this).closest('.gc-blip-picker');
        picker.find('.gc-blip-sprite').val(val);
        picker.find('.gc-blip-preview-img').attr('src', 'blips/' + val + '.webp');
        picker.find('.gc-blip-picker-label').text(blipLabel(val));
        picker.find('.gc-blip-option').removeClass('selected');
        $(this).addClass('selected');
        picker.find('.gc-blip-picker-dropdown').removeClass('open');
    });

    $(document).off('click.gcBlipClose').on('click.gcBlipClose', function(e) {
        if (!$(e.target).closest('.gc-blip-picker').length) {
            $('.gc-blip-picker-dropdown').removeClass('open');
        }
    });

    // ================================================
    //  ACTIVITÉS ILLÉGALES — Onglet dédié, éditeur tabbé
    // ================================================

    const GA_TYPES = [
        { id: 'harvest',  label: 'ga_act_type_harvest',  icon: 'fa-cannabis' },
        { id: 'process',  label: 'ga_act_type_process',  icon: 'fa-flask' },
        { id: 'sell_npc', label: 'ga_act_type_sell_npc', icon: 'fa-sack-dollar' },
    ];

    let gaActiveTab = 'basic';

    // Onglets disponibles selon le type
    function gaTabsForType(type) {
        const base = [
            { id: 'basic',          icon: 'fa-circle-info',   label: 'ga_tab_basic' },
            { id: 'required_items', icon: 'fa-box-open',      label: 'ga_tab_required_items' },
            { id: 'give_items',     icon: 'fa-gift',          label: 'ga_tab_give_items' },
            { id: 'locations',      icon: 'fa-map-marker-alt',label: 'ga_tab_locations' },
            { id: 'animation',      icon: 'fa-person-walking',label: 'ga_tab_animation' },
        ];
        if (type === 'sell_npc') {
            base.push({ id: 'npc_settings', icon: 'fa-user-tie', label: 'ga_tab_npc_settings' });
        }
        return base;
    }

    // ---- Helpers de lignes ----
    function gaRewardRow(r, i) {
        r = r || {};
        return '<div class="gc-entry ga-reward-row" data-ri="' + i + '" style="display:flex;flex-direction:row;align-items:center;gap:6px;padding:8px;">'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_item') + '</div>'
            + '<input class="jc-input ga-rw-item" placeholder="item_name" value="' + esc(r.item || '') + '" style="width:100%"></div>'
            + '<div style="width:70px">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_amount') + '</div>'
            + '<input class="jc-input ga-rw-amount" type="number" min="1" value="' + (r.amount || 1) + '"></div>'
            + '<div style="width:70px">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">Chance %</div>'
            + '<input class="jc-input ga-rw-chance" type="number" min="1" max="100" value="' + (r.chance || 100) + '"></div>'
            + '<button class="ga-row-remove ga-rw-remove"><i class="fas fa-trash"></i></button>'
            + '</div>';
    }

    function gaInputItemRow(it, i) {
        it = it || {};
        return '<div class="gc-entry ga-input-row" data-ii="' + i + '" style="display:flex;flex-direction:row;align-items:center;gap:6px;padding:8px;">'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_item') + '</div>'
            + '<input class="jc-input ga-in-item" placeholder="herb_coca" value="' + esc(it.item || '') + '" style="width:100%"></div>'
            + '<div style="width:80px">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_amount') + '</div>'
            + '<input class="jc-input ga-in-amount" type="number" min="1" value="' + (it.amount || 1) + '"></div>'
            + '<button class="ga-row-remove ga-in-remove"><i class="fas fa-trash"></i></button>'
            + '</div>';
    }

    function gaRequiredItemRow(r, i) {
        r = r || {};
        return '<div class="gc-entry ga-req-row" data-ri="' + i + '" style="display:flex;flex-direction:row;align-items:center;gap:6px;padding:8px;">'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_item') + '</div>'
            + '<input class="jc-input ga-req-item" placeholder="item_name" value="' + esc(r.item || '') + '" style="width:100%"></div>'
            + '<div style="width:70px">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_amount') + '</div>'
            + '<input class="jc-input ga-req-amount" type="number" min="1" value="' + (r.amount || 1) + '"></div>'
            + '<button class="ga-row-remove ga-req-remove"><i class="fas fa-trash"></i></button>'
            + '</div>';
    }

    function gaHarvestPointRow(pt, pi) {
        pt = pt || {};
        const prefix = 'ga-hvp-' + pi;
        // Coordonnées avec prop individuel par point
        const coords = '<div class="gc-entry-coords">'
            + '<input type="number" step="0.0001" class="jc-input ga-hvp-x" data-pi="' + pi + '" placeholder="X" value="' + (pt.x != null ? pt.x : '') + '">'
            + '<input type="number" step="0.0001" class="jc-input ga-hvp-y" data-pi="' + pi + '" placeholder="Y" value="' + (pt.y != null ? pt.y : '') + '">'
            + '<input type="number" step="0.0001" class="jc-input ga-hvp-z" data-pi="' + pi + '" placeholder="Z" value="' + (pt.z != null ? pt.z : '') + '">'
            + '<input type="number" step="0.1" class="jc-input ga-hvp-h" data-pi="' + pi + '" placeholder="Heading" value="' + (pt.heading || 0) + '" style="max-width:90px">'
            + '<input type="hidden" class="ga-hvp-ho" data-pi="' + pi + '" value="' + (pt.heightOffset || 0) + '">'
            + '<input type="hidden" class="ga-hvp-rx" data-pi="' + pi + '" value="' + (pt.rotX || 0) + '">'
            + '<input type="hidden" class="ga-hvp-ry" data-pi="' + pi + '" value="' + (pt.rotY || 0) + '">'
            + '<input type="hidden" class="ga-hvp-gizmo" data-pi="' + pi + '" value="' + (pt.gizmoPlaced || 0) + '">'
            + '<button class="jc-action-btn jc-action-btn-gold gc-place-btn" '
            + 'data-xsel=".ga-hvp-x[data-pi=\'' + pi + '\']" '
            + 'data-ysel=".ga-hvp-y[data-pi=\'' + pi + '\']" '
            + 'data-zsel=".ga-hvp-z[data-pi=\'' + pi + '\']" '
            + 'data-hsel=".ga-hvp-h[data-pi=\'' + pi + '\']" '
            + 'data-hosel=".ga-hvp-ho[data-pi=\'' + pi + '\']" '
            + 'data-rotxsel=".ga-hvp-rx[data-pi=\'' + pi + '\']" '
            + 'data-rotysel=".ga-hvp-ry[data-pi=\'' + pi + '\']" '
            + 'data-gizmoplacedsel=".ga-hvp-gizmo[data-pi=\'' + pi + '\']" '
            + 'data-propsel=".ga-hvp-prop[data-pi=\'' + pi + '\']">'
            + '<i class="fas fa-crosshairs"></i> ' + T('gc_btn_place') + '</button>'
            + '</div>';
        return '<div class="gc-entry ga-hvp-row" data-pi="' + pi + '" style="padding:10px;">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">'
            + '<span style="font-weight:600;opacity:.8"><i class="fas fa-map-pin" style="color:rgba(154, 148, 138,1);margin-right:6px"></i>' + T('ga_tab_locations') + ' #' + (pi + 1) + '</span>'
            + '<button class="ga-row-remove ga-hvp-remove" data-pi="' + pi + '"><i class="fas fa-times"></i></button>'
            + '</div>'
            + coords
            + '<div style="display:flex;gap:8px;margin-top:8px;align-items:center">'
            + '<div style="flex:1"><div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('gc_hv_prop') + ' <span style="opacity:.5">(' + T('gc_optional') + ')</span></div>'
            + '<input class="jc-input ga-hvp-prop" data-pi="' + pi + '" placeholder="s_harvestable_plant" value="' + esc(pt.propModel || '') + '"></div>'
            + '</div>'
            + '</div>';
    }

    function gaNpcItemRow(it, i) {
        it = it || {};
        return '<div class="ga-ni-row" data-ii="' + i + '" style="display:flex;flex-direction:row;align-items:flex-end;gap:6px;padding:8px;background:rgba(38,32,24,.94);border:1px solid rgba(154, 148, 138,.22);border-radius:8px;margin-bottom:6px">'
            + '<div style="flex:1;min-width:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_reward_item') + '</div>'
            + '<input class="jc-input ga-ni-item" placeholder="cocaine" value="' + esc(it.item || '') + '" style="width:100%"></div>'
            + '<div style="width:78px;flex-shrink:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_npc_pricemin') + '</div>'
            + '<input class="jc-input ga-ni-pricemin" type="number" min="0" value="' + (it.priceMin || 0) + '" style="width:100%"></div>'
            + '<div style="width:78px;flex-shrink:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_npc_pricemax') + '</div>'
            + '<input class="jc-input ga-ni-pricemax" type="number" min="0" value="' + (it.priceMax || 0) + '" style="width:100%"></div>'
            + '<div style="width:62px;flex-shrink:0">'
            + '<div style="font-size:.8em;opacity:.6;margin-bottom:3px">' + T('ga_npc_maxqty') + '</div>'
            + '<input class="jc-input ga-ni-maxqty" type="number" min="1" value="' + (it.maxQty || 1) + '" style="width:100%"></div>'
            + '<button class="ga-row-remove ga-ni-remove" style="flex-shrink:0;margin-bottom:2px"><i class="fas fa-trash"></i></button>'
            + '</div>';
    }

    function gaGangsPicker(selectedGangs) {
        selectedGangs = selectedGangs || [];
        const isPublic = selectedGangs.includes('*');
        let html = '<div class="ga-gangs-grid">';
        html += '<label class="gc-act-gang-opt" style="border-color:rgba(154, 148, 138,.4);background:rgba(154, 148, 138,.1)">'
            + '<input type="checkbox" class="ga-gang-cb" value="*" ' + (isPublic ? 'checked' : '') + '>'
            + '<i class="fas fa-globe" style="color:#9a948a"></i>'
            + '<span style="color:#9a948a;font-weight:600">' + T('ga_gangs_public') + '</span></label>';
        allGangsList.forEach(g => {
            const checked = !isPublic && selectedGangs.includes(g.name);
            html += '<label class="gc-act-gang-opt' + (checked ? ' active' : '') + '">'
                + '<input type="checkbox" class="ga-gang-cb" value="' + g.name + '" ' + (checked ? 'checked' : '') + '>'
                + '<i class="fas fa-users" style="color:rgba(154, 148, 138,.6);font-size:.75em"></i>'
                + '<span>' + esc(g.label || g.name) + '</span></label>';
        });
        html += '</div>';
        return html;
    }

    // ---- Contenus des onglets ----
    function gaTabContent_Basic(act) {
        const type = act.type || 'harvest';
        const typeOptions = GA_TYPES.map(t =>
            '<option value="' + t.id + '"' + (t.id === type ? ' selected' : '') + '>'
            + '<i class="fas ' + t.icon + '"></i> ' + T(t.label) + '</option>'
        ).join('');
        return '<div id="ga-tab-basic" class="ga-tab-body">'
            + '<div class="jc-field-row">'
            + '<div class="jc-field">'
            + '<span class="jc-field-label">' + T('ga_act_name') + '</span>'
            + '<input class="jc-input" id="gaName" value="' + esc(act.name || '') + '" placeholder="my_activity">'
            + '<span class="jc-field-hint">' + T('ga_hint_name_desc') + '</span></div>'
            + '<div class="jc-field">'
            + '<span class="jc-field-label">' + T('ga_act_label') + '</span>'
            + '<input class="jc-input" id="gaLabel" value="' + esc(act.label || '') + '" placeholder="' + T('ga_placeholder_label') + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_label_desc') + '</span></div>'
            + '</div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field">'
            + '<span class="jc-field-label">' + T('ga_act_type') + '</span>'
            + '<select class="jc-input" id="gaType">' + typeOptions + '</select>'
            + '<span class="jc-field-hint">' + T('ga_hint_type_desc') + '</span></div>'
            + '</div>'
            + '<div class="jc-section-icon-title" style="margin-top:20px"><i class="fas fa-users-gear"></i><h2>' + T('ga_gangs_label') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('ga_hint_gangs_desc') + '</div>'
            + gaGangsPicker(act.gangs || ['*'])
            + '</div>';
    }

    function gaTabContent_RequiredItems(act) {
        const d = act.data || {};
        const items = Array.isArray(d.requiredItems) ? d.requiredItems : (d.requiredItem ? [{ item: d.requiredItem, amount: 1 }] : []);
        let rows = items.map((r, i) => gaRequiredItemRow(r, i)).join('');
        return '<div id="ga-tab-required_items" class="ga-tab-body">'
            + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_required_items_desc') + '</div>'
            + '<div id="gaRequiredList">' + rows + '</div>'
            + '<button class="ga-add-row-btn ga-add-req"><i class="fas fa-plus"></i> ' + T('ga_add_required_item') + '</button>'
            + (act.type === 'harvest' ? ''
                + '<div class="jc-section-icon-title" style="margin-top:24px"><i class="fas fa-clock"></i><h2>' + T('ga_timing_title') + '</h2></div>'
                + '<div class="jc-field-row">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_duration') + '</span>'
                + '<input class="jc-input" id="ga_duration" type="number" min="1" value="' + (d.duration || 5) + '">'
                + '<span class="jc-field-hint">' + T('ga_hint_duration') + '</span></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_respawn') + '</span>'
                + '<input class="jc-input" id="ga_cooldown" type="number" min="0" value="' + (d.cooldown || 60) + '">'
                + '<span class="jc-field-hint">' + T('ga_hint_cooldown') + '</span></div>'
                + '</div>'
                : act.type === 'process' ? ''
                + '<div class="jc-section-icon-title" style="margin-top:24px"><i class="fas fa-clock"></i><h2>' + T('ga_timing_title') + '</h2></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_duration') + '</span>'
                + '<input class="jc-input" id="ga_duration" type="number" min="1" value="' + (d.duration || 8) + '">'
                + '<span class="jc-field-hint">' + T('ga_hint_duration') + '</span></div>'
                : '')
            + '</div>';
    }

    function gaTabContent_GiveItems(act) {
        const d = act.data || {};
        const type = act.type;
        if (type === 'sell_npc') {
            const items = d.items || [];
            let rows = items.map((it, i) => gaNpcItemRow(it, i)).join('');
            return '<div id="ga-tab-give_items" class="ga-tab-body">'
                + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_npc_items_desc') + '</div>'
                + '<div id="gaNpcItemsList">' + rows + '</div>'
                + '<button class="ga-add-row-btn ga-add-npc-item"><i class="fas fa-plus"></i> ' + T('ga_npc_items_add') + '</button>'
                + '</div>';
        }
        if (type === 'process') {
            // Input items (matières premières)
            const inputItems = Array.isArray(d.inputItems) ? d.inputItems
                : (d.inputItem ? [{ item: d.inputItem, amount: d.inputAmount || 1 }] : []);
            const inputRows = inputItems.map((it, i) => gaInputItemRow(it, i)).join('');
            // Output items (produits finis)
            const rewards = Array.isArray(d.rewards) ? d.rewards
                : (d.outputItem ? [{ item: d.outputItem, amount: d.outputAmount || 1, chance: 100 }] : []);
            const rewardRows = rewards.map((r, i) => gaRewardRow(r, i)).join('');
            return '<div id="ga-tab-give_items" class="ga-tab-body">'
                + '<div class="jc-section-icon-title" style="margin-bottom:8px"><i class="fas fa-arrow-right-to-bracket"></i><h2>' + T('ga_input_title') + '</h2></div>'
                + '<div class="jc-perm-hint" style="margin-bottom:10px">' + T('ga_hint_input_desc') + '</div>'
                + '<div id="gaInputItemsList">' + inputRows + '</div>'
                + '<button class="ga-add-row-btn ga-add-input"><i class="fas fa-plus"></i> ' + T('ga_add_input_item') + '</button>'
                + '<div class="jc-section-icon-title" style="margin-top:22px;margin-bottom:8px"><i class="fas fa-arrow-right-from-bracket"></i><h2>' + T('ga_output_title') + '</h2></div>'
                + '<div class="jc-perm-hint" style="margin-bottom:10px">' + T('ga_hint_output_desc') + '</div>'
                + '<div id="gaRewardsList">' + rewardRows + '</div>'
                + '<button class="ga-add-row-btn ga-add-reward"><i class="fas fa-plus"></i> ' + T('ga_add_reward') + '</button>'
                + '</div>';
        }
        // harvest
        const rewards = Array.isArray(d.rewards) ? d.rewards : (d.item ? [{ item: d.item, amount: d.amount || 1, chance: 100 }] : []);
        let rows = rewards.map((r, i) => gaRewardRow(r, i)).join('');
        return '<div id="ga-tab-give_items" class="ga-tab-body">'
            + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_rewards_desc') + '</div>'
            + '<div id="gaRewardsList">' + rows + '</div>'
            + '<button class="ga-add-row-btn ga-add-reward"><i class="fas fa-plus"></i> ' + T('ga_add_reward') + '</button>'
            + '</div>';
    }

    function gaTabContent_Locations(act) {
        const d = act.data || {};
        const type = act.type;
        if (type === 'harvest') {
            const points = Array.isArray(d.points) ? d.points : [];
            let rows = points.map((pt, pi) => gaHarvestPointRow(pt, pi)).join('');
            return '<div id="ga-tab-locations" class="ga-tab-body">'
                + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_harvest_locations_desc') + '</div>'
                + '<div id="gaHarvestPointsList">' + rows + '</div>'
                + '<button class="ga-add-row-btn ga-add-point"><i class="fas fa-plus"></i> ' + T('gc_hv_add_point') + '</button>'
                + '</div>';
        }
        if (type === 'process') {
            return '<div id="ga-tab-locations" class="ga-tab-body">'
                + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_process_location_desc') + '</div>'
                + '<div class="gc-entry" style="padding:12px">'
                + '<div class="jc-field"><span class="jc-field-label">' + T('gc_hv_prop') + ' <span style="opacity:.5">(' + T('gc_optional') + ')</span></span>'
                + '<input class="jc-input" id="ga_propModel" value="' + esc(d.propModel || '') + '" placeholder="prop_woodcraft_table">'
                + '<span class="jc-field-hint">' + T('ga_hint_prop') + '</span></div>'
                + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_distance') + '</span>'
                + '<input class="jc-input" id="ga_procDistance" type="number" step="0.1" min="0.5" value="' + (d.distance || 2.0) + '"></div>'
                + coordRow('ga-proc', 0, d.x, d.y, d.z, {
                    heading: true, headingVal: d.heading || 0,
                    transform: { ho: d.heightOffset, rotX: d.rotX, rotY: d.rotY, gizmoPlaced: d.gizmoPlaced },
                    propsel: '#ga_propModel'
                })
                + '</div>'
                + '</div>';
        }
        // sell_npc : type d'emplacement (PNJ / prop / zone) + coordRow avec gizmo dans le même onglet
        const ptype = d.pointType || 'npc';
        const isProp = ptype === 'prop';
        const isZone = ptype === 'zone';
        const modelLabel = isProp ? T('jc_field_prop_model') : T('ga_npc_model');
        const modelHint = isProp ? T('ga_hint_prop') : T('ga_hint_npc_model');
        const modelPlaceholder = isProp ? T('jc_placeholder_prop_model') : 'a_m_y_indian_01';
        const modelValue = isProp ? (d.propModel || '') : (d.npcModel || '');
        return '<div id="ga-tab-locations" class="ga-tab-body">'
            + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_npc_location_desc') + '</div>'
            + '<div class="gc-entry" style="padding:14px">'
            + '<div class="jc-field" style="margin-bottom:12px">'
            + '<span class="jc-field-label">' + T('ga_field_point_type') + '</span>'
            + '<div class="jc-hp-type-toggle">'
            + '<button type="button" class="jc-hp-type-btn ga-pt-btn' + (ptype === 'npc' ? ' active' : '') + '" data-ptype="npc"><i class="fas fa-user"></i> ' + T('ga_pointtype_npc') + '</button>'
            + '<button type="button" class="jc-hp-type-btn ga-pt-btn' + (isProp ? ' active' : '') + '" data-ptype="prop"><i class="fas fa-cube"></i> ' + T('ga_pointtype_prop') + '</button>'
            + '<button type="button" class="jc-hp-type-btn ga-pt-btn' + (isZone ? ' active' : '') + '" data-ptype="zone"><i class="fas fa-circle"></i> ' + T('ga_pointtype_zone') + '</button>'
            + '</div>'
            + '<input type="hidden" id="ga_pointType" value="' + ptype + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_point_type') + '</span>'
            + '</div>'
            + '<div class="jc-field ga-pt-model-section" style="margin-bottom:12px' + (isZone ? ';display:none' : '') + '">'
            + '<span class="jc-field-label ga-pt-model-label">' + modelLabel + '</span>'
            + '<input class="jc-input" id="ga_npcModel" value="' + esc(modelValue) + '" placeholder="' + esc(modelPlaceholder) + '">'
            + '<span class="jc-field-hint ga-pt-model-hint">' + modelHint + '</span>'
            + '</div>'
            + '<div class="jc-field ga-pt-zone-section" style="margin-bottom:12px' + (isZone ? '' : ';display:none') + '">'
            + '<span class="jc-field-label">' + T('ga_field_zone_radius') + '</span>'
            + '<input class="jc-input" id="ga_zoneRadius" type="number" step="0.1" min="0.5" value="' + (d.radius || 2.5) + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_zone_radius') + '</span>'
            + '</div>'
            + coordRow('ga-npc', 0, d.x, d.y, d.z, {
                heading: true, headingVal: d.heading || 0,
                transform: { ho: d.heightOffset, rotX: d.rotX, rotY: d.rotY, gizmoPlaced: d.gizmoPlaced },
                propsel: '#ga_npcModel',
                isPed: ptype === 'npc'
            })
            + '</div>'
            + '</div>';
    }

    function gaTabContent_Animation(act) {
        const d = act.data || {};
        const curId = d.animId || (act.type === 'harvest' ? 'hoeing' : 'craft');
        const isCustom = curId === 'custom';
        let selLabel = '';
        GC_ANIMATIONS.forEach(a => { if (a.id === curId) selLabel = a.label; });
        if (!selLabel) selLabel = GC_ANIMATIONS[0].label;
        const optsHtml = GC_ANIMATIONS.map(a =>
            '<div class="jc-csel-opt' + (a.id === curId ? ' jc-csel-selected' : '') + '" data-val="' + a.id + '">' + a.label + '</div>'
        ).join('');
        return '<div id="ga-tab-animation" class="ga-tab-body">'
            + '<div class="jc-perm-hint" style="margin-bottom:12px">' + T('ga_hint_animation_desc') + '</div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_animation') + '</span>'
            + '<div class="jc-csel gc-ga-animid" data-value="' + curId + '">'
            + '<div class="jc-csel-display">' + selLabel + '</div>'
            + '<div class="jc-csel-opts">' + optsHtml + '</div></div></div>'
            + '<div class="gc-entry-grid gc-ga-anim-custom" style="' + (isCustom ? '' : 'display:none') + '">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_anim_dict') + '</span>'
            + '<input type="text" class="jc-input gc-ga-animdict" placeholder="' + T('jc_placeholder_anim_dict') + '" value="' + esc(d.animDict || '') + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_anim_name') + '</span>'
            + '<input type="text" class="jc-input gc-ga-animname" placeholder="' + T('jc_placeholder_anim_name') + '" value="' + esc(d.animName || '') + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('jc_field_flag') + '</span>'
            + '<input type="number" class="jc-input gc-ga-animflag" min="0" value="' + (d.animFlag || 17) + '"></div>'
            + '</div>'
            + '</div>';
    }

    function gaTabContent_NpcSettings(act) {
        const d = act.data || {};
        const oh = d.openHours || {};
        return '<div id="ga-tab-npc_settings" class="ga-tab-body">'
            + '<div class="jc-config-notice" style="margin-bottom:16px">'
            + '<i class="fas fa-info-circle"></i>'
            + '<span>' + T('ga_npc_model_in_locations_hint') + '</span>'
            + '</div>'
            + '<div class="jc-field" style="margin-bottom:14px"><span class="jc-field-label">' + T('ga_npc_prompt') + '</span>'
            + '<input class="jc-input" id="ga_promptText" value="' + esc(d.promptText || '') + '" placeholder="' + esc(T('ga_prompt_sell_npc')) + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_npc_prompt') + '</span></div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('ga_npc_refuse') + '</span>'
            + '<input class="jc-input" id="ga_refuseChance" type="number" min="0" max="100" value="' + (d.refuseChance || 0) + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_refuse') + '</span></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('ga_npc_cooldown') + '</span>'
            + '<input class="jc-input" id="ga_cooldown" type="number" min="0" value="' + (d.cooldown || 30) + '">'
            + '<span class="jc-field-hint">' + T('ga_hint_cooldown') + '</span></div>'
            + '</div>'
            + '<div class="jc-section-icon-title" style="margin-top:20px"><i class="fas fa-clock"></i><h2>' + T('ga_hours_title') + '</h2></div>'
            + '<div class="jc-perm-hint">' + T('ga_hint_hours_desc') + '</div>'
            + '<div class="jc-field-row">'
            + '<div class="jc-field"><span class="jc-field-label">' + T('ga_hours_enabled') + '</span>'
            + '<input type="checkbox" id="ga_ohEnabled" ' + (oh.enabled ? 'checked' : '') + '></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('ga_hours_from') + '</span>'
            + '<input class="jc-input" id="ga_ohFrom" type="number" min="0" max="23" value="' + (oh.from !== undefined ? oh.from : 8) + '"></div>'
            + '<div class="jc-field"><span class="jc-field-label">' + T('ga_hours_to') + '</span>'
            + '<input class="jc-input" id="ga_ohTo" type="number" min="0" max="23" value="' + (oh.to !== undefined ? oh.to : 22) + '"></div>'
            + '</div>'
            + '</div>';
    }

    // ---- Collecte du formulaire ----
    function collectActivityForm() {
        const act = JSON.parse(JSON.stringify(editingActivity || { data: {} }));
        act.name = ($('#gaName').val() || '').trim();
        act.label = ($('#gaLabel').val() || '').trim();
        act.type = $('#gaType').val() || act.type || 'harvest';
        // Gangs
        const gangsChecked = [];
        $('.ga-gang-cb:checked').each(function() { gangsChecked.push($(this).val()); });
        act.gangs = gangsChecked.includes('*') ? ['*'] : (gangsChecked.length ? gangsChecked : ['*']);

        const d = {};
        // Anim
        const animId = $('.gc-ga-animid').attr('data-value') || (act.type === 'harvest' ? 'hoeing' : 'craft');
        d.animId = animId;
        if (animId === 'custom') {
            d.animDict = ($('.gc-ga-animdict').val() || '').trim();
            d.animName = ($('.gc-ga-animname').val() || '').trim();
            d.animFlag = parseInt($('.gc-ga-animflag').val()) || 17;
        } else {
            const preset = GC_ANIMATIONS.find(a => a.id === animId);
            if (preset) { d.animDict = preset.dict; d.animName = preset.name; d.animFlag = preset.flag; }
        }

        // Required items
        d.requiredItems = [];
        $('#gaRequiredList .ga-req-row').each(function() {
            const item = ($(this).find('.ga-req-item').val() || '').trim();
            if (item) d.requiredItems.push({ item, amount: parseInt($(this).find('.ga-req-amount').val()) || 1 });
        });
        // Legacy compat
        d.requiredItem = d.requiredItems.length ? d.requiredItems[0].item : '';

        d.duration = parseInt($('#ga_duration').val()) || (act.type === 'process' ? 8 : 5);
        d.cooldown = parseInt($('#ga_cooldown').val()) || 60;

        if (act.type === 'harvest') {
            d.rewards = [];
            $('#gaRewardsList .ga-reward-row').each(function() {
                const item = ($(this).find('.ga-rw-item').val() || '').trim();
                if (item) d.rewards.push({ item, amount: parseInt($(this).find('.ga-rw-amount').val()) || 1, chance: parseInt($(this).find('.ga-rw-chance').val()) || 100 });
            });
            d.points = [];
            $('#gaHarvestPointsList .ga-hvp-row').each(function(i) {
                const x = parseFloat($(this).find('.ga-hvp-x').val());
                const y = parseFloat($(this).find('.ga-hvp-y').val());
                const z = parseFloat($(this).find('.ga-hvp-z').val());
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    d.points.push({ x, y, z,
                        heading: parseFloat($(this).find('.ga-hvp-h').val()) || 0,
                        heightOffset: parseFloat($(this).find('.ga-hvp-ho').val()) || 0,
                        rotX: parseFloat($(this).find('.ga-hvp-rx').val()) || 0,
                        rotY: parseFloat($(this).find('.ga-hvp-ry').val()) || 0,
                        gizmoPlaced: parseInt($(this).find('.ga-hvp-gizmo').val()) || 0,
                        propModel: ($(this).find('.ga-hvp-prop').val() || '').trim(),
                    });
                }
            });
        } else if (act.type === 'process') {
            d.inputItems = [];
            $('#gaInputItemsList .ga-input-row').each(function() {
                const item = ($(this).find('.ga-in-item').val() || '').trim();
                if (item) d.inputItems.push({ item, amount: parseInt($(this).find('.ga-in-amount').val()) || 1 });
            });
            // Legacy compat (1er item)
            if (d.inputItems.length) { d.inputItem = d.inputItems[0].item; d.inputAmount = d.inputItems[0].amount; }
            d.rewards = [];
            $('#gaRewardsList .ga-reward-row').each(function() {
                const item = ($(this).find('.ga-rw-item').val() || '').trim();
                if (item) d.rewards.push({ item, amount: parseInt($(this).find('.ga-rw-amount').val()) || 1, chance: parseInt($(this).find('.ga-rw-chance').val()) || 100 });
            });
            // Legacy compat
            if (d.rewards.length) { d.outputItem = d.rewards[0].item; d.outputAmount = d.rewards[0].amount; }
            d.propModel = ($('#ga_propModel').val() || '').trim();
            d.distance = parseFloat($('#ga_procDistance').val()) || 2.0;
            d.x = parseFloat($('.ga-proc-x').val()) || 0;
            d.y = parseFloat($('.ga-proc-y').val()) || 0;
            d.z = parseFloat($('.ga-proc-z').val()) || 0;
            d.heading = parseFloat($('.ga-proc-heading').val()) || 0;
            d.heightOffset = parseFloat($('.ga-proc-ho').val()) || 0;
            d.rotX = parseFloat($('.ga-proc-rotx').val()) || 0;
            d.rotY = parseFloat($('.ga-proc-roty').val()) || 0;
            d.gizmoPlaced = parseInt($('.ga-proc-gizmoplaced').val()) || 0;
        } else if (act.type === 'sell_npc') {
            d.pointType = $('#ga_pointType').val() || 'npc';
            const gaModelVal = ($('#ga_npcModel').val() || '').trim();
            d.npcModel = d.pointType === 'npc' ? gaModelVal : '';
            d.propModel = d.pointType === 'prop' ? gaModelVal : '';
            d.radius = parseFloat($('#ga_zoneRadius').val()) || 2.5;
            d.promptText = ($('#ga_promptText').val() || '').trim();
            d.x = parseFloat($('.ga-npc-x').val()) || 0;
            d.y = parseFloat($('.ga-npc-y').val()) || 0;
            d.z = parseFloat($('.ga-npc-z').val()) || 0;
            d.heading = parseFloat($('.ga-npc-heading').val()) || 0;
            d.heightOffset = parseFloat($('.ga-npc-ho').val()) || 0;
            d.rotX = parseFloat($('.ga-npc-rotx').val()) || 0;
            d.rotY = parseFloat($('.ga-npc-roty').val()) || 0;
            d.gizmoPlaced = parseInt($('.ga-npc-gizmoplaced').val()) || 0;
            d.refuseChance = parseInt($('#ga_refuseChance').val()) || 0;
            d.cooldown = parseInt($('#ga_cooldown').val()) || 30;
            d.openHours = {
                enabled: $('#ga_ohEnabled').is(':checked'),
                from: parseInt($('#ga_ohFrom').val()) || 8,
                to: parseInt($('#ga_ohTo').val()) || 22,
            };
            d.items = [];
            $('#gaNpcItemsList .ga-ni-row').each(function() {
                const item = ($(this).find('.ga-ni-item').val() || '').trim();
                if (item) d.items.push({ item,
                    priceMin: parseInt($(this).find('.ga-ni-pricemin').val()) || 0,
                    priceMax: parseInt($(this).find('.ga-ni-pricemax').val()) || 0,
                    maxQty: parseInt($(this).find('.ga-ni-maxqty').val()) || 1,
                });
            });
        }
        act.data = d;
        return act;
    }

    function saveCurrentActivity() {
        const act = collectActivityForm();
        if (!act.name) { showToast(T('ga_hint_name_required'), 'error'); return; }
        $.post('https://cactus_ultimate/ga_saveActivity', JSON.stringify(act));
    }

    function deleteActivity(id) {
        showConfirm(T('ga_confirm_delete_title'), T('ga_confirm_delete'), function() {
            $.post('https://cactus_ultimate/ga_deleteActivity', JSON.stringify({ id }));
        });
    }

    function switchGaTab(tabId) {
        gaActiveTab = tabId;
        $('.ga-tab').removeClass('active');
        $('.ga-tab[data-tab="' + tabId + '"]').addClass('active');
        $('.ga-tab-body').hide();
        $('#ga-tab-' + tabId).show();
    }

    function renderActivityEditor(act, isNew) {
        editingActivity = act || { name: '', label: '', type: 'harvest', gangs: ['*'], data: {} };
        const type = editingActivity.type || 'harvest';
        const tabs = gaTabsForType(type);
        gaActiveTab = 'basic';

        const typeIcon = (GA_TYPES.find(t => t.id === type) || {}).icon || 'fa-flask';
        const tabsHtml = tabs.map(t =>
            '<div class="ga-tab' + (t.id === gaActiveTab ? ' active' : '') + '" data-tab="' + t.id + '">'
            + '<i class="fas ' + t.icon + '"></i><span>' + T(t.label) + '</span></div>'
        ).join('');

        let html = '<div class="ga-editor">'
            // Breadcrumb
            + '<div class="ga-breadcrumb">'
            + '<button class="jc-action-btn ga-back-to-list" style="padding:5px 12px;margin-right:10px"><i class="fas fa-arrow-left"></i></button>'
            + '<i class="fas ' + typeIcon + '" style="color:rgba(154, 148, 138,1);margin-right:8px"></i>'
            + '<span style="font-weight:600">' + esc(editingActivity.label || editingActivity.name || T(isNew ? 'ga_add_activity' : 'ga_edit_activity')) + '</span>'
            + (isNew ? '<span style="margin-left:10px;font-size:.8em;padding:2px 8px;background:rgba(154, 148, 138,.2);border:1px solid rgba(154, 148, 138,.4);border-radius:10px">' + T('ga_badge_new') + '</span>' : '')
            + '</div>'
            // Onglets
            + '<div class="ga-tab-bar">' + tabsHtml + '</div>'
            // Contenu des onglets (tous dans le DOM, visibilité CSS)
            + gaTabContent_Basic(editingActivity)
            + gaTabContent_RequiredItems(editingActivity)
            + gaTabContent_GiveItems(editingActivity)
            + gaTabContent_Locations(editingActivity)
            + gaTabContent_Animation(editingActivity)
            + (type === 'sell_npc' ? gaTabContent_NpcSettings(editingActivity) : '')
            // Barre de sauvegarde
            + '<div class="jc-save-bar">'
            + '<button class="jc-btn jc-btn-save" id="gaSaveActBtn"><i class="fas fa-save"></i> ' + T('jc_btn_save') + '</button>'
            + (!isNew ? '<button class="jc-btn jc-btn-danger" id="gaDeleteActBtn" style="margin-left:8px"><i class="fas fa-trash"></i> ' + T('gc_btn_delete') + '</button>' : '')
            + '</div>'
            + '</div>';

        $('#gcPageActivities').html(html);

        // Cacher tous les tabs sauf basic
        $('.ga-tab-body').hide();
        $('#ga-tab-basic').show();

        // === Événements === (off() systématique pour éviter l'accumulation de handlers)
        $('#gcPageActivities').off();

        // Navigation onglets
        $('#gcPageActivities').on('click', '.ga-tab', function() {
            switchGaTab($(this).data('tab'));
        });

        // Retour liste
        $('#gcPageActivities').on('click', '.ga-back-to-list', renderActivitiesPage);

        // Changement de type → re-render complet
        $('#gaType').on('change', function() {
            const saved = collectActivityForm();
            saved.type = $(this).val();
            editingActivity = saved;
            renderActivityEditor(saved, isNew);
        });

        // Rewards
        $('#gcPageActivities').on('click', '.ga-add-reward', function() {
            const i = $('#gaRewardsList .ga-reward-row').length;
            $('#gaRewardsList').append(gaRewardRow({}, i));
        });
        $('#gcPageActivities').on('click', '.ga-rw-remove', function() { $(this).closest('.ga-reward-row').remove(); });

        // Input items (process)
        $('#gcPageActivities').on('click', '.ga-add-input', function() {
            const i = $('#gaInputItemsList .ga-input-row').length;
            $('#gaInputItemsList').append(gaInputItemRow({}, i));
        });
        $('#gcPageActivities').on('click', '.ga-in-remove', function() { $(this).closest('.ga-input-row').remove(); });

        // Required items
        $('#gcPageActivities').on('click', '.ga-add-req', function() {
            const i = $('#gaRequiredList .ga-req-row').length;
            $('#gaRequiredList').append(gaRequiredItemRow({}, i));
        });
        $('#gcPageActivities').on('click', '.ga-req-remove', function() { $(this).closest('.ga-req-row').remove(); });

        // Harvest points
        $('#gcPageActivities').on('click', '.ga-add-point', function() {
            const i = $('#gaHarvestPointsList .ga-hvp-row').length;
            $('#gaHarvestPointsList').append(gaHarvestPointRow({}, i));
        });
        $('#gcPageActivities').on('click', '.ga-hvp-remove', function() { $(this).closest('.ga-hvp-row').remove(); });

        // NPC items
        $('#gcPageActivities').on('click', '.ga-add-npc-item', function() {
            const i = $('#gaNpcItemsList .ga-ni-row').length;
            $('#gaNpcItemsList').append(gaNpcItemRow({}, i));
        });
        $('#gcPageActivities').on('click', '.ga-ni-remove', function() { $(this).closest('.ga-ni-row').remove(); });

        // Toggle type d'emplacement sell_npc : PNJ / Prop / Zone (sans entité)
        $('#gcPageActivities').on('click', '.ga-pt-btn', function() {
            const ptype = $(this).data('ptype');
            $('#ga_pointType').val(ptype);
            $('.ga-pt-btn').removeClass('active');
            $(this).addClass('active');
            const isProp = ptype === 'prop';
            const isZone = ptype === 'zone';
            $('.ga-pt-model-section').toggle(!isZone);
            $('.ga-pt-zone-section').toggle(isZone);
            $('.ga-pt-model-label').text(isProp ? T('jc_field_prop_model') : T('ga_npc_model'));
            $('.ga-pt-model-hint').text(isProp ? T('ga_hint_prop') : T('ga_hint_npc_model'));
            $('#ga_npcModel').attr('placeholder', isProp ? T('jc_placeholder_prop_model') : 'a_m_y_indian_01');
            $('.gc-place-btn[data-propsel="#ga_npcModel"]').attr('data-isped', ptype === 'npc' ? '1' : '0');
        });

        // Note: .gc-place-btn dans les activités est géré par le handler global gcPlaceBtn
        // qui lit data-propsel, data-isped, data-xsel, etc. et appelle gc_startCoordPicker

        // jc-csel animation handler
        $('#gcPageActivities').on('click', '.jc-csel-opt', function() {
            const val = $(this).data('val');
            const $sel = $(this).closest('.jc-csel');
            $sel.find('.jc-csel-opt').removeClass('jc-csel-selected');
            $(this).addClass('jc-csel-selected');
            $sel.find('.jc-csel-display').text($(this).text());
            $sel.attr('data-value', val);
            $sel.find('.jc-csel-opts').removeClass('open');
            const isCustom = val === 'custom';
            $('.gc-ga-anim-custom').toggle(isCustom);
        });
        $('#gcPageActivities').on('click', '.jc-csel-display', function() {
            $(this).siblings('.jc-csel-opts').toggleClass('open');
        });

        // Save / Delete
        $('#gaSaveActBtn').on('click', saveCurrentActivity);
        $('#gaDeleteActBtn').on('click', function() { deleteActivity(editingActivity.id); });
    }

    function renderActivitiesPage() {
        editingActivity = null;
        const acts = Object.values(allActivities || {});

        const TYPE_META = {
            harvest:  { color: '#f5f3ee', bg: 'rgba(245, 243, 238,.12)', border: 'rgba(245, 243, 238,.25)',  icon: 'fa-cannabis' },
            process:  { color: '#9a948a', bg: 'rgba(154, 148, 138,.12)', border: 'rgba(154, 148, 138,.25)',  icon: 'fa-flask' },
            sell_npc: { color: '#cb0101', bg: 'rgba(165, 1, 1,.12)', border: 'rgba(165, 1, 1,.25)', icon: 'fa-sack-dollar' },
        };

        let html = '<div class="ga-list-page">'
            + '<div class="ga-list-header">'
            + '<div class="jc-section-icon-title" style="margin:0"><i class="fas fa-flask"></i><h2>' + T('gc_page_activities') + '</h2></div>'
            + '<button class="jc-btn jc-btn-primary" id="gaNewActBtn"><i class="fas fa-plus"></i> ' + T('ga_add_activity') + '</button>'
            + '</div>';

        if (!acts.length) {
            html += '<div class="jc-perm-hint" style="text-align:center;padding:40px 0">'
                + '<i class="fas fa-flask" style="font-size:2.2em;margin-bottom:14px;display:block;opacity:.2"></i>'
                + '<span style="opacity:.5">' + T('ga_hint_empty') + '</span></div>';
        } else {
            html += '<div class="ga-act-list">';
            acts.forEach(act => {
                const typeObj = GA_TYPES.find(t => t.id === act.type) || { label: act.type, icon: 'fa-circle' };
                const meta    = TYPE_META[act.type] || { color: '#9a948a', bg: 'rgba(154, 148, 138,.1)', border: 'rgba(154, 148, 138,.2)', icon: 'fa-circle' };
                const gangsArr = Array.isArray(act.gangs) ? act.gangs : [];
                const isPublic = gangsArr.includes('*');
                const gangsText = isPublic
                    ? '<span class="ga-gang-chip ga-gang-chip-public"><i class="fas fa-globe"></i> ' + T('ga_gangs_public') + '</span>'
                    : gangsArr.map(g => '<span class="ga-gang-chip">' + esc(g) + '</span>').join('');

                html += '<div class="ga-act-row" data-actid="' + act.id + '" style="--act-color:' + meta.color + ';--act-bg:' + meta.bg + ';--act-border:' + meta.border + '">'
                    // Indicateur couleur type
                    + '<div class="ga-act-stripe"></div>'
                    // Icône type
                    + '<div class="ga-act-icon-wrap"><i class="fas ' + meta.icon + '"></i></div>'
                    // Infos
                    + '<div class="ga-act-body">'
                    + '<div class="ga-act-name">' + esc(act.label || act.name) + '</div>'
                    + '<div class="ga-act-chips">'
                    + '<span class="ga-type-chip" style="color:' + meta.color + ';background:' + meta.bg + ';border-color:' + meta.border + '">'
                    + '<i class="fas ' + meta.icon + '"></i> ' + T(typeObj.label) + '</span>'
                    + '<span class="ga-id-chip"><i class="fas fa-tag"></i> ' + esc(act.name) + '</span>'
                    + gangsText
                    + '</div>'
                    + '</div>'
                    // Boutons
                    + '<div class="ga-act-btns">'
                    + '<button class="jc-action-btn jc-action-btn-gold ga-act-edit-btn" data-actid="' + act.id + '"><i class="fas fa-pen"></i> ' + T('jc_btn_edit') + '</button>'
                    + '<button class="ga-act-del-btn" data-actid="' + act.id + '"><i class="fas fa-trash"></i></button>'
                    + '</div>'
                    + '</div>';
            });
            html += '</div>';
        }
        html += '</div>';
        $('#gcPageActivities').html(html);

        $('#gaNewActBtn').on('click', function() { renderActivityEditor(null, true); });
        $('#gcPageActivities').on('click', '.ga-act-edit-btn', function(e) {
            e.stopPropagation();
            const id = $(this).data('actid');
            const act = allActivities[id] || allActivities[String(id)];
            if (act) renderActivityEditor(JSON.parse(JSON.stringify(act)), false);
        });
        $('#gcPageActivities').on('click', '.ga-act-del-btn', function(e) {
            e.stopPropagation();
            const id = $(this).data('actid');
            deleteActivity(id);
        });
    }

})(jQuery);
