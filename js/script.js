$(document).ready(function() {
    DebugLog('Script JS chargé et prêt');
    
    let currentJob = '';
    let currentGrade = 0;
    let currentPlayerName = '';
    let currentGradeName = '';
    let allEmployees = [];
    let allPlayers = [];
    let companyData = null;
    let onDuty = false;
    let notificationPosition = 'top-right'; 
    let jobOfferTimer = null;
    let currentJobOffer = null;
    let isListView = false; 
    let paymentInterval = 15;
    let historyChart = null;
    let currentChartType = 'cash';
    let currentChartPeriod = 7; 
    let isLoadingChart = false;
    let isDetailedMode = false;
    let myCharidentifier = 0;
    
    window.dateTimezone = 'Europe/Paris';
    window.dateFormat = 'EU'; // 'EU' = DD/MM/YYYY, 'US' = MM/DD/YYYY, 'ISO' = YYYY-MM-DD
    
    window.formatDateWithTimezone = function(timestamp) {
        if (!timestamp) return { date: '', time: '' };
        
        const date = new Date(timestamp);
        const timezone = window.dateTimezone || 'Europe/Paris';
        const dateFormat = window.dateFormat || 'EU';
        
        try {
            const options = { 
                timeZone: timezone,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            };
            
            const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(date);
            const dateParts = {};
            parts.forEach(p => dateParts[p.type] = p.value);
            
            let formattedDate;
            if (dateFormat === 'US') {
                formattedDate = `${dateParts.month}/${dateParts.day}/${dateParts.year}`;
            } else if (dateFormat === 'ISO') {
                formattedDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
            } else {
                formattedDate = `${dateParts.day}/${dateParts.month}/${dateParts.year}`;
            }
            
            return { date: formattedDate, time: `${dateParts.hour}:${dateParts.minute}` };
        } catch (e) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutesStr = String(date.getMinutes()).padStart(2, '0');
            return { date: `${day}/${month}/${year}`, time: `${hours}:${minutesStr}` };
        }
    };

  
    $(document).off('click.manageBtn').on('click.manageBtn', '.manage-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const charidentifier = $(this).data('id');
        DebugLog(' Clic sur bouton GÉRER, charidentifier:', charidentifier);
        openEmployeeModal(charidentifier);
    });

    $(document).off('click.fireBtn').on('click.fireBtn', '.fire-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const charidentifier = $(this).data('id');
        const employee = allEmployees.find(e => e.charidentifier === charidentifier);
        if (employee) {
            showConfirm(_T('fire_confirm_detailed', employee.name), function() {
                $.post('https://cactus_ultimate/fireEmployee', JSON.stringify({ charidentifier: employee.charidentifier }));
            });
        }
    });

    $(document).off('click.resignBtn').on('click.resignBtn', '.resign-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        showConfirm(_T('resign_confirm'), function() {
            $.post('https://cactus_ultimate/resign', JSON.stringify({}));
            setTimeout(function() {
                closeMenu();
            }, 500);
        });
    });

    $(document).off('click.bonusBtn').on('click.bonusBtn', '.bonus-btn', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const charidentifier = $(this).data('id');
        const employeeName = $(this).data('name');
        showBonusModal(charidentifier, employeeName);
    });

    function showBonusModal(charidentifier, employeeName) {
        if ($('#bonusModal').length === 0) {
            const bonusModalHtml = `
                <div id="bonusModal" class="bonus-overlay" style="display:none;">
                    <div class="bonus-popup">
                        <div class="bonus-header">
                            <i class="fas fa-coins bonus-icon"></i>
                            <h2 class="bonus-title">${_T('bonus_title')}</h2>
                        </div>
                        <div class="bonus-body">
                            <div class="bonus-info">
                                <div class="bonus-row">
                                    <span class="bonus-label">${_T('employee_name')}</span>
                                    <span class="bonus-value" id="bonusEmployeeName"></span>
                                </div>
                            </div>
                            <div class="bonus-input-container">
                                <label class="bonus-input-label">${_T('bonus_amount')}</label>
                                <div class="bonus-input-wrapper">
                                    <input type="number" id="bonusAmount" class="bonus-input" min="1" placeholder="0" />
                                    <span class="bonus-currency">$</span>
                                </div>
                            </div>
                        </div>
                        <div class="bonus-buttons">
                            <button class="bonus-btn-action bonus-confirm" id="bonusConfirmBtn">
                                <i class="fas fa-check"></i> ${_T('confirm')}
                            </button>
                            <button class="bonus-btn-action bonus-cancel" id="bonusCancelBtn">
                                <i class="fas fa-times"></i> ${_T('cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(bonusModalHtml);
        }
        $('#bonusEmployeeName').text(employeeName);
        $('#bonusAmount').val('');
        $('#bonusModal').data('charidentifier', charidentifier);
        $('#bonusModal').fadeIn(200);
        $('#bonusConfirmBtn').off('click').on('click', function() {
            const amount = parseInt($('#bonusAmount').val());
            const charId = $('#bonusModal').data('charidentifier');
            
            if (!amount || amount <= 0) {
                showNotification(_T('bonus_invalid_amount'), 'error', 4000);
                return;
            }

            $.post('https://cactus_ultimate/giveBonus', JSON.stringify({
                charidentifier: charId,
                amount: amount
            }));
            $('#bonusModal').fadeOut(200);
        });

        $('#bonusCancelBtn').off('click').on('click', function() {
            $('#bonusModal').fadeOut(200);
        });
        $('#bonusModal').off('click.overlay').on('click.overlay', function(e) {
            if ($(e.target).is('#bonusModal')) {
                $('#bonusModal').fadeOut(200);
            }
        });
    }

    function showConfirm(message, onConfirm) {
        $('#customConfirmMessage').text(message);
        $('#customConfirmModal').fadeIn(200);
        
        $('#customConfirmOk').off('click').on('click', function() {
            $('#customConfirmModal').fadeOut(200);
            if (onConfirm) onConfirm();
        });
        
        $('#customConfirmCancel').off('click').on('click', function() {
            $('#customConfirmModal').fadeOut(200);
        });
        
        $('.custom-modal-overlay').off('click').on('click', function() {
            $('#customConfirmModal').fadeOut(200);
        });
    }

    function showAlert(message) {
        $('#customAlertMessage').text(message);
        $('#customAlertModal').fadeIn(200);
        
        $('#customAlertOk').off('click').on('click', function() {
            $('#customAlertModal').fadeOut(200);
        });
        
        $('.custom-modal-overlay').off('click').on('click', function() {
            $('#customAlertModal').fadeOut(200);
        });
    }

  
    window.addEventListener('message', function(event) {
        const data = event.data;
        if (data.debug !== undefined) {
            setDebugMode(data.debug);
        }
        
        DebugLog('Message NUI reçu - action:', data.action);

        if (data.action === 'openMenu') {
            DebugLog('Ouverture du menu');
            
     
            if (data.data && data.data.locale) {
                setLocale(data.data.locale);
            }
            
            $('#container').fadeIn(300);
            
            if (data.data) {
                currentJob = data.data.name;
                currentGrade = data.data.grade;
                currentGradeName = data.data.gradeName;
                companyData = data.data;
                onDuty = data.data.onDuty || false;
                myCharidentifier = data.data.charidentifier || 0;
                
                
                if (data.data.paymentInterval !== undefined) {
                    paymentInterval = data.data.paymentInterval;
                    $('#paymentIntervalDisplay').text(paymentInterval);
                }
                
                updatePlayerInfo(data.data.gradeName, data.data.label);
                updateCompanyName(data.data.label);
                updateDutyButton(onDuty);
                updateLockOverlay(onDuty);
                updateGradesTabVisibility();
                updateAccountsTabVisibility();
                updateHistoryTabVisibility();
                updateActionButtonsVisibility();
                if (typeof initStorageUpgrade === 'function') {
                    const storageSlots = data.data.storageSlots || 5;
                    const money = data.data.money || 0;
                    const permissions = data.data.permissions || {};
                    initStorageUpgrade(storageSlots, money, permissions);
                }
                if (onDuty) {
                    $.post('https://cactus_ultimate/getEmployees', JSON.stringify({}));
                    $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                    $.post('https://cactus_ultimate/getStorageSlots', JSON.stringify({}));
                    requestDashboardStats();
                }
            }
            
        } else if (data.action === 'updateData') {
            DebugLog(' Mise à jour des données');
            DebugLog(' data.data reçu:', data.data);
            DebugLog(' data.data.grades:', data.data ? data.data.grades : 'undefined');
            if (data.data) {
                if (!companyData) {
                    companyData = {};
                }
                if (data.data.permissions !== undefined) {
                    companyData.permissions = data.data.permissions;
                    updateGradesTabVisibility();
                    updateAccountsTabVisibility();
                    updateHistoryTabVisibility();
                    updateActionButtonsVisibility();
                }
                if (data.data.employees !== undefined) {
                    DebugLog(' Mise à jour des employés:', data.data.employees.length, 'employés');
                    if (data.data.employees.length > 0) {
                        data.data.employees.forEach((emp, i) => {
                            DebugLog(` Employé[${i}] ${emp.name} - avatar: "${emp.avatar || '(vide)'}"`);
                        });
                    }
                    companyData.employees = data.data.employees;
                    allEmployees = data.data.employees;
                    updateEmployeesList(allEmployees);
                }
                if (data.data.money !== undefined) {
                    companyData.money = data.data.money;
                    updateMoneyDisplay(companyData);
                }
                if (data.data.gold !== undefined) {
                    companyData.gold = data.data.gold;
                    updateMoneyDisplay(companyData);
                }
                if (data.data.history !== undefined) {
                    companyData.history = data.data.history;
                    updateBankHistory(data.data.history);
                }
                if (data.data.grades !== undefined) {
                    companyData.grades = data.data.grades;
                    updateSalariesList(data.data.grades);
                }
                if (data.data.storageSlots !== undefined) {
                    if (typeof window.updateStorageSlotsDisplay === 'function') {
                        window.updateStorageSlotsDisplay(data.data.storageSlots);
                    }
                }
            }
            
        } else if (data.action === 'hide') {
            $('#container').fadeOut(300);
            
        } else if (data.action === 'closeMenu') {
            closeMenu();
            
        } else if (data.action === 'updateDutyStatus') {
            onDuty = data.onDuty;
            updateDutyButton(onDuty);
            updateLockOverlay(onDuty);
            if (onDuty) {
                $.post('https://cactus_ultimate/getEmployees', JSON.stringify({}));
                $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                requestDashboardStats();
            }
            
        } else if (data.action === 'updateEmployees') {
            allEmployees = data.employees;
            updateEmployeesList(allEmployees);
            
        } else if (data.action === 'updatePlayers') {
            allPlayers = data.players;
            updatePlayersList(allPlayers);
            
        } else if (data.action === 'updateCompanyData') {
            companyData = data;
            updateMoneyDisplay(data);
            updateSalariesList(data.grades);
        } else if (data.action === 'updateHistory') {
            DebugLog(' Historique reçu:', data.history);
            if (typeof window.updateHistoryData === 'function') {
                window.updateHistoryData(data.history || []);
            }
        } else if (data.action === 'updateFilteredHistory') {
            DebugLog(' Historique filtré reçu:', data.history ? data.history.length : 0, 'entries, filter:', data.filterType);
            isLoadingHistory = false;
            renderFilteredHistory(data.history || [], data.filterType);
        } else if (data.action === 'updateChartData') {
            DebugLog(' Données graphique reçues:', data.chartData ? data.chartData.labels.length : 0, 'jours');
            isLoadingChart = false;
            
            updateChart(data.chartData, data.chartType);
            if (data.totalTransactions !== undefined) {
                $('#statTotalTransactions').text(data.totalTransactions.toLocaleString('fr-FR'));
            }
        } else if (data.action === 'updateNearbyPlayers') {
            DebugLog(' Joueurs proches reçus:', data.players);
            renderNearbyPlayers(data.players || []);
        } else if (data.action === 'updateDashboardStats') {
            DebugLog(' Dashboard stats reçues:', data.stats);
            if (typeof updateDashboard === 'function') {
                updateDashboard(data.stats);
            }
        }
    });
    function updateCompanyName(label) {
        $('#companyName').text(label || _T('company'));
    }
    function updateDutyButton(isOnDuty) {
        const btn = $('#dutyToggleBtn');
        const text = $('#dutyBtnText');
        
        if (isOnDuty) {
            btn.addClass('on-duty');
            text.text(_T('go_off_duty'));
        } else {
            btn.removeClass('on-duty');
            text.text(_T('go_on_duty'));
        }
    }
    function updateLockOverlay(isOnDuty) {
        if (isOnDuty) {
            $('#lockOverlay').fadeOut(200);
            $('.nav-btn').removeClass('locked');
        } else {
            $('#lockOverlay').fadeIn(200);
            $('.nav-btn').addClass('locked');
        }
    }
    function updateGradesTabVisibility() {
        const gradesBtn = $('.nav-btn[data-tab="grades"]');
        if (companyData && companyData.permissions && !companyData.permissions.canEditGrades) {
            gradesBtn.addClass('disabled-tab');
            gradesBtn.attr('title', _T('no_permission_grades'));
        } else {
            gradesBtn.removeClass('disabled-tab');
            gradesBtn.removeAttr('title');
        }
    }
    function updateAccountsTabVisibility() {
        const accountsBtn = $('.nav-btn[data-tab="accounts"]');
        if (companyData && companyData.permissions && !companyData.permissions.canViewAccounts) {
            accountsBtn.addClass('disabled-tab');
            accountsBtn.attr('title', _T('no_permission_accounts'));
        } else {
            accountsBtn.removeClass('disabled-tab');
            accountsBtn.removeAttr('title');
        }
    }
    function updateHistoryTabVisibility() {
        const historyBtn = $('.nav-btn[data-tab="history"]');
        if (companyData && companyData.permissions && !companyData.permissions.canViewFullHistory) {
            historyBtn.addClass('disabled-tab');
            historyBtn.attr('title', _T('no_permission_history'));
        } else {
            historyBtn.removeClass('disabled-tab');
            historyBtn.removeAttr('title');
        }
    }
    function updateActionButtonsVisibility() {
        if (companyData && companyData.permissions && !companyData.permissions.canRecruit) {
            $('#recruitBtn').addClass('disabled-action').attr('title', _T('perm_recruit'));
        } else {
            $('#recruitBtn').removeClass('disabled-action').removeAttr('title');
        }
        if (companyData && companyData.permissions && !companyData.permissions.canManageMoney) {
            $('#depositBtn, #withdrawBtn').addClass('disabled-action').attr('title', _T('perm_manage_money'));
        } else {
            $('#depositBtn, #withdrawBtn').removeClass('disabled-action').removeAttr('title');
        }
        if (companyData && companyData.permissions && !companyData.permissions.canViewHistory) {
            $('#detailedHistoryBtn').addClass('disabled-action').attr('title', _T('perm_view_history'));
        } else {
            $('#detailedHistoryBtn').removeClass('disabled-action').removeAttr('title');
        }
        if (companyData && companyData.permissions && !companyData.permissions.canAccessInventory) {
            $('#storageBtn').addClass('disabled-action').attr('title', _T('perm_access_inventory'));
        } else {
            $('#storageBtn').removeClass('disabled-action').removeAttr('title');
        }
    }
    $('#dutyToggleBtn').click(function() {
        $.post('https://cactus_ultimate/toggleDuty', JSON.stringify({}));
    });
    function closeMenu() {
        $('#container').fadeOut(300);
        $.post('https://cactus_ultimate/closeMenu', JSON.stringify({}));
    }
    $('#closeBtn, .close-btn').click(function() {
        closeMenu();
    });
    $(document).keyup(function(e) {
        if (e.key === "Escape") {
            if ($('#currencyModal').is(':visible')) {
                $('#currencyModal').fadeOut(300);
                window.currentAction = null;
                return;
            }
            if ($('#detailedHistoryModal').is(':visible')) {
                $('#detailedHistoryModal').fadeOut(300);
                window.currentHistoryFilter = 'all';
                window.isLoadingHistory = false;
                window.isLoadingChart = false;
                return;
            }
            if ($('#bonusModal').is(':visible')) {
                $('#bonusModal').fadeOut(200);
                return;
            }
            if ($('#gradeManagementModal').is(':visible')) {
                $('#gradeManagementModal').fadeOut(300);
                return;
            }
            if ($('#container').is(':visible')) {
                closeMenu();
            }
        }
    });
    $('.nav-btn').click(function() {
        const tab = $(this).data('tab');
        if (tab === 'grades') {
            if (companyData && companyData.permissions && !companyData.permissions.canEditGrades) {
                showNotification(_T('no_permission_grades'), 'error', 4000);
                return;
            }
        }
        if (tab === 'accounts') {
            if (companyData && companyData.permissions && !companyData.permissions.canViewAccounts) {
                showNotification(_T('no_permission_accounts'), 'error', 4000);
                return;
            }
        }
        if (tab === 'history') {
            if (companyData && companyData.permissions && !companyData.permissions.canViewFullHistory) {
                showNotification(_T('no_permission_history'), 'error', 4000);
                return;
            }
        }
        
        $('.nav-btn').removeClass('active');
        $(this).addClass('active');
        
        $('.tab-content').removeClass('active');
        $(`#${tab}-tab`).addClass('active');

        if (tab === 'employees') {
            $.post('https://cactus_ultimate/getEmployees', JSON.stringify({}));
        } else if (tab === 'accounts') {
            $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
        } else if (tab === 'grades') {
            $.post('https://cactus_ultimate/getGrades', JSON.stringify({}));
        } else if (tab === 'dashboard') {
            requestDashboardStats();
        }
    });
    $('#searchEmployees').on('input', function() {
        const query = $(this).val().toLowerCase();
        const filtered = allEmployees.filter(e => 
            e.name.toLowerCase().includes(query) ||
            e.gradeName.toLowerCase().includes(query)
        );
        updateEmployeesList(filtered);
    });

    $('#employeesSearchClear').click(function() {
        $('#searchEmployees').val('');
        updateEmployeesList(allEmployees);
    });
    $('#viewGridBtn').click(function() {
        isListView = false;
        $('#viewGridBtn').addClass('active');
        $('#viewListBtn').removeClass('active');
        updateEmployeesList(allEmployees);
    });

    $('#viewListBtn').click(function() {
        isListView = true;
        $('#viewListBtn').addClass('active');
        $('#viewGridBtn').removeClass('active');
        updateEmployeesList(allEmployees);
    });

    function updatePlayerInfo(name, grade) {
        if (name !== null && name !== undefined) {
            currentPlayerName = name;
        }
        if (grade !== null && grade !== undefined) {
            currentGradeName = grade;
        }
        
        const displayName = currentPlayerName || _T('loading');
        const displayGrade = currentGradeName || _T('unknown_grade');
        
        $('#playerInfo').html(`${displayName} - ${displayGrade}`);
    }

    function updateEmployeesList(employees) {
        DebugLog(' updateEmployeesList appelée avec', employees ? employees.length : 0, 'employés');
        const container = $('#employeesList');
        container.empty();

        if (!employees || employees.length === 0) {
            container.html(`
                <div class="loading-state">
                    <img src="img/loading.png" class="loading-icon" alt="Loading">
                    <p>${_T('no_employees')}</p>
                </div>
            `);
            return;
        }
        if (isListView) {
            container.removeClass('members-grid-new').addClass('members-list-view');
            updateEmployeesListView(employees);
        } else {
            container.removeClass('members-list-view').addClass('members-grid-new');
            updateEmployeesGridView(employees);
            DebugLog(' Cartes d\'employés régénérées (vue grille)');
        }
        container[0].offsetHeight;
        DebugLog(' DOM rafraîchi - Nombre de cartes dans le conteneur:', container.children().length);
    }

    function activateAvatarImages() {
        $('#employeesList').find('img.avatar-img[data-src]').each(function() {
            const img = this;
            const url = img.getAttribute('data-src');
            if (!url) return;
            const fallback = img.nextElementSibling;
            function showImage() {
                img.style.display = '';
                if (fallback) fallback.style.display = 'none';
            }
            img.onload = showImage;
            img.src = url;
            img.removeAttribute('data-src');
            if (img.complete && img.naturalWidth > 0) {
                showImage();
            }
        });
    }

    function updateEmployeesGridView(employees) {
        const container = $('#employeesList');
        container.empty();

        employees.forEach((employee) => {
            DebugLog(' Création carte pour', employee.name, '- Grade:', employee.grade, 'GradeName:', employee.gradeName);
            const permissions = companyData?.permissions || {};
            
            const isSelf = (employee.charidentifier === myCharidentifier);
            
            const canFire = currentGrade > employee.grade 
                && (permissions.canFire !== false)
                && !isSelf;
            
            const canManage = (currentGrade > employee.grade && (permissions.canManage !== false))
                || (isSelf && permissions.canEditAvatars === true);
            const canSeeManage = canManage && (permissions.canSeeManageButton !== false || isSelf);
            const canSeeFire = canFire && (permissions.canSeeFireButton !== false);
            const canSeeBonus = currentGrade > employee.grade && (permissions.canSeeBonusButton === true) && !isSelf;
            
            const initial = employee.name.charAt(0).toUpperCase();
            const isOnline = employee.online !== false;
            let lastSeenText = _T('never_connected');
            if (employee.lastSeenTimestamp && employee.lastSeenTimestamp > 0) {
                const formatted = window.formatDateWithTimezone(employee.lastSeenTimestamp);
                lastSeenText = `${formatted.date} ${_T('at_time')} ${formatted.time}`;
            }

            const avatarHtml = employee.avatar && employee.avatar.trim() !== '' 
                ? `<img class="avatar-img" data-src="${employee.avatar}" alt="${employee.name}" referrerpolicy="no-referrer" style="display:none;">
                   <span class="member-initial-fallback">${initial}</span>`
                : `<span class="member-initial">${initial}</span>`;

            const card = $(`
                <div class="member-card-modern" data-identifier="${employee.identifier}">
                    <div class="member-avatar">
                        ${avatarHtml}
                        <div class="member-status ${isOnline ? 'online' : 'offline'}"></div>
                    </div>
                    <div class="member-details">
                        <div class="member-name-modern">${employee.name}</div>
                        <div class="member-position">${employee.gradeName}</div>
                        <div class="member-last-seen">${isOnline ? `<span style="color:#f5f3ee; font-weight:600">${_T('online')}</span>` : '<i class="fas fa-clock"></i> ' + lastSeenText}</div>
                    </div>
                    <div class="member-actions-modern">
                        ${canSeeManage ? `<button class="action-btn manage-btn" data-id="${employee.charidentifier}"><i class="fas fa-cog"></i> ${_T('manage_button')}</button>` : ''}
                        ${canSeeBonus ? `<button class="action-btn bonus-btn" data-id="${employee.charidentifier}" data-name="${employee.name}"><i class="fas fa-coins"></i> ${_T('bonus_button')}</button>` : ''}
                        ${canSeeFire ? `<button class="action-btn fire-btn" data-id="${employee.charidentifier}"><i class="fas fa-times-circle"></i> ${_T('fire_button')}</button>` : ''}
                        ${isSelf ? `<button class="action-btn resign-btn" data-id="${employee.charidentifier}"><i class="fas fa-sign-out-alt"></i> ${_T('resign_button')}</button>` : ''}
                    </div>
                </div>
            `);
            container.append(card);
        });
        
        activateAvatarImages();
        DebugLog(' Toutes les cartes ajoutées - Total dans DOM:', container.children().length);
    }

    function updateEmployeesListView(employees) {
        const container = $('#employeesList');

        employees.forEach((employee, index) => {
            const permissions = companyData?.permissions || {};
            
            const isSelf = (employee.charidentifier === myCharidentifier);
            
            const canFire = currentGrade > employee.grade 
                && (permissions.canFire !== false)
                && !isSelf;
                
            const canManage = (currentGrade > employee.grade && (permissions.canManage !== false))
                || (isSelf && permissions.canEditAvatars === true);
            const canSeeManage = canManage && (permissions.canSeeManageButton !== false || isSelf);
            const canSeeFire = canFire && (permissions.canSeeFireButton !== false);
            const canSeeBonus = currentGrade > employee.grade && (permissions.canSeeBonusButton === true) && !isSelf;
            
            const isOnline = employee.online !== false;
            let lastSeenText = _T('never_connected');
            if (employee.lastSeenTimestamp && employee.lastSeenTimestamp > 0) {
                const formatted = window.formatDateWithTimezone(employee.lastSeenTimestamp);
                lastSeenText = `${formatted.date} ${_T('at_time')} ${formatted.time}`;
            }

            const row = $(`
                <div class="member-row-list" data-identifier="${employee.identifier}">
                    <div class="member-id">${index + 1}</div>
                    <div class="member-avatar">
                        ${employee.avatar && employee.avatar.trim() !== '' 
                            ? `<img class="avatar-img" data-src="${employee.avatar}" alt="${employee.name}" referrerpolicy="no-referrer" style="display:none;">
                               <i class="fas fa-user member-avatar-placeholder"></i>`
                            : `<i class="fas fa-user member-avatar-placeholder"></i>`
                        }
                    </div>
                    <div class="member-info-inline">
                        <div class="member-name-inline">${employee.name}</div>
                        <div class="member-position-inline">${employee.gradeName}</div>
                    </div>
                    <div class="member-lastseen-inline">
                        ${isOnline 
                            ? `<i class="fas fa-circle" style="color: #f5f3ee; font-size: 0.6rem;"></i><span style="color: #f5f3ee; font-weight: 600;">${_T('online')}</span>`
                            : `<i class="fas fa-clock"></i><span>${lastSeenText}</span>`
                        }
                    </div>
                    <div class="member-actions-inline">
                        ${canSeeManage ? `<button class="action-btn-inline manage-btn" data-id="${employee.charidentifier}"><i class="fas fa-cog"></i> ${_T('manage_button')}</button>` : ''}
                        ${canSeeBonus ? `<button class="action-btn-inline bonus-btn" data-id="${employee.charidentifier}" data-name="${employee.name}"><i class="fas fa-coins"></i> ${_T('bonus_button')}</button>` : ''}
                        ${canSeeFire ? `<button class="action-btn-inline fire-btn" data-id="${employee.charidentifier}"><i class="fas fa-times-circle"></i> ${_T('fire_button')}</button>` : ''}
                        ${isSelf ? `<button class="action-btn-inline resign-btn" data-id="${employee.charidentifier}"><i class="fas fa-sign-out-alt"></i> ${_T('resign_button')}</button>` : ''}
                    </div>
                    <div class="member-status-indicator">
                        <div class="status-dot ${isOnline ? 'online' : 'offline'}"></div>
                    </div>
                </div>
            `);
            container.append(row);
        });
        
        activateAvatarImages();
    }

    function updateMoneyDisplay(data) {
        const money = data.money || 0;
        const formattedMoney = money.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        $('#company-money').text(formattedMoney + ' $');
        const gold = data.gold || 0;
        const formattedGold = gold.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        $('#company-gold').text(formattedGold);
        $('#statCurrentCash').text(formattedMoney + '$');
        $('#statCurrentGold').text(formattedGold);
        if (window.updateStorageMoney) {
            window.updateStorageMoney(money);
        }
        if (window.updateStorageGold) {
            window.updateStorageGold(gold);
        }
    }

    function updateBankHistory(history) {
        DebugLog(' updateBankHistory called with', history ? history.length : 0, 'entries');
        if (history && history.length > 0) {
            history.forEach((t, i) => {
                DebugLog(` Entry ${i}: type=${t.type}, amount=${t.amount}`);
            });
        }
        const containerSimple = $('#bankHistoryListSimple');
        containerSimple.empty();
        const containerModal = $('#bankHistoryListModal');
        containerModal.empty();

        if (!history || history.length === 0) {
            containerSimple.html(`
                <div class="history-empty">
                    <img src="img/bookcover.png" alt="${_T('empty')}" class="empty-icon-small">
                    <p>${_T('history_no_records')}</p>
                </div>
            `);
            containerModal.html(`
                <div class="history-empty">
                    <img src="img/bookcover.png" alt="${_T('empty')}" class="empty-icon">
                    <p>${_T('no_transactions')}</p>
                </div>
            `);
            return;
        }
        let totalDeposits = 0;
        let totalWithdraws = 0;
        
        history.forEach((transaction) => {
            const amount = parseFloat(transaction.amount) || 0;
            if (transaction.type === 'deposit' || transaction.type === 'deposit_gold' || transaction.type === 'register_sale') {
                totalDeposits += amount;
            } else if (transaction.type === 'withdraw' || transaction.type === 'withdraw_gold' || transaction.type === 'salary') {
                totalWithdraws += amount;
            }
        });
        
        const balance = totalDeposits - totalWithdraws;
        $('#totalDepositsModal').text(formatMoney(totalDeposits));
        $('#totalWithdrawsModal').text(formatMoney(totalWithdraws));
        $('#totalBalanceModal').text(formatMoney(balance));
        const recentHistory = history.slice(0, 5);
        recentHistory.forEach((transaction) => {
            let typeText = '';
            let typeClass = '';
            let typeIcon = '';
            
            if (transaction.type === 'deposit') {
                typeText = _T('history_deposit');
                typeClass = 'history-simple-deposit';
                typeIcon = 'img/plus.png';
            } else if (transaction.type === 'deposit_gold') {
                typeText = _T('history_deposit_gold');
                typeClass = 'history-simple-deposit';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'withdraw') {
                typeText = _T('history_withdraw');
                typeClass = 'history-simple-withdraw';
                typeIcon = 'img/dollar.png';
            } else if (transaction.type === 'withdraw_gold') {
                typeText = _T('history_withdraw_gold');
                typeClass = 'history-simple-withdraw';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'salary') {
                typeText = _T('history_salary');
                typeClass = 'history-simple-salary';
                typeIcon = 'img/salary.png';
            } else if (transaction.type === 'upgrade_storage') {
                typeText = _T('history_upgrade_storage');
                typeClass = 'history-simple-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'upgrade_storage_gold') {
                typeText = _T('history_upgrade_storage_gold');
                typeClass = 'history-simple-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'bonus') {
                typeText = _T('history_bonus');
                typeClass = 'history-simple-bonus';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'register_sale') {
                typeText = _T('history_register_sale');
                typeClass = 'history-simple-deposit';
                typeIcon = 'img/dollar.png';
            }
            
            const playerName = transaction.playerName || _T('information');
            const amount = parseFloat(transaction.amount) || 0;
            const valueClass = (transaction.type === 'deposit' || transaction.type === 'deposit_gold' || transaction.type === 'register_sale') ? 'history-value-positive' : 'history-value-negative';
            const valuePrefix = (transaction.type === 'deposit' || transaction.type === 'deposit_gold' || transaction.type === 'register_sale') ? '+' : '-';
            const isGoldTransaction = transaction.type.includes('gold');
            let dateStr = '';
            if (transaction.date) {
                const dateParts = transaction.date.split(' ');
                dateStr = dateParts[0] || '';
            }

            const rowSimple = $(`
                <div class="history-row-simple">
                    <div class="history-simple-type ${typeClass}">
                        <img src="${typeIcon}" alt="${typeText}" class="history-simple-icon">
                        <span>${typeText}</span>
                    </div>
                    <div class="history-simple-player">${playerName}</div>
                    <div class="history-simple-amount ${valueClass}">
                        ${valuePrefix}${formatCurrency(Math.abs(amount), isGoldTransaction)}
                    </div>
                    <div class="history-simple-date">${dateStr}</div>
                </div>
            `);
            containerSimple.append(rowSimple);
        });
        history.forEach((transaction) => {
            let typeText = '';
            let typeClass = '';
            let typeIcon = '';
            
            if (transaction.type === 'deposit') {
                typeText = _T('history_deposit');
                typeClass = 'history-type-deposit';
                typeIcon = 'img/plus.png';
            } else if (transaction.type === 'deposit_gold') {
                typeText = _T('history_deposit_gold');
                typeClass = 'history-type-deposit';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'withdraw') {
                typeText = _T('history_withdraw');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/dollar.png';
            } else if (transaction.type === 'withdraw_gold') {
                typeText = _T('history_withdraw_gold');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'salary') {
                typeText = _T('history_salary');
                typeClass = 'history-type-salary';
                typeIcon = 'img/salary.png';
            } else if (transaction.type === 'upgrade_storage') {
                typeText = _T('history_upgrade_storage');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'upgrade_storage_gold') {
                typeText = _T('history_upgrade_storage_gold');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'bonus') {
                typeText = _T('history_bonus');
                typeClass = 'history-type-bonus';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'register_sale') {
                typeText = _T('history_register_sale');
                typeClass = 'history-type-deposit';
                typeIcon = 'img/dollar.png';
            } else {
                typeText = _T('other');
                typeClass = 'history-type-other';
                typeIcon = 'img/book.png';
            }
            
            const playerName = transaction.playerName || _T('system');
            const playerGrade = transaction.playerGrade || '';
            const amount = parseFloat(transaction.amount) || 0;
            const valueClass = (transaction.type === 'deposit' || transaction.type === 'deposit_gold' || transaction.type === 'register_sale') ? 'history-value-positive' : 'history-value-negative';
            const valuePrefix = (transaction.type === 'deposit' || transaction.type === 'deposit_gold' || transaction.type === 'register_sale') ? '+' : '-';
            const isGoldTransaction = transaction.type.includes('gold');
            let dateStr = '';
            let timeStr = '';
            if (transaction.date) {
                const dateParts = transaction.date.split(' ');
                dateStr = dateParts[0] || '';
                timeStr = dateParts[1] || '';
            }

            const row = $(`
                <div class="history-row" data-type="${transaction.type}">
                    <div class="history-col-type ${typeClass}">
                        <img src="${typeIcon}" alt="${typeText}" class="history-type-icon">
                        <span class="history-type-text">${typeText}</span>
                    </div>
                    <div class="history-col-player">
                        <span class="history-player-name">${playerName}</span>
                        ${playerGrade ? `<span class="history-player-grade">${playerGrade}</span>` : ''}
                    </div>
                    <div class="history-col-value ${valueClass}">
                        ${valuePrefix}${formatCurrency(Math.abs(amount), isGoldTransaction)}
                    </div>
                    <div class="history-col-date">
                        <span class="history-date">${dateStr}</span>
                        <span class="history-time">${timeStr}</span>
                    </div>
                </div>
            `);
            containerModal.append(row);
        });
    }
    function renderFilteredHistory(history, filterType) {
        const containerModal = $('#bankHistoryListModal');
        containerModal.empty();
        
        if (!history || history.length === 0) {
            containerModal.html(`
                <div class="history-empty">
                    <img src="img/bookcover.png" alt="${_T('empty')}" class="empty-icon">
                    <p>${_T('no_transactions')}</p>
                </div>
            `);
            return;
        }
        history.forEach((transaction) => {
            let typeText = '';
            let typeClass = '';
            let typeIcon = '';
            
            if (transaction.type === 'deposit') {
                typeText = _T('history_deposit');
                typeClass = 'history-type-deposit';
                typeIcon = 'img/plus.png';
            } else if (transaction.type === 'deposit_gold') {
                typeText = _T('history_deposit_gold');
                typeClass = 'history-type-deposit';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'withdraw') {
                typeText = _T('history_withdraw');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/dollar.png';
            } else if (transaction.type === 'withdraw_gold') {
                typeText = _T('history_withdraw_gold');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/gold.png';
            } else if (transaction.type === 'salary') {
                typeText = _T('history_salary');
                typeClass = 'history-type-salary';
                typeIcon = 'img/salary.png';
            } else if (transaction.type === 'upgrade_storage') {
                typeText = _T('history_upgrade_storage');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'upgrade_storage_gold') {
                typeText = _T('history_upgrade_storage_gold');
                typeClass = 'history-type-withdraw';
                typeIcon = 'img/chest.png';
            } else if (transaction.type === 'bonus') {
                typeText = _T('history_bonus');
                typeClass = 'history-type-bonus';
                typeIcon = 'img/gold.png';
            } else {
                typeText = _T('other');
                typeClass = 'history-type-other';
                typeIcon = 'img/book.png';
            }
            
            const playerName = transaction.playerName || _T('system');
            const amount = parseFloat(transaction.amount) || 0;
            const valueClass = (transaction.type === 'deposit' || transaction.type === 'deposit_gold') ? 'history-value-positive' : 'history-value-negative';
            const valuePrefix = (transaction.type === 'deposit' || transaction.type === 'deposit_gold') ? '+' : '-';
            const isGoldTransaction = transaction.type.includes('gold');
            let dateStr = '';
            let timeStr = '';
            if (transaction.date) {
                const dateParts = transaction.date.split(' ');
                dateStr = dateParts[0] || '';
                timeStr = dateParts[1] || '';
            }

            const row = $(`
                <div class="history-row" data-type="${transaction.type}">
                    <div class="history-col-type ${typeClass}">
                        <img src="${typeIcon}" alt="${typeText}" class="history-type-icon">
                        <span class="history-type-text">${typeText}</span>
                    </div>
                    <div class="history-col-player">
                        <span class="history-player-name">${playerName}</span>
                    </div>
                    <div class="history-col-value ${valueClass}">
                        ${valuePrefix}${formatCurrency(Math.abs(amount), isGoldTransaction)}
                    </div>
                    <div class="history-col-date">
                        <span class="history-date">${dateStr}</span>
                        <span class="history-time">${timeStr}</span>
                    </div>
                </div>
            `);
            containerModal.append(row);
        });
        
        DebugLog(' Rendered', history.length, 'filtered history entries for filter:', filterType);
    }
    $('#detailedHistoryBtn').off('click').on('click', function() {
        if (companyData && companyData.permissions && !companyData.permissions.canViewHistory) {
            showNotification(_T('perm_view_history'), 'error', 4000);
            return;
        }
        currentHistoryFilter = 'all';
        $('.filter-btn').removeClass('active');
        $('.filter-btn[data-filter="all"]').addClass('active');
        $('.history-tab').removeClass('active');
        $('.history-tab[data-tab="list"]').addClass('active');
        $('#historyListTab').show();
        $('#historyChartTab').hide();
        
        $('#detailedHistoryModal').fadeIn(300);
    });
    $('#closeHistoryModal').off('click').on('click', function() {
        $('#detailedHistoryModal').fadeOut(300);
        currentHistoryFilter = 'all';
        isLoadingHistory = false;
        isLoadingChart = false;
    });
    $('.history-modal-overlay').off('click').on('click', function() {
        $('#detailedHistoryModal').fadeOut(300);
        currentHistoryFilter = 'all';
        isLoadingHistory = false;
        isLoadingChart = false;
    });
    let currentHistoryFilter = 'all';
    let isLoadingHistory = false;
    
    $('.filter-btn').off('click').on('click', function() {
        const filter = $(this).data('filter');
        if (isLoadingHistory || filter === currentHistoryFilter) return;
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        
        currentHistoryFilter = filter;
        isLoadingHistory = true;
        $('#bankHistoryListModal').html(`
            <div class="history-loading">
                <p>${_T('loading') || 'Chargement...'}</p>
            </div>
        `);
        DebugLog(' Requesting filtered history:', filter);
        $.post('https://cactus_ultimate/requestFilteredHistory', JSON.stringify({ filterType: filter }));
    });
    
    $('.history-tab').off('click').on('click', function() {
        const tab = $(this).data('tab');
        $('.history-tab').removeClass('active');
        $(this).addClass('active');
        if (tab === 'list') {
            $('#historyListTab').show();
            $('#historyChartTab').hide();
        } else if (tab === 'chart') {
            $('#historyListTab').hide();
            $('#historyChartTab').show();
            requestChartData();
        }
    });
    $('.chart-type-btn').off('click').on('click', function() {
        const type = $(this).data('type');
        if (type === currentChartType || isLoadingChart) return;
        
        $('.chart-type-btn').removeClass('active');
        $(this).addClass('active');
        
        currentChartType = type;
        requestChartData();
    });
    $('.chart-period-btn').off('click').on('click', function() {
        const period = parseInt($(this).data('period'));
        if (period === currentChartPeriod || isLoadingChart) return;
        
        $('.chart-period-btn').removeClass('active');
        $(this).addClass('active');
        
        currentChartPeriod = period;
        requestChartData();
    });
    $('#detailedModeToggle').off('change').on('change', function() {
        isDetailedMode = $(this).is(':checked');
        DebugLog(' Detailed mode:', isDetailedMode);
        if (isDetailedMode) {
            $('.legend-salaries, .legend-bonuses, .legend-upgrades').show();
        } else {
            $('.legend-salaries, .legend-bonuses, .legend-upgrades').hide();
        }
        
        requestChartData();
    });
    function requestChartData() {
        isLoadingChart = true;
        DebugLog(' Requesting chart data:', currentChartType, currentChartPeriod, 'detailed:', isDetailedMode);
        $.post('https://cactus_ultimate/requestChartData', JSON.stringify({ 
            chartType: currentChartType, 
            period: currentChartPeriod,
            detailed: isDetailedMode
        }));
    }
    function updateChart(chartData, chartType) {
        const ctx = document.getElementById('historyChart');
        if (!ctx) return;
        const colors = chartType === 'gold' ? {
            deposits: { bg: 'rgba(154, 148, 138, 0.3)', border: '#9a948a' },
            withdrawals: { bg: 'rgba(203, 1, 1, 0.3)', border: '#cb0101' },
            balance: { bg: 'rgba(107, 102, 94, 0.1)', border: '#6b665e' },
            salaries: { bg: 'rgba(154, 148, 138, 0.2)', border: '#9a948a' },
            bonuses: { bg: 'rgba(165, 1, 1, 0.2)', border: '#a50101' },
            upgrades: { bg: 'rgba(156, 163, 175, 0.2)', border: '#9ca3af' }
        } : {
            deposits: { bg: 'rgba(245, 243, 238, 0.3)', border: '#f5f3ee' },
            withdrawals: { bg: 'rgba(203, 1, 1, 0.3)', border: '#cb0101' },
            balance: { bg: 'rgba(107, 102, 94, 0.1)', border: '#6b665e' },
            salaries: { bg: 'rgba(154, 148, 138, 0.2)', border: '#9a948a' },
            bonuses: { bg: 'rgba(165, 1, 1, 0.2)', border: '#a50101' },
            upgrades: { bg: 'rgba(156, 163, 175, 0.2)', border: '#9ca3af' }
        };
        if (historyChart) {
            historyChart.destroy();
        }
        const datasets = [
            {
                label: _T('legend_balance') || 'Solde',
                data: chartData.balance || [],
                borderColor: colors.balance.border,
                backgroundColor: colors.balance.bg,
                fill: true,
                tension: 0.3,
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: colors.balance.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 2,
                order: 0 
            },
            {
                label: _T('legend_deposits') || 'Dépôts',
                data: chartData.deposits || [],
                borderColor: colors.deposits.border,
                backgroundColor: colors.deposits.bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colors.deposits.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 2,
                order: 1
            },
            {
                label: _T('legend_withdrawals') || 'Retraits',
                data: chartData.withdrawals || [],
                borderColor: colors.withdrawals.border,
                backgroundColor: colors.withdrawals.bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: colors.withdrawals.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 2,
                order: 2
            }
        ];
        if (isDetailedMode && chartData.salaries) {
            datasets.push({
                label: _T('legend_salaries') || 'Salaires',
                data: chartData.salaries || [],
                borderColor: colors.salaries.border,
                backgroundColor: colors.salaries.bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5], 
                pointRadius: 3,
                pointBackgroundColor: colors.salaries.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 1,
                order: 3
            });
        }
        
        if (isDetailedMode && chartData.bonuses) {
            datasets.push({
                label: _T('legend_bonuses') || 'Bonus',
                data: chartData.bonuses || [],
                borderColor: colors.bonuses.border,
                backgroundColor: colors.bonuses.bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointBackgroundColor: colors.bonuses.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 1,
                order: 4
            });
        }
        
        if (isDetailedMode && chartData.upgrades) {
            datasets.push({
                label: _T('legend_upgrades') || 'Améliorations',
                data: chartData.upgrades || [],
                borderColor: colors.upgrades.border,
                backgroundColor: colors.upgrades.bg,
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 3,
                pointBackgroundColor: colors.upgrades.border,
                pointBorderColor: '#1a1a1a',
                pointBorderWidth: 1,
                order: 5
            });
        }
        const detailedLegend = document.querySelector('.chart-legend-detailed');
        if (detailedLegend) {
            detailedLegend.style.display = isDetailedMode ? 'flex' : 'none';
        }
        historyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels || [],
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        bottom: 10,
                        top: 10
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: true,
                        position: 'nearest',
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        titleColor: '#fff',
                        bodyColor: 'rgba(255, 255, 255, 0.8)',
                        borderColor: 'rgba(107, 102, 94, 0.5)',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        caretSize: 8,
                        caretPadding: 10,
                        titleFont: {
                            family: "'Crock', 'Hapna', sans-serif",
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            family: "'Crock', 'Hapna', sans-serif",
                            size: 12
                        },
                        displayColors: true,
                        boxWidth: 12,
                        boxHeight: 12,
                        boxPadding: 4,
                        callbacks: {
                            label: function(context) {
                                const value = context.parsed.y || 0;
                                const suffix = chartType === 'gold' ? (' ' + (_T('gold_suffix') || 'gold')) : '$';
                                return context.dataset.label + ': ' + value.toLocaleString('fr-FR') + suffix;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            font: {
                                family: "'Crock', 'Hapna', sans-serif",
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grace: '5%',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.5)',
                            font: {
                                family: "'Crock', 'Hapna', sans-serif",
                                size: 11
                            },
                            callback: function(value) {
                                const suffix = chartType === 'gold' ? '' : '$';
                                if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'k' + suffix;
                                }
                                return value + suffix;
                            }
                        },
                        title: {
                            display: false
                        }
                    }
                }
            }
        });
        
        DebugLog(' Chart updated with', chartData.labels.length, 'data points, detailed mode:', isDetailedMode);
    }
    function formatMoney(amount) {
        return amount.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + '$';
    }

    function formatCurrency(amount, isGold) {
        const formatted = amount.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return isGold ? formatted : formatted + '$';
    }
    let currentAction = null; 

    $('#depositBtn').off('click').on('click', function() {
        if (!onDuty) return;
        const canMoney = companyData && companyData.permissions && companyData.permissions.canManageMoney;
        const canGold = companyData && companyData.permissions && companyData.permissions.canManageGold;
        
        if (!canMoney && !canGold) {
            showNotification(_T('no_permission_money_gold'), 'error', 4000);
            return;
        }
        
        currentAction = 'deposit';
        $('#currencyModalTitle').text(_T('deposit'));
        $('#currencyAmount').val('');
        $('#currencyModal').fadeIn(300);
    });

    $('#withdrawBtn').off('click').on('click', function() {
        if (!onDuty) return;
        const canMoney = companyData && companyData.permissions && companyData.permissions.canManageMoney;
        const canGold = companyData && companyData.permissions && companyData.permissions.canManageGold;
        
        if (!canMoney && !canGold) {
            showNotification(_T('perm_manage_money'), 'error', 4000);
            return;
        }
        
        currentAction = 'withdraw';
        $('#currencyModalTitle').text(_T('withdraw'));
        $('#currencyAmount').val('');
        $('#currencyModal').fadeIn(300);
    });
    $('#closeCurrencyModal').off('click').on('click', function() {
        $('#currencyModal').fadeOut(300);
        currentAction = null;
    });
    $('#selectMoney').off('click').on('click', function() {
        if (companyData && companyData.permissions && !companyData.permissions.canManageMoney) {
            showNotification(_T('perm_manage_money'), 'error', 4000);
            return;
        }
        
        const amount = parseInt($('#currencyAmount').val());
        if (!amount || amount <= 0) {
            showAlert(_T('invalid_amount'));
            return;
        }
        
        if (currentAction === 'deposit') {
            $.post('https://cactus_ultimate/depositMoney', JSON.stringify({ amount }), function() {
                setTimeout(function() {
                    $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                }, 200);
            });
        } else if (currentAction === 'withdraw') {
            $.post('https://cactus_ultimate/withdrawMoney', JSON.stringify({ amount }), function() {
                setTimeout(function() {
                    $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                }, 200);
            });
        }
        
        $('#currencyModal').fadeOut(300);
        currentAction = null;
    });
    $('#selectGold').off('click').on('click', function() {
        if (companyData && companyData.permissions && !companyData.permissions.canManageGold) {
            showNotification(_T('no_permission_gold'), 'error', 4000);
            return;
        }
        
        const amount = parseInt($('#currencyAmount').val());
        if (!amount || amount <= 0) {
            showAlert(_T('invalid_amount'));
            return;
        }
        
        if (currentAction === 'deposit') {
            $.post('https://cactus_ultimate/depositGold', JSON.stringify({ amount }), function() {
                setTimeout(function() {
                    $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                }, 200);
            });
        } else if (currentAction === 'withdraw') {
            $.post('https://cactus_ultimate/withdrawGold', JSON.stringify({ amount }), function() {
                setTimeout(function() {
                    $.post('https://cactus_ultimate/getCompanyData', JSON.stringify({}));
                }, 200);
            });
        }
        
        $('#currencyModal').fadeOut(300);
        currentAction = null;
    });

    function updateSalariesList(grades) {
        const container = $('#salary-list');
        container.empty();

        if (!grades) {
            container.html(`
                <div class="loading-state">
                    <p>${_T('no_grades_configured')}</p>
                </div>
            `);
            return;
        }
        const gradesArray = [];
        for (let gradeLevel in grades) {
            gradesArray.push({
                level: parseInt(gradeLevel),
                name: grades[gradeLevel].name,
                salary: grades[gradeLevel].salary
            });
        }

        if (gradesArray.length === 0) {
            container.html(`
                <div class="loading-state">
                    <p>${_T('no_grades_configured')}</p>
                </div>
            `);
            return;
        }
        gradesArray.sort((a, b) => a.level - b.level);

        gradesArray.forEach((grade) => {
            const card = $(`
                <div class="grade-card">
                    <div class="grade-number">${grade.level}</div>
                    <div class="grade-info">
                        <div class="grade-name">${grade.name}</div>
                        <div class="grade-salary">$${grade.salary}</div>
                    </div>
                </div>
            `);
            container.append(card);
        });
    }

    function updatePlayersList(players) {
        const container = $('#nearbyPlayersList');
        container.empty();

        if (players.length === 0) {
            container.html(`
                <div class="recruit-loading">
                    <div class="recruit-loading-text">${_T('no_players_nearby')}</div>
                </div>
            `);
            return;
        }

        players.forEach((player) => {
            const card = $(`
                <div class="player-card">
                    <div class="player-info">
                        <div class="player-name">${player.name}</div>
                        <div class="player-job">${player.job || 'Sans emploi'}</div>
                    </div>
                    <div class="player-actions">
                        <button class="action-btn hire-btn" onclick="hirePlayer(${player.serverId})">
                            <i class="fas fa-user-plus"></i> Recruter
                        </button>
                    </div>
                </div>
            `);
            container.append(card);
        });
    }
    window.depositMoney = function() {
        const amount = parseInt($('#deposit-amount').val());
        if (amount && amount > 0) {
            $.post('https://cactus_ultimate/depositMoney', JSON.stringify({
                amount: amount
            }));
            $('#deposit-amount').val('');
        }
    };

    window.withdrawMoney = function() {
        const amount = parseInt($('#withdraw-amount').val());
        if (amount && amount > 0) {
            $.post('https://cactus_ultimate/withdrawMoney', JSON.stringify({
                amount: amount
            }));
            $('#withdraw-amount').val('');
        }
    };

    window.openEmployeeModal = function(charidentifier) {
        const employee = allEmployees.find(e => e.charidentifier === charidentifier);
        if (!employee) {
            DebugLog('ERREUR: Employé non trouvé avec charidentifier:', charidentifier);
            return;
        }

        const isSelf = (charidentifier === myCharidentifier);

        $('#employeeGradeSelect').empty();
        
        DebugLog(' Ouverture modal pour:', employee);
        DebugLog(' Est soi-même?', isSelf);
        DebugLog(' Données entreprise:', companyData);
        DebugLog(' companyData existe?', !!companyData);
        DebugLog(' companyData.grades existe?', !!(companyData && companyData.grades));
        $('#employeeNameDisplay').text(employee.name);
        const currentAvatar = employee.avatar || '';
        $('#memberAvatarInput').val(currentAvatar);
        if (currentAvatar && currentAvatar.trim() !== '') {
            updateAvatarPreview(currentAvatar);
        } else {
            $('#memberAvatarPreview').removeClass('show').html('');
        }
        const canEditAvatars = companyData && companyData.permissions && companyData.permissions.canEditAvatars;
        if (!canEditAvatars) {
            $('#memberAvatarInput').prop('disabled', true).addClass('disabled');
            $('#memberAvatarInput').attr('placeholder', _T('no_permission_avatars'));
        } else {
            $('#memberAvatarInput').prop('disabled', false).removeClass('disabled');
            $('#memberAvatarInput').attr('placeholder', 'URL');
        }
        
        const canManageGrade = companyData && companyData.permissions && companyData.permissions.canManageEmployeeGrade && !isSelf;
        if (!canManageGrade) {
            $('#employeeGradeSelect').prop('disabled', true).addClass('disabled');
        } else {
            $('#employeeGradeSelect').prop('disabled', false).removeClass('disabled');
        }
        
        let lastSeenText = _T('never_connected');
        let lastSeenIcon = 'fa-clock';
        
        if (employee.online) {
            lastSeenText = _T('online');
            lastSeenIcon = 'fa-circle';
            $('#employeeLastSeenDisplay').html(`<i class="fas ${lastSeenIcon}" style="color: #f5f3ee;"></i><span style="color: #f5f3ee;">${lastSeenText}</span>`);
        } else {
            if (employee.lastSeenTimestamp && employee.lastSeenTimestamp > 0) {
                const formatted = window.formatDateWithTimezone(employee.lastSeenTimestamp);
                lastSeenText = `${formatted.date} ${_T('at_time')} ${formatted.time}`;
            }
            $('#employeeLastSeenDisplay').html(`<i class="fas ${lastSeenIcon}"></i><span>${lastSeenText}</span>`);
        }
        
        if (!companyData || !companyData.grades) {
            DebugLog('ERREUR: companyData ou grades manquant!');
            $.post('https://cactus_ultimate/refresh', JSON.stringify({}));
            return;
        }
        
        if (companyData && companyData.grades) {
            const gradesArray = [];
            for (let gradeLevel in companyData.grades) {
                gradesArray.push({
                    level: parseInt(gradeLevel),
                    name: companyData.grades[gradeLevel].name,
                    salary: companyData.grades[gradeLevel].salary
                });
            }
            gradesArray.sort((a, b) => a.level - b.level);
            
            DebugLog(' Grades disponibles:', gradesArray);
            gradesArray.forEach((grade) => {
                if (grade.level <= currentGrade) {
                    $('#employeeGradeSelect').append(`
                        <option value="${grade.level}" ${grade.level === employee.grade ? 'selected' : ''}>
                            ${grade.name}
                        </option>
                    `);
                }
            });
            $('#employeeManageModal').data('identifier', employee.identifier);
            $('#employeeManageModal').data('charidentifier', employee.charidentifier);
            $('#employeeManageModal').data('currentGrade', employee.grade);
            $('#employeeManageModal').data('currentAvatar', currentAvatar);
            $('#employeeManageModal').data('isSelf', isSelf);
            
            if (isSelf) {
                $('#fireEmployeeBtn').hide();
                $('#resignEmployeeBtn').show().text(_T('resign_button'));
            } else {
                $('#fireEmployeeBtn').show().text(_T('fire_button'));
                $('#resignEmployeeBtn').hide();
            }
            
            $('#employeeManageModal').fadeIn(300);
        }
    };
    function updateAvatarPreview(url) {
        const preview = $('#memberAvatarPreview');
        if (!url || url.trim() === '') {
            preview.removeClass('show').html('');
            return;
        }
        if (!url.match(/^https?:\/\//i)) {
            preview.removeClass('show').html('');
            return;
        }
        
        preview.addClass('show').html(`
            <img src="${url}" alt="Avatar" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.parentElement.innerHTML='<i class=\\'fas fa-user member-avatar-preview-placeholder\\'></i>';">
        `);
    }
    $(document).off('input.avatarPreview').on('input.avatarPreview', '#memberAvatarInput', function() {
        updateAvatarPreview($(this).val());
    });
    $('#recruitBtn').off('click').on('click', function() {
        if (!onDuty) return;
        if (companyData && companyData.permissions && !companyData.permissions.canRecruit) {
            showNotification(_T('no_permission_recruit'), 'error', 4000);
            return;
        }
        $('#recruitModal').fadeIn(300);
        $.post('https://cactus_ultimate/refreshNearbyPlayers', JSON.stringify({}));
    });
    $('#closeRecruitModalBtn').off('click').on('click', function() {
        $('#recruitModal').fadeOut(300);
    });
    $('#refreshNearbyBtn').off('click').on('click', function() {
        $.post('https://cactus_ultimate/getNearbyPlayers', JSON.stringify({}));
    });
    $('#storageBtn').off('click').on('click', function() {
        if (!onDuty) return;
        if (companyData && companyData.permissions && !companyData.permissions.canAccessInventory) {
            return;
        }
        
        $.post('https://cactus_ultimate/openInventory', JSON.stringify({}));
    });
    $('#closeRecruitModalBtn, #recruitModal .member-modal-overlay').off('click').on('click', function() {
        $('#recruitModal').fadeOut(300);
    });
    $('#closeEmployeeModalBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('#modalLoadingOverlay').hide();
        $('#employeeManageModal').fadeOut(300);
    });
    $(document).off('click.employeeOverlay').on('click.employeeOverlay', '#employeeManageModal .member-modal-overlay', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $('#modalLoadingOverlay').hide();
        $('#employeeManageModal').fadeOut(300);
    });
    $(document).off('keyup.employeeModal').on('keyup.employeeModal', function(e) {
        if (e.key === "Escape" && $('#employeeManageModal').is(':visible')) {
            $('#employeeManageModal').fadeOut(300);
        }
    });

    $('#saveEmployeeBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        DebugLog(' Bouton Sauvegarder cliqué');
        
        const identifier = $('#employeeManageModal').data('identifier');
        const charidentifier = $('#employeeManageModal').data('charidentifier');
        const currentGrade = parseInt($('#employeeManageModal').data('currentGrade'));
        const newGrade = parseInt($('#employeeGradeSelect').val());
        const newAvatar = $('#memberAvatarInput').val().trim();
        const currentAvatar = $('#employeeManageModal').data('currentAvatar') || '';
        
        DebugLog(' Données:', {
            identifier: identifier,
            charidentifier: charidentifier,
            currentGrade: currentGrade,
            newGrade: newGrade,
            currentAvatar: currentAvatar,
            newAvatar: newAvatar
        });
        
        let gradeChanged = false;
        let avatarChanged = false;
        if (newGrade !== currentGrade) {
            gradeChanged = true;
            DebugLog(' Grade changé:', currentGrade, '->', newGrade);
            $('#modalLoadingOverlay').css('display', 'flex').hide().fadeIn(200);
            
            $.post('https://cactus_ultimate/setEmployeeGrade', JSON.stringify({
                charidentifier: charidentifier,
                grade: newGrade
            }));
        }
        if (newAvatar !== currentAvatar) {
            avatarChanged = true;
            DebugLog(' Avatar changé:', currentAvatar, '->', newAvatar);
            if (newAvatar === '' || (newAvatar.length >= 15 && newAvatar.match(/^https?:\/\//i))) {
                if (!gradeChanged) {
                    $('#modalLoadingOverlay').css('display', 'flex').hide().fadeIn(200);
                }
                
                $.post('https://cactus_ultimate/updateMemberAvatar', JSON.stringify({
                    identifier: identifier,
                    charidentifier: charidentifier,
                    avatarUrl: newAvatar
                }));
            } else {
                showNotification(_T('invalid_avatar_url'), 'error', 4000);
                return;
            }
        }
        if (!gradeChanged && !avatarChanged) {
            showNotification(_T('no_changes'), 'info', 3000);
            $('#employeeManageModal').fadeOut(300);
        } else {
            setTimeout(function() {
                $('#modalLoadingOverlay').fadeOut(200);
                $('#employeeManageModal').fadeOut(300);
            }, 1200);
        }
    });

    $('#fireEmployeeBtn').click(function() {
        const identifier = $('#employeeManageModal').data('identifier');
        
        showConfirm(_T('confirm_fire'), function() {
            $.post('https://cactus_ultimate/fireEmployee', JSON.stringify({
                identifier: identifier
            }));
            
            $('#employeeManageModal').fadeOut(300);
        });
    });

    $('#resignEmployeeBtn').click(function() {
        showConfirm(_T('resign_confirm'), function() {
            $.post('https://cactus_ultimate/resign', JSON.stringify({}));
            $('#employeeManageModal').fadeOut(300);
            setTimeout(function() {
                closeMenu();
            }, 500);
        });
    });

    window.hirePlayer = function(serverId) {
        var defaultGrade = (companyData && companyData.defaultRecruitGrade !== undefined) ? companyData.defaultRecruitGrade : 0;
        $.post('https://cactus_ultimate/hirePlayer', JSON.stringify({
            serverId: serverId,
            grade: defaultGrade
        }));
    };

    function showNotification(message, type = 'default', duration = 4000) {
        const container = $('#notificationContainer');
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        else if (type === 'error') icon = 'fa-exclamation-circle';
        else if (type === 'info') icon = 'fa-info-circle';
        
        const notification = $(`
            <div class="notification ${type}">
                <div class="notification-content">
                    <i class="fas ${icon} notification-icon"></i>
                    <span class="notification-text">${message}</span>
                </div>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `);
        
        container.append(notification);
        notification.find('.notification-close').click(function() {
            notification.addClass('fade-out');
            setTimeout(() => notification.remove(), 300);
        });
        setTimeout(() => {
            notification.addClass('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (data.action === 'showNotification') {
            showNotification(data.message, data.type || 'default', data.duration || 4000);
        } else if (data.action === 'setNotificationPosition') {
            notificationPosition = data.position || 'top-right';
            $('#notificationContainer').removeClass().addClass('notification-container ' + notificationPosition);
        } else if (data.action === 'setDateConfig') {
            window.dateTimezone = data.timezone || 'Europe/Paris';
            window.dateFormat = data.dateFormat || 'EU';
            DebugLog('Date config set - Timezone:', window.dateTimezone, 'Format:', window.dateFormat);
        } else if (data.action === 'updateStorageSlots') {
            if (typeof updateStorageSlots === 'function') {
                updateStorageSlots(data.slots || 5);
            }
        }
    });

    function showJobOffer(data) {
        currentJobOffer = data;
        
        $('#jobOfferTitle').text(_T('job_offer'));
        $('#jobOfferCompany').text(data.companyLabel);
        $('#jobOfferGrade').text(data.gradeName);
        $('#jobOfferSalary').text('$' + data.salary);
        $('#jobOfferRecruiter').text(data.recruiterName);
        $('#jobOfferAcceptText').text(_T('accept'));
        $('#jobOfferRefuseText').text(_T('refuse'));
        
        $('#jobOfferOverlay').fadeIn(300);
        let timeLeft = Math.floor((data.timeout || 30000) / 1000);
        $('#jobOfferTimer').text(timeLeft);
        
        jobOfferTimer = setInterval(() => {
            timeLeft--;
            $('#jobOfferTimer').text(timeLeft);
            
            if (timeLeft <= 0) {
                clearInterval(jobOfferTimer);
                closeJobOffer(false);
            }
        }, 1000);
    }

    function closeJobOffer(accepted) {
        if (jobOfferTimer) {
            clearInterval(jobOfferTimer);
            jobOfferTimer = null;
        }
        
        $('#jobOfferOverlay').fadeOut(300);
        
        if (currentJobOffer) {
            $.post('https://cactus_ultimate/jobOfferResponse', JSON.stringify({
                accepted: accepted,
                offerId: currentJobOffer.offerId
            }));
        }
        
        currentJobOffer = null;
    }

    $('#jobOfferAccept').click(function() {
        closeJobOffer(true);
    });

    $('#jobOfferRefuse').click(function() {
        closeJobOffer(false);
    });
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (data.action === 'showJobOffer') {
            showJobOffer(data.data);
        } else if (data.action === 'closeJobOffer') {
            closeJobOffer(false);
        }
    });
    
    function renderNearbyPlayers(players) {
        const container = $('#nearbyPlayersList');
        container.empty();

        if (!players || players.length === 0) {
            container.html(
                '<div class="recruit-empty-state">' +
                    '<div class="recruit-empty-icon">' +
                        '<i class="fas fa-user-slash"></i>' +
                    '</div>' +
                    '<div class="recruit-empty-text">' + _T('no_players_nearby') + '</div>' +
                    '<div class="recruit-empty-hint">' + _T('players_appear_hint') + '</div>' +
                '</div>'
            );
            return;
        }

        players.forEach(player => {
            const card = createPlayerCard(player);
            container.append(card);
        });
    }

    function createPlayerCard(player) {
        const initials = getInitials(player.name);
        const distance = player.distance ? player.distance.toFixed(1) : '?';
        
        let html = '<div class="recruit-card" data-player-id="' + player.serverId + '">';
        
        if (player.distance) {
            html += '<div class="recruit-distance">' +
                        '<i class="fas fa-location-arrow"></i>' +
                        '<span>' + distance + 'm</span>' +
                    '</div>';
        }
        
        html += '<div class="recruit-avatar">' +
                    '<div class="recruit-avatar-placeholder">' + initials + '</div>' +
                '</div>' +
                '<div class="recruit-info">' +
                    '<div class="recruit-name">' + escapeHtml(player.name) + '</div>' +
                    '<div class="recruit-job">' +
                        '<i class="fas fa-briefcase"></i>' +
                        '<span>' + escapeHtml(player.jobLabel || _T('unemployed')) + '</span>' +
                    '</div>';
        
        if (player.identifier) {
            html += '<div class="recruit-identifier">' +
                        '<i class="fas fa-id-card"></i>' +
                        '<span>ID: ' + player.serverId + '</span>' +
                    '</div>';
        }
        
        html += '</div>' +
                '<button class="recruit-hire-btn" data-player-id="' + player.serverId + '" data-player-name="' + escapeHtml(player.name) + '">' +
                    '<i class="fas fa-user-plus"></i>' +
                    '<span>' + _T('recruit') + '</span>' +
                '</button>' +
            '</div>';
        
        return $(html);
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    $(document).off('click.hireBtn').on('click.hireBtn', '.recruit-hire-btn', function() {
        const serverId = $(this).data('player-id');
        const playerName = $(this).data('player-name');
        
        showConfirm(_T('recruit_confirm', playerName), function() {
            $.post('https://cactus_ultimate/hirePlayer', JSON.stringify({
                targetId: serverId
            }), function(response) {
                if (response && response.success) {
                    showNotification(_T('recruit_success'), 'success', 4000);
                    setTimeout(function() {
                        $('#refreshNearbyBtn').click();
                    }, 500);
                } else {
                    showNotification(response.message || _T('recruit_error'), 'error', 4000);
                }
            });
        });
    });
    $('#refreshNearbyBtn').off('click').on('click', function() {
        const btn = $(this);
        btn.prop('disabled', true);
        
        $('#nearbyPlayersList').html(
            '<div class="recruit-loading">' +
                '<div class="recruit-loading-spinner"></div>' +
                '<div class="recruit-loading-text">' + _T('loading') + '</div>' +
            '</div>'
        );
        
        $.post('https://cactus_ultimate/refreshNearbyPlayers', JSON.stringify({}), function() {
            setTimeout(function() {
                btn.prop('disabled', false);
            }, 1000);
        });
    });
    $('#recruitModal').on('show', function() {
        $('#refreshNearbyBtn').click();
    });

    
    let currentShopJob = null;
    let currentShopName = null;

    function openJobShopPanel(data) {
        currentShopJob  = data.jobName;
        currentShopName = data.shopName;
        const itemImageBase = data.itemImagePath || 'img/';

        const shopLabel = data.shopLabel || 'Shop';
        $('#jobShopLabel').text(shopLabel);
        $('#jobShopTitleText').text(shopLabel);
        $('#jobShopBadge').text(shopLabel);

        const payerInfo = $('#jobShopPayerInfo');
        if (data.paymentSource === 'company') {
            payerInfo.show();
            $('#jobShopPayerText').html('<span class="payer-company">' + _T('shop_paid_by_company') + '</span>');
        } else {
            payerInfo.hide();
        }

        const list = $('#jobShopItemsList').empty();
        const items = data.items || [];
        const playerGrade = parseInt(data.playerGrade) || 0;

        if (items.length === 0) {
            list.append('<div class="job-shop-empty"><i class="fas fa-box-open"></i> ' + _T('shop_no_items') + '</div>');
        } else {
            items.forEach(function(it, idx) {
                const isCash = (it.currency !== 'gold');
                const currencyLabel = isCash
                    ? '<span class="cash">' + _T('currency_cash') + '</span>'
                    : '<span class="gold">' + _T('currency_gold') + '</span>';
                const itemGrade = parseInt(it.gradeRequired) || 0;
                const isLocked = (itemGrade > 0 && playerGrade < itemGrade);
                const gradeHtml = (itemGrade > 0)
                    ? '<div class="job-shop-item-grade' + (isLocked ? ' locked' : '') + '">' + (isLocked ? '<img src="img/lock.png" alt="" class="grade-lock-icon"> ' : '') + _T('grade') + ' ' + itemGrade + '+</div>'
                    : '';

                const imgSrc = it.image
                    ? itemImageBase + it.image
                    : 'img/box_s_bg_1.png';

                const lockedClass = isLocked ? ' job-shop-item-locked' : '';

                list.append(
                    '<div class="job-shop-item' + lockedClass + '" data-item="' + (it.item || '') + '" data-idx="' + idx + '">' +
                        '<div class="job-shop-item-img"><img src="' + imgSrc + '" alt="" onerror="this.style.display=\'none\'"></div>' +
                        '<div class="job-shop-item-info">' +
                            '<div class="job-shop-item-name">' + (it.label || it.item || '???') + '</div>' +
                            '<div class="job-shop-item-price">' + (parseFloat(it.price) || 0).toFixed(2) + ' ' + currencyLabel + '</div>' +
                            gradeHtml +
                        '</div>' +
                        (isLocked
                            ? '<div class="job-shop-locked-badge"><img src="img/lock.png" alt=""> ' + _T('shop_locked') + '</div>'
                            : '<div class="job-shop-qty-wrapper">' +
                                '<div class="job-shop-qty-ctrl">' +
                                    '<button class="job-shop-qty-btn job-shop-qty-minus" data-item="' + (it.item || '') + '">−</button>' +
                                    '<input type="number" class="job-shop-qty-input" data-item="' + (it.item || '') + '" value="1" min="1" max="999">' +
                                    '<button class="job-shop-qty-btn job-shop-qty-plus" data-item="' + (it.item || '') + '">+</button>' +
                                '</div>' +
                                '<button class="job-shop-buy-btn" data-item="' + (it.item || '') + '" data-idx="' + idx + '"><img src="img/gold.png" alt=""> ' + _T('shop_buy') + '</button>' +
                              '</div>') +
                    '</div>'
                );
            });
        }

        $('#jobShopPanel').fadeIn(200);
    }

    $(document).on('click', '.job-shop-qty-minus', function() {
        const input = $(this).siblings('.job-shop-qty-input');
        let v = parseInt(input.val()) || 1;
        if (v > 1) input.val(v - 1);
    });
    $(document).on('click', '.job-shop-qty-plus', function() {
        const input = $(this).siblings('.job-shop-qty-input');
        let v = parseInt(input.val()) || 1;
        if (v < 999) input.val(v + 1);
    });
    $(document).on('change', '.job-shop-qty-input', function() {
        let v = parseInt($(this).val()) || 1;
        if (v < 1) v = 1;
        if (v > 999) v = 999;
        $(this).val(v);
    });

    $(document).on('click', '.job-shop-buy-btn', function() {
        const item = $(this).data('item');
        const idx = $(this).data('idx');
        if (!item || !currentShopJob || !currentShopName) return;
        const qtyInput = $(this).closest('.job-shop-qty-wrapper').find('.job-shop-qty-input');
        const qty = Math.max(1, parseInt(qtyInput.val()) || 1);
        $.post('https://cactus_ultimate/shopBuyItem', JSON.stringify({
            jobName: currentShopJob,
            shopName: currentShopName,
            item: item,
            itemIndex: idx,
            qty: qty
        }));
    });

    $('#jobShopCloseBtn').on('click', function() {
        $('#jobShopPanel').fadeOut(200);
        $.post('https://cactus_ultimate/closeJobShop', JSON.stringify({}));
        currentShopJob = null;
        currentShopName = null;
    });

    
    function showCodeInputPanel(label) {
        $('#codeInputLabel').text(label || _T('enter_code'));
        $('#codeInputField').val('');
        applyInterfaceTranslations();
        $('#codeInputOverlay').fadeIn(200, function() {
            $('#codeInputField').focus();
        });
    }

    $('#codeInputConfirm').on('click', function() {
        const code = $('#codeInputField').val();
        $('#codeInputOverlay').fadeOut(150);
        $.post('https://cactus_ultimate/codeInputResult', JSON.stringify({
            code: code,
            cancelled: false
        }));
    });

    $('#codeInputCancel').on('click', function() {
        $('#codeInputOverlay').fadeOut(150);
        $.post('https://cactus_ultimate/codeInputResult', JSON.stringify({
            code: '',
            cancelled: true
        }));
    });

    $('#codeInputField').on('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            $('#codeInputConfirm').click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            $('#codeInputCancel').click();
        }
    });

    
    window.addEventListener('message', function(event) {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'openJobShop') {
            if (data.locale) setLocale(data.locale);
            openJobShopPanel(data);
        } else if (data.type === 'showCodeInput') {
            if (data.locale) setLocale(data.locale);
            showCodeInputPanel(data.stashLabel);
        } else if (data.type === 'closeJobShop') {
            $('#jobShopPanel').fadeOut(200);
            currentShopJob = null;
            currentShopName = null;
        } else if (data.type === 'hideCodeInput') {
            $('#codeInputOverlay').fadeOut(150);
        }
    });
});
