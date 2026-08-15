// Clay configuration for tandooPEB.
// Values are stored by Clay in localStorage under 'clay-settings',
// keyed by the messageKey fields below (read in index.js).

module.exports = [
  {
    type: 'heading',
    defaultValue: 'tandooPEB settings'
  },
  {
    type: 'text',
    defaultValue: 'Shopping list provider and connection details. ' +
                  'Changes apply after pressing Save.'
  },
  {
    type: 'select',
    messageKey: 'provider',
    label: 'Provider',
    defaultValue: 'tandoor',
    options: [
      { label: 'Tandoor Recipes', value: 'tandoor' }
    ]
  },
  {
    type: 'input',
    messageKey: 'serverUrl',
    label: 'Server URL',
    defaultValue: '',
    attributes: {
      placeholder: 'https://recipes.example.com'
    }
  },
  {
    type: 'input',
    messageKey: 'apiToken',
    label: 'API token',
    defaultValue: '',
    attributes: {
      placeholder: 'Tandoor: Settings > API Token'
    }
  },
  {
    type: 'text',
    defaultValue: 'In Tandoor, find your token under Settings / API Token. ' +
                  'On the watch: SELECT checks an item, SELECT the top row syncs.'
  },
  {
    type: 'submit',
    defaultValue: 'Save'
  }
];
