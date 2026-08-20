let dashboardChart = null;
let dashboardStatsLoaded = false;

function updateDashboard(stats) {
    if (!stats) return;
    DebugLog('[Dashboard] updateDashboard called', stats);

    const totalEmployees = stats.totalEmployees ?? 0;
    const onlineEmployees = stats.onlineEmployees ?? 0;
    const onDutyEmployees = stats.onDutyEmployees ?? 0;
    const companyMoney = stats.money ?? 0;
    const companyGold = stats.gold ?? 0;

    $('#dashStatTotalEmployees').text(totalEmployees);
    $('#dashStatTotalSub').html(`<span class="highlight">${onlineEmployees}</span> ${_T('dash_online_now') || 'en ligne'}`);

    $('#dashStatOnDuty').text(onDutyEmployees);
    $('#dashStatOnDutySub').text(`/ ${totalEmployees} ${_T('dash_employees') || 'employés'}`);

    const moneyFormatted = Number(companyMoney).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('#dashStatBalance').text('$' + moneyFormatted);
    const goldFormatted = Number(companyGold).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    $('#dashStatBalanceSub').html(`${_T('dash_gold') || 'Or'}: <span class="highlight">${goldFormatted}</span>`);

    if (stats.gradeDistribution && stats.gradeDistribution.length > 0) {
        renderGradeChart(stats.gradeDistribution);
    }

    if (stats.recentActivity) {
        renderRecentActivity(stats.recentActivity);
    }

    dashboardStatsLoaded = true;
}

function renderGradeChart(distribution) {
    const ctx = document.getElementById('dashboardGradeChart');
    if (!ctx) return;

    const labels = distribution.map(g => g.name || `Grade ${g.grade}`);
    const values = distribution.map(g => g.count || 0);

    const barColors = distribution.map((_, i) => {
        const alpha = 0.5 + (i / Math.max(distribution.length - 1, 1)) * 0.5;
        return `rgba(154, 148, 138, ${alpha.toFixed(2)})`;
    });

    if (dashboardChart) {
        dashboardChart.destroy();
    }

    dashboardChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: _T('dash_employee_count') || 'Employés',
                data: values,
                backgroundColor: barColors,
                borderColor: 'rgba(154, 148, 138, 0.8)',
                borderWidth: 1,
                borderRadius: 4,
                barPercentage: 0.6,
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
                        color: 'rgba(255,255,255,0.5)',
                        font: { family: 'Hapna', size: 11 },
                        boxWidth: 12,
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    titleColor: '#9a948a',
                    bodyColor: '#fff',
                    borderColor: 'rgba(154, 148, 138,0.3)',
                    borderWidth: 1,
                    titleFont: { family: 'Hapna', weight: '700' },
                    bodyFont: { family: 'Hapna' },
                    callbacks: {
                        label: function(context) {
                            return ` ${context.parsed.y} ${_T('dash_employees') || 'employés'}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: 'rgba(255,255,255,0.6)',
                        font: { family: 'Hapna', size: 11, weight: '500' },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(255,255,255,0.5)',
                        font: { family: 'Hapna', size: 11 },
                        stepSize: 1,
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.06)',
                        drawBorder: false
                    }
                }
            }
        }
    });
}

function renderRecentActivity(activities) {
    const container = $('#dashboardActivityList');
    container.empty();

    if (!activities || activities.length === 0) {
        container.html(`
            <div class="dashboard-activity-empty">
                <img src="img/bookcover.png" alt="">
                <p>${_T('dash_no_activity') || 'Aucune activité récente'}</p>
            </div>
        `);
        return;
    }

    activities.forEach(act => {
        const icon = getActivityIcon(act.actionType);
        const text = formatActivityText(act);
        const time = formatActivityTime(act.timestamp);

        container.append(`
            <div class="dashboard-activity-item">
                <div class="dashboard-activity-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="dashboard-activity-info">
                    <div class="dashboard-activity-text">${text}</div>
                    <div class="dashboard-activity-time">${time}</div>
                </div>
            </div>
        `);
    });
}

function getActivityIcon(actionType) {
    const map = {
        'recruit': 'fas fa-user-plus',
        'fire': 'fas fa-user-minus',
        'promote': 'fas fa-arrow-up',
        'demote': 'fas fa-arrow-down',
        'deposit': 'fas fa-coins',
        'withdraw': 'fas fa-hand-holding-usd',
        'gold_deposit': 'fas fa-coins',
        'gold_withdraw': 'fas fa-hand-holding-usd',
        'grade_edit': 'fas fa-edit',
        'salary_change': 'fas fa-money-bill-wave',
        'bonus': 'fas fa-gift',
        'resign': 'fas fa-sign-out-alt',
        'permission_change': 'fas fa-shield-alt',
        'storage_upgrade': 'fas fa-warehouse',
        'register_sale': 'fas fa-cash-register',
        'job_create': 'fas fa-briefcase',
        'job_update': 'fas fa-edit',
        'job_delete': 'fas fa-trash',
        'job_toggle': 'fas fa-power-off'
    };
    return map[actionType] || 'fas fa-circle-info';
}

function formatActivityText(act) {
    const actor = act.actorName ? `<strong>${escapeHtml(act.actorName)}</strong>` : '';
    const target = act.targetName ? `<strong>${escapeHtml(act.targetName)}</strong>` : '';

    const typeLabels = {
        'recruit': `${actor} ${_T('dash_act_recruit') || 'a recruté'} ${target}`,
        'fire': `${actor} ${_T('dash_act_fire') || 'a licencié'} ${target}`,
        'promote': `${actor} ${_T('dash_act_promote') || 'a promu'} ${target}`,
        'demote': `${actor} ${_T('dash_act_demote') || 'a rétrogradé'} ${target}`,
        'deposit': `${actor} ${_T('dash_act_deposit') || 'a déposé'} $${Number(act.amount || 0).toLocaleString('fr-FR')}`,
        'withdraw': `${actor} ${_T('dash_act_withdraw') || 'a retiré'} $${Number(act.amount || 0).toLocaleString('fr-FR')}`,
        'gold_deposit': `${actor} ${_T('dash_act_gold_deposit') || 'a déposé'} ${Number(act.amount || 0).toLocaleString('fr-FR')} or`,
        'gold_withdraw': `${actor} ${_T('dash_act_gold_withdraw') || 'a retiré'} ${Number(act.amount || 0).toLocaleString('fr-FR')} or`,
        'bonus': `${actor} ${_T('dash_act_bonus') || 'a donné un bonus à'} ${target}`,
        'resign': `${actor || target} ${_T('dash_act_resign') || 'a démissionné'}`,
        'grade_edit': `${actor} ${_T('dash_act_grade_edit') || 'a modifié un grade'}`,
        'salary_change': `${actor} ${_T('dash_act_salary') || 'a modifié un salaire'}`,
        'permission_change': `${actor} ${_T('dash_act_permission') || 'a modifié des permissions'}`,
        'storage_upgrade': `${actor} ${_T('dash_act_storage') || 'a amélioré le coffre'}`,
        'register_sale': `${actor} ${_T('dash_act_register_sale') || 'a encaissé'} $${Number(act.amount || 0).toLocaleString('fr-FR')} ${_T('dash_act_from') || 'de'} ${target}`,
        'job_create': `${actor} ${_T('dash_act_job_create') || 'a créé un job'}`,
        'job_update': `${actor} ${_T('dash_act_job_update') || 'a modifié un job'}`,
        'job_delete': `${actor} ${_T('dash_act_job_delete') || 'a supprimé un job'}`,
        'job_toggle': `${actor} ${_T('dash_act_job_toggle') || 'a activé/désactivé un job'}`
    };

    return typeLabels[act.actionType] || `${actor} — ${act.actionType || '?'}`;
}

function formatActivityTime(timestamp) {
    if (!timestamp) return '';
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return _T('dash_time_now') || 'À l\'instant';
    if (mins < 60) return `${_T('dash_time_ago') || 'il y a'} ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${_T('dash_time_ago') || 'il y a'} ${hours}h`;
    const days = Math.floor(hours / 24);
    return `${_T('dash_time_ago') || 'il y a'} ${days}j`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function requestDashboardStats() {
    DebugLog('[Dashboard] Requesting stats...');
    $.post('https://cactus_ultimate/getDashboardStats', JSON.stringify({}));
}
