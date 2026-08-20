(function($) {
    'use strict';

    var communityJobs = [];
    var communityLoaded = false;
    var communityLoading = false;
    var communitySearchQuery = '';
    var communityActiveTag = '';       // '' = all
    var communitySelectedJob = null;
    var communityFwTab = 'vorp';       // 'vorp' | 'rsg'
    var communityLocalJobs = [];       // list of local job names (for "already imported" badge)
    var communityIsModerator = false;

    var COMMUNITY_INDEX_URL = '';
    var COMMUNITY_JOB_URL_TEMPLATE = ''; // e.g. https://raw.githubusercontent.com/.../jobs/{id}.json

    window.addEventListener('message', function(event) {
        var data = event.data;

        if (data.action === 'community_jobList') {
            communityJobs = data.jobs || [];
            communityLoading = false;
            communityLoaded = true;
            renderCommunityContent();
        }

        if (data.action === 'community_jobDetail') {
            if (data.job) {
                communitySelectedJob = data.job;
                renderDetailView(data.job);
            }
        }

        if (data.action === 'community_importResult') {
            if (data.success) {
                showCommunityToast(_T('comm_import_success'), 'success');
                if (data.jobName && communityLocalJobs.indexOf(data.jobName) === -1) {
                    communityLocalJobs.push(data.jobName);
                }
                closeCommunityOverlays();
                renderCommunityContent();
            } else {
                showCommunityToast(data.error || _T('comm_import_error'), 'error');
            }
        }

        if (data.action === 'community_shareResult') {
            if (data.success) {
                showCommunityToast(_T('comm_share_success'), 'success');
                closeCommunityOverlays();
                communityLoaded = false;
                communityLoading = true;
                renderCommunityContent();
                $.post('https://cactus_ultimate/community_fetchJobs', JSON.stringify({}));
            } else {
                showCommunityToast(data.error || _T('comm_share_error'), 'error');
            }
        }

        if (data.action === 'community_localJobNames') {
            communityLocalJobs = data.names || [];
        }

        if (data.action === 'community_moderatorStatus') {
            communityIsModerator = !!data.isModerator;
        }

        if (data.action === 'community_deleteResult') {
            if (data.success) {
                showCommunityToast(_T('comm_delete_success'), 'success');
                closeCommunityOverlays();
                communityJobs = communityJobs.filter(function(j) { return j.id !== data.jobId; });
                renderCommunityContent();
            } else {
                showCommunityToast(data.error || _T('comm_delete_error'), 'error');
            }
            $('#commConfirmDeleteOverlay').remove();
        }

        if (data.action === 'community_config') {
            if (data.indexUrl) COMMUNITY_INDEX_URL = data.indexUrl;
            if (data.jobUrlTemplate) COMMUNITY_JOB_URL_TEMPLATE = data.jobUrlTemplate;
        }
    });

    window.renderCommunityHub = function(localJobNames) {
        communityLocalJobs = localJobNames || communityLocalJobs;
        var el = $('#jcPageCommunity');
        el.css({ position: 'relative', overflow: 'hidden' });

        if (!communityIsModerator) {
            $.post('https://cactus_ultimate/community_checkModerator', JSON.stringify({}));
        }

        if (!communityLoaded && !communityLoading) {
            communityLoading = true;
            el.html(buildLoadingHTML());
            $.post('https://cactus_ultimate/community_fetchJobs', JSON.stringify({}));
            return;
        }

        renderCommunityContent();
    };

    function renderCommunityContent() {
        var el = $('#jcPageCommunity');
        el.css({ position: 'relative', overflow: 'hidden' });

        if (communityLoading) {
            el.html(buildLoadingHTML());
            return;
        }

        var filtered = communityJobs.filter(function(job) {
            var matchesSearch = true;
            if (communitySearchQuery) {
                var q = communitySearchQuery.toLowerCase();
                matchesSearch = (job.label || '').toLowerCase().indexOf(q) !== -1 ||
                    (job.description || '').toLowerCase().indexOf(q) !== -1 ||
                    (job.author || '').toLowerCase().indexOf(q) !== -1 ||
                    (job.map || '').toLowerCase().indexOf(q) !== -1 ||
                    (job.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; });
            }
            var matchesTag = true;
            if (communityActiveTag) {
                matchesTag = (job.tags || []).indexOf(communityActiveTag) !== -1;
            }
            return matchesSearch && matchesTag;
        });

        var allTags = {};
        communityJobs.forEach(function(job) {
            (job.tags || []).forEach(function(t) { allTags[t] = (allTags[t] || 0) + 1; });
        });
        var tagList = Object.keys(allTags).sort(function(a, b) { return allTags[b] - allTags[a]; });

        var html = '';

        html += '<div class="comm-header">';
        html += '  <div class="comm-header-left">';
        html += '    <div class="comm-header-title"><i class="fas fa-globe"></i> ' + _T('comm_title') + '</div>';
        html += '    <div class="comm-header-sub">' + _T('comm_subtitle') + '</div>';
        html += '  </div>';
        html += '  <div class="comm-header-actions">';
        html += '    <button class="comm-detail-import-btn" id="commShareBtn"><i class="fas fa-share-alt"></i> ' + _T('comm_share_job') + '</button>';
        html += '    <button class="comm-detail-import-btn" id="commRefreshBtn"><i class="fas fa-sync-alt"></i></button>';
        html += '  </div>';
        html += '</div>';

        html += '<div class="comm-stats-row">';
        html += '  <div class="comm-stat-pill"><i class="fas fa-briefcase"></i> <span class="comm-stat-value">' + communityJobs.length + '</span> ' + _T('comm_jobs_available') + '</div>';
        html += '  <div class="comm-stat-pill"><i class="fas fa-users"></i> <span class="comm-stat-value">' + communityJobs.reduce(function(s, j) { return s + (j.importCount || 0); }, 0) + '</span> ' + _T('comm_total_imports') + '</div>';
        html += '</div>';

        html += '<div class="comm-toolbar">';
        html += '  <div class="comm-search-wrapper">';
        html += '    <i class="fas fa-search"></i>';
        html += '    <input type="text" class="comm-search-input" id="commSearchInput" placeholder="' + _T('comm_search_placeholder') + '" value="' + escHtml(communitySearchQuery) + '">';
        html += '  </div>';
        html += '  <div class="comm-tag-filters">';
        html += '    <button class="comm-tag-btn ' + (!communityActiveTag ? 'active' : '') + '" data-tag="">' + _T('comm_all') + '</button>';
        tagList.slice(0, 8).forEach(function(tag) {
            html += '    <button class="comm-tag-btn ' + (communityActiveTag === tag ? 'active' : '') + '" data-tag="' + escHtml(tag) + '">' + escHtml(tag) + ' <span style="opacity:0.4">(' + allTags[tag] + ')</span></button>';
        });
        html += '  </div>';
        html += '</div>';

        if (filtered.length === 0) {
            html += '<div class="comm-empty"><i class="fas fa-search"></i><p>' + _T('comm_no_results') + '</p></div>';
        } else {
            html += '<div class="comm-grid" id="commGrid">';
            filtered.forEach(function(job) {
                var isInstalled = communityLocalJobs.indexOf(job.name) !== -1;
                html += buildCardHTML(job, isInstalled);
            });
            html += '</div>';
        }

        el.html(html);
        bindCommunityEvents();
    }

    function buildCardHTML(job, isInstalled) {
        var h = '';
        h += '<div class="comm-card" data-job-id="' + escHtml(job.id) + '">';
        h += '  <div class="comm-card-title">' + escHtml(job.label);
        if (isInstalled) {
            h += ' <span style="font-size:0.55rem;color:#4ade80;background:rgba(74,222,128,0.1);padding:0.1rem 0.4rem;border-radius:3px;margin-left:0.4rem;vertical-align:middle;">' + _T('comm_installed') + '</span>';
        }
        h += '</div>';
        h += '  <div class="comm-card-jobname"><i class="fas fa-terminal"></i> /setjob ' + escHtml(job.name) + '</div>';
        h += '  <div class="comm-card-meta">';
        if (job.map) {
            h += '    <div class="comm-card-meta-item"><i class="fas fa-map-marker-alt"></i> ' + escHtml(job.map) + '</div>';
        }
        h += '    <div class="comm-card-meta-item"><i class="fas fa-language"></i> ' + escHtml(job.language || 'English') + '</div>';
        h += '    <div class="comm-card-meta-item"><i class="fas fa-download"></i> ' + _T('comm_imported_times', (job.importCount || 0)) + '</div>';
        h += '  </div>';
        if (job.description && job.description.trim() !== '') {
            var shortDesc = job.description.length > 80 ? job.description.substring(0, 80) + '...' : job.description;
            h += '  <div class="comm-card-description">' + escHtml(shortDesc) + '</div>';
        }
        if (job.tags && job.tags.length > 0) {
            h += '  <div class="comm-card-tags">';
            job.tags.slice(0, 4).forEach(function(tag) {
                h += '    <span class="comm-card-tag">' + escHtml(tag) + '</span>';
            });
            h += '  </div>';
        }
        h += '  <div class="comm-card-footer">';
        h += '    <div class="comm-card-author">';
        if (job.authorAvatar) {
            h += '      <img class="comm-card-author-avatar" src="' + escHtml(job.authorAvatar) + '" alt="">';
        } else {
            h += '      <div class="comm-card-author-icon">' + (job.author || 'U').charAt(0).toUpperCase() + '</div>';
        }
        h += '      ' + escHtml(job.author || 'Unknown');
        h += '    </div>';
        h += '    <button class="comm-card-view-btn">' + _T('comm_view') + '</button>';
        h += '  </div>';
        h += '</div>';
        return h;
    }

    function renderDetailView(job) {
        var el = $('#jcPageCommunity');
        var isInstalled = communityLocalJobs.indexOf(job.name) !== -1;

        var h = '<div class="comm-detail-overlay" id="commDetailOverlay">';
        h += '<button class="comm-detail-close" id="commDetailClose"><i class="fas fa-times"></i></button>';

        h += '<div class="comm-detail-title">' + escHtml(job.label) + '</div>';
        h += '<div class="comm-detail-jobname"><i class="fas fa-terminal"></i> <span>Job name :</span> <code>' + escHtml(job.name) + '</code> <span class="comm-detail-setjob-hint">(/setjob ' + escHtml(job.name) + ')</span></div>';

        h += '<div class="comm-detail-author-row">';
        h += '  <div class="comm-detail-author-info">';
        if (job.authorAvatar) {
            h += '    <img class="comm-detail-avatar" src="' + escHtml(job.authorAvatar) + '" alt="">';
        } else {
            h += '    <div class="comm-detail-avatar-fallback">' + (job.author || 'U').charAt(0).toUpperCase() + '</div>';
        }
        h += '    <div class="comm-detail-author-text">';
        h += '      <span class="comm-detail-author-name">' + escHtml(job.author || 'Unknown') + '</span>';
        if (job.authorDiscord) {
            h += '      <span class="comm-detail-author-discord">@' + escHtml(job.authorDiscord) + '</span>';
        }
        h += '    </div>';
        h += '  </div>';
        h += '  <div class="comm-detail-actions">';
        if (!isInstalled) {
            h += '    <button class="comm-detail-import-btn" id="commImportJobBtn" data-job-id="' + escHtml(job.id) + '"><i class="fas fa-download"></i> ' + _T('comm_import') + '</button>';
        } else {
            h += '    <span class="comm-detail-installed-badge"><i class="fas fa-check-circle"></i> ' + _T('comm_already_installed') + '</span>';
        }
        if (communityIsModerator) {
            h += '    <button class="comm-delete-btn" id="commDeleteJobBtn" data-job-id="' + escHtml(job.id) + '"><i class="fas fa-trash-alt"></i> ' + _T('comm_delete') + '</button>';
        }
        h += '  </div>';
        h += '</div>';

        var descText = job.description || '';
        if (descText.trim() !== '') {
            h += '<div class="comm-detail-desc-block">';
            h += '  <div class="comm-detail-desc-label"><i class="fas fa-align-left"></i> ' + _T('comm_description_label') + '</div>';
            h += '  <div class="comm-detail-desc-text">' + escHtml(descText) + '</div>';
            h += '</div>';
        }

        h += '<div class="comm-detail-meta-row">';
        if (job.map && job.map.trim() !== '') {
            h += '<div class="comm-detail-meta-badge"><i class="fas fa-map-marker-alt"></i> ' + escHtml(job.map) + '</div>';
        }
        h += '<div class="comm-detail-meta-badge"><i class="fas fa-language"></i> ' + escHtml(job.language || 'English') + '</div>';
        h += '<div class="comm-detail-meta-badge"><i class="fas fa-download"></i> ' + (job.importCount || 0) + ' imports</div>';
        h += '</div>';

        h += '<div class="comm-detail-content-summary">';
        h += '  <div style="font-size:0.85rem;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:0.6rem;"><i class="fas fa-box-open" style="margin-right:0.4rem;opacity:0.6;"></i>' + _T('comm_job_content') + '</div>';

        var grades = job.grades || [];
        if (grades.length > 0) {
            h += '<div class="comm-content-block">';
            h += '  <div class="comm-content-block-title"><i class="fas fa-layer-group"></i> ' + _T('comm_grades') + ' <span style="opacity:0.4;">(' + grades.length + ')</span></div>';
            h += '  <div class="comm-grades-list">';
            grades.forEach(function(g) {
                h += '<div class="comm-grade-item">';
                h += '  <span class="comm-grade-level">' + (g.level !== undefined ? g.level : '?') + '</span>';
                h += '  <span class="comm-grade-name">' + escHtml(g.name || g.label || '?') + '</span>';
                h += '  <span class="comm-grade-salary">$' + (g.salary || 0) + '</span>';
                h += '</div>';
            });
            h += '  </div>';
            h += '</div>';
        }

        var features = [];
        if (job.blips && job.blips.length > 0) features.push({ icon: 'fa-map-pin', label: _T('comm_blips'), count: job.blips.length });
        if (job.harvestZones && job.harvestZones.length > 0) features.push({ icon: 'fa-seedling', label: _T('comm_harvest_zones'), count: job.harvestZones.length });
        if (job.sellPoints && job.sellPoints.length > 0) features.push({ icon: 'fa-cash-register', label: _T('comm_sell_points'), count: job.sellPoints.length });
        if (job.stashes && job.stashes.length > 0) features.push({ icon: 'fa-archive', label: _T('comm_stashes'), count: job.stashes.length });
        if (job.shops && job.shops.length > 0) features.push({ icon: 'fa-store', label: _T('comm_shops'), count: job.shops.length });
        if (job.dutyPoints && job.dutyPoints.length > 0) features.push({ icon: 'fa-clock', label: _T('comm_duty_points'), count: job.dutyPoints.length });
        if (job.registers && job.registers.length > 0) features.push({ icon: 'fa-money-bill-wave', label: _T('comm_registers'), count: job.registers.length });

        if (features.length > 0) {
            h += '<div class="comm-content-block">';
            h += '  <div class="comm-content-block-title"><i class="fas fa-puzzle-piece"></i> ' + _T('comm_features') + '</div>';
            h += '  <div class="comm-features-grid">';
            features.forEach(function(f) {
                h += '<div class="comm-feature-pill"><i class="fas ' + f.icon + '"></i> ' + f.label + ' <span class="comm-feature-count">' + f.count + '</span></div>';
            });
            h += '  </div>';
            h += '</div>';
        }

        var extraInfo = [];
        if (job.maxSalary) extraInfo.push({ label: _T('comm_max_salary'), value: '$' + job.maxSalary });
        if (job.jobType) extraInfo.push({ label: _T('comm_job_type'), value: escHtml(job.jobType) });
        if (job.defaultDuty !== undefined) extraInfo.push({ label: _T('comm_default_duty'), value: job.defaultDuty ? '<i class="fas fa-check" style="color:#4ade80;"></i>' : '<i class="fas fa-times" style="color:#ef4444;"></i>' });
        if (job.offDutyPay !== undefined) extraInfo.push({ label: _T('comm_off_duty_pay'), value: job.offDutyPay ? '<i class="fas fa-check" style="color:#4ade80;"></i>' : '<i class="fas fa-times" style="color:#ef4444;"></i>' });
        if (job.coords) extraInfo.push({ label: _T('comm_coords'), value: 'X: ' + (job.coords.x || 0).toFixed(1) + ' Y: ' + (job.coords.y || 0).toFixed(1) + ' Z: ' + (job.coords.z || 0).toFixed(1) });

        if (extraInfo.length > 0) {
            h += '<div class="comm-content-block">';
            h += '  <div class="comm-content-block-title"><i class="fas fa-cog"></i> ' + _T('comm_settings') + '</div>';
            h += '  <div class="comm-extra-grid">';
            extraInfo.forEach(function(info) {
                h += '<div class="comm-extra-item"><span class="comm-extra-label">' + info.label + '</span><span class="comm-extra-value">' + info.value + '</span></div>';
            });
            h += '  </div>';
            h += '</div>';
        }

        if (grades.length === 0 && features.length === 0 && extraInfo.length === 0) {
            h += '<div style="text-align:center;color:rgba(255,255,255,0.3);font-size:0.75rem;padding:1rem;">' + _T('comm_no_content_info') + '</div>';
        }

        h += '</div>';

        if (job.items && job.items.length > 0) {
            h += '<div class="comm-items-section">';
            h += '  <div class="comm-items-title">' + _T('comm_items_title') + '</div>';
            h += '  <div class="comm-items-sub">' + _T('comm_items_sub') + '</div>';

            h += '  <div class="comm-fw-tabs">';
            h += '    <button class="comm-fw-tab ' + (communityFwTab === 'vorp' ? 'active' : '') + '" data-fw="vorp">VORP</button>';
            h += '    <button class="comm-fw-tab ' + (communityFwTab === 'rsg' ? 'active' : '') + '" data-fw="rsg">RSG-Core</button>';
            h += '  </div>';

            h += '  <div class="comm-items-code" id="commItemsCode">';
            h += '    <button class="comm-copy-btn" id="commCopyItemsBtn" title="Copy"><i class="fas fa-copy"></i></button>';
            h += generateItemsCode(job.items, communityFwTab);
            h += '  </div>';
            h += '</div>';
        }

        h += '</div>';

        el.append(h);
        bindDetailEvents(job);
    }

    function buildInfoItem(icon, label, value) {
        return '<div class="comm-detail-info-item">' +
            '<div class="comm-detail-info-label"><i class="fas ' + icon + '"></i> ' + label + '</div>' +
            '<div class="comm-detail-info-value">' + value + '</div></div>';
    }

    function generateItemsCode(items, fw) {
        var lines = [];
        if (fw === 'vorp') {
            lines.push('-- VORP Inventory: Add these items to your database');
            lines.push('-- Table: items | or use VORP admin panel');
            lines.push('');
            items.forEach(function(item) {
                lines.push("INSERT INTO items (item, label, `limit`, can_remove, type, usable) VALUES ('" + escSql(item.name) + "', '" + escSql(item.label) + "', 50, 1, '" + (item.type || 'item_standard') + "', 1);");
            });
        } else {
            lines.push('-- RSG-Core: Add to rsg-core/shared/items.lua');
            lines.push('');
            items.forEach(function(item) {
                lines.push("['" + escSql(item.name) + "'] = {name = '" + escSql(item.name) + "', label = '" + escSql(item.label) + "', weight = " + (item.weight || 200) + ", type = 'item', image = '" + escSql(item.name) + ".png', unique = false, useable = true, shouldClose = true, description = '" + escSql(item.label) + "'},");
            });
        }
        return escHtml(lines.join('\n'));
    }

    function escSql(str) {
        return (str || '').replace(/'/g, "\\'");
    }

    function openShareModal(localJobs) {
        var el = $('#jcPageCommunity');

        var h = '<div class="comm-share-overlay" id="commShareOverlay">';
        h += '<div class="comm-share-modal">';
        h += '  <button class="comm-detail-close" id="commShareClose"><i class="fas fa-times"></i></button>';
        h += '  <div class="comm-share-title"><i class="fas fa-share-alt"></i> ' + _T('comm_share_title') + '</div>';
        h += '  <div class="comm-share-sub">' + _T('comm_share_sub') + '</div>';

        h += '  <div class="comm-share-field">';
        h += '    <label>' + _T('comm_select_job') + '</label>';
        h += '    <div class="comm-custom-select" id="commShareJobSelect" data-value="">';
        h += '      <div class="comm-custom-select-display">— ' + _T('comm_select_job') + ' —</div>';
        h += '      <div class="comm-custom-select-options">';
        h += '        <div class="comm-custom-select-option" data-val="">— ' + _T('comm_select_job') + ' —</div>';
        (localJobs || []).forEach(function(j) {
            h += '        <div class="comm-custom-select-option" data-val="' + escHtml(j.name) + '">' + escHtml(j.label) + ' (' + escHtml(j.name) + ')</div>';
        });
        h += '      </div>';
        h += '    </div>';
        h += '  </div>';

        h += '  <div class="comm-share-field">';
        h += '    <label>' + _T('comm_share_description') + ' <span style="font-size:0.6rem;opacity:0.4;">(max 200)</span></label>';
        h += '    <textarea id="commShareDesc" maxlength="200" placeholder="' + _T('comm_share_desc_placeholder') + '"></textarea>';
        h += '  </div>';

        h += '  <div class="comm-share-field">';
        h += '    <label>' + _T('comm_supported_maps') + '</label>';
        h += '    <input type="text" id="commShareMap" placeholder="ex: Spooni, other mapping...">';
        h += '  </div>';

        h += '  <div class="comm-share-field">';
        h += '    <label>' + _T('comm_tags') + '</label>';
        h += '    <input type="text" id="commShareTags" placeholder="saloon, ranch, mining...">';
        h += '  </div>';

        h += '  <div class="comm-share-field">';
        h += '    <label>' + _T('comm_language') + '</label>';
        h += '    <div class="comm-custom-select" id="commShareLanguage" data-value="English">';
        h += '      <div class="comm-custom-select-display">English</div>';
        h += '      <div class="comm-custom-select-options">';
        var langs = ['English','Fran\u00e7ais','Deutsch','Espa\u00f1ol','Portugu\u00eas','Italiano','Nederlands','Polski','\u0420\u0443\u0441\u0441\u043a\u0438\u0439','T\u00fcrk\u00e7e','\u0e44\u0e17\u0e22'];
        langs.forEach(function(l) {
            h += '        <div class="comm-custom-select-option" data-val="' + l + '">' + l + '</div>';
        });
        h += '      </div>';
        h += '    </div>';
        h += '  </div>';

        h += '  <div class="comm-share-footer">';
        h += '    <button class="comm-share-cancel-btn" id="commShareCancelBtn">' + _T('cancel') + '</button>';
        h += '    <button class="comm-share-submit-btn" id="commShareSubmitBtn"><i class="fas fa-paper-plane"></i> ' + _T('comm_submit_share') + '</button>';
        h += '  </div>';
        h += '</div></div>';

        el.append(h);

        el.find('.comm-custom-select').each(function() {
            var $sel = $(this);
            var $display = $sel.find('.comm-custom-select-display');
            var $opts = $sel.find('.comm-custom-select-options');

            $display.on('click', function(e) {
                e.stopPropagation();
                el.find('.comm-custom-select-options').not($opts).removeClass('open');
                el.find('.comm-custom-select').not($sel).removeClass('active');
                $opts.toggleClass('open');
                $sel.toggleClass('active');
            });

            $sel.find('.comm-custom-select-option').on('click', function(e) {
                e.stopPropagation();
                var val = $(this).attr('data-val');
                var txt = $(this).text();
                $sel.attr('data-value', val);
                $display.text(txt);
                $opts.removeClass('open');
                $sel.removeClass('active');
            });
        });

        $('#commShareOverlay').on('click', function() {
            el.find('.comm-custom-select-options').removeClass('open');
            el.find('.comm-custom-select').removeClass('active');
        });

        $('#commShareClose, #commShareCancelBtn').off('click').on('click', function() {
            $('#commShareOverlay').remove();
        });

        $('#commShareSubmitBtn').off('click').on('click', function() {
            var jobName = $('#commShareJobSelect').attr('data-value');
            var desc = $('#commShareDesc').val().trim();
            var map = $('#commShareMap').val().trim();
            var tags = $('#commShareTags').val().trim();
            var language = $('#commShareLanguage').attr('data-value');

            if (!jobName) {
                showCommunityToast(_T('comm_select_job_required'), 'error');
                return;
            }

            $.post('https://cactus_ultimate/community_shareJob', JSON.stringify({
                jobName: jobName,
                description: desc,
                map: map,
                tags: tags,
                language: language
            }));
        });
    }

    function showImportConfirm(job) {
        var el = $('#jcPageCommunity');

        var h = '<div class="comm-confirm-overlay" id="commConfirmOverlay">';
        h += '<div class="comm-confirm-modal">';
        h += '  <div class="comm-confirm-icon"><i class="fas fa-download"></i></div>';
        h += '  <div class="comm-confirm-title">' + _T('comm_confirm_import') + '</div>';
        h += '  <div class="comm-confirm-text">' + _T('comm_confirm_import_text', escHtml(job.label)) + '</div>';
        h += '  <div class="comm-confirm-footer">';
        h += '    <button class="comm-confirm-no" id="commConfirmNo">' + _T('cancel') + '</button>';
        h += '    <button class="comm-confirm-yes" id="commConfirmYes"><i class="fas fa-check"></i> ' + _T('comm_import') + '</button>';
        h += '  </div>';
        h += '</div></div>';

        el.append(h);

        $('#commConfirmNo').off('click').on('click', function() { $('#commConfirmOverlay').remove(); });
        $('#commConfirmYes').off('click').on('click', function() {
            $('#commConfirmOverlay').remove();
            $.post('https://cactus_ultimate/community_importJob', JSON.stringify({
                communityJobId: job.id,
                jobData: job,
                source: 'community'
            }));
        });
    }

    function bindCommunityEvents() {
        $('#commSearchInput').off('input').on('input', function() {
            communitySearchQuery = $(this).val();
            renderCommunityContent();
        });

        $('.comm-tag-btn').off('click').on('click', function() {
            communityActiveTag = $(this).data('tag') || '';
            renderCommunityContent();
        });

        $(document).off('click.commcard').on('click.commcard', '.comm-card, .comm-card-view-btn', function(e) {
            e.stopPropagation();
            var card = $(this).closest('.comm-card');
            var jobId = card.data('job-id');
            var job = communityJobs.find(function(j) { return j.id === jobId; });
            if (job) {
                communitySelectedJob = job;
                renderDetailView(job);
            }
        });

        $('#commShareBtn').off('click').on('click', function() {
            $.post('https://cactus_ultimate/community_getLocalJobs', JSON.stringify({}));
        });

        $('#commRefreshBtn').off('click').on('click', function() {
            communityLoaded = false;
            communityLoading = true;
            renderCommunityContent();
            $.post('https://cactus_ultimate/community_fetchJobs', JSON.stringify({}));
        });
    }

    function bindDetailEvents(job) {
        $('#commDetailClose').off('click').on('click', function() {
            $('#commDetailOverlay').remove();
            communitySelectedJob = null;
        });

        $('.comm-fw-tab').off('click').on('click', function() {
            communityFwTab = $(this).data('fw');
            $('.comm-fw-tab').removeClass('active');
            $(this).addClass('active');
            $('#commItemsCode').html(
                '<button class="comm-copy-btn" id="commCopyItemsBtn" title="Copy"><i class="fas fa-copy"></i></button>' +
                generateItemsCode(job.items || [], communityFwTab)
            );
            bindCopyBtn(job);
        });

        bindCopyBtn(job);

        $('#commImportJobBtn').off('click').on('click', function() {
            showImportConfirm(job);
        });

        $('#commDeleteJobBtn').off('click').on('click', function() {
            showDeleteConfirm(job);
        });
    }

    function showDeleteConfirm(job) {
        var el = $('#jcPageCommunity');
        var h = '<div class="comm-confirm-delete-overlay" id="commConfirmDeleteOverlay">';
        h += '<div class="comm-confirm-delete-modal">';
        h += '  <div class="comm-confirm-delete-title"><i class="fas fa-exclamation-triangle"></i> ' + _T('comm_delete_confirm_title') + '</div>';
        h += '  <div class="comm-confirm-delete-text">' + _T('comm_delete_confirm_text').replace('{0}', '<strong>' + escHtml(job.label) + '</strong>') + '</div>';
        h += '  <div class="comm-confirm-delete-actions">';
        h += '    <button class="comm-confirm-delete-cancel" id="commDeleteCancelBtn">' + _T('cancel') + '</button>';
        h += '    <button class="comm-confirm-delete-confirm" id="commDeleteConfirmBtn"><i class="fas fa-trash-alt"></i> ' + _T('comm_delete_confirm') + '</button>';
        h += '  </div>';
        h += '</div></div>';
        el.append(h);

        $('#commDeleteCancelBtn').off('click').on('click', function() {
            $('#commConfirmDeleteOverlay').remove();
        });

        $('#commDeleteConfirmBtn').off('click').on('click', function() {
            $(this).prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> ...');
            $.post('https://cactus_ultimate/community_deleteJob', JSON.stringify({ jobId: job.id }));
        });
    }

    function bindCopyBtn(job) {
        $('#commCopyItemsBtn').off('click').on('click', function() {
            var codeText = generateItemsCodeRaw(job.items || [], communityFwTab);
            copyTextToClipboard(codeText);
            $('#commCopyItemsBtn').addClass('copied').html('<i class="fas fa-check"></i>');
            setTimeout(function() {
                $('#commCopyItemsBtn').removeClass('copied').html('<i class="fas fa-copy"></i>');
            }, 2000);
        });
    }

    function copyTextToClipboard(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    function generateItemsCodeRaw(items, fw) {
        var lines = [];
        if (fw === 'vorp') {
            lines.push('-- VORP Inventory: Add these items to your database');
            lines.push('-- Table: items | or use VORP admin panel');
            lines.push('');
            items.forEach(function(item) {
                lines.push("INSERT INTO items (item, label, `limit`, can_remove, type, usable) VALUES ('" + escSql(item.name) + "', '" + escSql(item.label) + "', 50, 1, '" + (item.type || 'item_standard') + "', 1);");
            });
        } else {
            lines.push('-- RSG-Core: Add to rsg-core/shared/items.lua');
            lines.push('');
            items.forEach(function(item) {
                lines.push("['" + escSql(item.name) + "'] = {name = '" + escSql(item.name) + "', label = '" + escSql(item.label) + "', weight = " + (item.weight || 200) + ", type = 'item', image = '" + escSql(item.name) + ".png', unique = false, useable = true, shouldClose = true, description = '" + escSql(item.label) + "'},");
            });
        }
        return lines.join('\n');
    }

    window.addEventListener('message', function(event) {
        if (event.data.action === 'community_localJobsForShare') {
            openShareModal(event.data.jobs || []);
        }
    });

    function buildLoadingHTML() {
        return '<div class="comm-loading"><i class="fas fa-spinner"></i><p>' + _T('comm_loading') + '</p></div>';
    }

    function closeCommunityOverlays() {
        $('#commDetailOverlay').remove();
        $('#commShareOverlay').remove();
        $('#commConfirmOverlay').remove();
        $('#commConfirmDeleteOverlay').remove();
    }

    function showCommunityToast(msg, type) {
        $('.comm-toast').remove();
        var el = $('<div class="comm-toast ' + (type || 'info') + '">' + msg + '</div>');
        $('#jcPageCommunity').append(el);
        setTimeout(function() { el.remove(); }, 3200);
    }

    function escHtml(str) {
        var d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }

})(jQuery);
