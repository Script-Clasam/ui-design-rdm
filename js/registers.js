(function($) {
    'use strict';

    var currentRegisterData = null;

    window.addEventListener('message', function(event) {
        var data = event.data;

        if (data.action === 'register_openCreate') {
            if (data.locale) setLocale(data.locale);
            currentRegisterData = {
                jobName: data.jobName,
                registerName: data.registerName,
                registerLabel: data.registerLabel || 'Register',
                isEmployee: true,
                invoice: data.invoice || null
            };
            openCreateModal(data.invoice);
        }

        if (data.action === 'register_openPay') {
            if (data.locale) setLocale(data.locale);
            currentRegisterData = {
                jobName: data.jobName,
                registerName: data.registerName,
                registerLabel: data.registerLabel || 'Register',
                isEmployee: false,
                invoice: data.invoice
            };
            openPayModal(data.invoice);
        }

        if (data.action === 'register_close') {
            closeAll();
        }

        if (data.action === 'register_invoiceUpdate') {
            if (currentRegisterData && getRegKey(currentRegisterData.jobName, currentRegisterData.registerName) === data.key) {
                currentRegisterData.invoice = data.invoice || null;
            }
        }
    });

    function getRegKey(jobName, regName) {
        return jobName + '_' + (regName || 'reg');
    }

    function openCreateModal(existingInvoice) {
        var $overlay = $('#registerCreateOverlay');
        var $form = $('#registerCreateForm');
        var $pending = $('#registerPendingView');
        var $footer = $('#registerCreateFooter');
        var $pendingFooter = $('#registerPendingFooter');

        $('#registerCreateTitle').text(currentRegisterData.registerLabel || _T('reg_cash_register'));

        if (existingInvoice) {
            $form.hide();
            $pending.show();
            $footer.hide();
            $pendingFooter.show();
            $('#registerPendingAmount').text('$' + Number(existingInvoice.amount).toLocaleString('en-US'));
            $('#registerPendingItem').text(existingInvoice.itemDescription || '—');
        } else {
            $form.show();
            $pending.hide();
            $footer.show();
            $pendingFooter.hide();
            $('#registerAmount').val('');
            $('#registerItemDesc').val('');
        }

        $overlay.addClass('active');
        if (!existingInvoice) {
            setTimeout(function() { $('#registerAmount').focus(); }, 100);
        }
    }

    function openPayModal(invoice) {
        if (!invoice) return;

        $('#registerPayAmount').text('$' + Number(invoice.amount).toLocaleString('en-US'));
        $('#registerPayItem').text(invoice.itemDescription || '—');
        $('#registerPayFrom').text(_T('reg_from') + ' ' + (invoice.creatorName || _T('recruit_button')));
        $('#registerPayJob').text(invoice.jobLabel || invoice.jobName || '—');

        $('#registerPayOverlay').addClass('active');
    }

    function closeAll() {
        $('#registerCreateOverlay').removeClass('active');
        $('#registerPayOverlay').removeClass('active');
        currentRegisterData = null;
        $.post('https://cactus_ultimate/register_closedNUI', JSON.stringify({}));
    }

    $(document).on('click', '#registerSubmitBtn', function() {
        var amount = parseFloat($('#registerAmount').val());
        var itemDesc = $('#registerItemDesc').val().trim();

        if (!amount || amount <= 0) {
            $('#registerAmount').css('border-color', '#ef4444');
            setTimeout(function() { $('#registerAmount').css('border-color', ''); }, 1500);
            return;
        }
        if (!itemDesc) {
            $('#registerItemDesc').css('border-color', '#ef4444');
            setTimeout(function() { $('#registerItemDesc').css('border-color', ''); }, 1500);
            return;
        }

        $.post('https://cactus_ultimate/register_createInvoice', JSON.stringify({
            jobName: currentRegisterData.jobName,
            registerName: currentRegisterData.registerName,
            amount: amount,
            itemDescription: itemDesc
        }));

        closeAll();
    });

    $(document).on('click', '#registerCancelInvoiceBtn', function() {
        $.post('https://cactus_ultimate/register_cancelInvoice', JSON.stringify({
            jobName: currentRegisterData.jobName,
            registerName: currentRegisterData.registerName
        }));
        closeAll();
    });

    $(document).on('click', '#registerPayBtn', function() {
        $.post('https://cactus_ultimate/register_payInvoice', JSON.stringify({
            jobName: currentRegisterData.jobName,
            registerName: currentRegisterData.registerName
        }));
        closeAll();
    });

    $(document).on('click', '#registerCreateClose, #registerCreateCancelBtn, #registerPendingCloseBtn', function() {
        closeAll();
    });
    $(document).on('click', '#registerPayClose, #registerPayCancelBtn', function() {
        closeAll();
    });

    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            if ($('#registerCreateOverlay').hasClass('active') || $('#registerPayOverlay').hasClass('active')) {
                closeAll();
            }
        }
    });

})(jQuery);
