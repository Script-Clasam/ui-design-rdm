(function($) {
    'use strict';

    let currentStorageSlots = 5;
    let companyMoney = 0;
    let companyGold = 0;
    let canUpgrade = false;

    window.initStorageUpgrade = function(slots, money, permissions) {
        currentStorageSlots = slots || 5;
        companyMoney = money || 0;
        canUpgrade = permissions && permissions.canUpgradeStorage || false;

        DebugLog('Storage - Initialisation:', {
            slots: currentStorageSlots,
            money: companyMoney,
            canUpgrade: canUpgrade,
            permissions: permissions
        });
        if (canUpgrade) {
            DebugLog('Storage - Affichage du bouton d\'upgrade');
            $('#upgradeStorageBtn').show();
        } else {
            DebugLog('Storage - Bouton d\'upgrade masqué - Permission manquante');
            $('#upgradeStorageBtn').hide();
        }
    };

    window.updateStorageSlots = function(slots) {
        currentStorageSlots = slots || 5;
        $('#currentStorageSlotsModal').text(currentStorageSlots + ' ' + _T('slots'));
    };

    window.updateStorageMoney = function(money) {
        companyMoney = money || 0;
        DebugLog('Storage - Mise à jour de l\'argent:', companyMoney);

        if ($('#storageModalOverlay').is(':visible')) {
            generateStorageTiers();
        }
    };

    window.updateStorageGold = function(gold) {
        companyGold = gold || 0;
        DebugLog('Storage - Mise à jour de l\'or:', companyGold);
        
        if ($('#storageModalOverlay').is(':visible')) {
            generateStorageTiers();
        }
    };

    function openStorageModal() {
        $('#currentStorageSlotsModal').text(currentStorageSlots + ' ' + _T('slots'));
        generateStorageTiers();
        $('#storageModalOverlay').fadeIn(300);
    }

    function closeStorageModal() {
        $('#storageModalOverlay').fadeOut(300);
    }

    function generateStorageTiers() {
        const grid = $('#storageTiersGrid');
        grid.empty();

        $.post('https://cactus_ultimate/getStoragePrices', JSON.stringify({}), function(prices) {
            if (!prices || Object.keys(prices).length === 0) {
                grid.html('<p style="color: rgba(255,255,255,0.7); text-align: center; grid-column: 1/-1;">' + _T('no_tiers_configured') + '</p>');
                return;
            }

            const sortedTiers = Object.entries(prices).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            
            let nextTierSlots = null;
            for (const [slots, priceInfo] of sortedTiers) {
                const slotCount = parseInt(slots);
                if (currentStorageSlots < slotCount) {
                    nextTierSlots = slotCount;
                    break;
                }
            }

            sortedTiers.forEach(([slots, priceInfo]) => {
                const slotCount = parseInt(slots);
                

                let price, isGold;
                if (typeof priceInfo === 'object' && priceInfo !== null) {
                    price = priceInfo.price;
                    isGold = priceInfo.gold || false;
                } else {
                    price = priceInfo;
                    isGold = false;
                }
                
                const isOwned = currentStorageSlots >= slotCount;
                const isNextTier = slotCount === nextTierSlots;
                const isLocked = !isOwned && !isNextTier;
                const availableCurrency = isGold ? companyGold : companyMoney;
                const isInsufficient = availableCurrency < price && !isOwned;

                let classes = 'storage-tier-card';
                if (isOwned) classes += ' tier-owned';
                if (isLocked) classes += ' tier-locked';
                if (isInsufficient && isNextTier) classes += ' tier-insufficient';

                const currencyIcon = isGold ? '<img src="img/gold.png" style="width: 16px; height: 16px; margin-left: 4px; vertical-align: middle;">' : '$';
                
                const lockIcon = isLocked ? '<div class="tier-lock-icon">🔒</div>' : '';

                const card = $(`
                    <div class="${classes}" data-slots="${slotCount}" data-price="${price}" data-gold="${isGold}">
                        ${lockIcon}
                        <div class="tier-slots">${slotCount}</div>
                        <div class="tier-label">${_T('slots')}</div>
                        <div class="tier-price">${price}${currencyIcon}</div>
                    </div>
                `);

    
                if (isNextTier && !isInsufficient) {
                    card.on('click', function() {
                        showConfirmPopup(slotCount, price, isGold);
                    });
                }

                grid.append(card);
            });
        });
    }

    function showConfirmPopup(slots, price, isGold) {
        const currencyText = isGold ? _T('gold') : '$';
        const message = _T('storage_confirm', slots, slots - currentStorageSlots, price, currencyText);
        
        $('#confirmPopupMessage').text(message);
        $('#confirmPopup').fadeIn(200);

       
        $('#confirmYes').off('click').on('click', function() {
            $('#confirmPopup').fadeOut(200);
            purchaseStorageUpgrade(slots, isGold);
        });

        $('#confirmNo').off('click').on('click', function() {
            $('#confirmPopup').fadeOut(200);
        });
    }

    function purchaseStorageUpgrade(slots, isGold) {
        $.post('https://cactus_ultimate/upgradeStorage', JSON.stringify({ slots: slots, useGold: isGold || false }), function(response) {
            if (response) {
   
                closeStorageModal();
            }
        });
    }

    $(document).on('click', '#upgradeStorageBtn', function() {
        openStorageModal();
    });

    $(document).on('click', '#closeStorageModal', function() {
        closeStorageModal();
    });

    $(document).on('click', '.storage-modal-overlay', function(e) {
        if (e.target === this) {
            closeStorageModal();
        }
    });

    $(document).on('keyup', function(e) {
        if (e.key === 'Escape') {
            if ($('#confirmPopup').is(':visible')) {
                $('#confirmPopup').fadeOut(200);
            } else if ($('#storageModalOverlay').is(':visible')) {
                closeStorageModal();
            }
        }
    });

})(jQuery);
