// Tandoor Recipes shopping list provider.
//
// API (verified against Tandoor 2.6.x OpenAPI schema):
//   GET  {url}/api/shopping-list-entry/          -> paginated, only UNCHECKED items
//   POST {url}/api/shopping-list-entry/bulk/     -> {ids: [...], checked: true} marks done
//   Auth: header "Authorization: Token <token>"

function normalizeUrl(url) {
  return (url || '').trim().replace(/\/+$/, '');
}

function request(method, url, token, body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(xhr.responseText ? JSON.parse(xhr.responseText) : {});
        } catch (e) {
          reject(new Error('bad json'));
        }
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject(new Error('bad token'));
      } else if (xhr.status === 404) {
        reject(new Error('bad url'));
      } else {
        reject(new Error('http ' + xhr.status));
      }
    };
    xhr.onerror = function () { reject(new Error('no server')); };
    xhr.ontimeout = function () { reject(new Error('timeout')); };
    xhr.timeout = 15000;
    xhr.open(method, url);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    if (body !== undefined) {
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(body));
    } else {
      xhr.send();
    }
  });
}

// 2.0 -> "2", 0.5 -> "0.5", with unit -> "500 g", without -> "1x"
function formatAmount(amount, unitName) {
  var a = Math.round((amount || 0) * 100) / 100;
  var s = '' + a;
  return unitName ? s + ' ' + unitName : s + 'x';
}

module.exports = {
  id: 'tandoor',
  label: 'Tandoor Recipes',

  // -> Promise<[{id: uint32, name: string, amount: string}]> (open items only)
  fetchItems: function (cfg) {
    var base = normalizeUrl(cfg.serverUrl);
    var items = [];
    function fetchPage(url) {
      return request('GET', url, cfg.apiToken).then(function (data) {
        (data.results || []).forEach(function (e) {
          if (e.checked) return;  // skip already-done items
          items.push({
            id: e.id,
            name: (e.food && e.food.name) ? e.food.name : '?',
            amount: formatAmount(e.amount, e.unit && e.unit.name)
          });
        });
        if (data.next) {
          return fetchPage(data.next);
        }
        return items;
      });
    }
    return fetchPage(base + '/api/shopping-list-entry/?page_size=100');
  },

  // mark entries done; resolves immediately when there is nothing to do
  markDone: function (cfg, ids) {
    if (!ids || ids.length === 0) {
      return Promise.resolve();
    }
    var base = normalizeUrl(cfg.serverUrl);
    return request('POST', base + '/api/shopping-list-entry/bulk/', cfg.apiToken, {
      ids: ids,
      checked: true
    });
  }
};
