(function($) {
    'use strict';

    let allJobs = [];
    let selectedJob = null;
    let editingJob = null;
    let isCreatingNew = false;
    let activeSection = 'general';
    let currentView = 'list'; // 'list' | 'editor'
    let activePage = 'dashboard'; // 'dashboard' | 'jobs' | 'webhooks' | 'history' | 'updates' | 'community'
    let coordPickerContext = null;
    let blipsList = [];
    let hasCactusCraft = false;

    const PAGES = [
        { id: 'dashboard',      label: 'jc_page_dashboard',      icon: 'fa-th-large' },
        { id: 'jobs',           label: 'jc_page_jobs',           icon: 'fa-briefcase' },
        { id: 'craftsettings',  label: 'jc_page_craftsettings',  icon: 'fa-flask' },
        { id: 'community',      label: 'jc_page_community',      icon: 'fa-users' },
        { id: 'webhooks',       label: 'jc_page_webhooks',       icon: 'fa-plug' },
        { id: 'history',        label: 'jc_page_history',        icon: 'fa-history' },
        { id: 'updates',        label: 'jc_page_updates',        icon: 'fa-bell' },
    ];

    fetch('blips/blips_list.json').then(r => r.json()).then(list => { blipsList = list; }).catch(() => { blipsList = []; });

    function ensureArray(v) {
        if (typeof v === 'string') { try { v = JSON.parse(v); } catch(e) { return []; } }
        return Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
    }

    function jcSelect(cls, dataAttrs, options, selectedVal, disabled) {
        var d = disabled ? 'jc-csel-disabled' : '';
        var selLabel = '';
        for (var oi = 0; oi < options.length; oi++) {
            if (options[oi].value === selectedVal) { selLabel = options[oi].label; break; }
        }
        if (!selLabel && options.length > 0) selLabel = options[0].label;
        var h = '<div class="jc-csel ' + cls + ' ' + d + '" ' + dataAttrs + ' data-value="' + esc(selectedVal || '') + '">';
        h += '<div class="jc-csel-display">' + esc(selLabel) + '</div>';
        h += '<div class="jc-csel-opts">';
        for (var oi2 = 0; oi2 < options.length; oi2++) {
            var sel = options[oi2].value === selectedVal ? ' jc-csel-selected' : '';
            h += '<div class="jc-csel-opt' + sel + '" data-val="' + esc(options[oi2].value) + '">' + esc(options[oi2].label) + '</div>';
        }
        h += '</div></div>';
        return h;
    }

    function initJcSelects(container) {
        var $c = container ? $(container) : $(document);
        $c.find('.jc-csel').not('.jc-csel-disabled').each(function() {
            var $sel = $(this);
            if ($sel.data('jc-csel-init')) return;
            $sel.data('jc-csel-init', true);
        });
    }

    $(document).off('click.jcCsel').on('click.jcCsel', '.jc-csel-display', function(e) {
        e.stopPropagation();
        var $sel = $(this).closest('.jc-csel');
        if ($sel.hasClass('jc-csel-disabled')) return;
        var $opts = $sel.find('.jc-csel-opts');
        $('.jc-csel-opts').not($opts).removeClass('open');
        $('.jc-csel').not($sel).removeClass('active');
        $opts.toggleClass('open');
        $sel.toggleClass('active');
    });
    $(document).off('click.jcCselOpt').on('click.jcCselOpt', '.jc-csel-opt', function(e) {
        e.stopPropagation();
        var $sel = $(this).closest('.jc-csel');
        var val = $(this).attr('data-val');
        var txt = $(this).text();
        $sel.attr('data-value', val);
        $sel.find('.jc-csel-display').text(txt);
        $sel.find('.jc-csel-opt').removeClass('jc-csel-selected');
        $(this).addClass('jc-csel-selected');
        $sel.find('.jc-csel-opts').removeClass('open');
        $sel.removeClass('active');
        $sel.trigger('jc-csel-change');
    });
    $(document).on('click.jcCselClose', function() {
        $('.jc-csel-opts').removeClass('open');
        $('.jc-csel').removeClass('active');
    });

    function jcSelVal($el) {
        if ($el.hasClass('jc-csel')) return $el.attr('data-value') || '';
        return $el.val() || '';
    }

    const PERM_DEFS = [
        { key: 'openBossMenu',        label: _T('jc_perm_open_boss_menu'),      icon: 'fa-door-open' },
        { key: 'recruit',             label: _T('jc_perm_recruit'),             icon: 'fa-user-plus' },
        { key: 'fire',                label: _T('jc_perm_fire'),                icon: 'fa-user-times' },
        { key: 'promote',             label: _T('jc_perm_promote'),             icon: 'fa-arrow-up' },
        { key: 'manageMoney',         label: _T('jc_perm_manage_money'),        icon: 'fa-dollar-sign' },
        { key: 'manageGold',          label: _T('jc_perm_manage_gold'),         icon: 'fa-coins' },
        { key: 'viewHistory',         label: _T('jc_perm_view_history'),        icon: 'fa-history' },
        { key: 'viewFullHistory',     label: _T('jc_perm_view_full_history'),   icon: 'fa-book' },
        { key: 'editGrades',          label: _T('jc_perm_edit_grades'),         icon: 'fa-edit' },
        { key: 'upgradeStorage',      label: _T('jc_perm_upgrade_storage'),     icon: 'fa-arrow-up' },
        { key: 'accessInventory',     label: _T('jc_perm_access_inventory'),    icon: 'fa-box' },
        { key: 'editAvatars',         label: _T('jc_perm_edit_avatars'),        icon: 'fa-image' },
        { key: 'manageEmployeeGrade', label: _T('jc_perm_manage_employee_grade'), icon: 'fa-user-edit' },
        { key: 'canSeeManageButton',  label: _T('jc_perm_see_manage_btn'),     icon: 'fa-cog' },
        { key: 'canSeeFireButton',    label: _T('jc_perm_see_fire_btn'),       icon: 'fa-eye' },
        { key: 'canSeePromoteButton', label: _T('jc_perm_see_promote_btn'),    icon: 'fa-eye' },
        { key: 'canSeeDemoteButton',  label: _T('jc_perm_see_demote_btn'),     icon: 'fa-eye' },
        { key: 'canGiveBonus',        label: _T('jc_perm_give_bonuses'),       icon: 'fa-gift' },
        { key: 'canSeeBonusButton',   label: _T('jc_perm_see_bonus_btn'),      icon: 'fa-eye' },
    ];

    const SECTIONS = [
        { id: 'general',      labelKey: 'jc_section_general',       icon: 'fa-info-circle' },
        { id: 'grades',       labelKey: 'jc_section_grades',        icon: 'fa-layer-group' },
        { id: 'bossmenus',    labelKey: 'jc_section_bossmenus',     icon: 'fa-map-marker-alt' },
        { id: 'blips',        labelKey: 'jc_section_blips',         icon: 'fa-map-pin' },
        { id: 'stashes',      labelKey: 'jc_section_stashes',       icon: 'fa-lock' },
        { id: 'shops',        labelKey: 'jc_section_shops',         icon: 'fa-shopping-cart' },
        { id: 'harvestzones', labelKey: 'jc_section_harvestzones',  icon: 'fa-leaf' },
        { id: 'sellpoints',   labelKey: 'jc_section_sellpoints',   icon: 'fa-store' },
        { id: 'dutypoints',   labelKey: 'jc_section_dutypoints',   icon: 'fa-clock' },
        { id: 'registers',    labelKey: 'jc_section_registers',    icon: 'fa-cash-register' },
        { id: 'crafting',     labelKey: 'jc_section_crafting',     icon: 'fa-hammer' },
        { id: 'permissions',  labelKey: 'jc_section_permissions',  icon: 'fa-shield-alt' },
    ];

    window.addEventListener('message', function(event) {
        const data = event.data;

        if (data.action === 'openJobCreator') {
            if (data.locale) setLocale(data.locale);
            hasCactusCraft = data.hasCactusCraft === true;
            allJobs = data.jobs || [];
            selectedJob = null;
            editingJob = null;
            isCreatingNew = false;
            currentView = 'list';
            activePage = 'dashboard';
            jcDashboardStats = null;
            showUI();
            switchToPage('dashboard');
            $.post('https://cactus_ultimate/community_getMyProfile', JSON.stringify({}));
        }

        if (data.action === 'community_myProfile') {
            if (data.name) {
                var profileEl = $('#jcSidebarProfile');
                $('#jcSidebarName').text(data.name);
                if (data.avatar) {
                    $('#jcSidebarAvatar').attr('src', data.avatar).show();
                } else {
                    $('#jcSidebarAvatar').hide();
                }
                profileEl.show();
            }
        }

        if (data.action === 'refreshJobCreator') {
            allJobs = data.jobs || [];
            const selName = data.selectedName || (selectedJob ? selectedJob.name : null);
            if (currentView === 'list') {
                renderJobList($('.jc-search-input').val());
                if (selName) {
                    selectedJob = allJobs.find(j => j.name === selName) || null;
                    renderPreview();
                    renderJobList($('.jc-search-input').val());
                }
            } else if (currentView === 'editor') {
                if (selName) {
                    const fresh = allJobs.find(j => j.name === selName);
                    if (fresh) {
                        editingJob = JSON.parse(JSON.stringify(fresh));
                        selectedJob = fresh;
                        $('#jcEditingName').text(editingJob.label || editingJob.name);
                        renderSection(activeSection);
                    }
                }
            }
        }

        if (data.action === 'jc_receiveHistory') {
            if (typeof window._jcHistoryHandler === 'function') {
                window._jcHistoryHandler(data.data || {});
            }
        }

        if (data.action === 'jc_receivePos') {
            if (data.coords) {
                if (coordPickerContext) {
                    $(coordPickerContext.xSel).val(data.coords.x);
                    $(coordPickerContext.ySel).val(data.coords.y);
                    $(coordPickerContext.zSel).val(data.coords.z);
                    if (coordPickerContext.hSel && data.coords.heading !== undefined) {
                        $(coordPickerContext.hSel).val(data.coords.heading);
                    }
                    if (coordPickerContext.rotXSel && data.coords.rotX !== undefined) {
                        $(coordPickerContext.rotXSel).val(data.coords.rotX);
                    }
                    if (coordPickerContext.rotYSel && data.coords.rotY !== undefined) {
                        $(coordPickerContext.rotYSel).val(data.coords.rotY);
                    }
                    if (coordPickerContext.gizmoPlacedSel && data.coords.gizmoPlaced !== undefined) {
                        $(coordPickerContext.gizmoPlacedSel).val(data.coords.gizmoPlaced);
                    }
                    if (coordPickerContext.isSphere && coordPickerContext.radiusSel && data.coords.heightOffset !== undefined) {
                        $(coordPickerContext.radiusSel).val(data.coords.heightOffset);
                    } else if (coordPickerContext.hoSel && data.coords.heightOffset !== undefined) {
                        $(coordPickerContext.hoSel).val(data.coords.heightOffset);
                    }
                    coordPickerContext = null;
                    collectFormIntoEditing();
                } else {
                    $('#jcCoordX').val(data.coords.x);
                    $('#jcCoordY').val(data.coords.y);
                    $('#jcCoordZ').val(data.coords.z);
                    collectFormIntoEditing();
                }
            }
        }

        if (data.action === 'jc_restore') {
            restoreFromMinimize();
        }

        if (data.action === 'jc_showPlacementGuide') {
            $('#jcPlacementGuide').css('display', 'flex');
            if (data.title) {
                $('.jc-placement-guide-title').text(data.title);
            } else {
                $('.jc-placement-guide-title').text(_T('jc_placement_mode'));
            }
            if (data.keys) {
                $('.jc-placement-guide-keys').html(data.keys);
            } else {
                $('.jc-placement-guide-keys').html(
                    '<span class="jc-key-hint"><kbd>←</kbd><kbd>→</kbd> ' + _T('jc_placement_rotate') + '</span>'
                    + '<span class="jc-key-hint"><kbd>↑</kbd><kbd>↓</kbd> ' + _T('jc_placement_height') + '</span>'
                    + '<span class="jc-key-hint"><kbd>R</kbd> ' + _T('jc_placement_snap_ground') + '</span>'
                    + '<span class="jc-key-hint"><kbd>G</kbd> ' + _T('jc_placement_confirm') + '</span>'
                    + '<span class="jc-key-hint"><kbd>Esc</kbd> ' + _T('jc_placement_cancel') + '</span>'
                );
            }
            if (data.label1) {
                $($('.jc-heading-label')[0]).text(data.label1);
            } else {
                $($('.jc-heading-label')[0]).text(_T('jc_placement_heading'));
            }
            if (data.label2) {
                $($('.jc-heading-label')[1]).text(data.label2);
            } else {
                $($('.jc-heading-label')[1]).text(_T('jc_placement_position'));
            }
            $('#jcPlacementHeading').text(data.heading !== undefined ? data.heading : 0);
            $('#jcPlacementHeight').text(data.height !== undefined ? data.height : 0);
        }
        if (data.action === 'jc_hidePlacementGuide') {
            $('#jcPlacementGuide').hide();
            $('.jc-placement-guide-title').text(_T('jc_placement_mode'));
            $($('.jc-heading-label')[0]).text(_T('jc_placement_heading'));
            $($('.jc-heading-label')[1]).text(_T('jc_placement_position'));
        }

        if (data.action === 'jc_updateDashboardStats') {
            updateJCDashboardStats(data.stats || {});
        }
    });

    function showUI() {
        $('#jobCreatorContainer').show();
        $('.jc-minimize-banner').hide();

        renderMainNav();

        $('.jc-logo-row span').text(_T('jc_title'));
        $('.jc-search-input').attr('placeholder', _T('jc_search_placeholder'));
        $('#jcNewJobBtn').html('<i class="fas fa-plus"></i> ' + _T('jc_btn_create_new'));
        $('#jcCloseBtn').html('<i class="fas fa-times"></i> ' + _T('jc_btn_close_panel'));
        $('#jcSwitchGangBtn').html('<i class="fas fa-skull"></i> <span>' + _T('gc_ui_title') + '</span>');
        $('.jc-preview-empty p').text(_T('jc_select_job_preview'));
        $('.jc-editing-label').text(_T('jc_editing_label'));
        $('#jcGoBackBtn').html('<i class="fas fa-arrow-left"></i> ' + _T('jc_btn_go_back'));
        $('.jc-minimize-banner span').html('<i class="fas fa-hammer" style="margin-right:6px;"></i>' + _T('jc_minimize_banner'));
    }

    function hideUI() {
        $('#jobCreatorContainer').hide();
        $('.jc-minimize-banner').hide();
        $('#jcPlacementGuide').hide();
        $.post('https://cactus_ultimate/jc_close', JSON.stringify({}));
    }

    function restoreFromMinimize() {
        $('#jobCreatorContainer').show();
        $('.jc-minimize-banner').hide();
        $('#jcPlacementGuide').hide();
    }

    function renderMainNav() {
        const nav = $('#jcMainNavItems');
        nav.empty();
        PAGES.filter(p => p.id !== 'craftsettings' || hasCactusCraft).forEach(p => {
            nav.append(`
                <div class="jc-main-nav-item ${p.id === activePage ? 'active' : ''}" data-page="${p.id}">
                    <i class="fas ${p.icon}"></i>
                    <span>${_T(p.label)}</span>
                </div>
            `);
        });
    }

    function switchToPage(pageId) {
        activePage = pageId;
        currentView = 'list';

        $('.jc-page').hide();

        $('#jcMainNav').show();

        $('.jc-main-nav-item').removeClass('active');
        $(`.jc-main-nav-item[data-page="${pageId}"]`).addClass('active');

        switch (pageId) {
            case 'dashboard':
                $('#jcPageDashboard').show();
                renderJCDashboard($('#jcPageDashboard'));
                break;
            case 'jobs':
                $('#jcPageJobs').show();
                renderJobList();
                renderPreview();
                break;
            case 'webhooks':
                $('#jcPageWebhooks').show();
                renderWebhooksPage();
                break;
            case 'history':
                $('#jcPageHistory').show();
                renderHistoryPage();
                break;
            case 'updates':
                $('#jcPageUpdates').show();
                renderUpdatesPage();
                break;
            case 'community':
                $('#jcPageCommunity').show();
                renderCommunityPage();
                break;
            case 'craftsettings':
                $('#jcPageCraftSettings').show();
                renderCraftSettingsPage();
                break;
        }
    }

    function switchToEditorView(job, creating) {
        isCreatingNew = creating || false;
        editingJob = JSON.parse(JSON.stringify(job));
        selectedJob = job;
        currentView = 'editor';
        activeSection = 'general';

        $('.jc-page').hide();
        $('#jcPageEditor').show();

        $('.jc-main-nav-item').removeClass('active');
        $('.jc-main-nav-item[data-page="jobs"]').addClass('active');

        $('#jcEditingName').text(editingJob.label || editingJob.name || _T('jc_new_job'));

        renderNavItems();
        renderSection('general');
    }

    function renderJobList(filter) {
        const container = $('.jc-job-list');
        container.empty();

        let jobs = allJobs;
        if (filter && filter.trim()) {
            const f = filter.toLowerCase();
            jobs = allJobs.filter(j => j.label.toLowerCase().includes(f) || j.name.toLowerCase().includes(f));
        }

        if (jobs.length === 0) {
            container.html('<div style="text-align:center;color:rgba(255,255,255,0.18);padding:2rem;font-size:0.78rem;font-family:Hapna,sans-serif;">' + _T('jc_no_jobs_found') + '</div>');
            return;
        }

        jobs.forEach(function(job) {
            const isActive = selectedJob && selectedJob.name === job.name;
            const src = job.source === 'config'
                ? '<span class="jc-badge jc-badge-config">CONFIG</span>'
                : '<span class="jc-badge jc-badge-db">DB</span>';
            const off = !job.enabled ? '<span class="jc-badge jc-badge-disabled">OFF</span>' : '';
            const emp = '<span class="jc-badge jc-badge-employees"><i class="fas fa-users" style="margin-right:2px;font-size:0.5rem;"></i>' + (job.employeeCount||0) + '</span>';

            container.append(`
                <div class="jc-job-item ${isActive ? 'active' : ''}" data-job="${esc(job.name)}">
                    <div class="jc-job-item-label">${esc(job.label)}</div>
                    <div class="jc-job-item-name">${esc(job.name)}</div>
                    <div class="jc-job-item-meta">${src}${off}${emp}</div>
                </div>
            `);
        });
    }

    let jcDashboardChart = null;
    let jcDashboardStats = null;

    function renderPreview() {
        const el = $('#jcListPreview');
        if (!selectedJob) {
            el.html(`<div class="jc-preview-empty"><i class="fas fa-briefcase"></i><p>${_T('jc_select_job_preview')}</p></div>`);
            return;
        }
        const j = selectedJob;
        const isDB = j.source === 'database';
        const coordsOk = j.coords && j.coords.x !== undefined;
        const gradeCount = (j.grades || []).length;

        el.html(`
            <div class="jc-preview-card">
                <div class="jc-preview-header">
                    <div>
                        <div class="jc-preview-title">${esc(j.label)}</div>
                        <div class="jc-preview-name">${esc(j.name)} · ${j.source === 'config' ? _T('jc_source_config') : _T('jc_source_database')}</div>
                    </div>
                    <div class="jc-preview-actions">
                        <button class="jc-btn jc-btn-edit" id="jcEditJobBtn"><i class="fas fa-pen"></i> ${_T('jc_btn_edit')}</button>
                        ${isDB ? '<button class="jc-btn jc-btn-toggle" id="jcTogglePrevBtn"><i class="fas fa-power-off"></i> ' + (j.enabled ? _T('jc_btn_disable') : _T('jc_btn_enable')) + '</button>' : ''}
                        ${isDB ? '<button class="jc-btn jc-btn-delete" id="jcDeletePrevBtn"><i class="fas fa-trash"></i> ' + _T('jc_btn_delete') + '</button>' : ''}
                    </div>
                </div>

                <div class="jc-preview-stats">
                    <div class="jc-stat-card">
                        <div class="jc-stat-card-value">${j.employeeCount || 0}</div>
                        <div class="jc-stat-card-label">${_T('jc_field_employees')}</div>
                    </div>
                    <div class="jc-stat-card">
                        <div class="jc-stat-card-value">${gradeCount}</div>
                        <div class="jc-stat-card-label">${_T('jc_field_grades')}</div>
                    </div>
                    <div class="jc-stat-card">
                        <div class="jc-stat-card-value">${coordsOk ? '<i class="fas fa-check" style="color:#f5f3ee;font-size:1rem;"></i>' : '<i class="fas fa-times" style="color:#cb0101;font-size:1rem;"></i>'}</div>
                        <div class="jc-stat-card-label">${_T('jc_field_location')}</div>
                    </div>
                    <div class="jc-stat-card">
                        <div class="jc-stat-card-value">${j.enabled ? '<i class="fas fa-check" style="color:#f5f3ee;font-size:1rem;"></i>' : '<i class="fas fa-times" style="color:#cb0101;font-size:1rem;"></i>'}</div>
                        <div class="jc-stat-card-label">${_T('jc_field_active')}</div>
                    </div>
                </div>

                <div class="jc-preview-info-grid">
                    <div class="jc-info-box">
                        <div class="jc-info-box-title">${_T('jc_field_max_salary')}</div>
                        <div class="jc-info-box-value">$${j.maxSalary || 0}</div>
                    </div>
                    <div class="jc-info-box">
                        <div class="jc-info-box-title">${_T('jc_field_location')}</div>
                        <div class="jc-info-box-value">${coordsOk ? (j.coords.x.toFixed(1) + ', ' + j.coords.y.toFixed(1) + ', ' + j.coords.z.toFixed(1)) : _T('jc_not_set')}</div>
                    </div>
                    <div class="jc-info-box">
                        <div class="jc-info-box-title">${_T('jc_field_storage')}</div>
                        <div class="jc-info-box-value">${j.storage && j.storage.id ? esc(j.storage.name || j.storage.id) : _T('jc_none')}</div>
                    </div>
                    <div class="jc-info-box">
                        <div class="jc-info-box-title">${_T('jc_field_highest_grade')}</div>
                        <div class="jc-info-box-value">${gradeCount > 0 ? esc(j.grades[gradeCount-1].name) : _T('jc_na')}</div>
                    </div>
                </div>
            </div>
        `);
    }

    function renderNavItems() {
        const nav = $('#jcNavItems');
        nav.empty();
        SECTIONS.filter(s => s.id !== 'crafting' || hasCactusCraft).forEach(s => {
            nav.append(`
                <div class="jc-nav-item ${s.id === activeSection ? 'active' : ''}" data-section="${s.id}">
                    <i class="fas ${s.icon}"></i>
                    <span>${_T(s.labelKey)}</span>
                </div>
            `);
        });
    }

    function renderSection(sectionId) {
        activeSection = sectionId;
        const el = $('#jcEditorContent');
        const j = editingJob;
        const isConfig = j.source === 'config';
        const d = isConfig ? 'disabled' : '';

        $('.jc-nav-item').removeClass('active');
        $(`.jc-nav-item[data-section="${sectionId}"]`).addClass('active');

        let html = '';

        if (isConfig) {
            html += `<div class="jc-config-notice"><i class="fas fa-info-circle"></i><span>${_T('jc_config_notice')}</span></div>`;
        }

        switch(sectionId) {
            case 'general':      html += buildGeneral(j, d); break;
            case 'grades':       html += buildGrades(j, d); break;
            case 'bossmenus':    html += buildBossMenus(j, d); break;
            case 'blips':        html += buildBlips(j, d); break;
            case 'stashes':      html += buildStashes(j, d); break;
            case 'shops':        html += buildShops(j, d); break;
            case 'harvestzones': html += buildHarvestZones(j, d); break;
            case 'sellpoints':   html += buildSellPoints(j, d); break;
            case 'dutypoints':   html += buildDutyPoints(j, d); break;
            case 'registers':    html += buildRegisters(j, d); break;
            case 'crafting':     html += buildCrafting(j, d); break;
            case 'permissions':  html += buildPermissions(j, d); break;
        }

        if (!isConfig) {
            html += `<div class="jc-save-bar">
                <button class="jc-btn jc-btn-save" id="jcSaveBtn"><i class="fas fa-save"></i> ${_T('jc_btn_save')}</button>
            </div>`;
        }

        el.html(html);
        bindSectionEvents(sectionId, isConfig);
    }

    function buildGeneral(j, d) {
        const dutyChecked = j.defaultDuty !== false ? 'checked' : '';
        const offDutyPayChecked = j.offDutyPay === true ? 'checked' : '';
        return `
            <div class="jc-section-icon-title"><i class="fas fa-info-circle"></i><h2>${_T('jc_section_general')}</h2></div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_name')}</span>
                    <input type="text" class="jc-input" id="jcJobName" value="${esc(j.name)}" placeholder="${_T('jc_placeholder_name')}" ${!isCreatingNew ? 'disabled' : ''} ${d}>
                    <span class="jc-field-hint">${isCreatingNew ? _T('jc_hint_name_new') : _T('jc_hint_name_locked')}</span>
                </div>
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_label')}</span>
                    <input type="text" class="jc-input" id="jcJobLabel" value="${esc(j.label)}" placeholder="${_T('jc_placeholder_label')}" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_label')}</span>
                </div>
            </div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_max_salary')}</span>
                    <input type="number" class="jc-input" id="jcMaxSalary" value="${j.maxSalary || 5000}" min="0" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_max_salary')}</span>
                </div>
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_min_grade_edit')}</span>
                    <input type="number" class="jc-input" id="jcMinGradeEdit" value="${j.minGradeToEditGrades || 3}" min="0" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_min_grade_edit')}</span>
                </div>
            </div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_job_type')}</span>
                    <input type="text" class="jc-input" id="jcJobType" value="${esc(j.jobType || '')}" placeholder="${_T('jc_placeholder_job_type')}" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_job_type')}</span>
                </div>
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_webhook')}</span>
                    <input type="text" class="jc-input" id="jcWebhook" value="${esc(j.webhook || '')}" placeholder="${_T('jc_placeholder_webhook')}" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_webhook')}</span>
                </div>
            </div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <div class="jc-checkbox-row">
                        <input type="checkbox" class="jc-checkbox" id="jcDefaultDuty" ${dutyChecked} ${d}>
                        <label class="jc-checkbox-label" for="jcDefaultDuty">${_T('jc_field_must_be_on_duty')}</label>
                    </div>
                    <span class="jc-field-hint">${_T('jc_hint_must_be_on_duty')}</span>
                </div>
                <div class="jc-field">
                    <div class="jc-checkbox-row">
                        <input type="checkbox" class="jc-checkbox" id="jcOffDutyPay" ${offDutyPayChecked} ${d}>
                        <label class="jc-checkbox-label" for="jcOffDutyPay">${_T('jc_field_off_duty_pay')}</label>
                    </div>
                    <span class="jc-field-hint">${_T('jc_hint_off_duty_pay')}</span>
                </div>
            </div>
        `;
    }

    function buildGrades(j, d) {
        const grades = j.grades || [];
        let rows = '';
        grades.forEach(g => {
            rows += `
                <tr data-level="${g.level}">
                    <td><span class="jc-grade-level">${g.level}</span></td>
                    <td><input type="text" value="${esc(g.name)}" class="jc-grade-name" ${d}></td>
                    <td><input type="number" value="${g.salary||0}" min="0" class="jc-grade-salary" ${d}></td>
                    ${!d ? '<td><button class="jc-grade-remove" title="' + _T('jc_btn_remove') + '"><i class="fas fa-times"></i></button></td>' : ''}
                </tr>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-layer-group"></i><h2>${_T('jc_section_grades')}</h2></div>

            <table class="jc-grades-table">
                <thead><tr>
                    <th style="width:55px;">${_T('jc_field_level')}</th>
                    <th>${_T('jc_field_name')}</th>
                    <th style="width:130px;">${_T('jc_field_salary')}</th>
                    ${!d ? '<th style="width:40px;"></th>' : ''}
                </tr></thead>
                <tbody id="jcGradesBody">${rows}</tbody>
            </table>
            ${!d ? '<button class="jc-add-grade-btn" id="jcAddGradeBtn"><i class="fas fa-plus"></i> ' + _T('jc_btn_add_grade') + '</button>' : ''}
        `;
    }

    function buildBossMenus(j, d) {
        const c = j.coords || {};
        const s = j.storage || {};
        return `
            <div class="jc-section-icon-title"><i class="fas fa-map-marker-alt"></i><h2>${_T('jc_section_bossmenus')}</h2></div>

            <div class="jc-coords-grid">
                <div class="jc-field" style="margin-bottom:0;">
                    <span class="jc-field-label">X</span>
                    <input type="number" step="0.0001" class="jc-input" id="jcCoordX" value="${c.x != null ? c.x : ''}" placeholder="0.0" ${d}>
                </div>
                <div class="jc-field" style="margin-bottom:0;">
                    <span class="jc-field-label">Y</span>
                    <input type="number" step="0.0001" class="jc-input" id="jcCoordY" value="${c.y != null ? c.y : ''}" placeholder="0.0" ${d}>
                </div>
                <div class="jc-field" style="margin-bottom:0;">
                    <span class="jc-field-label">Z</span>
                    <input type="number" step="0.0001" class="jc-input" id="jcCoordZ" value="${c.z != null ? c.z : ''}" placeholder="0.0" ${d}>
                </div>
                <div class="jc-field" style="margin-bottom:0;">
                    <span class="jc-field-label">${_T('jc_field_distance')}</span>
                    <input type="number" step="0.1" class="jc-input" id="jcDistance" value="${j.distance || 2.0}" min="0.5" ${d}>
                </div>
            </div>

            ${!d ? `
                <div style="display:flex;gap:0.5rem;margin-top:1rem;">
                    <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel="#jcCoordX" data-ysel="#jcCoordY" data-zsel="#jcCoordZ"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_my_position')}</button>
                    <button class="jc-action-btn jc-action-btn-blue" id="jcTpBtn"><i class="fas fa-location-arrow"></i> ${_T('jc_btn_teleport')}</button>
                </div>
                <span class="jc-field-hint" style="margin-top:0.5rem;">${_T('jc_hint_my_position')}</span>
            ` : ''}

            <div class="jc-section-icon-title" style="margin-top:2rem;"><i class="fas fa-box"></i><h2>${_T('jc_section_storage')}</h2></div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_storage_id')}</span>
                    <input type="text" class="jc-input" id="jcStorageId" value="${esc(s.id||'')}" placeholder="e.g. police_storage" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_storage_id')}</span>
                </div>
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_storage_name')}</span>
                    <input type="text" class="jc-input" id="jcStorageName" value="${esc(s.name||'')}" placeholder="e.g. Police Storage" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_storage_name')}</span>
                </div>
            </div>
        `;
    }

    function blipLabel(name) {
        return name.replace(/^blip_/, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    function buildBlips(j, d) {
        const blips = ensureArray(j.blips);
        let cards = '';

        blips.forEach((b, i) => {
            const curSprite = b.sprite || 'blip_shop_store';
            const gridItems = blipsList.map(name =>
                `<div class="jc-blip-option ${name === curSprite ? 'selected' : ''}" data-value="${name}" title="${name}"><img src="blips/${name}.webp" alt="${name}" loading="lazy"></div>`
            ).join('');
            cards += `
                <div class="jc-dynamic-card" data-type="blip" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-map-pin"></i> Blip #${i+1}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="blip" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_name')}</span>
                            <input type="text" class="jc-input jc-blip-name" data-idx="${i}" value="${esc(b.name||'')}" placeholder="${_T('jc_hint_blip_name')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_visibility')}</span>
                            ${jcSelect('jc-blip-visibility', 'data-idx="'+i+'"', [{value:'all',label:_T('jc_opt_all_players')},{value:'job',label:_T('jc_opt_job_only')}], b.visibility||'all', !!d)}
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_sprite')}</span>
                            <div class="jc-blip-picker" data-idx="${i}">
                                <div class="jc-blip-picker-current" data-idx="${i}" ${d ? 'style="pointer-events:none;opacity:0.6;"' : ''}>
                                    <img src="blips/${curSprite}.webp" class="jc-blip-preview-img" alt="">
                                    <span class="jc-blip-picker-label">${blipLabel(curSprite)}</span>
                                    <i class="fas fa-chevron-down jc-blip-picker-arrow"></i>
                                </div>
                                <input type="hidden" class="jc-blip-sprite" data-idx="${i}" value="${curSprite}">
                                <div class="jc-blip-picker-dropdown">
                                    <input type="text" class="jc-blip-search" placeholder="${_T('jc_hint_search_blip')}" autocomplete="off">
                                    <div class="jc-blip-grid">${gridItems}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-blip-x" data-idx="${i}" value="${b.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-blip-y" data-idx="${i}" value="${b.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-blip-z" data-idx="${i}" value="${b.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_scale')}</span>
                            <input type="number" step="0.01" class="jc-input jc-blip-scale" data-idx="${i}" value="${b.scale||0.2}" min="0.05" max="2" ${d}></div>
                    </div>
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-blip-x[data-idx='${i}']" data-ysel=".jc-blip-y[data-idx='${i}']" data-zsel=".jc-blip-z[data-idx='${i}']"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_my_position')}</button>
                    </div>` : ''}
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-map-pin"></i><h2>${_T('jc_section_blips')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_blips_desc')}</div>
            <div id="jcBlipsList">${cards}</div>
            ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddBlipBtn"><i class="fas fa-plus"></i> ${_T('jc_btn_add_blip')}</button>` : ''}
        `;
    }

    const HARVEST_ANIMATIONS = [
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

    function buildHarvestZones(j, d) {
        const zones = ensureArray(j.harvestZones);
        let cards = '';

        zones.forEach((z, i) => {
            const curAnimId = z.animId || (z.animDict ? 'custom' : 'craft');
            const animOptions = HARVEST_ANIMATIONS.map(a => ({value: a.id, label: a.label}));
            const isCustomAnim = (curAnimId === 'custom');
            const jobRestricted = z.jobRestricted !== false ? 'checked' : '';

            let rewards = ensureArray(z.rewards);
            if (rewards.length === 0 && z.item && z.item !== '') {
                rewards = [{ item: z.item, amount: z.amount || 1, chance: 100 }];
            }
            if (rewards.length === 0) {
                rewards = [{ item: '', amount: 1, chance: 100 }];
            }

            let rewardRows = '';
            rewards.forEach((rw, ri) => {
                rewardRows += `
                    <div class="jc-harvest-reward-row" data-zone="${i}" data-rw="${ri}">
                        <div class="jc-hp-detail-field" style="flex:3;">
                            <span class="jc-hp-detail-label">${ri === 0 ? _T('jc_field_item_name') : ''}</span>
                            <input type="text" class="jc-input jc-input-sm jc-rw-item" data-zone="${i}" data-rw="${ri}" value="${esc(rw.item||'')}" placeholder="${_T('jc_placeholder_item')}" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:1;">
                            <span class="jc-hp-detail-label">${ri === 0 ? _T('jc_field_amount') : ''}</span>
                            <input type="number" class="jc-input jc-input-sm jc-rw-amount" data-zone="${i}" data-rw="${ri}" value="${rw.amount||1}" min="1" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:1;">
                            <span class="jc-hp-detail-label">${ri === 0 ? _T('jc_field_chance') : ''}</span>
                            <input type="number" class="jc-input jc-input-sm jc-rw-chance" data-zone="${i}" data-rw="${ri}" value="${rw.chance != null ? rw.chance : 100}" min="1" max="100" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:0 0 auto; align-self:flex-end;">
                            ${!d ? `<button class="jc-harvest-reward-remove" data-zone="${i}" data-rw="${ri}" title="${_T('jc_btn_remove_reward')}" style="margin-bottom:2px;"><i class="fas fa-times"></i></button>` : ''}
                        </div>
                    </div>`;
            });

            const pts = ensureArray(z.points);
            let pointRows = '';
            pts.forEach((pt, pi) => {
                const hasProp = pt.prop && pt.prop !== '';
                const pointType = hasProp ? 'prop' : 'zone';
                const pointRadius = pt.radius || 1.5;
                pointRows += `
                    <div class="jc-harvest-point" data-zone="${i}" data-pt="${pi}">
                        <div class="jc-hp-type-row">
                            <span class="jc-harvest-point-num">#${pi+1}</span>
                            <div class="jc-hp-type-toggle">
                                <button class="jc-hp-type-btn ${pointType === 'prop' ? 'active' : ''}" data-zone="${i}" data-pt="${pi}" data-ptype="prop" ${d}><i class="fas fa-cube"></i> ${_T('jc_btn_prop')}</button>
                                <button class="jc-hp-type-btn ${pointType === 'zone' ? 'active' : ''}" data-zone="${i}" data-pt="${pi}" data-ptype="zone" ${d}><i class="fas fa-circle"></i> ${_T('jc_btn_zone')}</button>
                            </div>
                            <input type="hidden" class="jc-hp-ptype" data-zone="${i}" data-pt="${pi}" value="${pointType}">
                            <div class="jc-harvest-point-actions">
                                ${!d ? `<button class="jc-action-btn jc-action-btn-gold jc-action-btn-sm jc-pick-coords" data-xsel=".jc-hp-x[data-zone='${i}'][data-pt='${pi}']" data-ysel=".jc-hp-y[data-zone='${i}'][data-pt='${pi}']" data-zsel=".jc-hp-z[data-zone='${i}'][data-pt='${pi}']" data-hsel=".jc-hp-h[data-zone='${i}'][data-pt='${pi}']" data-hosel=".jc-hp-ho[data-zone='${i}'][data-pt='${pi}']" data-rotxsel=".jc-hp-rotx[data-zone='${i}'][data-pt='${pi}']" data-rotysel=".jc-hp-roty[data-zone='${i}'][data-pt='${pi}']" data-gizmoplacedsel=".jc-hp-gizmoplaced[data-zone='${i}'][data-pt='${pi}']" data-propsel=".jc-hp-prop[data-zone='${i}'][data-pt='${pi}']" data-radiussel=".jc-hp-radius[data-zone='${i}'][data-pt='${pi}']"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>` : ''}
                                ${!d ? `<button class="jc-action-btn jc-action-btn-blue jc-action-btn-sm jc-tp-to" data-xsel=".jc-hp-x[data-zone='${i}'][data-pt='${pi}']" data-ysel=".jc-hp-y[data-zone='${i}'][data-pt='${pi}']" data-zsel=".jc-hp-z[data-zone='${i}'][data-pt='${pi}']"><i class="fas fa-location-arrow"></i></button>` : ''}
                                ${!d ? `<button class="jc-harvest-point-remove" data-zone="${i}" data-pt="${pi}" title="${_T('jc_btn_remove_point')}"><i class="fas fa-times"></i></button>` : ''}
                            </div>
                        </div>
                        <div class="jc-hp-prop-section" data-zone="${i}" data-pt="${pi}" style="${pointType === 'prop' ? '' : 'display:none;'}">
                            <div class="jc-hp-detail-row">
                                <div class="jc-hp-detail-field" style="flex:3;">
                                    <span class="jc-hp-detail-label">${_T('jc_field_prop_model')}</span>
                                    <input type="text" class="jc-input jc-input-sm jc-hp-prop" data-zone="${i}" data-pt="${pi}" value="${esc(pt.prop||'')}" placeholder="${_T('jc_placeholder_prop_model')}" ${d}>
                                </div>
                            </div>
                        </div>
                        <div class="jc-hp-zone-section" data-zone="${i}" data-pt="${pi}" style="${pointType === 'zone' ? '' : 'display:none;'}">
                            <div class="jc-hp-detail-row">
                                <div class="jc-hp-detail-field" style="flex:1;">
                                    <span class="jc-hp-detail-label">${_T('jc_field_radius')}</span>
                                    <input type="number" step="0.1" min="0.5" max="20" class="jc-input jc-input-sm jc-hp-radius" data-zone="${i}" data-pt="${pi}" value="${pointRadius}" ${d}>
                                </div>
                                <div class="jc-hp-detail-field" style="flex:1;">
                                    <span class="jc-hp-detail-label">${_T('jc_field_distance')}</span>
                                    <input type="number" step="0.1" min="0.5" max="50" class="jc-input jc-input-sm jc-hp-distance" data-zone="${i}" data-pt="${pi}" value="${pt.distance||3.0}" ${d}>
                                </div>
                                <div class="jc-hp-detail-hint">
                                    <i class="fas fa-info-circle"></i> ${_T('jc_hint_radius_distance')}
                                </div>
                            </div>
                        </div>
                        <div class="jc-hp-coords-row">
                            <div class="jc-hp-coord"><span>X</span><input type="number" step="0.0001" class="jc-input jc-input-sm jc-hp-x" data-zone="${i}" data-pt="${pi}" value="${pt.x||''}" ${d}></div>
                            <div class="jc-hp-coord"><span>Y</span><input type="number" step="0.0001" class="jc-input jc-input-sm jc-hp-y" data-zone="${i}" data-pt="${pi}" value="${pt.y||''}" ${d}></div>
                            <div class="jc-hp-coord"><span>Z</span><input type="number" step="0.0001" class="jc-input jc-input-sm jc-hp-z" data-zone="${i}" data-pt="${pi}" value="${pt.z||''}" ${d}></div>
                            <div class="jc-hp-coord"><span>H</span><input type="number" step="0.1" class="jc-input jc-input-sm jc-hp-h" data-zone="${i}" data-pt="${pi}" value="${pt.heading||0}" ${d}></div>
                            <input type="hidden" class="jc-hp-ho" data-zone="${i}" data-pt="${pi}" value="${pt.heightOffset||0}">
                            <input type="hidden" class="jc-hp-rotx" data-zone="${i}" data-pt="${pi}" value="${pt.rotX||0}">
                            <input type="hidden" class="jc-hp-roty" data-zone="${i}" data-pt="${pi}" value="${pt.rotY||0}">
                            <input type="hidden" class="jc-hp-gizmoplaced" data-zone="${i}" data-pt="${pi}" value="${pt.gizmoPlaced||0}">
                        </div>
                    </div>`;
            });

            cards += `
                <div class="jc-dynamic-card" data-type="harvest" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-leaf"></i> ${_T('jc_btn_zone')} #${i+1} — ${esc(z.name) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="harvest" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>

                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_zone_name')}</span>
                            <input type="text" class="jc-input jc-harvest-name" data-idx="${i}" value="${esc(z.name||'')}" placeholder="${_T('jc_placeholder_harvest_name')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-harvest-prompttext" data-idx="${i}" value="${esc(z.promptText||_T('jc_default_harvest'))}" placeholder="${_T('jc_default_harvest')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_animation')}</span>
                            ${jcSelect('jc-harvest-animid', 'data-idx="'+i+'"', animOptions, curAnimId, !!d)}
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-harvest-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], z.interactionType||'prompt', !!d)}
                            <span class="jc-field-hint">${_T('jc_hint_interaction')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row jc-custom-anim-row" data-idx="${i}" style="${isCustomAnim ? '' : 'display:none;'}">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_anim_dict')}</span>
                            <input type="text" class="jc-input jc-harvest-animdict" data-idx="${i}" value="${esc(z.animDict||'')}" placeholder="${_T('jc_placeholder_anim_dict')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_anim_name')}</span>
                            <input type="text" class="jc-input jc-harvest-animname" data-idx="${i}" value="${esc(z.animName||'')}" placeholder="${_T('jc_placeholder_anim_name')}" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:80px;">
                            <span class="jc-field-label">${_T('jc_field_flag')}</span>
                            <input type="number" class="jc-input jc-harvest-animflag" data-idx="${i}" value="${z.animFlag||17}" min="0" ${d}>
                        </div>
                    </div>

                    <div class="jc-harvest-rewards-section" data-zone="${i}">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-gift"></i> ${_T('jc_field_rewards')} (${rewards.length})</span>
                            <span class="jc-field-hint" style="margin:0;">${_T('jc_hint_rewards')}</span>
                        </div>
                        <div class="jc-harvest-rewards-list" id="jcHarvestRewards_${i}">${rewardRows}</div>
                        ${!d ? `<button class="jc-add-harvest-reward-btn" data-zone="${i}"><i class="fas fa-plus"></i> ${_T('jc_btn_add_reward')}</button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_duration')}</span>
                            <input type="number" class="jc-input jc-harvest-duration" data-idx="${i}" value="${z.duration||5}" min="1" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_cooldown')}</span>
                            <input type="number" class="jc-input jc-harvest-cooldown" data-idx="${i}" value="${z.cooldown||30}" min="0" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_required_item')}</span>
                            <input type="text" class="jc-input jc-harvest-required" data-idx="${i}" value="${esc(z.requiredItem||'')}" placeholder="${_T('jc_placeholder_required_item')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-harvest-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_job_restricted_harvest')}</span>
                        </div>
                    </div>

                    <div class="jc-harvest-points-section">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-map-marker-alt"></i> ${_T('jc_field_harvest_points')} (${pts.length})</span>
                            <span class="jc-field-hint" style="margin:0;">${_T('jc_hint_harvest_points')}</span>
                        </div>
                        <div class="jc-harvest-points-list" id="jcHarvestPts_${i}">${pointRows}</div>
                        ${!d ? `<button class="jc-add-harvest-point-btn" data-zone="${i}"><i class="fas fa-plus"></i> ${_T('jc_btn_add_point')}</button>` : ''}
                    </div>
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-leaf"></i><h2>${_T('jc_section_harvestzones')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_harvestzones_desc')}</div>
            <div id="jcHarvestList">${cards}</div>
            ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddHarvestBtn"><i class="fas fa-plus"></i> ${_T('jc_btn_add_harvest_zone')}</button>` : ''}
        `;
    }

    function buildSellPoints(j, d) {
        const points = ensureArray(j.sellPoints);
        let cards = '';

        points.forEach((p, i) => {
            const jobRestricted = p.jobRestricted !== false ? 'checked' : '';
            const sellAtOnce = p.sellAtOnce !== false ? 'checked' : '';
            const curAnimId = p.animId || 'craft';
            const animOptions = HARVEST_ANIMATIONS.map(a => ({value: a.id, label: a.label}));
            const isCustomAnim = (curAnimId === 'custom');

            let items = ensureArray(p.items);
            if (items.length === 0 && p.item) {
                items = [{ item: p.item, itemLabel: p.itemLabel || '', price: p.price || 0 }];
            }
            let itemRows = '';
            items.forEach((it, ii) => {
                itemRows += `
                    <tr class="jc-sell-item-row" data-sell="${i}" data-item="${ii}">
                        <td><input type="text" class="jc-input jc-input-sm jc-si-item" data-sell="${i}" data-item="${ii}" value="${esc(it.item||'')}" placeholder="item_name" ${d}></td>
                        <td><input type="text" class="jc-input jc-input-sm jc-si-label" data-sell="${i}" data-item="${ii}" value="${esc(it.itemLabel||'')}" placeholder="${_T('jc_placeholder_display_name')}" ${d}></td>
                        <td><input type="number" class="jc-input jc-input-sm jc-si-price" data-sell="${i}" data-item="${ii}" value="${it.price||0}" min="0" ${d}></td>
                        <td>${!d ? `<button class="jc-sell-item-remove" data-sell="${i}" data-item="${ii}" title="${_T('jc_btn_remove')}"><i class="fas fa-times"></i></button>` : ''}</td>
                    </tr>`;
            });

            cards += `
                <div class="jc-dynamic-card" data-type="sell" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-store"></i> ${_T('jc_section_sellpoints')} #${i+1} — ${esc(p.name) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="sell" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_point_name')}</span>
                            <input type="text" class="jc-input jc-sell-name" data-idx="${i}" value="${esc(p.name||'')}" placeholder="${_T('jc_placeholder_sell_name')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction_label')}</span>
                            <input type="text" class="jc-input jc-sell-intlabel" data-idx="${i}" value="${esc(p.interactionLabel||_T('jc_default_sell'))}" placeholder="${_T('jc_default_sell')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_header_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-sell-prompttext" data-idx="${i}" value="${esc(p.promptText||_T('jc_default_sell'))}" placeholder="${_T('jc_default_sell')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_progress_text')}</span>
                            <input type="text" class="jc-input jc-sell-progress" data-idx="${i}" value="${esc(p.progressText||_T('jc_default_selling'))}" placeholder="${_T('jc_default_selling')}" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_icon')}</span>
                            <input type="text" class="jc-input jc-sell-icon" data-idx="${i}" value="${esc(p.icon||'fas fa-dollar-sign')}" placeholder="fas fa-dollar-sign" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_icon')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_radius')}</span>
                            <input type="number" step="0.1" class="jc-input jc-sell-radius" data-idx="${i}" value="${p.radius||2.0}" min="0.5" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_distance')}</span>
                            <input type="number" step="0.1" class="jc-input jc-sell-distance" data-idx="${i}" value="${p.distance||3.0}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_interaction_reach')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_duration')}</span>
                            <input type="number" class="jc-input jc-sell-duration" data-idx="${i}" value="${p.duration||3}" min="0" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_instant')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_animation')}</span>
                            ${jcSelect('jc-sell-animid', 'data-idx="'+i+'"', animOptions, curAnimId, !!d)}
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_min_grade')}</span>
                            <input type="number" class="jc-input jc-sell-grade" data-idx="${i}" value="${p.gradeRequired||0}" min="0" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_all_grades')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_employee_pct')}</span>
                            <input type="number" class="jc-input jc-sell-emppct" data-idx="${i}" value="${p.employeePercentage != null ? p.employeePercentage : 100}" min="0" max="100" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_employee_pct')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row jc-sell-custom-anim-row" data-idx="${i}" style="${isCustomAnim ? '' : 'display:none;'}">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_anim_dict')}</span>
                            <input type="text" class="jc-input jc-sell-animdict" data-idx="${i}" value="${esc(p.animDict||'')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_anim_name')}</span>
                            <input type="text" class="jc-input jc-sell-animname" data-idx="${i}" value="${esc(p.animName||'')}" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:80px;">
                            <span class="jc-field-label">${_T('jc_field_flag')}</span>
                            <input type="number" class="jc-input jc-sell-animflag" data-idx="${i}" value="${p.animFlag||17}" min="0" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_npc_model')}</span>
                            <input type="text" class="jc-input jc-sell-npcmodel" data-idx="${i}" value="${esc(p.npcModel||'')}" placeholder="${_T('jc_placeholder_npc_model')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_npc_model')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-sell-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], p.interactionType||'prompt', !!d)}
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:0.2rem;">
                                <input type="checkbox" class="jc-checkbox jc-sell-atonce" data-idx="${i}" ${sellAtOnce} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_sell_all_at_once')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_sell_all_at_once')}</span>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:0.2rem;">
                                <input type="checkbox" class="jc-checkbox jc-sell-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_job_restricted_sell')}</span>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-sell-x" data-idx="${i}" value="${p.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-sell-y" data-idx="${i}" value="${p.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-sell-z" data-idx="${i}" value="${p.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_heading')}</span>
                            <input type="number" step="0.1" class="jc-input jc-sell-heading" data-idx="${i}" value="${p.heading||0}" ${d}></div>
                    </div>
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-sell-x[data-idx='${i}']" data-ysel=".jc-sell-y[data-idx='${i}']" data-zsel=".jc-sell-z[data-idx='${i}']" data-hsel=".jc-sell-heading[data-idx='${i}']" data-propsel=".jc-sell-npcmodel[data-idx='${i}']" data-radiussel=".jc-sell-radius[data-idx='${i}']" data-isnpc="1"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                    </div>` : ''}
                    <div class="jc-harvest-points-section" style="margin-top:0.75rem;">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-cubes"></i> ${_T('jc_field_items')} (${items.length})</span>
                        </div>
                        <table class="jc-items-table" style="width:100%;margin-top:0.3rem;">
                            <thead><tr><th>${_T('jc_field_item_name')}</th><th>${_T('jc_field_label')}</th><th>${_T('jc_field_price')}</th><th></th></tr></thead>
                            <tbody id="jcSellItems_${i}">${itemRows}</tbody>
                        </table>
                        ${!d ? `<button class="jc-add-harvest-point-btn jc-add-sell-item-btn" data-sell="${i}" style="margin-top:0.3rem;"><i class="fas fa-plus"></i> ${_T('jc_btn_add_item')}</button>` : ''}
                    </div>
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-store"></i><h2>${_T('jc_section_sellpoints')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_sellpoints_desc')}</div>
            <div id="jcSellList">${cards}</div>
            ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddSellBtn"><i class="fas fa-plus"></i> ${_T('jc_btn_add_sell_point')}</button>` : ''}
        `;
    }

    function buildStashes(j, d) {
        const stashes = ensureArray(j.stashes);
        let cards = '';

        stashes.forEach((s, i) => {
            const shared = s.shared ? 'checked' : '';
            const globalV = s.global ? 'checked' : '';
            const jobRestricted = s.jobRestricted !== false ? 'checked' : '';
            cards += `
                <div class="jc-dynamic-card" data-type="stash" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-lock"></i> ${_T('jc_section_stashes')} #${i+1} — ${esc(s.label) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="stash" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_stash_id')}</span>
                            <input type="text" class="jc-input jc-stash-id" data-idx="${i}" value="${esc(s.name||'')}" placeholder="e.g. police_armory" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_stash_id')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_display_name')}</span>
                            <input type="text" class="jc-input jc-stash-label" data-idx="${i}" value="${esc(s.label||'')}" placeholder="e.g. Armory" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction_label')}</span>
                            <input type="text" class="jc-input jc-stash-intlabel" data-idx="${i}" value="${esc(s.interactionLabel||_T('jc_default_open_storage'))}" placeholder="${_T('jc_default_open_storage')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_header_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-stash-prompttext" data-idx="${i}" value="${esc(s.promptText||_T('jc_default_open'))}" placeholder="${_T('jc_default_open')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_icon')}</span>
                            <input type="text" class="jc-input jc-stash-icon" data-idx="${i}" value="${esc(s.icon||'fas fa-box')}" placeholder="fas fa-box" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_radius')}</span>
                            <input type="number" step="0.1" class="jc-input jc-stash-radius" data-idx="${i}" value="${s.radius||1.5}" min="0.5" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_distance')}</span>
                            <input type="number" step="0.1" class="jc-input jc-stash-distance" data-idx="${i}" value="${s.distance||3.0}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_interaction_reach')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_slots')}</span>
                            <input type="number" class="jc-input jc-stash-slots" data-idx="${i}" value="${s.slots||50}" min="1" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_max_weight')}</span>
                            <input type="number" class="jc-input jc-stash-maxweight" data-idx="${i}" value="${s.maxWeight||120000}" min="1000" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_min_grade')}</span>
                            <input type="number" class="jc-input jc-stash-grade" data-idx="${i}" value="${s.gradeRequired||0}" min="0" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_all_grades')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_code_lock')}</span>
                            <input type="text" class="jc-input jc-stash-code" data-idx="${i}" value="${esc(s.codeLock||'')}" placeholder="${_T('jc_hint_no_lock')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_code_lock')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prop_model')}</span>
                            <input type="text" class="jc-input jc-stash-propmodel" data-idx="${i}" value="${esc(s.propModel||'')}" placeholder="e.g. p_chest01x" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prop_model')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-stash-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], s.interactionType||'prompt', !!d)}
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-stash-shared" data-idx="${i}" ${shared} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_shared')}</label>
                            </div>
                            <span class="jc-field-hint jc-stash-shared-hint" data-idx="${i}"><i class="fas fa-info-circle"></i> ${shared ? _T('jc_hint_shared_on') : _T('jc_hint_shared_off')}</span>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-stash-global" data-idx="${i}" ${globalV} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_global')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_global')}</span>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-stash-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-stash-x" data-idx="${i}" value="${s.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-stash-y" data-idx="${i}" value="${s.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-stash-z" data-idx="${i}" value="${s.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_heading')}</span>
                            <input type="number" step="0.1" class="jc-input jc-stash-heading" data-idx="${i}" value="${s.heading||0}" ${d}></div>
                    </div>
                    <input type="hidden" class="jc-stash-ho" data-idx="${i}" value="${s.heightOffset||0}">
                    <input type="hidden" class="jc-stash-rotx" data-idx="${i}" value="${s.rotX||0}">
                    <input type="hidden" class="jc-stash-roty" data-idx="${i}" value="${s.rotY||0}">
                    <input type="hidden" class="jc-stash-gizmoplaced" data-idx="${i}" value="${s.gizmoPlaced||0}">
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-stash-x[data-idx='${i}']" data-ysel=".jc-stash-y[data-idx='${i}']" data-zsel=".jc-stash-z[data-idx='${i}']" data-hsel=".jc-stash-heading[data-idx='${i}']" data-hosel=".jc-stash-ho[data-idx='${i}']" data-rotxsel=".jc-stash-rotx[data-idx='${i}']" data-rotysel=".jc-stash-roty[data-idx='${i}']" data-gizmoplacedsel=".jc-stash-gizmoplaced[data-idx='${i}']" data-propsel=".jc-stash-propmodel[data-idx='${i}']" data-radiussel=".jc-stash-radius[data-idx='${i}']"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                        <button class="jc-action-btn jc-action-btn-blue jc-action-btn-sm jc-tp-to" data-xsel=".jc-stash-x[data-idx='${i}']" data-ysel=".jc-stash-y[data-idx='${i}']" data-zsel=".jc-stash-z[data-idx='${i}']"><i class="fas fa-location-arrow"></i> TP</button>
                    </div>` : ''}
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-lock"></i><h2>${_T('jc_section_stashes')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_stashes_desc')}</div>
            <div id="jcStashesList">${cards}</div>
            ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddStashBtn"><i class="fas fa-plus"></i> ${_T('jc_btn_add_stash')}</button>` : ''}
        `;
    }

    function buildShops(j, d) {
        const shops = ensureArray(j.shops);
        let cards = '';

        shops.forEach((sh, i) => {
            const jobRestricted = sh.jobRestricted !== false ? 'checked' : '';
            const items = ensureArray(sh.items);
            let itemRows = '';
            items.forEach((it, ii) => {
                itemRows += `
                    <tr class="jc-shop-item-row" data-shop="${i}" data-item="${ii}">
                        <td><input type="text" class="jc-input jc-input-sm jc-shi-item" data-shop="${i}" data-item="${ii}" value="${esc(it.item||'')}" placeholder="item_name" ${d}></td>
                        <td><input type="text" class="jc-input jc-input-sm jc-shi-label" data-shop="${i}" data-item="${ii}" value="${esc(it.label||'')}" placeholder="${_T('jc_placeholder_display_name')}" ${d}></td>
                        <td><input type="number" class="jc-input jc-input-sm jc-shi-price" data-shop="${i}" data-item="${ii}" value="${it.price||0}" min="0" ${d}></td>
                        <td>${jcSelect('jc-shi-currency jc-input-sm', 'data-shop="'+i+'" data-item="'+ii+'"', [{value:'cash',label:_T('currency_cash')},{value:'gold',label:_T('currency_gold')}], it.currency||'cash', !!d)}</td>
                        <td><input type="number" class="jc-input jc-input-sm jc-shi-grade" data-shop="${i}" data-item="${ii}" value="${it.gradeRequired||0}" min="0" style="width:50px;" ${d}></td>
                        <td>${!d ? `<button class="jc-shop-item-remove" data-shop="${i}" data-item="${ii}" title="${_T('jc_btn_remove')}"><i class="fas fa-times"></i></button>` : ''}</td>
                    </tr>`;
            });

            cards += `
                <div class="jc-dynamic-card" data-type="shop" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-shopping-cart"></i> ${_T('jc_section_shops')} #${i+1} — ${esc(sh.label) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="shop" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_shop_name')}</span>
                            <input type="text" class="jc-input jc-shop-name" data-idx="${i}" value="${esc(sh.name||'')}" placeholder="e.g. police_armory" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_display_label')}</span>
                            <input type="text" class="jc-input jc-shop-label" data-idx="${i}" value="${esc(sh.label||'')}" placeholder="e.g. Police Armory" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction_label')}</span>
                            <input type="text" class="jc-input jc-shop-intlabel" data-idx="${i}" value="${esc(sh.interactionLabel||_T('jc_default_browse_shop'))}" placeholder="${_T('jc_default_browse_shop')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_header_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-shop-prompttext" data-idx="${i}" value="${esc(sh.promptText||_T('jc_default_browse'))}" placeholder="${_T('jc_default_browse')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_icon')}</span>
                            <input type="text" class="jc-input jc-shop-icon" data-idx="${i}" value="${esc(sh.icon||'fas fa-shopping-cart')}" placeholder="fas fa-shopping-cart" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_radius')}</span>
                            <input type="number" step="0.1" class="jc-input jc-shop-radius" data-idx="${i}" value="${sh.radius||1.5}" min="0.5" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_distance')}</span>
                            <input type="number" step="0.1" class="jc-input jc-shop-distance" data-idx="${i}" value="${sh.distance||3.0}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_interaction_reach')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_min_grade')}</span>
                            <input type="number" class="jc-input jc-shop-grade" data-idx="${i}" value="${sh.gradeRequired||0}" min="0" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_npc_model')}</span>
                            <input type="text" class="jc-input jc-shop-npcmodel" data-idx="${i}" value="${esc(sh.npcModel||'')}" placeholder="${_T('jc_hint_optional_npc')}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-shop-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], sh.interactionType||'prompt', !!d)}
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-shop-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_payment_source')}</span>
                            ${jcSelect('jc-shop-paymentsource', 'data-idx="'+i+'"', [{value:'player',label:_T('jc_opt_player')},{value:'company',label:_T('jc_opt_company')}], sh.paymentSource||'player', !!d)}
                            <span class="jc-field-hint">${_T('jc_hint_payment_source')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_revenue_target')}</span>
                            ${jcSelect('jc-shop-revenuetarget', 'data-idx="'+i+'"', [{value:'company',label:_T('jc_opt_company')},{value:'none',label:_T('jc_opt_none')}], sh.revenueTarget||'company', !!d)}
                            <span class="jc-field-hint">${_T('jc_hint_revenue_target')}</span>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-shop-x" data-idx="${i}" value="${sh.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-shop-y" data-idx="${i}" value="${sh.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-shop-z" data-idx="${i}" value="${sh.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_heading')}</span>
                            <input type="number" step="0.1" class="jc-input jc-shop-heading" data-idx="${i}" value="${sh.heading||0}" ${d}></div>
                    </div>
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-shop-x[data-idx='${i}']" data-ysel=".jc-shop-y[data-idx='${i}']" data-zsel=".jc-shop-z[data-idx='${i}']" data-hsel=".jc-shop-heading[data-idx='${i}']" data-propsel=".jc-shop-npcmodel[data-idx='${i}']" data-radiussel=".jc-shop-radius[data-idx='${i}']" data-isnpc="1"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                    </div>` : ''}
                    <div class="jc-harvest-points-section" style="margin-top:0.75rem;">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-shopping-basket"></i> ${_T('jc_field_shop_items')} (${items.length})</span>
                        </div>
                        <table class="jc-items-table" style="width:100%;margin-top:0.3rem;">
                            <thead><tr><th>${_T('jc_field_item_name')}</th><th>${_T('jc_field_label')}</th><th>${_T('jc_field_price')}</th><th>${_T('jc_field_currency')}</th><th>${_T('jc_field_grade')}</th><th></th></tr></thead>
                            <tbody id="jcShopItems_${i}">${itemRows}</tbody>
                        </table>
                        ${!d ? `<button class="jc-add-harvest-point-btn jc-add-shop-item-btn" data-shop="${i}" style="margin-top:0.3rem;"><i class="fas fa-plus"></i> ${_T('jc_btn_add_shop_item')}</button>` : ''}
                    </div>
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-shopping-cart"></i><h2>${_T('jc_section_shops')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_shops_desc')}</div>
            <div id="jcShopsList">${cards}</div>
            ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddShopBtn"><i class="fas fa-plus"></i> ${_T('jc_btn_add_shop')}</button>` : ''}
        `;
    }

    function buildStorage(j, d) {
        const s = j.storage || {};
        return `
            <div class="jc-section-icon-title"><i class="fas fa-box"></i><h2>${_T('jc_section_storage')}</h2></div>

            <div class="jc-field-row">
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_storage_id')}</span>
                    <input type="text" class="jc-input" id="jcStorageId" value="${esc(s.id||'')}" placeholder="e.g. police_storage" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_storage_id')}</span>
                </div>
                <div class="jc-field">
                    <span class="jc-field-label">${_T('jc_field_storage_name')}</span>
                    <input type="text" class="jc-input" id="jcStorageName" value="${esc(s.name||'')}" placeholder="e.g. Police Storage" ${d}>
                    <span class="jc-field-hint">${_T('jc_hint_storage_name')}</span>
                </div>
            </div>
        `;
    }

    function buildDutyPoints(j, d) {
        const points = ensureArray(j.dutyPoints);
        let cards = '';

        points.forEach((dp, i) => {
            const jobRestricted = dp.jobRestricted !== false ? 'checked' : '';
            cards += `
                <div class="jc-dynamic-card" data-type="duty" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-clock"></i> ${_T('jc_section_dutypoints')} #${i+1} — ${esc(dp.label) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="duty" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_name_id')}</span>
                            <input type="text" class="jc-input jc-duty-name" data-idx="${i}" value="${esc(dp.name||'')}" placeholder="e.g. duty_main" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_duty_id')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_display_name')}</span>
                            <input type="text" class="jc-input jc-duty-label" data-idx="${i}" value="${esc(dp.label||'')}" placeholder="e.g. Clock In/Out" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction_label')}</span>
                            <input type="text" class="jc-input jc-duty-intlabel" data-idx="${i}" value="${esc(dp.interactionLabel||_T('jc_default_toggle_duty'))}" placeholder="${_T('jc_default_toggle_duty')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_duty_interaction')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-duty-prompttext" data-idx="${i}" value="${esc(dp.promptText||_T('jc_default_toggle_duty'))}" placeholder="${_T('jc_default_toggle_duty')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_on_duty_label')}</span>
                            <input type="text" class="jc-input jc-duty-ondutylabel" data-idx="${i}" value="${esc(dp.onDutyLabel||'')}" placeholder="${_T('jc_hint_default_go_off_duty')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_on_duty_label')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_off_duty_label')}</span>
                            <input type="text" class="jc-input jc-duty-offdutylabel" data-idx="${i}" value="${esc(dp.offDutyLabel||'')}" placeholder="${_T('jc_hint_default_go_on_duty')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_off_duty_label')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_icon')}</span>
                            <input type="text" class="jc-input jc-duty-icon" data-idx="${i}" value="${esc(dp.icon||'fas fa-clock')}" placeholder="fas fa-clock" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_radius')}</span>
                            <input type="number" step="0.1" class="jc-input jc-duty-radius" data-idx="${i}" value="${dp.radius||1.5}" min="0.5" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_distance')}</span>
                            <input type="number" step="0.1" class="jc-input jc-duty-distance" data-idx="${i}" value="${dp.distance||3.0}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_interaction_reach')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_npc_model')}</span>
                            <input type="text" class="jc-input jc-duty-npcmodel" data-idx="${i}" value="${esc(dp.npcModel||'')}" placeholder="e.g. s_m_m_sdgeneral_01" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_invisible_zone')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-duty-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], dp.interactionType||'prompt', !!d)}
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-duty-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_job_restricted_duty')}</span>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-duty-x" data-idx="${i}" value="${dp.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-duty-y" data-idx="${i}" value="${dp.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-duty-z" data-idx="${i}" value="${dp.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_heading')}</span>
                            <input type="number" step="0.1" class="jc-input jc-duty-heading" data-idx="${i}" value="${dp.heading||0}" ${d}></div>
                    </div>
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-duty-x[data-idx='${i}']" data-ysel=".jc-duty-y[data-idx='${i}']" data-zsel=".jc-duty-z[data-idx='${i}']" data-hsel=".jc-duty-heading[data-idx='${i}']" data-propsel=".jc-duty-npcmodel[data-idx='${i}']" data-radiussel=".jc-duty-radius[data-idx='${i}']" data-isnpc="1"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                        <button class="jc-action-btn jc-action-btn-blue jc-action-btn-sm jc-tp-to" data-xsel=".jc-duty-x[data-idx='${i}']" data-ysel=".jc-duty-y[data-idx='${i}']" data-zsel=".jc-duty-z[data-idx='${i}']"><i class="fas fa-location-arrow"></i> TP</button>
                    </div>` : ''}
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-clock"></i><h2>${_T('jc_section_dutypoints')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_dutypoints_desc')}</div>
            <div id="jcDutyList">${cards}</div>
            ${!d ? '<button class="jc-add-dynamic-btn" id="jcAddDutyBtn"><i class="fas fa-plus"></i> ' + _T('jc_btn_add_duty_point') + '</button>' : ''}
        `;
    }

    function buildRegisters(j, d) {
        const regs = ensureArray(j.registers);
        let cards = '';

        regs.forEach((reg, i) => {
            const jobRestricted = reg.jobRestricted !== false ? 'checked' : '';
            cards += `
                <div class="jc-dynamic-card" data-type="register" data-idx="${i}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-cash-register"></i> ${_T('jc_section_registers')} #${i+1} — ${esc(reg.label) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="register" data-idx="${i}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_name_id')}</span>
                            <input type="text" class="jc-input jc-reg-name" data-idx="${i}" value="${esc(reg.name||'')}" placeholder="e.g. register_main" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_register_id')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_display_name')}</span>
                            <input type="text" class="jc-input jc-reg-label" data-idx="${i}" value="${esc(reg.label||'')}" placeholder="e.g. Main Counter" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_employee_pct')}</span>
                            <input type="number" step="1" min="0" max="100" class="jc-input jc-reg-emppct" data-idx="${i}" value="${reg.employeePercentage != null ? reg.employeePercentage : 10}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_register_pct')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_radius')}</span>
                            <input type="number" step="0.1" class="jc-input jc-reg-radius" data-idx="${i}" value="${reg.radius||1.25}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_register_radius')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_distance')}</span>
                            <input type="number" step="0.1" class="jc-input jc-reg-distance" data-idx="${i}" value="${reg.distance||3.0}" min="0.5" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_interaction_reach')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prop_model')}</span>
                            <input type="text" class="jc-input jc-reg-propmodel" data-idx="${i}" value="${esc(reg.propModel||'')}" placeholder="e.g. p_cashregister01x" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_invisible_zone')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction')}</span>
                            ${jcSelect('jc-reg-interaction', 'data-idx="'+i+'"', [{value:'prompt',label:_T('jc_opt_prompt')},{value:'ox_target',label:'ox_target'},{value:'pc_interaction',label:'pc_interaction'}], reg.interactionType||'prompt', !!d)}
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-reg-jobrestricted" data-idx="${i}" ${jobRestricted} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_field_job_restricted')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_hint_job_restricted_register')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_icon')}</span>
                            <input type="text" class="jc-input jc-reg-icon" data-idx="${i}" value="${esc(reg.icon||'fas fa-cash-register')}" placeholder="fas fa-cash-register" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_interaction_label')}</span>
                            <input type="text" class="jc-input jc-reg-intlabel" data-idx="${i}" value="${esc(reg.interactionLabel||_T('jc_default_cash_register'))}" placeholder="${_T('jc_default_cash_register')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_register_interaction')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_field_prompt_text')}</span>
                            <input type="text" class="jc-input jc-reg-prompttext" data-idx="${i}" value="${esc(reg.promptText||_T('jc_default_use_register'))}" placeholder="${_T('jc_default_use_register')}" ${d}>
                            <span class="jc-field-hint">${_T('jc_hint_prompt_text')}</span>
                        </div>
                    </div>
                    <div class="jc-coords-grid">
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-reg-x" data-idx="${i}" value="${reg.x||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-reg-y" data-idx="${i}" value="${reg.y||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-reg-z" data-idx="${i}" value="${reg.z||''}" ${d}></div>
                        <div class="jc-field" style="margin-bottom:0;"><span class="jc-field-label">${_T('jc_field_heading')}</span>
                            <input type="number" step="0.1" class="jc-input jc-reg-heading" data-idx="${i}" value="${reg.heading||0}" ${d}></div>
                    </div>
                    <input type="hidden" class="jc-reg-rotx" data-idx="${i}" value="${reg.rotX||0}">
                    <input type="hidden" class="jc-reg-roty" data-idx="${i}" value="${reg.rotY||0}">
                    <input type="hidden" class="jc-reg-gizmoplaced" data-idx="${i}" value="${reg.gizmoPlaced||0}">
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-top:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-reg-x[data-idx='${i}']" data-ysel=".jc-reg-y[data-idx='${i}']" data-zsel=".jc-reg-z[data-idx='${i}']" data-hsel=".jc-reg-heading[data-idx='${i}']" data-hosel="" data-rotxsel=".jc-reg-rotx[data-idx='${i}']" data-rotysel=".jc-reg-roty[data-idx='${i}']" data-gizmoplacedsel=".jc-reg-gizmoplaced[data-idx='${i}']" data-propsel=".jc-reg-propmodel[data-idx='${i}']" data-radiussel=".jc-reg-radius[data-idx='${i}']" data-isnpc="0"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                        <button class="jc-action-btn jc-action-btn-blue jc-action-btn-sm jc-tp-to" data-xsel=".jc-reg-x[data-idx='${i}']" data-ysel=".jc-reg-y[data-idx='${i}']" data-zsel=".jc-reg-z[data-idx='${i}']"><i class="fas fa-location-arrow"></i> TP</button>
                    </div>` : ''}
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-cash-register"></i><h2>${_T('jc_section_registers')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_hint_registers_desc')}</div>
            <div id="jcRegistersList">${cards}</div>
            ${!d ? '<button class="jc-add-dynamic-btn" id="jcAddRegBtn"><i class="fas fa-plus"></i> ' + _T('jc_btn_add_register') + '</button>' : ''}
        `;
    }

    // ========================================================
    // CRAFTING SECTION  (cactus_craft integration)
    // ========================================================
    const CRAFT_ANIMATIONS = [
        {id: 'craft',        label: 'Craft (default)'},
        {id: 'knifecooking', label: 'Knife Cooking'},
        {id: 'hammercraft',  label: 'Hammering'},
        {id: 'spindlecook',  label: 'Spindle Cooking'},
        {id: 'campfire',     label: 'Campfire'},
        {id: 'riverwash',    label: 'River Washing'},
        {id: 'hoeing',       label: 'Hoeing / Raking'},
        {id: 'gravedigging', label: 'Digging'},
        {id: 'carry_box',    label: 'Carrying (Box)'},
        {id: 'sweeping',     label: 'Sweeping'},
        {id: 'crafting',     label: 'Crafting (alt)'},
    ];

    function buildCrafting(j, d) {
        // ---- Categories ----
        const cats = ensureArray(j.craftCategories);
        let catRows = '';
        cats.forEach((c, ci) => {
            catRows += `
                <div class="jc-craft-cat-row" data-ci="${ci}">
                    <div class="jc-hp-detail-field" style="flex:1;">
                        <span class="jc-hp-detail-label">${ci === 0 ? _T('jc_craft_cat_id') : ''}</span>
                        <input type="text" class="jc-input jc-input-sm jc-craft-cat-id" data-ci="${ci}" value="${esc(c.id||'')}" placeholder="weapons" ${d}>
                    </div>
                    <div class="jc-hp-detail-field" style="flex:2;">
                        <span class="jc-hp-detail-label">${ci === 0 ? _T('jc_craft_cat_label') : ''}</span>
                        <input type="text" class="jc-input jc-input-sm jc-craft-cat-label" data-ci="${ci}" value="${esc(c.label||'')}" placeholder="Weapons" ${d}>
                    </div>
                    <div class="jc-hp-detail-field" style="flex:0 0 auto;align-self:flex-end;">
                        ${!d ? `<button class="jc-craft-cat-remove" data-ci="${ci}" title="${_T('jc_btn_remove')}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                </div>`;
        });

        // ---- Stations ----
        const stations = ensureArray(j.craftStations);
        let stationCards = '';
        stations.forEach((st, si) => {
            const illegalChecked = st.illegal === true ? 'checked' : '';
            const showXPChecked  = st.showXP !== false ? 'checked' : '';
            const blipEnabled    = st.blip && st.blip.enabled !== false ? 'checked' : '';
            const stCats = ensureArray(st.categories);
            const catCheckboxes = cats.length > 0 ? cats.map((c, ci) => {
                const checked = stCats.indexOf(c.id) !== -1 ? 'checked' : '';
                return `<label class="jc-craft-cat-check"><input type="checkbox" class="jc-craft-st-cat" data-si="${si}" data-catid="${esc(c.id)}" ${checked} ${d}> ${esc(c.label || c.id)}</label>`;
            }).join(' ') : `<span class="jc-field-hint">${_T('jc_craft_no_categories')}</span>`;

            stationCards += `
                <div class="jc-dynamic-card" data-type="craftstation" data-idx="${si}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-industry"></i> ${_T('jc_craft_station')} #${si+1} — ${esc(st.name) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="craftstation" data-idx="${si}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_station_id')}</span>
                            <input type="text" class="jc-input jc-craft-st-id" data-idx="${si}" value="${esc(st.id||'')}" placeholder="my_forge" ${d}>
                            <span class="jc-field-hint">${_T('jc_craft_station_id_hint')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_station_name')}</span>
                            <input type="text" class="jc-input jc-craft-st-name" data-idx="${si}" value="${esc(st.name||'')}" placeholder="Valentine Forge" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_prompt_text')}</span>
                            <input type="text" class="jc-input jc-craft-st-prompt" data-idx="${si}" value="${esc(st.PromptTexte||'')}" placeholder="Work the anvil" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_station_logo')}</span>
                            <input type="text" class="jc-input jc-craft-st-logo" data-idx="${si}" value="${esc(st.logo||'craft.png')}" placeholder="craft.png" ${d}>
                            <span class="jc-field-hint">${_T('jc_craft_station_logo_hint')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field" style="max-width:90px;">
                            <span class="jc-field-label">${_T('jc_cs_icon_width')}</span>
                            <input type="number" class="jc-input jc-craft-st-logo-w" data-idx="${si}" value="${(st.logoSize && st.logoSize.width) || 48}" min="1" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:90px;">
                            <span class="jc-field-label">${_T('jc_cs_icon_height')}</span>
                            <input type="number" class="jc-input jc-craft-st-logo-h" data-idx="${si}" value="${(st.logoSize && st.logoSize.height) || 48}" min="1" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:90px;">
                            <span class="jc-field-label">${_T('jc_cs_icon_radius')}</span>
                            <input type="number" class="jc-input jc-craft-st-logo-r" data-idx="${si}" value="${(st.logoSize && st.logoSize.borderRadius) || 6}" min="0" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_blip_sprite')}</span>
                            <input type="text" class="jc-input jc-craft-st-blipsprite" data-idx="${si}" value="${esc((st.blip && st.blip.sprite)||'blip_shop_blacksmith')}" placeholder="blip_shop_blacksmith" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:100px;">
                            <span class="jc-field-label">${_T('jc_craft_blip_scale')}</span>
                            <input type="number" step="0.01" class="jc-input jc-craft-st-blipscale" data-idx="${si}" value="${(st.blip && st.blip.scale) || 0.2}" min="0.05" max="2" ${d}>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-craft-st-blipenabled" data-idx="${si}" ${blipEnabled} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_craft_blip_enabled')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">X</span>
                            <input type="number" step="0.0001" class="jc-input jc-craft-st-x" data-idx="${si}" value="${st.x||0}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">Y</span>
                            <input type="number" step="0.0001" class="jc-input jc-craft-st-y" data-idx="${si}" value="${st.y||0}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">Z</span>
                            <input type="number" step="0.0001" class="jc-input jc-craft-st-z" data-idx="${si}" value="${st.z||0}" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">H</span>
                            <input type="number" step="0.1" class="jc-input jc-craft-st-heading" data-idx="${si}" value="${st.heading||0}" ${d}>
                        </div>
                    </div>
                    ${!d ? `<div style="display:flex;gap:0.5rem;margin-bottom:0.5rem;">
                        <button class="jc-action-btn jc-action-btn-gold jc-pick-coords" data-xsel=".jc-craft-st-x[data-idx='${si}']" data-ysel=".jc-craft-st-y[data-idx='${si}']" data-zsel=".jc-craft-st-z[data-idx='${si}']" data-hsel=".jc-craft-st-heading[data-idx='${si}']"><i class="fas fa-crosshairs"></i> ${_T('jc_btn_place')}</button>
                        <button class="jc-action-btn jc-action-btn-blue jc-action-btn-sm jc-tp-to" data-xsel=".jc-craft-st-x[data-idx='${si}']" data-ysel=".jc-craft-st-y[data-idx='${si}']" data-zsel=".jc-craft-st-z[data-idx='${si}']"><i class="fas fa-location-arrow"></i> TP</button>
                    </div>` : ''}
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_categories')}</span>
                            <div class="jc-craft-cat-checks">${catCheckboxes}</div>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <div class="jc-checkbox-row">
                                <input type="checkbox" class="jc-checkbox jc-craft-st-showxp" data-idx="${si}" ${showXPChecked} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_craft_show_xp')}</label>
                            </div>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row">
                                <input type="checkbox" class="jc-checkbox jc-craft-st-illegal" data-idx="${si}" ${illegalChecked} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_craft_illegal')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_craft_illegal_hint')}</span>
                        </div>
                    </div>
                </div>`;
        });

        // ---- Recipes ----
        const recipes = ensureArray(j.craftRecipes);
        let recipeCards = '';
        const animOptions = CRAFT_ANIMATIONS.map(a => ({value: a.id, label: a.label}));

        recipes.forEach((r, ri) => {
            const curAnim = r.Animations || 'craft';
            const illegalChecked = r.CategoryIllegal === true ? 'checked' : '';
            const isWeapon = r.result && r.result.Itsweapon ? 'checked' : '';

            // Ingredients
            const ingredients = ensureArray(r.ingredients);
            let ingredientRows = '';
            ingredients.forEach((ing, ii) => {
                ingredientRows += `
                    <div class="jc-craft-ingredient-row" data-ri="${ri}" data-ii="${ii}">
                        <div class="jc-hp-detail-field" style="flex:2;">
                            <span class="jc-hp-detail-label">${ii === 0 ? _T('jc_craft_item_name') : ''}</span>
                            <input type="text" class="jc-input jc-input-sm jc-craft-ing-item" data-ri="${ri}" data-ii="${ii}" value="${esc(ing.item||'')}" placeholder="iron_ore" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:2;">
                            <span class="jc-hp-detail-label">${ii === 0 ? _T('jc_craft_item_label') : ''}</span>
                            <input type="text" class="jc-input jc-input-sm jc-craft-ing-label" data-ri="${ri}" data-ii="${ii}" value="${esc(ing.label||'')}" placeholder="Iron Ore" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:1;max-width:80px;">
                            <span class="jc-hp-detail-label">${ii === 0 ? _T('jc_field_amount') : ''}</span>
                            <input type="number" class="jc-input jc-input-sm jc-craft-ing-amount" data-ri="${ri}" data-ii="${ii}" value="${ing.amount||1}" min="1" ${d}>
                        </div>
                        <div class="jc-hp-detail-field" style="flex:0 0 auto;align-self:flex-end;">
                            ${!d ? `<button class="jc-craft-ing-remove" data-ri="${ri}" data-ii="${ii}" title="${_T('jc_btn_remove')}"><i class="fas fa-times"></i></button>` : ''}
                        </div>
                    </div>`;
            });

            // Station whitelist
            const rStations = ensureArray(r.stations);
            let stationChecks = '';
            if (stations.length > 0) {
                stationChecks = stations.map((st, si) => {
                    const checked = rStations.indexOf(st.id) !== -1 ? 'checked' : '';
                    return `<label class="jc-craft-cat-check"><input type="checkbox" class="jc-craft-rcp-station" data-ri="${ri}" data-stid="${esc(st.id)}" ${checked} ${d}> ${esc(st.name || st.id)}</label>`;
                }).join(' ');
            } else {
                stationChecks = `<span class="jc-field-hint">${_T('jc_craft_no_stations')}</span>`;
            }

            // Category dropdown
            const catOptions = [{value: '', label: '—'}].concat(cats.map(c => ({value: c.id, label: c.label || c.id})));

            recipeCards += `
                <div class="jc-dynamic-card" data-type="craftrecipe" data-idx="${ri}">
                    <div class="jc-dynamic-card-header">
                        <span class="jc-dynamic-card-title"><i class="fas fa-scroll"></i> ${_T('jc_craft_recipe')} #${ri+1} — ${esc(r.label) || _T('jc_unnamed')}</span>
                        ${!d ? `<button class="jc-dynamic-card-remove" data-type="craftrecipe" data-idx="${ri}"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_recipe_id')}</span>
                            <input type="text" class="jc-input jc-craft-rcp-id" data-idx="${ri}" value="${esc(r.id||'')}" placeholder="steel_longknife" ${d}>
                            <span class="jc-field-hint">${_T('jc_craft_recipe_id_hint')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_recipe_label')}</span>
                            <input type="text" class="jc-input jc-craft-rcp-label" data-idx="${ri}" value="${esc(r.label||'')}" placeholder="Steel Longknife" ${d}>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_category')}</span>
                            ${jcSelect('jc-craft-rcp-cat', 'data-idx="'+ri+'"', catOptions, r.category||'', !!d)}
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_animation')}</span>
                            ${jcSelect('jc-craft-rcp-anim', 'data-idx="'+ri+'"', animOptions, curAnim, !!d)}
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_time')}</span>
                            <input type="number" class="jc-input jc-craft-rcp-time" data-idx="${ri}" value="${r.craftTime||10}" min="1" ${d}>
                            <span class="jc-field-hint">${_T('jc_craft_time_hint')}</span>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_level')}</span>
                            <input type="number" class="jc-input jc-craft-rcp-level" data-idx="${ri}" value="${r.requiredLevel||0}" min="0" ${d}>
                        </div>
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_xp')}</span>
                            <input type="number" class="jc-input jc-craft-rcp-xp" data-idx="${ri}" value="${r.xpGain !== false ? (r.xpGain||5) : 0}" min="0" ${d}>
                            <span class="jc-field-hint">${_T('jc_craft_xp_hint')}</span>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <span class="jc-field-label">${_T('jc_craft_result_item')}</span>
                            <input type="text" class="jc-input jc-craft-rcp-result-item" data-idx="${ri}" value="${esc((r.result && r.result.item)||'')}" placeholder="weapon_melee_longknife" ${d}>
                        </div>
                        <div class="jc-field" style="max-width:100px;">
                            <span class="jc-field-label">${_T('jc_field_amount')}</span>
                            <input type="number" class="jc-input jc-craft-rcp-result-amount" data-idx="${ri}" value="${(r.result && r.result.amount)||1}" min="1" ${d}>
                        </div>
                        <div class="jc-field">
                            <div class="jc-checkbox-row" style="margin-top:1.4rem;">
                                <input type="checkbox" class="jc-checkbox jc-craft-rcp-isweapon" data-idx="${ri}" ${isWeapon} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_craft_is_weapon')}</label>
                            </div>
                        </div>
                    </div>
                    <div class="jc-field-row">
                        <div class="jc-field">
                            <div class="jc-checkbox-row">
                                <input type="checkbox" class="jc-checkbox jc-craft-rcp-illegal" data-idx="${ri}" ${illegalChecked} ${d}>
                                <label class="jc-checkbox-label">${_T('jc_craft_recipe_illegal')}</label>
                            </div>
                            <span class="jc-field-hint">${_T('jc_craft_recipe_illegal_hint')}</span>
                        </div>
                    </div>

                    <div class="jc-harvest-rewards-section">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-box-open"></i> ${_T('jc_craft_ingredients')} (${ingredients.length})</span>
                        </div>
                        <div class="jc-craft-ingredients-list" id="jcCraftIngs_${ri}">${ingredientRows}</div>
                        ${!d ? `<button class="jc-craft-add-ing-btn" data-ri="${ri}"><i class="fas fa-plus"></i> ${_T('jc_craft_add_ingredient')}</button>` : ''}
                    </div>

                    <div class="jc-harvest-rewards-section" style="margin-top:0.5rem;">
                        <div class="jc-harvest-points-header">
                            <span class="jc-harvest-points-title"><i class="fas fa-industry"></i> ${_T('jc_craft_stations_whitelist')}</span>
                            <span class="jc-field-hint" style="margin:0;">${_T('jc_craft_stations_whitelist_hint')}</span>
                        </div>
                        <div class="jc-craft-cat-checks">${stationChecks}</div>
                    </div>
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-hammer"></i><h2>${_T('jc_section_crafting')}</h2></div>
            <div class="jc-field-hint" style="margin-bottom:1rem;">${_T('jc_craft_desc')}</div>

            <div class="jc-craft-subsection">
                <div class="jc-harvest-points-header">
                    <span class="jc-harvest-points-title"><i class="fas fa-tags"></i> ${_T('jc_craft_categories_title')} (${cats.length})</span>
                </div>
                <div id="jcCraftCatList">${catRows}</div>
                ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddCraftCatBtn" style="margin-top:0.5rem;"><i class="fas fa-plus"></i> ${_T('jc_craft_add_category')}</button>` : ''}
            </div>

            <div class="jc-craft-subsection" style="margin-top:1.5rem;">
                <div class="jc-harvest-points-header">
                    <span class="jc-harvest-points-title"><i class="fas fa-industry"></i> ${_T('jc_craft_stations_title')} (${stations.length})</span>
                </div>
                <div id="jcCraftStationList">${stationCards}</div>
                ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddCraftStBtn" style="margin-top:0.5rem;"><i class="fas fa-plus"></i> ${_T('jc_craft_add_station')}</button>` : ''}
            </div>

            <div class="jc-craft-subsection" style="margin-top:1.5rem;">
                <div class="jc-harvest-points-header">
                    <span class="jc-harvest-points-title"><i class="fas fa-scroll"></i> ${_T('jc_craft_recipes_title')} (${recipes.length})</span>
                </div>
                <div id="jcCraftRecipeList">${recipeCards}</div>
                ${!d ? `<button class="jc-add-dynamic-btn" id="jcAddCraftRcpBtn" style="margin-top:0.5rem;"><i class="fas fa-plus"></i> ${_T('jc_craft_add_recipe')}</button>` : ''}
            </div>
        `;
    }

    function buildPermissions(j, d) {
        const perms = j.defaultPermissions || {};
        let items = '';
        PERM_DEFS.forEach(p => {
            const val = perms[p.key] !== undefined ? perms[p.key] : 3;
            const num = (val === true) ? 0 : (val === false ? 99 : (parseInt(val) || 0));
            items += `
                <div class="jc-perm-item">
                    <i class="fas ${p.icon}"></i>
                    <label>${p.label}</label>
                    <input type="number" min="0" max="99" value="${num}" data-perm="${p.key}" class="jc-perm-input" ${d}>
                </div>`;
        });

        return `
            <div class="jc-section-icon-title"><i class="fas fa-shield-alt"></i><h2>${_T('jc_section_permissions')}</h2></div>
            <div class="jc-perm-hint">${_T('jc_hint_permissions')}</div>
            <div class="jc-perms-grid">${items}</div>
        `;
    }

    function bindSectionEvents(sectionId, isConfig) {
        if (isConfig) return;

        $('#jcSaveBtn').off('click').on('click', function() { saveCurrentJob(); });

        if (sectionId === 'grades') {
            $('#jcAddGradeBtn').off('click').on('click', function() {
                const tbody = $('#jcGradesBody');
                const next = tbody.find('tr').length;
                tbody.append(`
                    <tr data-level="${next}">
                        <td><span class="jc-grade-level">${next}</span></td>
                        <td><input type="text" value="${_T('jc_default_new_grade')}" class="jc-grade-name"></td>
                        <td><input type="number" value="50" min="0" class="jc-grade-salary"></td>
                        <td><button class="jc-grade-remove" title="${_T('jc_btn_remove')}"><i class="fas fa-times"></i></button></td>
                    </tr>
                `);
            });
        }

        if (sectionId === 'bossmenus') {
            $('#jcTpBtn').off('click').on('click', function() {
                const x = parseFloat($('#jcCoordX').val());
                const y = parseFloat($('#jcCoordY').val());
                const z = parseFloat($('#jcCoordZ').val());
                if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                    $.post('https://cactus_ultimate/jc_teleportTo', JSON.stringify({x,y,z}));
                }
            });
        }

        if (sectionId === 'blips') {
            $('#jcAddBlipBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.blips = editingJob.blips || [];
                editingJob.blips.push({name: '', sprite: 'blip_shop_store', x: 0, y: 0, z: 0, scale: 0.2, visibility: 'all'});
                renderSection('blips');
            });

            $(document).off('click.jcBlipPicker').on('click.jcBlipPicker', '.jc-blip-picker-current', function(e) {
                e.stopPropagation();
                const dd = $(this).siblings('.jc-blip-picker-dropdown');
                const wasOpen = dd.hasClass('open');
                $('.jc-blip-picker-dropdown.open').removeClass('open');
                if (!wasOpen) {
                    dd.addClass('open');
                    dd.find('.jc-blip-search').val('').trigger('input').focus();
                }
            });

            $(document).off('input.jcBlipSearch').on('input.jcBlipSearch', '.jc-blip-search', function() {
                const q = $(this).val().toLowerCase();
                $(this).siblings('.jc-blip-grid').find('.jc-blip-option').each(function() {
                    const name = $(this).data('value').toLowerCase();
                    $(this).toggle(name.indexOf(q) !== -1);
                });
            });

            $(document).off('click.jcBlipOption').on('click.jcBlipOption', '.jc-blip-option', function(e) {
                e.stopPropagation();
                const val = $(this).data('value');
                const picker = $(this).closest('.jc-blip-picker');
                picker.find('.jc-blip-sprite').val(val);
                picker.find('.jc-blip-preview-img').attr('src', 'blips/' + val + '.webp');
                picker.find('.jc-blip-picker-label').text(blipLabel(val));
                picker.find('.jc-blip-option').removeClass('selected');
                $(this).addClass('selected');
                picker.find('.jc-blip-picker-dropdown').removeClass('open');
            });

            $(document).off('click.jcBlipClose').on('click.jcBlipClose', function() {
                $('.jc-blip-picker-dropdown.open').removeClass('open');
            });
        }

        if (sectionId === 'harvestzones') {
            $('#jcAddHarvestBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.harvestZones = editingJob.harvestZones || [];
                editingJob.harvestZones.push({name:'', rewards:[{item:'', amount:1, chance:100}], duration:5, animId:'craft', animDict:'', animName:'', animFlag:17, cooldown:30, requiredItem:'', jobRestricted:true, interactionType:'prompt', points:[]});
                renderSection('harvestzones');
            });

            $(document).off('jc-csel-change.jcAnimId').on('jc-csel-change.jcAnimId', '.jc-harvest-animid', function() {
                const idx = $(this).data('idx');
                const val = jcSelVal($(this));
                const row = $(`.jc-custom-anim-row[data-idx='${idx}']`);
                if (val === 'custom') {
                    row.show();
                } else {
                    row.hide();
                    const preset = HARVEST_ANIMATIONS.find(a => a.id === val);
                    if (preset) {
                        $(`.jc-harvest-animdict[data-idx='${idx}']`).val(preset.dict);
                        $(`.jc-harvest-animname[data-idx='${idx}']`).val(preset.name);
                        $(`.jc-harvest-animflag[data-idx='${idx}']`).val(preset.flag);
                    }
                }
            });

            $(document).off('click.jcAddHPt').on('click.jcAddHPt', '.jc-add-harvest-point-btn', function() {
                collectFormIntoEditing();
                const zi = parseInt($(this).data('zone'));
                if (editingJob.harvestZones && editingJob.harvestZones[zi]) {
                    editingJob.harvestZones[zi].points = editingJob.harvestZones[zi].points || [];
                    editingJob.harvestZones[zi].points.push({prop:'', radius:1.5, x:0, y:0, z:0, heading:0, heightOffset:0, rotX:0, rotY:0, gizmoPlaced:0});
                    renderSection('harvestzones');
                }
            });
            $(document).off('click.jcRmHPt').on('click.jcRmHPt', '.jc-harvest-point-remove', function() {
                collectFormIntoEditing();
                const zi = parseInt($(this).data('zone'));
                const pi = parseInt($(this).data('pt'));
                if (editingJob.harvestZones && editingJob.harvestZones[zi] && editingJob.harvestZones[zi].points) {
                    editingJob.harvestZones[zi].points.splice(pi, 1);
                    renderSection('harvestzones');
                }
            });

            $(document).off('click.jcAddRw').on('click.jcAddRw', '.jc-add-harvest-reward-btn', function() {
                collectFormIntoEditing();
                const zi = parseInt($(this).data('zone'));
                if (editingJob.harvestZones && editingJob.harvestZones[zi]) {
                    editingJob.harvestZones[zi].rewards = editingJob.harvestZones[zi].rewards || [];
                    editingJob.harvestZones[zi].rewards.push({item:'', amount:1, chance:100});
                    renderSection('harvestzones');
                }
            });
            $(document).off('click.jcRmRw').on('click.jcRmRw', '.jc-harvest-reward-remove', function() {
                collectFormIntoEditing();
                const zi = parseInt($(this).data('zone'));
                const ri = parseInt($(this).data('rw'));
                if (editingJob.harvestZones && editingJob.harvestZones[zi] && editingJob.harvestZones[zi].rewards) {
                    if (editingJob.harvestZones[zi].rewards.length > 1) {
                        editingJob.harvestZones[zi].rewards.splice(ri, 1);
                        renderSection('harvestzones');
                    }
                }
            });

            $(document).off('click.jcHpType').on('click.jcHpType', '.jc-hp-type-btn', function() {
                const zi = $(this).data('zone');
                const pi = $(this).data('pt');
                const ptype = $(this).data('ptype');
                const card = $(this).closest('.jc-harvest-point');
                card.find('.jc-hp-ptype').val(ptype);
                card.find('.jc-hp-type-btn').removeClass('active');
                $(this).addClass('active');
                if (ptype === 'prop') {
                    card.find('.jc-hp-prop-section').show();
                    card.find('.jc-hp-zone-section').hide();
                } else {
                    card.find('.jc-hp-prop-section').hide();
                    card.find('.jc-hp-zone-section').show();
                    card.find('.jc-hp-prop').val('');
                }
            });
        }

        if (sectionId === 'sellpoints') {
            $('#jcAddSellBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.sellPoints = editingJob.sellPoints || [];
                editingJob.sellPoints.push({name:'', interactionLabel:_T('jc_default_sell'), progressText:_T('jc_default_selling'), icon:'fas fa-dollar-sign', radius:2.0, duration:3, gradeRequired:0, employeePercentage:100, sellAtOnce:true, animId:'craft', animDict:'', animName:'', animFlag:17, x:0, y:0, z:0, heading:0, npcModel:'', jobRestricted:true, interactionType:'prompt', items:[]});
                renderSection('sellpoints');
            });

            $(document).off('jc-csel-change.jcSellAnimId').on('jc-csel-change.jcSellAnimId', '.jc-sell-animid', function() {
                const idx = $(this).data('idx');
                const val = jcSelVal($(this));
                const row = $(`.jc-sell-custom-anim-row[data-idx='${idx}']`);
                if (val === 'custom') {
                    row.show();
                } else {
                    row.hide();
                    const preset = HARVEST_ANIMATIONS.find(a => a.id === val);
                    if (preset) {
                        $(`.jc-sell-animdict[data-idx='${idx}']`).val(preset.dict);
                        $(`.jc-sell-animname[data-idx='${idx}']`).val(preset.name);
                        $(`.jc-sell-animflag[data-idx='${idx}']`).val(preset.flag);
                    }
                }
            });

            $(document).off('click.jcAddSellItem').on('click.jcAddSellItem', '.jc-add-sell-item-btn', function() {
                collectFormIntoEditing();
                const si = parseInt($(this).data('sell'));
                if (editingJob.sellPoints && editingJob.sellPoints[si]) {
                    editingJob.sellPoints[si].items = editingJob.sellPoints[si].items || [];
                    editingJob.sellPoints[si].items.push({item:'', itemLabel:'', price:0});
                    renderSection('sellpoints');
                }
            });

            $(document).off('click.jcRmSellItem').on('click.jcRmSellItem', '.jc-sell-item-remove', function() {
                collectFormIntoEditing();
                const si = parseInt($(this).data('sell'));
                const ii = parseInt($(this).data('item'));
                if (editingJob.sellPoints && editingJob.sellPoints[si] && editingJob.sellPoints[si].items) {
                    editingJob.sellPoints[si].items.splice(ii, 1);
                    renderSection('sellpoints');
                }
            });
        }

        if (sectionId === 'stashes') {
            $('#jcAddStashBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.stashes = editingJob.stashes || [];
                const autoId = (editingJob.name || 'job') + '_stash_' + editingJob.stashes.length;
                editingJob.stashes.push({name:autoId, label:'', interactionLabel:_T('jc_default_open_storage'), icon:'fas fa-box', radius:1.5, slots:50, maxWeight:120000, gradeRequired:0, codeLock:'', shared:false, global:false, jobRestricted:true, interactionType:'prompt', npcModel:'', x:0, y:0, z:0, heading:0});
                renderSection('stashes');
            });
        }

        if (sectionId === 'shops') {
            $('#jcAddShopBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.shops = editingJob.shops || [];
                editingJob.shops.push({name:'', label:'', interactionLabel:_T('jc_default_browse_shop'), icon:'fas fa-shopping-cart', radius:1.5, gradeRequired:0, jobRestricted:true, interactionType:'prompt', npcModel:'', x:0, y:0, z:0, heading:0, items:[]});
                renderSection('shops');
            });

            $(document).off('click.jcAddShopItem').on('click.jcAddShopItem', '.jc-add-shop-item-btn', function() {
                collectFormIntoEditing();
                const si = parseInt($(this).data('shop'));
                if (editingJob.shops && editingJob.shops[si]) {
                    editingJob.shops[si].items = editingJob.shops[si].items || [];
                    editingJob.shops[si].items.push({item:'', label:'', price:0, currency:'cash', gradeRequired:0});
                    renderSection('shops');
                }
            });

            $(document).off('click.jcRmShopItem').on('click.jcRmShopItem', '.jc-shop-item-remove', function() {
                collectFormIntoEditing();
                const si = parseInt($(this).data('shop'));
                const ii = parseInt($(this).data('item'));
                if (editingJob.shops && editingJob.shops[si] && editingJob.shops[si].items) {
                    editingJob.shops[si].items.splice(ii, 1);
                    renderSection('shops');
                }
            });
        }

        if (sectionId === 'dutypoints') {
            $('#jcAddDutyBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.dutyPoints = editingJob.dutyPoints || [];
                editingJob.dutyPoints.push({name:'', label:'', interactionLabel:_T('jc_default_toggle_duty'), promptText:_T('jc_default_toggle_duty'), onDutyLabel:'', offDutyLabel:'', icon:'fas fa-clock', radius:1.5, distance:3.0, jobRestricted:true, interactionType:'prompt', npcModel:'', x:0, y:0, z:0, heading:0});
                renderSection('dutypoints');
            });
        }

        if (sectionId === 'registers') {
            $('#jcAddRegBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.registers = editingJob.registers || [];
                editingJob.registers.push({name:'', label:'', interactionLabel:_T('jc_default_cash_register'), promptText:_T('jc_default_use_register'), icon:'fas fa-cash-register', radius:1.25, distance:3.0, employeePercentage:10, jobRestricted:true, interactionType:'prompt', propModel:'', x:0, y:0, z:0, heading:0});
                renderSection('registers');
            });
        }

        if (sectionId === 'crafting') {
            // Add Category
            $('#jcAddCraftCatBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.craftCategories = editingJob.craftCategories || [];
                editingJob.craftCategories.push({id: '', label: ''});
                renderSection('crafting');
            });
            // Remove Category
            $(document).off('click.jcCraftCatRm').on('click.jcCraftCatRm', '.jc-craft-cat-remove', function() {
                collectFormIntoEditing();
                const ci = parseInt($(this).data('ci'));
                if (editingJob.craftCategories) {
                    editingJob.craftCategories.splice(ci, 1);
                    renderSection('crafting');
                }
            });
            // Add Station
            $('#jcAddCraftStBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.craftStations = editingJob.craftStations || [];
                const autoId = (editingJob.name || 'job') + '_station_' + editingJob.craftStations.length;
                editingJob.craftStations.push({id: autoId, name: '', PromptTexte: '', logo: 'craft.png', blip: {enabled: true, sprite: 'blip_shop_blacksmith', scale: 0.2}, x: 0, y: 0, z: 0, heading: 0, categories: [], showXP: true, illegal: false, jobs: [editingJob.name]});
                renderSection('crafting');
            });
            // Add Recipe
            $('#jcAddCraftRcpBtn').off('click').on('click', function() {
                collectFormIntoEditing();
                editingJob.craftRecipes = editingJob.craftRecipes || [];
                editingJob.craftRecipes.push({id: '', label: '', category: '', Animations: 'craft', craftTime: 10, requiredLevel: 0, xpGain: 5, CategoryIllegal: false, ingredients: [{item: '', label: '', amount: 1}], result: {item: '', amount: 1, Itsweapon: false}, stations: []});
                renderSection('crafting');
            });
            // Add Ingredient
            $(document).off('click.jcCraftAddIng').on('click.jcCraftAddIng', '.jc-craft-add-ing-btn', function() {
                collectFormIntoEditing();
                const ri = parseInt($(this).data('ri'));
                if (editingJob.craftRecipes && editingJob.craftRecipes[ri]) {
                    editingJob.craftRecipes[ri].ingredients = editingJob.craftRecipes[ri].ingredients || [];
                    editingJob.craftRecipes[ri].ingredients.push({item: '', label: '', amount: 1});
                    renderSection('crafting');
                }
            });
            // Remove Ingredient
            $(document).off('click.jcCraftRmIng').on('click.jcCraftRmIng', '.jc-craft-ing-remove', function() {
                collectFormIntoEditing();
                const ri = parseInt($(this).data('ri'));
                const ii = parseInt($(this).data('ii'));
                if (editingJob.craftRecipes && editingJob.craftRecipes[ri] && editingJob.craftRecipes[ri].ingredients) {
                    editingJob.craftRecipes[ri].ingredients.splice(ii, 1);
                    renderSection('crafting');
                }
            });
        }
    }

    function collectFormIntoEditing() {
        const name = $('#jcJobName').val();
        if (name !== undefined && name !== '') editingJob.name = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const label = $('#jcJobLabel').val();
        if (label !== undefined) editingJob.label = label.trim();
        const ms = $('#jcMaxSalary').val();
        if (ms !== undefined) editingJob.maxSalary = parseInt(ms) || 5000;
        const mge = $('#jcMinGradeEdit').val();
        if (mge !== undefined) editingJob.minGradeToEditGrades = parseInt(mge) || 3;

        const jt = $('#jcJobType').val();
        if (jt !== undefined) editingJob.jobType = jt.trim() || null;
        if ($('#jcDefaultDuty').length) editingJob.defaultDuty = $('#jcDefaultDuty').is(':checked');
        if ($('#jcOffDutyPay').length) editingJob.offDutyPay = $('#jcOffDutyPay').is(':checked');
        const wh = $('#jcWebhook').val();
        if (wh !== undefined) editingJob.webhook = wh.trim() || null;

        const cx = $('#jcCoordX').val(), cy = $('#jcCoordY').val(), cz = $('#jcCoordZ').val();
        if (cx !== undefined) {
            const px = parseFloat(cx), py = parseFloat(cy), pz = parseFloat(cz);
            editingJob.coords = (!isNaN(px) && !isNaN(py) && !isNaN(pz)) ? {x:px,y:py,z:pz} : null;
        }
        const dist = $('#jcDistance').val();
        if (dist !== undefined) editingJob.distance = parseFloat(dist) || 2.0;

        const sid = $('#jcStorageId').val(), sname = $('#jcStorageName').val();
        if (sid !== undefined) {
            editingJob.storage = sid.trim() ? {id: sid.trim(), name: (sname||'').trim() || (editingJob.label + ' ' + _T('jc_default_storage_suffix'))} : null;
        }

        if ($('#jcGradesBody').length) {
            const grades = [];
            $('#jcGradesBody tr').each(function(i) {
                grades.push({
                    level: i,
                    name: $(this).find('.jc-grade-name').val().trim() || (_T('jc_default_grade') + ' ' + i),
                    salary: parseInt($(this).find('.jc-grade-salary').val()) || 0
                });
            });
            editingJob.grades = grades;
        }

        if ($('.jc-perm-input').length) {
            const perms = {};
            $('.jc-perm-input').each(function() {
                perms[$(this).data('perm')] = parseInt($(this).val()) || 0;
            });
            editingJob.defaultPermissions = perms;
        }

        if ($('#jcBlipsList').length) {
            const blips = [];
            $('#jcBlipsList .jc-dynamic-card[data-type="blip"]').each(function() {
                blips.push({
                    name: $(this).find('.jc-blip-name').val()?.trim() || '',
                    sprite: $(this).find('.jc-blip-sprite').val() || 'blip_shop_store',
                    visibility: jcSelVal($(this).find('.jc-blip-visibility')) || 'all',
                    x: parseFloat($(this).find('.jc-blip-x').val()) || 0,
                    y: parseFloat($(this).find('.jc-blip-y').val()) || 0,
                    z: parseFloat($(this).find('.jc-blip-z').val()) || 0,
                    scale: parseFloat($(this).find('.jc-blip-scale').val()) || 0.2,
                });
            });
            editingJob.blips = blips;
        }

        if ($('#jcHarvestList').length) {
            const zones = [];
            $('#jcHarvestList .jc-dynamic-card[data-type="harvest"]').each(function() {
                const zi = $(this).data('idx');
                const pts = [];
                $(this).find('.jc-harvest-point').each(function() {
                    const ptype = $(this).find('.jc-hp-ptype').val() || 'prop';
                    pts.push({
                        prop: ptype === 'prop' ? ($(this).find('.jc-hp-prop').val()?.trim() || '') : '',
                        radius: parseFloat($(this).find('.jc-hp-radius').val()) || 1.5,
                        distance: parseFloat($(this).find('.jc-hp-distance').val()) || 3.0,
                        x: parseFloat($(this).find('.jc-hp-x').val()) || 0,
                        y: parseFloat($(this).find('.jc-hp-y').val()) || 0,
                        z: parseFloat($(this).find('.jc-hp-z').val()) || 0,
                        heading: parseFloat($(this).find('.jc-hp-h').val()) || 0,
                        heightOffset: parseFloat($(this).find('.jc-hp-ho').val()) || 0,
                        rotX: parseFloat($(this).find('.jc-hp-rotx').val()) || 0,
                        rotY: parseFloat($(this).find('.jc-hp-roty').val()) || 0,
                        gizmoPlaced: parseInt($(this).find('.jc-hp-gizmoplaced').val()) || 0,
                    });
                });
                const rewards = [];
                $(this).find('.jc-harvest-reward-row').each(function() {
                    const rwItem = $(this).find('.jc-rw-item').val()?.trim() || '';
                    if (rwItem !== '') {
                        rewards.push({
                            item: rwItem,
                            amount: parseInt($(this).find('.jc-rw-amount').val()) || 1,
                            chance: parseInt($(this).find('.jc-rw-chance').val()) || 100,
                        });
                    }
                });
                zones.push({
                    name: $(this).find('.jc-harvest-name').val()?.trim() || '',
                    rewards: rewards,
                    duration: parseInt($(this).find('.jc-harvest-duration').val()) || 5,
                    animId: jcSelVal($(this).find('.jc-harvest-animid')) || 'craft',
                    animDict: $(this).find('.jc-harvest-animdict').val()?.trim() || '',
                    animName: $(this).find('.jc-harvest-animname').val()?.trim() || '',
                    animFlag: parseInt($(this).find('.jc-harvest-animflag').val()) || 17,
                    cooldown: parseInt($(this).find('.jc-harvest-cooldown').val()) || 30,
                    requiredItem: $(this).find('.jc-harvest-required').val()?.trim() || '',
                    jobRestricted: $(this).find('.jc-harvest-jobrestricted').is(':checked'),
                    interactionType: jcSelVal($(this).find('.jc-harvest-interaction')) || 'prompt',
                    promptText: $(this).find('.jc-harvest-prompttext').val()?.trim() || _T('jc_default_harvest'),
                    points: pts,
                });
            });
            editingJob.harvestZones = zones;
        }

        if ($('#jcSellList').length) {
            const points = [];
            $('#jcSellList .jc-dynamic-card[data-type="sell"]').each(function() {
                const card = $(this);
                const items = [];
                card.find('.jc-sell-item-row').each(function() {
                    items.push({
                        item: $(this).find('.jc-si-item').val()?.trim() || '',
                        itemLabel: $(this).find('.jc-si-label').val()?.trim() || '',
                        price: parseInt($(this).find('.jc-si-price').val()) || 0,
                    });
                });
                points.push({
                    name: card.find('.jc-sell-name').val()?.trim() || '',
                    interactionLabel: card.find('.jc-sell-intlabel').val()?.trim() || _T('jc_default_sell'),
                    promptText: card.find('.jc-sell-prompttext').val()?.trim() || _T('jc_default_sell'),
                    progressText: card.find('.jc-sell-progress').val()?.trim() || _T('jc_default_selling'),
                    icon: card.find('.jc-sell-icon').val()?.trim() || 'fas fa-dollar-sign',
                    radius: parseFloat(card.find('.jc-sell-radius').val()) || 2.0,
                    distance: parseFloat(card.find('.jc-sell-distance').val()) || 3.0,
                    duration: parseInt(card.find('.jc-sell-duration').val()) || 3,
                    gradeRequired: parseInt(card.find('.jc-sell-grade').val()) || 0,
                    employeePercentage: parseInt(card.find('.jc-sell-emppct').val()),
                    sellAtOnce: card.find('.jc-sell-atonce').is(':checked'),
                    animId: jcSelVal(card.find('.jc-sell-animid')) || 'craft',
                    animDict: card.find('.jc-sell-animdict').val()?.trim() || '',
                    animName: card.find('.jc-sell-animname').val()?.trim() || '',
                    animFlag: parseInt(card.find('.jc-sell-animflag').val()) || 17,
                    npcModel: card.find('.jc-sell-npcmodel').val()?.trim() || '',
                    jobRestricted: card.find('.jc-sell-jobrestricted').is(':checked'),
                    interactionType: jcSelVal(card.find('.jc-sell-interaction')) || 'prompt',
                    x: parseFloat(card.find('.jc-sell-x').val()) || 0,
                    y: parseFloat(card.find('.jc-sell-y').val()) || 0,
                    z: parseFloat(card.find('.jc-sell-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-sell-heading').val()) || 0,
                    items: items,
                });
            });
            editingJob.sellPoints = points;
        }

        if ($('#jcStashesList').length) {
            const stashes = [];
            $('#jcStashesList .jc-dynamic-card[data-type="stash"]').each(function() {
                const card = $(this);
                stashes.push({
                    name: card.find('.jc-stash-id').val()?.trim() || '',
                    label: card.find('.jc-stash-label').val()?.trim() || '',
                    interactionLabel: card.find('.jc-stash-intlabel').val()?.trim() || _T('jc_default_open_storage'),
                    promptText: card.find('.jc-stash-prompttext').val()?.trim() || _T('jc_default_open'),
                    icon: card.find('.jc-stash-icon').val()?.trim() || 'fas fa-box',
                    radius: parseFloat(card.find('.jc-stash-radius').val()) || 1.5,
                    distance: parseFloat(card.find('.jc-stash-distance').val()) || 3.0,
                    slots: parseInt(card.find('.jc-stash-slots').val()) || 50,
                    maxWeight: parseInt(card.find('.jc-stash-maxweight').val()) || 120000,
                    gradeRequired: parseInt(card.find('.jc-stash-grade').val()) || 0,
                    codeLock: card.find('.jc-stash-code').val()?.trim() || '',
                    shared: card.find('.jc-stash-shared').is(':checked'),
                    global: card.find('.jc-stash-global').is(':checked'),
                    jobRestricted: card.find('.jc-stash-jobrestricted').is(':checked'),
                    interactionType: jcSelVal(card.find('.jc-stash-interaction')) || 'prompt',
                    propModel: card.find('.jc-stash-propmodel').val()?.trim() || '',
                    x: parseFloat(card.find('.jc-stash-x').val()) || 0,
                    y: parseFloat(card.find('.jc-stash-y').val()) || 0,
                    z: parseFloat(card.find('.jc-stash-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-stash-heading').val()) || 0,
                    heightOffset: parseFloat(card.find('.jc-stash-ho').val()) || 0,
                    rotX: parseFloat(card.find('.jc-stash-rotx').val()) || 0,
                    rotY: parseFloat(card.find('.jc-stash-roty').val()) || 0,
                    gizmoPlaced: parseInt(card.find('.jc-stash-gizmoplaced').val()) || 0,
                });
            });
            editingJob.stashes = stashes;
        }

        if ($('#jcShopsList').length) {
            const shops = [];
            $('#jcShopsList .jc-dynamic-card[data-type="shop"]').each(function() {
                const card = $(this);
                const items = [];
                card.find('.jc-shop-item-row').each(function() {
                    items.push({
                        item: $(this).find('.jc-shi-item').val()?.trim() || '',
                        label: $(this).find('.jc-shi-label').val()?.trim() || '',
                        price: parseInt($(this).find('.jc-shi-price').val()) || 0,
                        currency: jcSelVal($(this).find('.jc-shi-currency')) || 'cash',
                        gradeRequired: parseInt($(this).find('.jc-shi-grade').val()) || 0,
                    });
                });
                shops.push({
                    name: card.find('.jc-shop-name').val()?.trim() || '',
                    label: card.find('.jc-shop-label').val()?.trim() || '',
                    interactionLabel: card.find('.jc-shop-intlabel').val()?.trim() || _T('jc_default_browse_shop'),
                    promptText: card.find('.jc-shop-prompttext').val()?.trim() || _T('jc_default_browse'),
                    icon: card.find('.jc-shop-icon').val()?.trim() || 'fas fa-shopping-cart',
                    radius: parseFloat(card.find('.jc-shop-radius').val()) || 1.5,
                    distance: parseFloat(card.find('.jc-shop-distance').val()) || 3.0,
                    gradeRequired: parseInt(card.find('.jc-shop-grade').val()) || 0,
                    jobRestricted: card.find('.jc-shop-jobrestricted').is(':checked'),
                    paymentSource: jcSelVal(card.find('.jc-shop-paymentsource')) || 'player',
                    revenueTarget: jcSelVal(card.find('.jc-shop-revenuetarget')) || 'company',
                    interactionType: jcSelVal(card.find('.jc-shop-interaction')) || 'prompt',
                    npcModel: card.find('.jc-shop-npcmodel').val()?.trim() || '',
                    x: parseFloat(card.find('.jc-shop-x').val()) || 0,
                    y: parseFloat(card.find('.jc-shop-y').val()) || 0,
                    z: parseFloat(card.find('.jc-shop-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-shop-heading').val()) || 0,
                    items: items,
                });
            });
            editingJob.shops = shops;
        }

        if ($('#jcDutyList').length) {
            const dutyPoints = [];
            $('#jcDutyList .jc-dynamic-card[data-type="duty"]').each(function() {
                const card = $(this);
                dutyPoints.push({
                    name: card.find('.jc-duty-name').val()?.trim() || '',
                    label: card.find('.jc-duty-label').val()?.trim() || '',
                    interactionLabel: card.find('.jc-duty-intlabel').val()?.trim() || _T('jc_default_toggle_duty'),
                    promptText: card.find('.jc-duty-prompttext').val()?.trim() || _T('jc_default_toggle_duty'),
                    onDutyLabel: card.find('.jc-duty-ondutylabel').val()?.trim() || '',
                    offDutyLabel: card.find('.jc-duty-offdutylabel').val()?.trim() || '',
                    icon: card.find('.jc-duty-icon').val()?.trim() || 'fas fa-clock',
                    radius: parseFloat(card.find('.jc-duty-radius').val()) || 1.5,
                    distance: parseFloat(card.find('.jc-duty-distance').val()) || 3.0,
                    npcModel: card.find('.jc-duty-npcmodel').val()?.trim() || '',
                    jobRestricted: card.find('.jc-duty-jobrestricted').is(':checked'),
                    interactionType: jcSelVal(card.find('.jc-duty-interaction')) || 'prompt',
                    x: parseFloat(card.find('.jc-duty-x').val()) || 0,
                    y: parseFloat(card.find('.jc-duty-y').val()) || 0,
                    z: parseFloat(card.find('.jc-duty-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-duty-heading').val()) || 0,
                });
            });
            editingJob.dutyPoints = dutyPoints;
        }

        if ($('#jcRegistersList').length) {
            const registers = [];
            $('#jcRegistersList .jc-dynamic-card[data-type="register"]').each(function() {
                const card = $(this);
                registers.push({
                    name: card.find('.jc-reg-name').val()?.trim() || '',
                    label: card.find('.jc-reg-label').val()?.trim() || '',
                    interactionLabel: card.find('.jc-reg-intlabel').val()?.trim() || _T('jc_default_cash_register'),
                    promptText: card.find('.jc-reg-prompttext').val()?.trim() || _T('jc_default_use_register'),
                    icon: card.find('.jc-reg-icon').val()?.trim() || 'fas fa-cash-register',
                    radius: parseFloat(card.find('.jc-reg-radius').val()) || 1.25,
                    distance: parseFloat(card.find('.jc-reg-distance').val()) || 3.0,
                    employeePercentage: parseInt(card.find('.jc-reg-emppct').val()) || 0,
                    propModel: card.find('.jc-reg-propmodel').val()?.trim() || '',
                    jobRestricted: card.find('.jc-reg-jobrestricted').is(':checked'),
                    interactionType: jcSelVal(card.find('.jc-reg-interaction')) || 'prompt',
                    x: parseFloat(card.find('.jc-reg-x').val()) || 0,
                    y: parseFloat(card.find('.jc-reg-y').val()) || 0,
                    z: parseFloat(card.find('.jc-reg-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-reg-heading').val()) || 0,
                    rotX: parseFloat(card.find('.jc-reg-rotx').val()) || 0,
                    rotY: parseFloat(card.find('.jc-reg-roty').val()) || 0,
                    gizmoPlaced: parseInt(card.find('.jc-reg-gizmoplaced').val()) || 0,
                });
            });
            editingJob.registers = registers;
        }

        // ---- Crafting Categories ----
        if ($('#jcCraftCatList').length) {
            const craftCategories = [];
            $('#jcCraftCatList .jc-craft-cat-row').each(function() {
                const id = $(this).find('.jc-craft-cat-id').val()?.trim() || '';
                if (id) {
                    craftCategories.push({
                        id: id.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                        label: $(this).find('.jc-craft-cat-label').val()?.trim() || id,
                    });
                }
            });
            editingJob.craftCategories = craftCategories;
        }

        // ---- Craft Stations ----
        if ($('#jcCraftStationList').length) {
            const craftStations = [];
            $('#jcCraftStationList .jc-dynamic-card[data-type="craftstation"]').each(function() {
                const card = $(this);
                const si = parseInt(card.data('idx'));
                const cats = [];
                card.find('.jc-craft-st-cat:checked').each(function() {
                    cats.push($(this).data('catid'));
                });
                craftStations.push({
                    id: card.find('.jc-craft-st-id').val()?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || '',
                    name: card.find('.jc-craft-st-name').val()?.trim() || '',
                    PromptTexte: card.find('.jc-craft-st-prompt').val()?.trim() || '',
                    logo: card.find('.jc-craft-st-logo').val()?.trim() || 'craft.png',
                    logoSize: {
                        width: parseInt(card.find('.jc-craft-st-logo-w').val()) || 48,
                        height: parseInt(card.find('.jc-craft-st-logo-h').val()) || 48,
                        borderRadius: parseInt(card.find('.jc-craft-st-logo-r').val()) || 6,
                    },
                    blip: {
                        enabled: card.find('.jc-craft-st-blipenabled').is(':checked'),
                        sprite: card.find('.jc-craft-st-blipsprite').val()?.trim() || 'blip_shop_blacksmith',
                        scale: parseFloat(card.find('.jc-craft-st-blipscale').val()) || 0.2,
                    },
                    x: parseFloat(card.find('.jc-craft-st-x').val()) || 0,
                    y: parseFloat(card.find('.jc-craft-st-y').val()) || 0,
                    z: parseFloat(card.find('.jc-craft-st-z').val()) || 0,
                    heading: parseFloat(card.find('.jc-craft-st-heading').val()) || 0,
                    categories: cats,
                    showXP: card.find('.jc-craft-st-showxp').is(':checked'),
                    illegal: card.find('.jc-craft-st-illegal').is(':checked'),
                    jobs: [editingJob.name],
                });
            });
            editingJob.craftStations = craftStations;
        }

        // ---- Craft Recipes ----
        if ($('#jcCraftRecipeList').length) {
            const craftRecipes = [];
            $('#jcCraftRecipeList .jc-dynamic-card[data-type="craftrecipe"]').each(function() {
                const card = $(this);
                const ri = parseInt(card.data('idx'));
                const ingredients = [];
                card.find('.jc-craft-ingredient-row').each(function() {
                    const item = $(this).find('.jc-craft-ing-item').val()?.trim() || '';
                    if (item) {
                        ingredients.push({
                            item: item,
                            label: $(this).find('.jc-craft-ing-label').val()?.trim() || item,
                            amount: parseInt($(this).find('.jc-craft-ing-amount').val()) || 1,
                        });
                    }
                });
                const stWhitelist = [];
                card.find('.jc-craft-rcp-station:checked').each(function() {
                    stWhitelist.push($(this).data('stid'));
                });
                const xpVal = parseInt(card.find('.jc-craft-rcp-xp').val());
                craftRecipes.push({
                    id: card.find('.jc-craft-rcp-id').val()?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || '',
                    label: card.find('.jc-craft-rcp-label').val()?.trim() || '',
                    category: jcSelVal(card.find('.jc-craft-rcp-cat')) || '',
                    Animations: jcSelVal(card.find('.jc-craft-rcp-anim')) || 'craft',
                    craftTime: parseInt(card.find('.jc-craft-rcp-time').val()) || 10,
                    requiredLevel: parseInt(card.find('.jc-craft-rcp-level').val()) || 0,
                    xpGain: xpVal > 0 ? xpVal : false,
                    CategoryIllegal: card.find('.jc-craft-rcp-illegal').is(':checked'),
                    ingredients: ingredients,
                    result: {
                        item: card.find('.jc-craft-rcp-result-item').val()?.trim() || '',
                        amount: parseInt(card.find('.jc-craft-rcp-result-amount').val()) || 1,
                        Itsweapon: card.find('.jc-craft-rcp-isweapon').is(':checked'),
                    },
                    stations: stWhitelist,
                });
            });
            editingJob.craftRecipes = craftRecipes;
        }
    }

    function saveCurrentJob() {
        collectFormIntoEditing();

        if (!editingJob.name || editingJob.name.length < 2) {
            showNotif(_T('jc_err_name_min'), 'error');
            return;
        }
        if (!editingJob.label) {
            showNotif(_T('jc_err_label_required'), 'error');
            return;
        }
        if (!editingJob.grades || editingJob.grades.length === 0) {
            showNotif(_T('jc_err_grade_required'), 'error');
            return;
        }

        const data = {
            name: editingJob.name,
            label: editingJob.label,
            maxSalary: editingJob.maxSalary,
            minGradeToEditGrades: editingJob.minGradeToEditGrades,
            coords: editingJob.coords,
            distance: editingJob.distance,
            storage: editingJob.storage,
            defaultPermissions: editingJob.defaultPermissions || {},
            grades: editingJob.grades || [],
            enabled: editingJob.enabled !== false,
            isNew: isCreatingNew,
            jobType: editingJob.jobType || null,
            defaultDuty: editingJob.defaultDuty !== false,
            offDutyPay: editingJob.offDutyPay === true,
            webhook: editingJob.webhook || null,
            blips: editingJob.blips || [],
            harvestZones: editingJob.harvestZones || [],
            sellPoints: editingJob.sellPoints || [],
            stashes: editingJob.stashes || [],
            shops: editingJob.shops || [],
            dutyPoints: editingJob.dutyPoints || [],
            registers: editingJob.registers || [],
            craftStations: editingJob.craftStations || [],
            craftRecipes: editingJob.craftRecipes || [],
            craftCategories: editingJob.craftCategories || [],
        };

        $.post('https://cactus_ultimate/jc_saveJob', JSON.stringify(data))
            .done(function() {
                showToast(_T('jc_toast_saving') || 'Saving...', 'success');
            })
            .fail(function() {
                showToast(_T('jc_toast_save_error') || 'Save error', 'error');
            });
        isCreatingNew = false;
    }

    function showConfirm(title, msg, onYes) {
        const ov = $(`<div class="jc-confirm-overlay">
            <div class="jc-confirm-box">
                <h3>${title}</h3>
                <p>${msg}</p>
                <div class="jc-confirm-actions">
                    <button class="jc-btn jc-btn-delete jc-yes"><i class="fas fa-check"></i> ${_T('jc_btn_confirm')}</button>
                    <button class="jc-btn jc-btn-toggle jc-no"><i class="fas fa-times"></i> ${_T('jc_btn_cancel')}</button>
                </div>
            </div>
        </div>`);
        $('body').append(ov);
        ov.find('.jc-yes').on('click', () => { ov.remove(); onYes(); });
        ov.find('.jc-no').on('click', () => { ov.remove(); });
    }

    function showNotif(msg, type) {
        showToast(msg, type || 'error');
    }

    $(document).off('click.jcClose').on('click.jcClose', '#jcCloseBtn', function() { hideUI(); });
    $(document).off('click.jcSwitchGang').on('click.jcSwitchGang', '#jcSwitchGangBtn', function() {
        $('#jobCreatorContainer').hide();
        $('.jc-minimize-banner').hide();
        $.post('https://cactus_ultimate/jc_switchToGangCreator', JSON.stringify({}));
    });
    $(document).off('keydown.jcEsc').on('keydown.jcEsc', function(e) {
        if (e.key === 'Escape' && $('#jobCreatorContainer').is(':visible')) {
            if (currentView === 'editor') {
                collectFormIntoEditing();
                switchToPage('jobs');
            } else {
                hideUI();
            }
        }
    });

    $(document).off('input.jcSearch').on('input.jcSearch', '.jc-search-input', function() {
        renderJobList($(this).val());
    });

    $(document).off('click.jcNew').on('click.jcNew', '#jcNewJobBtn', function() {
        switchToEditorView({
            name: '', label: '', maxSalary: 5000, minGradeToEditGrades: 3,
            coords: null, distance: 2.0, storage: null,
            defaultPermissions: {
                openBossMenu: 0, recruit: 3, fire: 3, promote: 3,
                manageMoney: 3, manageGold: 3, viewHistory: 0,
                viewFullHistory: 3, editGrades: 3, upgradeStorage: 3,
                accessInventory: 0, editAvatars: 0, manageEmployeeGrade: 3,
                canSeeManageButton: 0, canSeeFireButton: 3, canSeePromoteButton: 3,
                canSeeDemoteButton: 3, canGiveBonus: 3, canSeeBonusButton: 3
            },
            grades: [
                { level: 0, name: _T('jc_default_recruit'), salary: 20 },
                { level: 1, name: _T('jc_default_employee'), salary: 50 },
                { level: 2, name: _T('jc_default_senior'), salary: 80 },
                { level: 3, name: _T('jc_default_manager'), salary: 150 },
            ],
            enabled: true, source: 'database', employeeCount: 0,
            jobType: null, defaultDuty: true, offDutyPay: false, webhook: null,
            blips: [], harvestZones: [], sellPoints: [],
            stashes: [], shops: [],
            craftStations: [], craftRecipes: [], craftCategories: []
        }, true);
    });

    $(document).off('click.jcMainNav').on('click.jcMainNav', '.jc-main-nav-item', function() {
        const pageId = $(this).data('page');
        if (currentView === 'editor') {
            collectFormIntoEditing();
        }
        switchToPage(pageId);
    });

    $(document).off('click.jcSelect').on('click.jcSelect', '.jc-job-item', function() {
        const name = $(this).data('job');
        const job = allJobs.find(j => j.name === name);
        if (job) {
            selectedJob = job;
            renderJobList($('.jc-search-input').val());
            renderPreview();
        }
    });

    $(document).off('click.jcEdit').on('click.jcEdit', '#jcEditJobBtn', function() {
        if (selectedJob) switchToEditorView(selectedJob, false);
    });

    $(document).off('click.jcTogglePrev').on('click.jcTogglePrev', '#jcTogglePrevBtn', function() {
        if (!selectedJob) return;
        const newState = !selectedJob.enabled;
        $.post('https://cactus_ultimate/jc_toggleJob', JSON.stringify({ name: selectedJob.name, enabled: newState }));
    });

    $(document).off('click.jcDeletePrev').on('click.jcDeletePrev', '#jcDeletePrevBtn', function() {
        if (!selectedJob) return;
        showConfirm(_T('jc_confirm_delete_title'), _T('jc_confirm_delete_msg').replace('{name}', esc(selectedJob.label)), function() {
            $.post('https://cactus_ultimate/jc_deleteJob', JSON.stringify({ name: selectedJob.name }));
            selectedJob = null;
            renderPreview();
        });
    });

    $(document).off('click.jcNav').on('click.jcNav', '.jc-nav-item', function() {
        collectFormIntoEditing();
        renderSection($(this).data('section'));
    });

    $(document).off('click.jcBack').on('click.jcBack', '#jcGoBackBtn', function() {
        collectFormIntoEditing();
        switchToPage('jobs');
    });

    $(document).off('click.jcGradeRm').on('click.jcGradeRm', '.jc-grade-remove', function() {
        $(this).closest('tr').remove();
        $('#jcGradesBody tr').each(function(i) {
            $(this).attr('data-level', i);
            $(this).find('.jc-grade-level').text(i);
        });
    });

    $(document).off('click.jcBanner').on('click.jcBanner', '.jc-minimize-banner', function() {
        restoreFromMinimize();
    });

    $(document).off('click.jcTpTo').on('click.jcTpTo', '.jc-tp-to', function(e) {
        e.stopPropagation();
        var x = parseFloat($($(this).data('xsel')).val());
        var y = parseFloat($($(this).data('ysel')).val());
        var z = parseFloat($($(this).data('zsel')).val());
        if (!isNaN(x) && !isNaN(y) && !isNaN(z) && (x !== 0 || y !== 0 || z !== 0)) {
            $.post('https://cactus_ultimate/jc_teleportTo', JSON.stringify({x:x, y:y, z:z}));
        }
    });

    $(document).off('change.jcSharedHint').on('change.jcSharedHint', '.jc-stash-shared', function() {
        var idx = $(this).data('idx');
        var hint = $(`.jc-stash-shared-hint[data-idx="${idx}"]`);
        if ($(this).is(':checked')) {
            hint.html('<i class="fas fa-info-circle"></i> ' + _T('jc_hint_shared_on'));
        } else {
            hint.html('<i class="fas fa-info-circle"></i> ' + _T('jc_hint_shared_off'));
        }
    });

    $(document).off('click.jcPickCoords').on('click.jcPickCoords', '.jc-pick-coords', function() {
        collectFormIntoEditing();
        var propModel = '';
        var propSel = $(this).data('propsel');
        if (propSel) {
            propModel = $(propSel).val() || '';
        }
        var sphereRadius = 0;
        var radiusSel = $(this).data('radiussel');
        if (radiusSel && !propModel) {
            sphereRadius = parseFloat($(radiusSel).val()) || 1.5;
        }
        var isNpc = $(this).data('isnpc') ? true : false;
        coordPickerContext = {
            xSel: $(this).data('xsel'),
            ySel: $(this).data('ysel'),
            zSel: $(this).data('zsel'),
            hSel: $(this).data('hsel') || null,
            hoSel: $(this).data('hosel') || null,
            rotXSel: $(this).data('rotxsel') || null,
            rotYSel: $(this).data('rotysel') || null,
            gizmoPlacedSel: $(this).data('gizmoplacedsel') || null,
            radiusSel: $(this).data('radiussel') || null,
            isSphere: sphereRadius > 0
        };
        $.post('https://cactus_ultimate/jc_startCoordPicker', JSON.stringify({prop: propModel, sphereRadius: sphereRadius, isNpc: isNpc}));
        $('#jobCreatorContainer').hide();
        $('.jc-minimize-banner').css('display', 'flex');
    });

    $(document).off('click.jcRemoveDynamic').on('click.jcRemoveDynamic', '.jc-dynamic-card-remove', function() {
        collectFormIntoEditing();
        const type = $(this).data('type');
        const idx = parseInt($(this).data('idx'));
        if (type === 'blip' && editingJob.blips) {
            editingJob.blips.splice(idx, 1);
            renderSection('blips');
        } else if (type === 'harvest' && editingJob.harvestZones) {
            editingJob.harvestZones.splice(idx, 1);
            renderSection('harvestzones');
        } else if (type === 'sell' && editingJob.sellPoints) {
            editingJob.sellPoints.splice(idx, 1);
            renderSection('sellpoints');
        } else if (type === 'stash' && editingJob.stashes) {
            editingJob.stashes.splice(idx, 1);
            renderSection('stashes');
        } else if (type === 'shop' && editingJob.shops) {
            editingJob.shops.splice(idx, 1);
            renderSection('shops');
        } else if (type === 'duty' && editingJob.dutyPoints) {
            editingJob.dutyPoints.splice(idx, 1);
            renderSection('dutypoints');
        } else if (type === 'craftstation' && editingJob.craftStations) {
            editingJob.craftStations.splice(idx, 1);
            renderSection('crafting');
        } else if (type === 'craftrecipe' && editingJob.craftRecipes) {
            editingJob.craftRecipes.splice(idx, 1);
            renderSection('crafting');
        }
    });

    function esc(s) {
        if (!s) return '';
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderJCDashboard(el) {
        const totalJobs = allJobs.length;
        const totalEmployees = allJobs.reduce((sum, j) => sum + (j.employeeCount || 0), 0);

        const onDuty = jcDashboardStats ? (jcDashboardStats.totalOnDuty || 0) : '...';
        const wealthiestName = jcDashboardStats ? (jcDashboardStats.wealthiestJob || '—') : '...';
        const wealthiestBalance = jcDashboardStats ? ('$' + Number(jcDashboardStats.wealthiestBalance || 0).toLocaleString('fr-FR')) : '';

        el.html(`
            <div class="jc-dashboard">
                <div class="jc-dashboard-title">${_T('jc_dash_title')}</div>

                <div class="jc-dash-stats">
                    <div class="jc-dash-stat">
                        <div class="jc-dash-stat-top">
                            <span class="jc-dash-stat-label">${_T('jc_dash_total_jobs')}</span>
                            <i class="fas fa-briefcase jc-dash-stat-icon"></i>
                        </div>
                        <div class="jc-dash-stat-value" id="jcDashTotalJobs">${totalJobs}</div>
                        <div class="jc-dash-stat-sub">${_T('jc_dash_create_jobs')}</div>
                    </div>

                    <div class="jc-dash-stat">
                        <div class="jc-dash-stat-top">
                            <span class="jc-dash-stat-label">${_T('jc_dash_on_duty')}</span>
                            <i class="fas fa-star jc-dash-stat-icon" style="color:rgba(245, 243, 238,0.4);"></i>
                        </div>
                        <div class="jc-dash-stat-value" id="jcDashOnDuty" style="color:#f5f3ee;">${onDuty}</div>
                        <div class="jc-dash-stat-sub" id="jcDashOnDutySub">${totalEmployees} ${_T('jc_dash_total_employees')}</div>
                    </div>

                    <div class="jc-dash-stat">
                        <div class="jc-dash-stat-top">
                            <span class="jc-dash-stat-label">${_T('jc_dash_wealthiest')}</span>
                            <i class="fas fa-trophy jc-dash-stat-icon" style="color:rgba(154, 148, 138,0.4);"></i>
                        </div>
                        <div class="jc-dash-stat-value jc-wealthiest-name" id="jcDashWealthiest">${esc(wealthiestName)}</div>
                        <div class="jc-dash-stat-sub" id="jcDashWealthiestSub">${wealthiestBalance ? _T('jc_dash_account_balance') + ' <span class="jc-gold">' + wealthiestBalance + '</span>' : ''}</div>
                    </div>
                </div>

                <div class="jc-dash-chart-section">
                    <div class="jc-dash-chart-title">${_T('jc_dash_popular_jobs')}</div>
                    <div class="jc-dash-chart-subtitle">${_T('jc_dash_popular_subtitle')}</div>
                    <div class="jc-dash-chart-wrapper">
                        <canvas id="jcDashboardChart"></canvas>
                    </div>
                </div>
            </div>
        `);

        renderJCDashboardChart();

        if (!jcDashboardStats) {
            $.post('https://cactus_ultimate/jc_getDashboardStats', JSON.stringify({}));
        }
    }

    
    function renderJCDashboardChart() {
        const ctx = document.getElementById('jcDashboardChart');
        if (!ctx) return;

        const sorted = allJobs.slice().sort((a, b) => (b.employeeCount || 0) - (a.employeeCount || 0)).slice(0, 10);
        const labels = sorted.map(j => j.label || j.name);
        const values = sorted.map(j => j.employeeCount || 0);

        if (jcDashboardChart) {
            jcDashboardChart.destroy();
            jcDashboardChart = null;
        }

        jcDashboardChart = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: _T('jc_dash_player_count'),
                    data: values,
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    borderColor: 'rgba(255, 255, 255, 0.95)',
                    borderWidth: 1,
                    borderRadius: 3,
                    barPercentage: 0.55,
                    categoryPercentage: 0.7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            color: 'rgba(255,255,255,0.4)',
                            font: { family: 'Hapna', size: 11 },
                            boxWidth: 12,
                            padding: 10
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        titleColor: '#9a948a',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255,255,255,0.1)',
                        borderWidth: 1,
                        titleFont: { family: 'Hapna', weight: '700' },
                        bodyFont: { family: 'Hapna' }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: 'rgba(255,255,255,0.5)',
                            font: { family: 'Hapna', size: 11, weight: '500' },
                            maxRotation: 45,
                            minRotation: 0
                        },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'rgba(255,255,255,0.35)',
                            font: { family: 'Hapna', size: 11 },
                            stepSize: 1,
                            precision: 0
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.04)',
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    
    function updateJCDashboardStats(stats) {
        jcDashboardStats = stats;

        const $onDuty = $('#jcDashOnDuty');
        if ($onDuty.length) {
            $onDuty.text(stats.totalOnDuty || 0);
        }
        const $wealthiest = $('#jcDashWealthiest');
        if ($wealthiest.length) {
            $wealthiest.text(stats.wealthiestJob || '—');
        }
        const $wealthiestSub = $('#jcDashWealthiestSub');
        if ($wealthiestSub.length && stats.wealthiestBalance !== undefined) {
            const bal = '$' + Number(stats.wealthiestBalance || 0).toLocaleString('fr-FR');
            $wealthiestSub.html(_T('jc_dash_account_balance') + ' <span class="jc-gold">' + bal + '</span>');
        }
    }

    function renderWebhooksPage() {
        const el = $('#jcPageWebhooks');

        // Event types that trigger a webhook
        const eventTypes = [
            { key: 'hire',        icon: 'fa-user-plus',       color: '#f5f3ee' },
            { key: 'fire',        icon: 'fa-user-minus',      color: '#cb0101' },
            { key: 'promote',     icon: 'fa-arrow-up',        color: '#9a948a' },
            { key: 'demote',      icon: 'fa-arrow-down',      color: '#9a948a' },
            { key: 'deposit',     icon: 'fa-piggy-bank',      color: '#9a948a' },
            { key: 'withdraw',    icon: 'fa-hand-holding-usd',color: '#9a948a' },
            { key: 'bonus',       icon: 'fa-gift',            color: '#9a948a' },
            { key: 'salary',      icon: 'fa-money-bill-wave', color: '#f5f3ee' },
            { key: 'harvest',     icon: 'fa-seedling',        color: '#f5f3ee' },
            { key: 'sell',        icon: 'fa-store',           color: '#9a948a' },
            { key: 'shop',        icon: 'fa-shopping-cart',   color: '#9a948a' },
        ];

        const dbJobs = (allJobs || []).filter(j => j.source === 'database');

        let eventsHtml = '';
        for (const ev of eventTypes) {
            eventsHtml += `<span class="jc-wh-event-badge" style="--badge-color:${ev.color}"><i class="fas ${ev.icon}"></i> ${_T('jc_wh_evt_' + ev.key)}</span>`;
        }

        let jobRows = '';
        if (dbJobs.length === 0) {
            jobRows = `<div class="jc-wh-empty"><i class="fas fa-inbox"></i> ${_T('jc_wh_no_jobs')}</div>`;
        } else {
            for (const job of dbJobs) {
                const hasWh = job.webhook && job.webhook.trim() !== '';
                const statusCls = hasWh ? 'jc-wh-status-on' : 'jc-wh-status-off';
                const statusIcon = hasWh ? 'fa-check-circle' : 'fa-times-circle';
                const statusText = hasWh ? _T('jc_wh_active') : _T('jc_wh_inactive');
                jobRows += `
                    <div class="jc-wh-job-row" data-job="${esc(job.name)}">
                        <div class="jc-wh-job-info">
                            <span class="jc-wh-job-label">${esc(job.label || job.name)}</span>
                            <span class="jc-wh-job-name">${esc(job.name)}</span>
                        </div>
                        <div class="jc-wh-job-status ${statusCls}"><i class="fas ${statusIcon}"></i> ${statusText}</div>
                        <div class="jc-wh-job-url-wrap">
                            <input type="text" class="jc-input jc-wh-url-input" data-job="${esc(job.name)}" placeholder="https://discord.com/api/webhooks/..." value="${esc(job.webhook || '')}">
                        </div>
                        <div class="jc-wh-job-actions">
                            <button class="jc-btn-sm jc-wh-btn-test" data-job="${esc(job.name)}" title="${_T('jc_wh_test')}"><i class="fas fa-paper-plane"></i></button>
                            <button class="jc-btn-sm jc-wh-btn-save" data-job="${esc(job.name)}" title="${_T('jc_wh_save')}"><i class="fas fa-save"></i></button>
                            <button class="jc-btn-sm jc-wh-btn-clear" data-job="${esc(job.name)}" title="${_T('jc_wh_clear')}"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>`;
            }
        }

        el.html(`
            <div class="jc-generic-page-header">${_T('jc_page_webhooks')}</div>
            <div class="jc-generic-page-sub">${_T('jc_webhooks_desc')}</div>

            <div class="jc-webhook-card">
                <div class="jc-webhook-card-title"><i class="fas fa-bell"></i> ${_T('jc_wh_events_title')}</div>
                <div class="jc-wh-events-grid">${eventsHtml}</div>
                <div class="jc-wh-events-hint">${_T('jc_wh_events_hint')}</div>
            </div>

            <div class="jc-webhook-card">
                <div class="jc-webhook-card-title"><i class="fas fa-plug"></i> ${_T('jc_webhooks_discord')}</div>
                <div class="jc-wh-search-bar">
                    <input type="text" class="jc-input jc-wh-search" placeholder="${_T('jc_wh_search_placeholder')}">
                </div>
                <div class="jc-wh-job-list">${jobRows}</div>
            </div>
        `);

        // ── Search / filter ──
        el.find('.jc-wh-search').on('input', function() {
            const q = $(this).val().toLowerCase();
            el.find('.jc-wh-job-row').each(function() {
                const name = ($(this).attr('data-job') || '').toLowerCase();
                const label = $(this).find('.jc-wh-job-label').text().toLowerCase();
                $(this).toggle(name.includes(q) || label.includes(q));
            });
        });

        // ── Save webhook URL ──
        el.find('.jc-wh-btn-save').on('click', function() {
            const jobName = $(this).attr('data-job');
            const url = el.find('.jc-wh-url-input[data-job="' + jobName + '"]').val().trim();
            if (url && !url.startsWith('https://')) {
                showToast(_T('jc_wh_invalid_url'), 'error');
                return;
            }
            $.post('https://cactus_ultimate/jc_webhookSave', JSON.stringify({ name: jobName, webhook: url || null }));
            // Update allJobs locally
            const job = allJobs.find(j => j.name === jobName);
            if (job) job.webhook = url || null;
            showToast(_T('jc_wh_saved'), 'success');
            // Re-render to update status dot
            renderWebhooksPage();
        });

        // ── Test webhook ──
        el.find('.jc-wh-btn-test').on('click', function() {
            const jobName = $(this).attr('data-job');
            const url = el.find('.jc-wh-url-input[data-job="' + jobName + '"]').val().trim();
            if (!url || !url.startsWith('https://')) {
                showToast(_T('jc_wh_invalid_url'), 'error');
                return;
            }
            $(this).find('i').removeClass('fa-paper-plane').addClass('fa-spinner fa-spin');
            const btn = $(this);
            $.post('https://cactus_ultimate/jc_webhookTest', JSON.stringify({ name: jobName, webhook: url }));
            setTimeout(() => {
                btn.find('i').removeClass('fa-spinner fa-spin').addClass('fa-paper-plane');
                showToast(_T('jc_wh_test_sent'), 'success');
            }, 1500);
        });

        // ── Clear webhook ──
        el.find('.jc-wh-btn-clear').on('click', function() {
            const jobName = $(this).attr('data-job');
            el.find('.jc-wh-url-input[data-job="' + jobName + '"]').val('');
            $.post('https://cactus_ultimate/jc_webhookSave', JSON.stringify({ name: jobName, webhook: null }));
            const job = allJobs.find(j => j.name === jobName);
            if (job) job.webhook = null;
            showToast(_T('jc_wh_cleared'), 'success');
            renderWebhooksPage();
        });
    }

    function showToast(msg, type) {
        const existing = $('.jc-toast');
        if (existing.length) existing.remove();
        const cls = type === 'error' ? 'jc-toast-error' : 'jc-toast-success';
        const $t = $(`<div class="jc-toast ${cls}">${msg}</div>`);
        $('#jobCreatorContainer').append($t);
        setTimeout(() => $t.addClass('jc-toast-show'), 10);
        setTimeout(() => { $t.removeClass('jc-toast-show'); setTimeout(() => $t.remove(), 300); }, 3000);
    }

    function renderHistoryPage() {
        const el = $('#jcPageHistory');

        // Action type definitions with icons and colors
        const actionTypes = [
            { key: 'recruit',         icon: 'fa-user-plus',        color: '#f5f3ee' },
            { key: 'fire',            icon: 'fa-user-minus',       color: '#cb0101' },
            { key: 'promote',         icon: 'fa-arrow-up',         color: '#9a948a' },
            { key: 'demote',          icon: 'fa-arrow-down',       color: '#9a948a' },
            { key: 'grade_edit',      icon: 'fa-user-edit',        color: '#cb0101' },
            { key: 'resign',          icon: 'fa-door-open',        color: '#9a948a' },
            { key: 'deposit',         icon: 'fa-piggy-bank',       color: '#f5f3ee' },
            { key: 'withdraw',        icon: 'fa-hand-holding-usd', color: '#9a948a' },
            { key: 'gold_deposit',    icon: 'fa-coins',            color: '#9a948a' },
            { key: 'gold_withdraw',   icon: 'fa-coins',            color: '#cb0101' },
            { key: 'bonus',           icon: 'fa-gift',             color: '#9a948a' },
            { key: 'salary',          icon: 'fa-money-bill-wave',  color: '#f5f3ee' },
            { key: 'register_sale',   icon: 'fa-cash-register',    color: '#9a948a' },
            { key: 'upgrade_storage', icon: 'fa-arrow-up',         color: '#cb0101' },
            { key: 'job_create',      icon: 'fa-plus-circle',      color: '#f5f3ee' },
            { key: 'job_update',      icon: 'fa-edit',             color: '#9a948a' },
            { key: 'job_delete',      icon: 'fa-trash',            color: '#cb0101' },
            { key: 'job_toggle',      icon: 'fa-toggle-on',        color: '#9a948a' },
        ];

        function getActionMeta(actionType) {
            const found = actionTypes.find(a => a.key === actionType);
            if (found) return found;
            return { key: actionType, icon: 'fa-question-circle', color: 'rgba(255,255,255,0.4)' };
        }

        function getActionLabel(actionType) {
            const k = 'jc_hist_act_' + actionType;
            const t = _T(k);
            return t !== k ? t : _T('jc_hist_act_unknown');
        }

        // Build job filter jcSelect options
        var jobSelOpts = [{ value: '', label: _T('jc_hist_filter_all_jobs') }];
        for (var ji = 0; ji < (allJobs || []).length; ji++) {
            var jj = allJobs[ji];
            jobSelOpts.push({ value: jj.name, label: jj.label || jj.name });
        }

        // Build action filter jcSelect options
        var actSelOpts = [{ value: '', label: _T('jc_hist_filter_all_actions') }];
        for (var ai = 0; ai < actionTypes.length; ai++) {
            actSelOpts.push({ value: actionTypes[ai].key, label: _T('jc_hist_act_' + actionTypes[ai].key) });
        }

        el.html(`
            <div class="jc-generic-page-header">${_T('jc_page_history')}</div>
            <div class="jc-generic-page-sub">${_T('jc_history_desc')}</div>

            <div class="jc-hist-card">
                <div class="jc-hist-filters">
                    ${jcSelect('jc-hist-filter-job', '', jobSelOpts, '')}
                    ${jcSelect('jc-hist-filter-action', '', actSelOpts, '')}
                </div>

                <div class="jc-hist-table-wrap">
                    <table class="jc-hist-table">
                        <thead>
                            <tr>
                                <th>${_T('jc_hist_col_date')}</th>
                                <th>${_T('jc_hist_col_job')}</th>
                                <th>${_T('jc_hist_col_action')}</th>
                                <th>${_T('jc_hist_col_actor')}</th>
                                <th>${_T('jc_hist_col_target')}</th>
                                <th>${_T('jc_hist_col_details')}</th>
                            </tr>
                        </thead>
                        <tbody class="jc-hist-tbody"></tbody>
                    </table>
                    <div class="jc-hist-empty" style="display:none;">
                        <i class="fas fa-inbox"></i> ${_T('jc_hist_no_data')}
                    </div>
                    <div class="jc-hist-loading">
                        <i class="fas fa-spinner fa-spin"></i> ${_T('jc_hist_loading')}
                    </div>
                </div>

                <div class="jc-hist-pagination">
                    <span class="jc-hist-total"></span>
                    <div class="jc-hist-page-controls">
                        <button class="jc-btn-sm jc-hist-prev" disabled><i class="fas fa-chevron-left"></i> ${_T('jc_hist_prev')}</button>
                        <span class="jc-hist-page-info"></span>
                        <button class="jc-btn-sm jc-hist-next" disabled>${_T('jc_hist_next')} <i class="fas fa-chevron-right"></i></button>
                    </div>
                </div>
            </div>
        `);

        let histPage = 1;
        const histPerPage = 20;

        function loadHistory() {
            el.find('.jc-hist-loading').show();
            el.find('.jc-hist-empty').hide();
            el.find('.jc-hist-tbody').empty();
            el.find('.jc-hist-prev, .jc-hist-next').prop('disabled', true);

            $.post('https://cactus_ultimate/jc_getHistory', JSON.stringify({
                page: histPage,
                perPage: histPerPage,
                filterJob: el.find('.jc-hist-filter-job').attr('data-value') || '',
                filterAction: el.find('.jc-hist-filter-action').attr('data-value') || ''
            }));
        }

        // Handle incoming history data
        window._jcHistoryHandler = function(result) {
            el.find('.jc-hist-loading').hide();
            const rows = result.rows || [];
            const total = result.total || 0;
            const page = result.page || 1;
            const totalPages = result.totalPages || 1;
            histPage = page;

            el.find('.jc-hist-total').text(_T('jc_hist_total', total));
            el.find('.jc-hist-page-info').text(_T('jc_hist_page_info', page, totalPages));
            el.find('.jc-hist-prev').prop('disabled', page <= 1);
            el.find('.jc-hist-next').prop('disabled', page >= totalPages);

            if (rows.length === 0) {
                el.find('.jc-hist-empty').show();
                return;
            }

            let html = '';
            for (const r of rows) {
                const meta = getActionMeta(r.actionType);
                const label = getActionLabel(r.actionType);
                const ts = r.timestamp ? new Date(r.timestamp).toLocaleString() : '';
                const jobLabel = (allJobs.find(j => j.name === r.job) || {}).label || r.job || '';
                const amount = r.amount && parseFloat(r.amount) !== 0 ? ('$' + Number(r.amount).toLocaleString()) : '';
                const detail = r.details || '';
                const oldNew = (r.oldValue && r.newValue) ? (esc(r.oldValue) + ' → ' + esc(r.newValue)) : '';
                const detailText = [detail, oldNew, amount].filter(Boolean).join(' · ');

                html += `<tr>
                    <td class="jc-hist-td-date">${esc(ts)}</td>
                    <td><span class="jc-hist-job-badge">${esc(jobLabel)}</span></td>
                    <td><span class="jc-hist-action-badge" style="--act-color:${meta.color}"><i class="fas ${meta.icon}"></i> ${esc(label)}</span></td>
                    <td>${esc(r.actorName || '')}</td>
                    <td>${esc(r.targetName || '')}</td>
                    <td class="jc-hist-td-details">${esc(detailText)}</td>
                </tr>`;
            }
            el.find('.jc-hist-tbody').html(html);
        };

        // Filter change handlers (jcSelect custom event)
        el.find('.jc-hist-filter-job, .jc-hist-filter-action').on('jc-csel-change', function() {
            histPage = 1;
            loadHistory();
        });

        // Pagination handlers
        el.find('.jc-hist-prev').on('click', function() {
            if (histPage > 1) { histPage--; loadHistory(); }
        });
        el.find('.jc-hist-next').on('click', function() {
            histPage++;
            loadHistory();
        });

        // Initial load
        loadHistory();
    }

    function renderUpdatesPage() {
        const el = $('#jcPageUpdates');
        el.html(`
            <div class="jc-generic-page-header">${_T('jc_page_updates')}</div>
            <div class="jc-generic-page-sub">${_T('jc_updates_desc')}</div>
            <div class="jc-update-item">
                <div class="jc-update-version">v1.0.0</div>
                <div class="jc-update-title">${_T('jc_updates_initial_title')}</div>
                <div class="jc-update-desc">${_T('jc_updates_initial_desc')}</div>
                <div class="jc-update-date">${_T('jc_updates_initial_date')}</div>
            </div>
        `);
    }

    function renderCommunityPage() {
        if (typeof window.renderCommunityHub === 'function') {
            var localNames = (allJobs || []).filter(function(j) { return j.source === 'database'; }).map(function(j) { return j.name; });
            window.renderCommunityHub(localNames);
        } else {
            const el = $('#jcPageCommunity');
            el.html(`
                <div class="jc-generic-page-header">${_T('jc_page_community')}</div>
                <div class="jc-generic-page-sub">${_T('jc_community_desc')}</div>
                <div class="jc-coming-soon">
                    <i class="fas fa-users"></i>
                    <div class="jc-coming-soon-title">${_T('jc_coming_soon')}</div>
                    <p>${_T('jc_community_coming_desc')}</p>
                </div>
            `);
        }
    }

    // ================================================================
    //  CRAFT GLOBAL SETTINGS PAGE
    // ================================================================

    let craftSettingsData = null;
    let craftSettingsLoading = false;
    let craftSettingsSource = 'defaults'; // 'db' | 'live' | 'defaults'

    function renderCraftSettingsPage() {
        const el = $('#jcPageCraftSettings');
        el.html(`
            <div class="jc-generic-page-header"><i class="fas fa-flask"></i> ${_T('jc_cs_title')}</div>
            <div class="jc-generic-page-sub">${_T('jc_cs_desc')}</div>
            <div class="jc-cs-loading"><i class="fas fa-spinner fa-spin"></i> ${_T('jc_loading') || 'Loading...'}</div>
        `);
        craftSettingsLoading = true;
        $.post('https://cactus_ultimate/jc_getCraftSettings', '{}');
    }

    // Receive settings from server
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'jc_craftSettings') {
            craftSettingsData = event.data.settings || {};
            craftSettingsSource = event.data.settingsSource || 'defaults';
            craftSettingsLoading = false;
            buildCraftSettingsForm();
        }
    });

    function buildCraftSettingsForm() {
        const s = craftSettingsData || {};
        const el = $('#jcPageCraftSettings');

        // Source banner
        let sourceBanner = '';
        if (craftSettingsSource === 'live') {
            sourceBanner = `<div class="jc-cs-source-banner jc-cs-source-live"><i class="fas fa-info-circle"></i> ${_T('jc_cs_source_live')}</div>`;
        } else if (craftSettingsSource === 'defaults') {
            sourceBanner = `<div class="jc-cs-source-banner jc-cs-source-defaults"><i class="fas fa-exclamation-triangle"></i> ${_T('jc_cs_source_defaults')}</div>`;
        }

        // Defaults matching cactus_craft config.lua
        const bg = s.BackgroundCrafting || {};
        const alerts = s.IllegalCraftAlerts || {};
        const nameIconSize = s.NameIconSize || {};

        el.html(`
            <div class="jc-generic-page-header"><i class="fas fa-flask"></i> ${_T('jc_cs_title')}</div>
            <div class="jc-generic-page-sub">${_T('jc_cs_desc')}</div>
            ${sourceBanner}

            <!-- General -->
            <div class="jc-cs-section">
                <div class="jc-cs-section-title"><i class="fas fa-cog"></i> ${_T('jc_cs_general')}</div>
                <div class="jc-cs-grid">
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_framework')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_framework_hint')}</div>
                        <input type="text" class="jc-input" id="jcCsFrameworkInfo" value="${esc(s.Framework || 'RSG')}" disabled style="opacity:0.7;cursor:not-allowed;">
                        <div class="jc-sublabel" style="color:#6b665e;margin-top:4px;"><i class="fas fa-info-circle"></i> ${_T('jc_cs_auto_detected') || 'Auto-detected from cactus_ultimate'}</div>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_notification')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_notification_hint')}</div>
                        <select class="jc-input" id="jcCsNotifSelect">
                            ${['rsg','vorp','redem','bln','custom','none'].map(v => '<option value="'+v+'"'+(( (s.NotificationSystem||'rsg') === v)?' selected':'')+'>'+v+'</option>').join('')}
                        </select>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_inv_img_path')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_inv_img_path_hint')}</div>
                        <input type="text" class="jc-input" id="jcCsInvImgPath" value="${esc(s.InventoryImgPath || 'rsg-inventory/html/images/')}" placeholder="rsg-inventory/html/images/">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_open_key')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_open_key_hint')}</div>
                        <input type="text" class="jc-input" id="jcCsOpenKey" value="${esc(s.OpenKey || 'INPUT_CUT_FREE')}" placeholder="INPUT_CUT_FREE">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_illegal_default_time')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_illegal_default_time_hint')}</div>
                        <input type="number" class="jc-input" id="jcCsIllegalDefaultTime" value="${s.IllegalDefaultCraftTime || 15}" min="1">
                    </div>
                </div>
            </div>

            <!-- Name Icon -->
            <div class="jc-cs-section">
                <div class="jc-cs-section-title"><i class="fas fa-image"></i> ${_T('jc_cs_name_icon')}</div>
                <div class="jc-cs-grid">
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_name_icon_file')}</label>
                        <input type="text" class="jc-input" id="jcCsNameIcon" value="${esc(s.NameIcon || 'craft.png')}" placeholder="craft.png">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_icon_width')}</label>
                        <input type="number" class="jc-input" id="jcCsNameIconWidth" value="${nameIconSize.width || 36}" min="1">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_icon_height')}</label>
                        <input type="number" class="jc-input" id="jcCsNameIconHeight" value="${nameIconSize.height || 36}" min="1">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_icon_radius')}</label>
                        <input type="number" class="jc-input" id="jcCsNameIconRadius" value="${nameIconSize.borderRadius || 6}" min="0">
                    </div>
                </div>
            </div>

            <!-- XP System -->
            <div class="jc-cs-section">
                <div class="jc-cs-section-title"><i class="fas fa-star"></i> ${_T('jc_cs_xp_title')}</div>
                <div class="jc-cs-grid">
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsEnableXP" ${(s.EnableXP !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_enable_xp')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsDisplayXP" ${(s.DisplayXP !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_display_xp')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_xp_per_craft')}</label>
                        <input type="number" class="jc-input" id="jcCsXPPerCraft" value="${s.XPPerCraft || 5}" min="0">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_xp_threshold')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_xp_threshold_hint')}</div>
                        <input type="number" class="jc-input" id="jcCsXPThreshold" value="${s.XPLevelThreshold || 100}" min="1">
                    </div>
                </div>
            </div>

            <!-- Background Crafting -->
            <div class="jc-cs-section">
                <div class="jc-cs-section-title"><i class="fas fa-clock"></i> ${_T('jc_cs_background_title')}</div>
                <div class="jc-cs-grid">
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsBgEnabled" ${bg.Enabled ? 'checked' : ''}>
                            ${_T('jc_cs_bg_enabled')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsBgAllowClose" ${(bg.AllowUIClose !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_bg_allow_close')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsBgPersistence" ${(bg.Persistence !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_bg_persistence')}
                        </label>
                        <div class="jc-sublabel">${_T('jc_cs_bg_persistence_hint')}</div>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_bg_tick')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_bg_tick_hint')}</div>
                        <input type="number" class="jc-input" id="jcCsBgTick" value="${bg.TickSeconds || 5}" min="1">
                    </div>
                </div>
            </div>

            <!-- Illegal Craft Alerts -->
            <div class="jc-cs-section">
                <div class="jc-cs-section-title"><i class="fas fa-exclamation-triangle"></i> ${_T('jc_cs_alerts_title')}</div>
                <div class="jc-cs-grid">
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsAlertsEnabled" ${(alerts.Enabled !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_alerts_enabled')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_probability')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_alerts_probability_hint')}</div>
                        <input type="number" class="jc-input" id="jcCsAlertsProbability" value="${alerts.Probability || 30}" min="0" max="100">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_notify_jobs')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_alerts_notify_jobs_hint')}</div>
                        <input type="text" class="jc-input" id="jcCsAlertsNotifyJobs" value="${esc((alerts.NotifyJobs || ['sheriff','police','lawman']).join(', '))}" placeholder="sheriff, police, lawman">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_message')}</label>
                        <input type="text" class="jc-input" id="jcCsAlertsMessage" value="${esc(alerts.NotifyMessage || 'Suspicious activity reported near %s')}" placeholder="Suspicious activity reported near %s">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsAlertsExcludeCrafter" ${(alerts.ExcludeCrafter !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_alerts_exclude_crafter')}
                        </label>
                        <div class="jc-sublabel">${_T('jc_cs_alerts_exclude_hint')}</div>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_cooldown')}</label>
                        <div class="jc-sublabel">${_T('jc_cs_alerts_cooldown_hint')}</div>
                        <input type="number" class="jc-input" id="jcCsAlertsCooldown" value="${alerts.AlertCooldown || 300}" min="0">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-checkbox-row">
                            <input type="checkbox" class="jc-checkbox" id="jcCsAlertsShowBlip" ${(alerts.ShowBlipOnMap !== false) ? 'checked' : ''}>
                            ${_T('jc_cs_alerts_show_blip')}
                        </label>
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_blip_duration')}</label>
                        <input type="number" class="jc-input" id="jcCsAlertsBlipDuration" value="${alerts.BlipDuration || 60}" min="1">
                    </div>
                    <div class="jc-form-row">
                        <label class="jc-label">${_T('jc_cs_alerts_blip_radius')}</label>
                        <input type="number" step="0.1" class="jc-input" id="jcCsAlertsBlipRadius" value="${alerts.BlipRadius || 150.0}" min="1">
                    </div>
                </div>
            </div>

            <!-- Save Button -->
            <div class="jc-cs-actions">
                <button class="jc-action-btn jc-action-btn-gold jc-cs-save-btn" id="jcCsSaveBtn">
                    <i class="fas fa-save"></i> ${_T('jc_cs_save')}
                </button>
            </div>
        `);

        // Bind save
        $('#jcCsSaveBtn').off('click').on('click', saveCraftSettings);
    }

    function saveCraftSettings() {
        const notifyJobsRaw = ($('#jcCsAlertsNotifyJobs').val() || '').split(',').map(s => s.trim()).filter(s => s.length > 0);

        const data = {
            Framework:             $('#jcCsFrameworkInfo').val() || 'RSG',
            NotificationSystem:    $('#jcCsNotifSelect').val() || 'rsg',
            InventoryImgPath:      $('#jcCsInvImgPath').val() || '',
            OpenKey:               $('#jcCsOpenKey').val() || 'INPUT_CUT_FREE',
            IllegalDefaultCraftTime: parseInt($('#jcCsIllegalDefaultTime').val()) || 15,
            NameIcon:              $('#jcCsNameIcon').val() || 'craft.png',
            NameIconSize: {
                width:       parseInt($('#jcCsNameIconWidth').val()) || 36,
                height:      parseInt($('#jcCsNameIconHeight').val()) || 36,
                borderRadius: parseInt($('#jcCsNameIconRadius').val()) || 6,
            },
            EnableXP:              $('#jcCsEnableXP').is(':checked'),
            DisplayXP:             $('#jcCsDisplayXP').is(':checked'),
            XPPerCraft:            parseInt($('#jcCsXPPerCraft').val()) || 5,
            XPLevelThreshold:      parseInt($('#jcCsXPThreshold').val()) || 100,
            BackgroundCrafting: {
                Enabled:       $('#jcCsBgEnabled').is(':checked'),
                AllowUIClose:  $('#jcCsBgAllowClose').is(':checked'),
                Persistence:   $('#jcCsBgPersistence').is(':checked'),
                TickSeconds:   parseInt($('#jcCsBgTick').val()) || 5,
            },
            IllegalCraftAlerts: {
                Enabled:         $('#jcCsAlertsEnabled').is(':checked'),
                Probability:     parseInt($('#jcCsAlertsProbability').val()) || 30,
                NotifyJobs:      notifyJobsRaw,
                NotifyMessage:   $('#jcCsAlertsMessage').val() || '',
                ExcludeCrafter:  $('#jcCsAlertsExcludeCrafter').is(':checked'),
                AlertCooldown:   parseInt($('#jcCsAlertsCooldown').val()) || 300,
                ShowBlipOnMap:   $('#jcCsAlertsShowBlip').is(':checked'),
                BlipDuration:    parseInt($('#jcCsAlertsBlipDuration').val()) || 60,
                BlipRadius:      parseFloat($('#jcCsAlertsBlipRadius').val()) || 150.0,
            },
        };

        $.post('https://cactus_ultimate/jc_saveCraftSettings', JSON.stringify(data));
        craftSettingsData = data;
        craftSettingsSource = 'db';
        showToast(_T('jc_cs_saved_toast'), 'success');
    }

})(jQuery);
