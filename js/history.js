$(document).ready(function() {
    let allHistory = [];

    $(document).on('click', '.nav-btn[data-tab="history"]', function() {
        loadHistory();
    });

    function loadHistory() {
        DebugLog('Demande de chargement de l\'historique...');
        $.post('https://cactus_ultimate/getHistory', JSON.stringify({ limit: 100 }));
    }

    window.updateHistoryData = function(history) {
        DebugLog('History - Données reçues:', history);
        allHistory = history || [];
        displayHistory(allHistory);
    };

 
    function displayHistory(history) {
        const container = $('#historyContainer');
        container.empty();

        if (history.length === 0) {
            container.html(`
                <div class="history-empty-state">
                    <img src="img/bookcover.png" alt="${_T('history_empty')}">
                    <p>${_T('no_actions_recorded')}</p>
                </div>
            `);
            return;
        }

        history.forEach((entry) => {
            const card = createHistoryCard(entry);
            container.append(card);
        });
    }

    function createHistoryCard(entry) {
        const actionIcon = getActionIcon(entry.actionType);
        const actionLabel = getActionLabel(entry.actionType);
        const timestamp = formatTimestamp(entry.timestamp);
        const description = getActionDescription(entry);

        return $(`
            <div class="history-card" data-id="${entry.id}" data-action="${entry.actionType}">
                <div class="history-icon">
                    <img src="img/${actionIcon}" alt="${actionLabel}">
                </div>
                <div class="history-content">
                    <div class="history-header">
                        <span class="history-action">${actionLabel}</span>
                        <span class="history-time">${timestamp}</span>
                    </div>
                    <div class="history-description">${description}</div>
                </div>
            </div>
        `);
    }
    function getActionIcon(actionType) {
        const icons = {
            'hire': 'recru.png',
            'fire': 'licen.png',
            'resign': 'licen.png',
            'promote': 'promo.png',
            'demote': 'dem.png',
            'avatar': 'pict.png',
            'deposit': 'updollars.png',
            'deposit_gold': 'upgold.png',
            'withdraw': 'downdollars.png',
            'withdraw_gold': 'downgold.png',
            'upgrade_storage': 'upslots.png',
            'grade_update': 'promo.png',
            'grade_change': 'promo.png',
            'bonus': 'gold.png'
        };
        return icons[actionType] || 'info.png';
    }
    function getActionColor(actionType) {
        const colors = {
            'hire': 'linear-gradient(135deg, #3b82f6, #2563eb)',
            'fire': 'linear-gradient(135deg, #ef4444, #dc2626)',
            'resign': 'linear-gradient(135deg, #f59e0b, #d97706)',
            'promote': 'linear-gradient(135deg, #10b981, #059669)',
            'demote': 'linear-gradient(135deg, #f59e0b, #d97706)',
            'avatar': 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            'deposit': 'linear-gradient(135deg, #22c55e, #16a34a)',
            'deposit_gold': 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            'withdraw': 'linear-gradient(135deg, #ef4444, #dc2626)',
            'withdraw_gold': 'linear-gradient(135deg, #f59e0b, #d97706)',
            'upgrade_storage': 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            'grade_update': 'linear-gradient(135deg, #a855f7, #9333ea)',
            'bonus': 'linear-gradient(135deg, #fbbf24, #f59e0b)'
        };
        return colors[actionType] || 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
    function getActionLabel(actionType) {
        const labels = {
            'hire': _T('history_recruit'),
            'fire': _T('history_fire'),
            'resign': _T('history_resign'),
            'promote': _T('history_promote'),
            'demote': _T('history_demote'),
            'avatar': _T('history_avatar'),
            'deposit': _T('history_deposit'),
            'deposit_gold': _T('history_deposit_gold'),
            'withdraw': _T('history_withdraw'),
            'withdraw_gold': _T('history_withdraw_gold'),
            'upgrade_storage': _T('history_upgrade_storage'),
            'grade_update': _T('history_grade_change'),
            'grade_change': _T('history_grade_change'),
            'bonus': _T('history_bonus'),
            'register_sale': _T('history_register_sale')
        };
        return labels[actionType] || _T('action');
    }
    function getActionDescription(entry) {
        const actorName = entry.actorName || _T('unknown');
        const targetName = entry.targetName || _T('unknown');
        const oldValue = entry.oldValue || '';
        const newValue = entry.newValue || '';

        switch (entry.actionType) {
            case 'hire':
                return _T('history_desc_hire').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`);
            
            case 'fire':
                return _T('history_desc_fire').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`);
            
            case 'promote':
                return _T('history_desc_promote').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`).replace('{old}', `<span class="badge-value">${oldValue}</span>`).replace('{new}', `<span class="badge-value-new">${newValue}</span>`);
            
            case 'demote':
                return _T('history_desc_demote').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`).replace('{old}', `<span class="badge-value">${oldValue}</span>`).replace('{new}', `<span class="badge-value-new">${newValue}</span>`);
            
            case 'avatar':
                return _T('history_desc_avatar').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`);
            
            case 'deposit':
                const depositAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_deposit').replace('{actor}', `<strong>${actorName}</strong>`).replace('{amount}', `<span class="badge-value-new">${depositAmount.toFixed(2)}</span>`);
            
            case 'deposit_gold':
                const depositGoldAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_deposit_gold').replace('{actor}', `<strong>${actorName}</strong>`).replace('{amount}', `<span class="badge-value-new">${depositGoldAmount.toFixed(2)}</span>`);
            
            case 'withdraw':
                const withdrawAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_withdraw').replace('{actor}', `<strong>${actorName}</strong>`).replace('{amount}', `<span class="badge-value">${withdrawAmount.toFixed(2)}</span>`);
            
            case 'withdraw_gold':
                const withdrawGoldAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_withdraw_gold').replace('{actor}', `<strong>${actorName}</strong>`).replace('{amount}', `<span class="badge-value">${withdrawGoldAmount.toFixed(2)}</span>`);
            
            case 'upgrade_storage':
                const slots = entry.newValue || '?';
                const price = entry.amount ? parseFloat(entry.amount).toFixed(2) : '0.00';
                return _T('history_desc_upgrade').replace('{actor}', `<strong>${actorName}</strong>`).replace('{slots}', `<span class="badge-value-new">${slots}</span>`).replace('{price}', `<span class="badge-value">${price}</span>`);
            
            case 'grade_update':
                return _T('history_desc_grade_update').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<span class="badge-value-new">${targetName}</span>`);
            
            case 'grade_change':
                return _T('history_desc_grade_change').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`).replace('{old}', `<span class="badge-value">${oldValue}</span>`).replace('{new}', `<span class="badge-value-new">${newValue}</span>`);
            
            case 'bonus':
                const bonusAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_bonus').replace('{actor}', `<strong>${actorName}</strong>`).replace('{amount}', `<span class="badge-value-new">${bonusAmount.toFixed(2)}</span>`).replace('{target}', `<strong>${targetName}</strong>`);
            
            case 'resign':
                return _T('history_desc_resign').replace('{actor}', `<strong>${actorName}</strong>`);
            
            case 'register_sale':
                const saleAmount = parseFloat(entry.amount) || 0;
                return _T('history_desc_register_sale').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`).replace('{amount}', `<span class="badge-value-new">${saleAmount.toFixed(2)}</span>`).replace('{details}', entry.details || '');
            
            default:
                return _T('history_desc_default').replace('{actor}', `<strong>${actorName}</strong>`).replace('{target}', `<strong>${targetName}</strong>`);
        }
    }
    function formatTimestamp(timestamp) {
        if (!timestamp) return _T('date_unknown');
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return minutes <= 1 ? _T('time_1_minute_ago') : _T('time_minutes_ago', minutes);
        }
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return hours === 1 ? _T('time_1_hour_ago') : _T('time_hours_ago', hours);
        }
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return days === 1 ? _T('time_1_day_ago') : _T('time_days_ago', days);
        }
        
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
            
            return `${formattedDate} ${dateParts.hour}:${dateParts.minute}`;
        } catch (e) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutesStr = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutesStr}`;
        }
    }
    $('#searchHistory').on('input', function() {
        const searchTerm = $(this).val().toLowerCase();
        
        if (searchTerm === '') {
            $('#historyClearSearch').hide();
            displayHistory(allHistory);
        } else {
            $('#historyClearSearch').show();
            const filtered = allHistory.filter(entry => {
                const actorName = (entry.actorName || '').toLowerCase();
                const targetName = (entry.targetName || '').toLowerCase();
                const actionLabel = getActionLabel(entry.actionType).toLowerCase();
                const description = getActionDescription(entry).toLowerCase();
                
                return actorName.includes(searchTerm) || 
                       targetName.includes(searchTerm) || 
                       actionLabel.includes(searchTerm) ||
                       description.includes(searchTerm);
            });
            displayHistory(filtered);
        }
    });
    $('#historyClearSearch').on('click', function() {
        $('#searchHistory').val('');
        $(this).hide();
        displayHistory(allHistory);
    });
    window.addEventListener('message', function(event) {
        const data = event.data;
        
        if (data.action === 'updateHistory') {
            allHistory = data.history || [];
            displayHistory(allHistory);
        }
    });
});
