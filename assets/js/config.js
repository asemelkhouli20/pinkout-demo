// PinkOut Partners — site configuration. Change behaviour here, not in the modules.
export const CONFIG = {
  // null = preview mode: the form validates and reviews, but sends nothing.
  // Set to a same-origin URL that accepts JSON POST to turn sending on.
  applicationEndpoint: null,
  // Partner decks (one per type). Requested through the form, never linked publicly.
  decks: { event: null, beauty: null, shop: null },
  consumerSite: 'https://pinkoutsa.com',
  defaultLang: 'en',
};
