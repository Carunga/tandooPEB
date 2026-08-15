# tandooPEB

Shopping list for your Pebble, synced with [Tandoor Recipes](https://github.com/TandoorRecipes/recipes).

## Features

- View your Tandoor shopping list directly on your watch
- Check items off with a single button press — changes sync back to the server
- Persists your list across watch restarts (no re-sync needed)
- Vibration feedback on check/uncheck and sync completion
- Status indicators: sync time, error messages, item count

## Setup

1. Install the `.pbw` on your Pebble (via [CloudPebble](https://cloudpebble.net), [Rebble](https://rebble.io), or sideload)
2. On your phone, open the Pebble app → Settings → **tandooPEB**
3. Enter your details:
   - **Server URL** — your Tandoor instance address (e.g. `https://recipes.example.com`)
   - **API Token** — found in Tandoor under **Settings → API Token**
4. Press **Save**
5. On the watch, select the top "Sync now" row to sync your shopping list

## Usage

| Action | Result |
|--------|--------|
| SELECT on an item | Toggle checked / unchecked |
| SELECT on "Sync now" | Start a sync |
| Long-press SELECT | Undo the last toggle |
| BACK with pending items | Asks to "Sync now" before leaving |
| BACK / DOWN in "Sync now?" dialog | Exit without syncing |
| SELECT in "Sync now?" dialog | Sync checked items, then exit |

Checked items are marked done on the server the next time you sync. If you leave the app with checked-but-unsynced items, you're prompted to sync first.

## Adding other providers

The app uses a provider system on the phone side — the watch UI and messaging protocol are fully provider-agnostic. Adding support for another shopping list backend (Bring!, Nextcloud Cookbook, Mealie, etc.) requires **no C changes**:

1. Create `src/pkjs/providers/<name>.js` implementing the interface:
   ```js
   module.exports = {
     id: 'myprovider',
     label: 'My Provider',
     fetchItems: function (cfg) {
       // cfg has: serverUrl, apiToken
       // return Promise<[{id: uint32, name: string, amount: string}]>
     },
     markDone: function (cfg, ids) {
       // ids is an array of uint32 entry IDs to mark done
       // return Promise<void>
     }
   };
   ```
2. Register it in `src/pkjs/providers/index.js`
3. Add it as an option in the provider dropdown in `src/pkjs/config.js`

## License

[GNU General Public License v3.0](LICENSE)
