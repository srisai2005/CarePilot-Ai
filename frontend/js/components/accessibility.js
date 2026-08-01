/**
 * Simple "larger text" accessibility mode aimed at elderly users and kids —
 * bumps font sizes across the app and persists the choice in localStorage.
 */
const A11y = {
  KEY: 'carepilot-large-text',

  init() {
    if (localStorage.getItem(this.KEY) === 'true') {
      document.body.classList.add('large-text');
    }
  },

  isActive() {
    return document.body.classList.contains('large-text');
  },

  toggle() {
    const active = document.body.classList.toggle('large-text');
    localStorage.setItem(this.KEY, active ? 'true' : 'false');
    return active;
  },
};
