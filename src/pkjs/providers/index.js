// Shopping list provider registry.
//
// To add a new provider (e.g. Bring, Nextcloud Cookbook, ...):
//   1. Create src/pkjs/providers/<name>.js implementing the provider interface:
//        id:       string  - unique key, used in settings
//        label:    string  - human readable name
//        fetchItems(cfg)      -> Promise<[{id: uint32, name: string, amount: string}]>
//                                resolves with the list of OPEN items
//        markDone(cfg, ids)   -> Promise<void>
//                                marks the given entry ids as done at the backend
//      cfg is the Clay settings object (messageKey -> value).
//   2. require() and register it in `providers` below.
//   3. Add it to the provider select options in src/pkjs/config.js.
//
// The watch app and the AppMessage protocol are provider-agnostic; nothing
// else needs to change.

var providers = {
  tandoor: require('./tandoor')
};

module.exports = {
  get: function (id) {
    return providers[id] || providers.tandoor;
  },
  all: providers
};
