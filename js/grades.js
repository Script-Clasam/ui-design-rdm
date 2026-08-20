(function($) {
    'use strict';

    let currentGrades = [];
    let currentEditingGrade = null;
    let maxSalary = 5000;
    let minGradeToEdit = 6;
    let playerGrade = 0;
    let currentJob = '';

 
    const permissionIcons = {
        canRecruit: 'fa-user-plus',
        canFire: 'fa-user-times',
        canManageMoney: 'fa-coins',
        canManageGold: 'fa-coins',
        canViewAccounts: 'fa-eye',
        canViewMembers: 'fa-users',
        canViewHistory: 'fa-history',
        canViewFullHistory: 'fa-book',
        canEditGrades: 'fa-edit',
        canUpgradeStorage: 'fa-arrow-up',
        canEditAvatars: 'fa-image',
        canAccessInventory: 'fa-box',
        canManageEmployeeGrade: 'fa-user-edit',
        canSeeManageButton: 'fa-cog',
        canSeeFireButton: 'fa-user-slash',
        canSeePromoteButton: 'fa-arrow-up',
        canSeeDemoteButton: 'fa-arrow-down',
        canGiveBonus: 'fa-coins',
        canSeeBonusButton: 'fa-gift'
    };
    function getPermissionLabel(permKey) {
        const labels = {
            canRecruit: _T('perm_recruit'),
            canFire: _T('perm_fire'),
            canManageMoney: _T('perm_manage_money'),
            canManageGold: _T('perm_manage_gold'),
            canViewAccounts: _T('perm_view_accounts'),
            canViewMembers: _T('perm_view_members'),
            canViewHistory: _T('perm_view_history'),
            canViewFullHistory: _T('perm_view_full_history'),
            canEditGrades: _T('perm_edit_grades'),
            canUpgradeStorage: _T('perm_upgrade_storage'),
            canEditAvatars: _T('perm_edit_avatars'),
            canAccessInventory: _T('perm_access_inventory'),
            canManageEmployeeGrade: _T('perm_manage_employee_grade'),
            canSeeManageButton: _T('perm_see_manage_button'),
            canSeeFireButton: _T('perm_see_fire_button'),
            canSeePromoteButton: _T('perm_see_promote_button'),
            canSeeDemoteButton: _T('perm_see_demote_button'),
            canGiveBonus: _T('perm_give_bonus'),
            canSeeBonusButton: _T('perm_see_bonus_button')
        };
        return labels[permKey] || permKey;
    }

    
    function getGradeImage(gradeNumber) {
        if (gradeNumber <= 28) {
           
            const formattedNumber = gradeNumber.toString().padStart(2, '0');
            return `img/number/${formattedNumber}.png`;
        } else {
            return 'img/number/most.png';
        }
    }

  
    function loadGrades() {
        
        $.post('https://cactus_ultimate/getGrades', JSON.stringify({}));
     
    }

 
    function displayGrades(grades) {
        const container = $('#gradesList');
        container.empty();

        if (!grades || grades.length === 0) {
            showEmptyGrades();
            return;
        }

        grades.forEach(function(grade) {
            const card = createGradeCard(grade);
            container.append(card);
        });
    }

    function createGradeCard(grade) {
        const permissions = grade.permissions || {};
        const activePermissions = Object.keys(permissions).filter(key => permissions[key]);
        
        const permissionsBadges = activePermissions.slice(0, 4).map(perm => {
            return `
                <div class="permission-badge">
                    <i class="fas ${permissionIcons[perm] || 'fa-check'}"></i>
                    ${getPermissionLabel(perm)}
                </div>
            `;
        }).join('');

        const moreCount = activePermissions.length > 4 ? activePermissions.length - 4 : 0;
        
        let moreBadge = '';
        if (moreCount > 0) {
            const remainingPermissions = activePermissions.slice(4).map(perm => {
                return '\u2022 ' + getPermissionLabel(perm);
            }).join('\n');
            const encodedPermissions = remainingPermissions.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            moreBadge = `<div class="permission-badge more-badge" title="${encodedPermissions}">+${moreCount}</div>`;
        }

        return $(`
            <div class="grade-card" data-grade="${grade.grade}">
                <div class="grade-badge">
                    <img src="${getGradeImage(grade.grade)}" alt="Grade ${grade.grade}" class="grade-badge-img">
                </div>
                <div class="grade-card-content">
                    <div class="grade-label">
                        <img src="img/recru.png" alt="Grade">
                        ${grade.label}
                    </div>
                    <div class="grade-info">
                        <div class="grade-info-row">
                            <img src="img/dollar.png" alt="${_T('grade_salary')}">
                            <span>${_T('salary_label')} <span class="grade-salary-value">${formatMoney(grade.salary)}</span></span>
                        </div>
                        <div class="grade-info-row">
                            <i class="fas fa-shield-alt"></i>
                            <span>${_T('permissions_active', activePermissions.length)}</span>
                        </div>
                    </div>
                    <div class="grade-permissions-summary">
                        ${permissionsBadges}
                        ${moreBadge}
                    </div>
                    <button class="grade-edit-btn">
                        <img src="img/boutique.png" alt="${_T('configure')}">
                        ${_T('configure')}
                    </button>
                </div>
            </div>
        `);
    }

    
    function showEmptyGrades() {
        const container = $('#gradesList');
        container.html(`
            <div class="grades-empty">
                <img src="img/loading.png" alt="${_T('empty')}">
                <p>${_T('no_grades_configured')}</p>
            </div>
        `);
    }

    
    function openGradeModal(grade) {
        currentEditingGrade = grade;
        if (playerGrade < minGradeToEdit) {
            if (typeof showNotification === 'function') {
                showNotification('error', _T('permission_denied'), _T('min_grade_required').replace('{grade}', minGradeToEdit));
            }
            return;
        }
        if (grade.grade >= playerGrade) {
            if (typeof showNotification === 'function') {
                showNotification('error', _T('permission_denied'), _T('cannot_edit_higher_grade'));
            }
            return;
        }
        $('#gradeNumber').html(`<img src="${getGradeImage(grade.grade)}" alt="Grade ${grade.grade}" class="grade-number-img">`);
        $('#gradeLabelDisplay').text(grade.label);
        $('#gradeSalaryInput').val(grade.salary);
        $('#gradeSalaryInput').attr('max', maxSalary);
        const permissions = grade.permissions || {};
        $('.permission-checkbox').each(function() {
            const perm = $(this).data('permission');
            $(this).prop('checked', permissions[perm] || false);
        });
        $('#gradeManagementModal').fadeIn(300);
    }

    
    function closeGradeModal() {
        $('#gradeManagementModal').fadeOut(300);
        currentEditingGrade = null;
    }

    
    function saveGrade() {
        if (!currentEditingGrade) return;

        const salary = parseFloat($('#gradeSalaryInput').val()) || 0;
        if (salary > maxSalary) {
            if (typeof showNotification === 'function') {
                showNotification('error', _T('invalid_salary'), _T('salary_too_high', maxSalary));
            }
            return;
        }
        if (salary < 0) {
            if (typeof showNotification === 'function') {
                showNotification('error', _T('invalid_salary'), _T('salary_must_be_positive'));
            }
            return;
        }
        
        const permissions = {};

        $('.permission-checkbox').each(function() {
            const perm = $(this).data('permission');
            permissions[perm] = $(this).is(':checked');
        });
        const job = currentJob || (window.companyData ? window.companyData.job : null);
        
        if (!job) {
            if (typeof showNotification === 'function') {
                showNotification('error', _T('error'), _T('cannot_determine_company'));
            }
            return;
        }

        const data = {
            job: job,
            grade: currentEditingGrade.grade,
            label: currentEditingGrade.label,
            salary: salary,
            permissions: permissions
        };
        $.post('https://cactus_ultimate/updateGrade', JSON.stringify(data));
    }

    
    function formatMoney(amount) {
        return parseFloat(amount).toFixed(2) + '$';
    }
    $(document).on('click', '.grade-card', function(e) {
        if ($(e.target).closest('.grade-edit-btn').length > 0) return;
        
        const gradeNum = parseInt($(this).data('grade'));
        const grade = currentGrades.find(g => g.grade === gradeNum);
        
        if (grade) {
            openGradeModal(grade);
        }
    });
    $(document).on('click', '.grade-edit-btn', function(e) {
        e.stopPropagation();
        const card = $(this).closest('.grade-card');
        const gradeNum = parseInt(card.data('grade'));
        const grade = currentGrades.find(g => g.grade === gradeNum);
        
        if (grade) {
            openGradeModal(grade);
        }
    });
    $(document).on('click', '#closeGradeModal, .grade-modal-overlay', function() {
        closeGradeModal();
    });
    $(document).on('click', '#saveGradeBtn', function() {
        saveGrade();
    });
    $(document).on('click', '.grade-modal-content', function(e) {
        e.stopPropagation();
    });
    $(document).on('click', '[data-tab="grades"]', function() {
        setTimeout(function() {
            loadGrades();
        }, 100);
    });
    window.addEventListener('message', function(event) {
        if (event.data.action === 'receiveGrades') {
            currentGrades = event.data.grades || [];
            maxSalary = event.data.maxSalary || 5000;
            minGradeToEdit = event.data.minGradeToEdit || 6;
            playerGrade = event.data.playerGrade || 0;
            $('#maxSalaryDisplay').text(maxSalary + '$');
            
            displayGrades(currentGrades);
        } else if (event.data.action === 'gradeUpdated') {
            if (event.data.success) {
                if (typeof showNotification === 'function') {
                    showNotification('success', 'OK', event.data.message || _T('grade_updated_success'));
                }
                closeGradeModal();
                loadGrades();
            } else {
                if (typeof showNotification === 'function') {
                    showNotification('error', _T('error'), event.data.message || _T('save_error'));
                }
            }
        } else if (event.data.action === 'openMenu' && event.data.data) {
            currentJob = event.data.data.name || event.data.data.job;
        }
    });
    const $tooltipEl = $('<div class="permissions-tooltip"></div>').appendTo('body').hide();

    $(document).on('mouseenter', '.more-badge', function(e) {
        const text = $(this).attr('title');
        if (!text) return;
        $(this).data('origTitle', text).removeAttr('title');
        $tooltipEl.html(text.replace(/\n/g, '<br>')).show();
        positionTooltip(e);
    }).on('mousemove', '.more-badge', function(e) {
        positionTooltip(e);
    }).on('mouseleave', '.more-badge', function() {
        $tooltipEl.hide();
        const orig = $(this).data('origTitle');
        if (orig) $(this).attr('title', orig);
    });

    function positionTooltip(e) {
        const tw = $tooltipEl.outerWidth();
        const th = $tooltipEl.outerHeight();
        let x = e.clientX - tw / 2;
        let y = e.clientY - th - 12;
        if (x < 8) x = 8;
        if (x + tw > window.innerWidth - 8) x = window.innerWidth - tw - 8;
        if (y < 8) y = e.clientY + 18;
        $tooltipEl.css({ left: x + 'px', top: y + 'px' });
    }

    window.GradesManager = {
        load: loadGrades,
        openModal: openGradeModal,
        closeModal: closeGradeModal
    };

})(jQuery);
