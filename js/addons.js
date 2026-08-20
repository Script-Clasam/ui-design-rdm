let enabledAddons = {};

function post(eventName, data) {
    return fetch(`https://${GetParentResourceName()}/${eventName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {})
    }).then(resp => resp.json())
}

function initializeAddons() {
    console.log('[Addons] Initializing addon system...');
    post('cactus_ultimate:server:getAddonsInfo', {}).then(data => {
        console.log('[Addons] Received addon info:', data);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            handleAddonsResponse(data);
        } else {
            console.log('[Addons] No addons enabled');
        }
    }).catch(err => {
        console.error('[Addons] Error fetching addon info:', err);
    });
}

function handleAddonsResponse(data) {
    if (!data || typeof data !== 'object') {
        console.warn('[Addons] No valid data received from server');
        return;
    }
    
    enabledAddons = data;
    console.log('[Addons] Enabled addons:', enabledAddons);
    
}

function setupAddonTabHandlers() {
    console.log('[Addons] Setting up addon tab handlers');
    
}

function triggerAddonCallback(addonName, callbackName, data) {
    post('cactus_ultimate:server:addonCallback', {
        addon: addonName,
        callback: callbackName,
        data: data
    }).catch(err => console.error('[Addons] Callback error:', err));
}

$(document).ready(function() {
    console.log('[Addons] Document ready, initializing addon system');
    setupAddonTabHandlers();
    initializeAddons();
});
