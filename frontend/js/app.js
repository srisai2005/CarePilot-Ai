/**
 * Minimal hash router — no build step required. Each route maps to a page
 * module with a render(container, params) method (sync or async). Routes
 * can carry a query string, e.g. "#/upload?type=Prescription", which is
 * parsed into params.query (a URLSearchParams instance).
 */
const App = {
  routes: [
    { pattern: /^#\/$/, page: LandingPage },
    { pattern: /^#\/dashboard$/, page: DashboardPage },
    { pattern: /^#\/upload$/, page: UploadPage },
    { pattern: /^#\/schedule$/, page: SchedulePage },
    { pattern: /^#\/timeline$/, page: TimelinePage },
    { pattern: /^#\/chat$/, page: ChatPage },
    { pattern: /^#\/dictionary$/, page: DictionaryPage },
    { pattern: /^#\/reminders$/, page: RemindersPage },
    { pattern: /^#\/records\/([^/?]+)$/, page: RecordDetailPage, params: ['id'] },
  ],

  init() {
    if (typeof A11y !== 'undefined') A11y.init();
    window.addEventListener('hashchange', () => this._handleRoute());
    this._handleRoute();
  },

  _handleRoute() {
    const fullHash = location.hash || '#/';
    const [pathPart, queryPart] = fullHash.split('?');
    const query = new URLSearchParams(queryPart || '');
    const container = document.getElementById('main-content');

    for (const route of this.routes) {
      const match = pathPart.match(route.pattern);
      if (match) {
        const params = { query };
        (route.params || []).forEach((name, i) => (params[name] = decodeURIComponent(match[i + 1])));
        Navbar.render(pathPart);
        window.scrollTo(0, 0);
        Promise.resolve(route.page.render(container, params)).catch((err) => {
          console.error(err);
          Toast.error('Something went wrong loading this page.');
        });
        return;
      }
    }

    // Unknown route -> back to landing
    location.hash = '#/';
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
