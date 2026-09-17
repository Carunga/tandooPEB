// tandooPEB phone side: sync orchestration + settings.
// Provider-agnostic: all backend logic lives in src/pkjs/providers/*.

var Clay = require('pebble-clay');
var clayConfig = require('./config');
var providers = require('./providers');

var clay = new Clay(clayConfig);

// SYNC_STATUS values, must match the C side
var STATUS = { START: 0, ITEM: 1, DONE: 2, FAIL: 3 };

function getConfig() {
  try {
    var settings = JSON.parse(localStorage.getItem('clay-settings')) || {};
    if (settings.serverUrl && settings.apiToken) {
      return settings;
    }
  } catch (e) {}
  return null;
}

function sendMessage(dict) {
  return new Promise(function (resolve, reject) {
    Pebble.sendAppMessage(dict, resolve, reject);
  });
}

// Deliver the fresh item list to the watch, one item per message,
// serialized via promise chaining.
function sendItems(items) {
  var chain = sendMessage({ SYNC_STATUS: STATUS.START, ITEM_COUNT: items.length });
  items.forEach(function (item, i) {
    chain = chain.then(function () {
      return sendMessage({
        SYNC_STATUS: STATUS.ITEM,
        ITEM_INDEX: i,
        ITEM_ID: item.id,
        ITEM_NAME: item.name,
        ITEM_AMOUNT: item.amount
      });
    });
  });
  return chain.then(function () {
    return sendMessage({ SYNC_STATUS: STATUS.DONE });
  });
}

function sendFail(msg) {
  console.log('sync failed: ' + msg);
  sendMessage({ SYNC_STATUS: STATUS.FAIL, SYNC_MSG: String(msg).substring(0, 32) });
}

var s_syncInProgress = false;

// NEW_ITEMS: one "c\tname" per line (c = '1' when checked done)
function parseNewItems(payload) {
  var items = [];
  var text = payload.NEW_ITEMS;
  if (!text || !payload.NEW_COUNT) {
    return items;
  }
  text.split('\n').forEach(function (line) {
    if (items.length >= payload.NEW_COUNT) return;
    var tab = line.indexOf('\t');
    if (tab < 0) return;
    var name = line.substring(tab + 1).trim();
    if (!name) return;
    items.push({ checked: line.charAt(0) === '1', name: name });
  });
  return items;
}

function runSync(doneIds, newItems) {
  if (s_syncInProgress) {
    console.log('sync already in progress, ignoring request');
    return;
  }
  s_syncInProgress = true;

  var cfg = getConfig();
  if (!cfg || !cfg.serverUrl || !cfg.apiToken) {
    sendFail('open settings');
    s_syncInProgress = false;
    return;
  }
  var provider = providers.get(cfg.provider);
  if (newItems.length > 0 && typeof provider.addItem !== 'function') {
    sendFail('add unsupported');
    s_syncInProgress = false;
    return;
  }

  console.log('sync start: provider=' + provider.id + ', ' + doneIds.length +
              ' done ids, ' + newItems.length + ' new items');

  // Create new local items first, already done when checked, so no separate
  // mark-done round trip is needed for them.
  var chain = Promise.resolve();
  newItems.forEach(function (item) {
    chain = chain.then(function () {
      return provider.addItem(cfg, item.name, item.checked);
    });
  });
  chain
    .then(function () { return provider.markDone(cfg, doneIds); })
    .then(function () { return provider.fetchItems(cfg); })
    .then(function (items) {
      console.log('fetched ' + items.length + ' open items');
      return sendItems(items);
    })
    .catch(function (err) {
      sendFail(err && err.message ? err.message : 'failed');
    })
    .then(function () { s_syncInProgress = false; });
}

Pebble.addEventListener('ready', function () {
  console.log('tandooPEB pkjs ready');
});

Pebble.addEventListener('appmessage', function (e) {
  if (!e.payload.SYNC_REQUEST) {
    return;
  }
  // DONE_IDS: raw bytes, little-endian uint32 per entry id
  var doneIds = [];
  var count = e.payload.DONE_COUNT || 0;
  var raw = e.payload.DONE_IDS;
  if (raw && count > 0) {
    for (var i = 0; i + 3 < raw.length && doneIds.length < count; i += 4) {
      doneIds.push((raw[i] | (raw[i + 1] << 8) | (raw[i + 2] << 16) | (raw[i + 3] << 24)) >>> 0);
    }
  }
  runSync(doneIds, parseNewItems(e.payload));
});
