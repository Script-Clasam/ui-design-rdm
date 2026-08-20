let debugMode = false;
function DebugLog(...args) {
    if (debugMode) {
        console.log('[Boss Menu]', ...args);
    }
}
function setDebugMode(enabled) {
    debugMode = enabled;
    if (enabled) {
        console.log('[Boss Menu] Mode debug activé');
    }
}

let currentLocale = 'en';
let translations = {};
let translationsLoaded = false;

function loadTranslations() {
    $.ajax({
        url: 'config_trad.json',
        async: false,
        dataType: 'json',
        success: function(data) {
            translations = data;
            translationsLoaded = true;
            DebugLog('Traductions chargées:', Object.keys(translations));
        },
        error: function(error) {
            if (typeof DebugLog === 'function') DebugLog('Traductions - Erreur:', error);
            translationsLoaded = false;
        }
    });
}

function _T(key, ...args) {
    if (!translationsLoaded) {
        loadTranslations();
    }
    
    let translation = translations[currentLocale]?.[key] || translations['en']?.[key] || key;
    
    if (args.length > 0) {
        args.forEach((arg, index) => {
            translation = translation.replace(new RegExp(`\\{${index}\\}`, 'g'), arg);
        });
        if (args.length >= 1) {
            translation = translation.replace(/\{count\}/g, args[0]);
            translation = translation.replace(/\{name\}/g, args[0]);
            translation = translation.replace(/\{amount\}/g, args[0]);
            translation = translation.replace(/\{max\}/g, args[0]);
            translation = translation.replace(/\{slots\}/g, args[0]);
            translation = translation.replace(/\{grade\}/g, args[0]);
        }
        if (args.length >= 2) {
            translation = translation.replace(/\{extra\}/g, args[1]);
            translation = translation.replace(/\{target\}/g, args[1]);
        }
        if (args.length >= 3) {
            translation = translation.replace(/\{price\}/g, args[2]);
        }
        if (args.length >= 4) {
            translation = translation.replace(/\{currency\}/g, args[3]);
        }
    }
    
    return translation;
}

function setLocale(locale) {
    if (!locale) return false;
    if (!translationsLoaded) {
        loadTranslations();
    }
    
    if (translations[locale]) {
        currentLocale = locale;
        DebugLog('Traductions - Langue définie depuis le serveur:', locale);
        applyInterfaceTranslations();
        return true;
    }
    DebugLog('Traductions - Langue non disponible:', locale);
    return false;
}

function applyInterfaceTranslations() {
    $('[data-i18n]').each(function() {
        const key = $(this).data('i18n');
        $(this).text(_T(key));
    });
    
    $('[data-i18n-placeholder]').each(function() {
        const key = $(this).data('i18n-placeholder');
        $(this).attr('placeholder', _T(key));
    });
    
    $('[data-tab="employees"] .nav-label').text(_T('nav_employees'));
    $('[data-tab="accounts"] .nav-label').text(_T('nav_accounts'));
    $('[data-tab="grades"] .nav-label').text(_T('nav_grades'));
    $('[data-tab="history"] .nav-label').text(_T('nav_history'));
    
    const dutyBtnText = $('#dutyBtnText');
    if (dutyBtnText.text().includes('PRENDRE') || dutyBtnText.text().includes('GO ON')) {
        dutyBtnText.text(_T('go_on_duty'));
    } else {
        dutyBtnText.text(_T('go_off_duty'));
    }
    
    $('.lock-content p').text(_T('locked_service'));
    
    $('#employees-tab .content-title-centered').text(_T('employees_title'));
    $('#searchEmployees').attr('placeholder', _T('search_employee'));
    $('#recruitBtn').html('<i class="fas fa-user-plus"></i> ' + _T('recruit_button'));
    $('#employeesList .loading-state p').text(_T('loading_employees'));
    
    $('.bank-title').text(_T('company_accounts'));
    $('#depositBtn').html('<i class="fas fa-arrow-down"></i> ' + _T('deposit'));
    $('#withdrawBtn').html('<i class="fas fa-arrow-up"></i> ' + _T('withdraw'));
    $('#storageBtn span').text(_T('storage_title'));
    $('#upgradeStorageBtn span').text(_T('storage_upgrade'));
    $('#detailedHistoryBtn span').text(_T('history_title'));
    $('.history-header-left h3').text(_T('recent_transactions'));

    $('#grades-tab .content-title-centered').text(_T('grades_title'));
    $('#grades-tab .grades-subtitle p').text(_T('grades_subtitle'));
    $('#gradesList .loading-state p').text(_T('loading_grades'));
    $('#history-tab .content-title-centered').text(_T('history_actions_title'));
    $('#history-tab .grades-subtitle p').text(_T('history_subtitle'));
    $('#searchHistory').attr('placeholder', _T('history_search'));
    $('#employeeManageModal .member-paper-header h3').text(_T('modify_grade'));
    $('#employeeManageModal label').eq(0).text(_T('full_name'));
    $('#employeeManageModal label').eq(1).text(_T('last_connection'));
    $('#employeeManageModal label').eq(2).text(_T('profile_photo'));
    $('#employeeManageModal label').eq(3).text(_T('employee_grade_label'));
    $('#saveEmployeeBtn').text(_T('confirm'));
    $('#fireEmployeeBtn').text(_T('fire_button'));
    $('#recruitModal .member-paper-header h3').text(_T('recruitment'));
    $('#refreshNearbyBtn span').text(_T('refresh'));
    $('#historyModal .history-modal-title h2').text(_T('detailed_transactions_registry'));
    $('[data-filter="all"]').html('<i class="fas fa-list"></i> ' + _T('filter_all'));
    $('[data-filter="deposit"]').html('<img src="img/plus.png" alt="Deposit" class="filter-icon"> ' + _T('filter_deposits'));
    $('[data-filter="withdraw"]').html('<img src="img/dollar.png" alt="Withdraw" class="filter-icon"> ' + _T('filter_withdrawals'));
    $('[data-filter="deposit_gold"]').html('<img src="img/gold.png" alt="Deposit Gold" class="filter-icon"> ' + _T('filter_deposits_gold'));
    $('[data-filter="withdraw_gold"]').html('<img src="img/gold.png" alt="Withdraw Gold" class="filter-icon"> ' + _T('history_withdraw_gold'));
    $('[data-filter="salary"]').html('<img src="img/salary.png" alt="Salary" class="filter-icon"> ' + _T('filter_salaries'));
    $('[data-filter="upgrade_storage"]').html('<img src="img/coffre.png" alt="Storage" class="filter-icon"> ' + _T('filter_storage_upgrades'));
    $('[data-filter="bonus"]').html('<i class="fas fa-coins filter-icon" style="color: #9a948a;"></i> ' + _T('filter_bonuses'));
    $('.history-col-type').text(_T('col_type'));
    $('.history-col-player').text(_T('col_employee'));
    $('.history-col-value').text(_T('col_amount'));
    $('.history-col-date').text(_T('col_date'));
    $('#storageModal h2').text(_T('upgrade_storage_title'));
    $('.storage-info-label').text(_T('current_storage_capacity'));
    $('#gradeManagementModal .grade-modal-title h2').text(_T('grade_details'));
    $('#saveGradeBtn').html('<img src="img/save.png" alt="Save" class="btn-icon"> ' + _T('save'));
    $('[data-permission="canRecruit"] ~ .permission-text span').text(_T('perm_recruit'));
    $('[data-permission="canFire"] ~ .permission-text span').text(_T('perm_fire'));
    $('[data-permission="canManageMoney"] ~ .permission-text span').text(_T('perm_manage_money'));
    $('[data-permission="canManageGold"] ~ .permission-text span').text(_T('perm_manage_gold'));
    $('[data-permission="canViewAccounts"] ~ .permission-text span').text(_T('perm_view_accounts'));
    $('[data-permission="canViewMembers"] ~ .permission-text span').text(_T('perm_view_members'));
    $('[data-permission="canViewHistory"] ~ .permission-text span').text(_T('perm_view_history'));
    $('[data-permission="canViewFullHistory"] ~ .permission-text span').text(_T('perm_view_full_history'));
    $('[data-permission="canEditGrades"] ~ .permission-text span').text(_T('perm_edit_grades'));
    $('[data-permission="canUpgradeStorage"] ~ .permission-text span').text(_T('perm_upgrade_storage'));
    $('[data-permission="canEditAvatars"] ~ .permission-text span').text(_T('perm_edit_avatars'));
    $('[data-permission="canAccessInventory"] ~ .permission-text span').text(_T('perm_access_inventory'));
    $('[data-permission="canManageEmployeeGrade"] ~ .permission-text span').text(_T('perm_manage_employee_grade'));
    
    DebugLog('Traductions - Interface traduite en', currentLocale);
}
