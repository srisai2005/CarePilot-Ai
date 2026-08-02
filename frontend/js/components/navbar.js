const Navbar = {
  links: [
    { href: '#/dashboard', label: 'Dashboard' },
    { href: '#/upload', label: 'Upload' },
    { href: '#/schedule', label: 'Schedule' },
    { href: '#/timeline', label: 'Timeline' },
    { href: '#/chat', label: 'AI Chat' },
    { href: '#/reminders', label: 'Reminders' },
    { href: '#/dictionary', label: 'Dictionary' },
  ],

  render(currentHash) {
    const nav = document.getElementById('navbar');
    const isLanding = currentHash === '' || currentHash === '#/';
    const largeTextOn = typeof A11y !== 'undefined' && A11y.isActive();

    nav.innerHTML = `
      <a class="brand" href="#/">
        <span class="brand-mark">🩺</span>
        <span>CarePilot <span class="gradient-text">AI</span></span>
      </a>
      ${isLanding ? '' : `
      <div class="nav-links">
        ${this.links.map(l => `<a class="nav-link ${currentHash === l.href ? 'active' : ''}" href="${l.href}">${l.label}</a>`).join('')}
      </div>`}
      <div class="nav-actions">
        ${isLanding ? '' : `
        <div class="global-search-wrap">
          <input class="input" id="global-search-input" placeholder="Search your records…" style="width:200px" />
          <div id="global-search-results"></div>
        </div>`}
        <select class="input btn-sm" id="language-select" title="Language for AI summaries, chat, and voice" style="width:auto;padding:6px 10px;">
          ${(Store.languages.length ? Store.languages : [{ code: 'en-US', label: 'English' }])
            .map((l) => `<option value="${l.code}" ${l.code === Store.language ? 'selected' : ''}>${Fmt.escapeHtml(l.label)}</option>`)
            .join('')}
        </select>
        <button class="btn btn-sm glass btn-icon" id="a11y-toggle" title="Make text bigger — helpful for older adults or kids" aria-pressed="${largeTextOn}">
          ${largeTextOn ? 'A<span style="font-size:16px;">A</span>' : 'Aa'}
        </button>
        <a href="#/upload" class="btn btn-primary btn-sm">+ Upload</a>
      </div>
    `;

    const langSelect = document.getElementById('language-select');
    if (langSelect) {
      langSelect.addEventListener('change', () => {
        Store.language = langSelect.value;
        Toast.info(`Language set to ${Store.languageInfo(langSelect.value).label}. New uploads, chat replies, and voice will use it.`);
      });
    }

    const a11yBtn = document.getElementById('a11y-toggle');
    if (a11yBtn) {
      a11yBtn.addEventListener('click', () => {
        const active = A11y.toggle();
        Toast.info(active ? 'Bigger text turned on.' : 'Bigger text turned off.');
        this.render(currentHash);
      });
    }

    if (!isLanding) this._wireSearch();
  },

  _wireSearch() {
    const input = document.getElementById('global-search-input');
    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      const q = input.value.trim();
      const resultsBox = document.getElementById('global-search-results');
      if (!q) { resultsBox.innerHTML = ''; resultsBox.className = ''; return; }
      debounce = setTimeout(async () => {
        try {
          const { results } = await API.search(q);
          resultsBox.className = 'glass global-search-results';
          resultsBox.innerHTML = results.length
            ? results.map(r => `
              <a class="search-result-row row-between" href="#/records/${r.recordId}">
                <span>
                  <div style="font-weight:700;font-size:13.5px;">${Fmt.docIcon(r.docType)} ${Fmt.escapeHtml(r.title)}</div>
                  <div class="dim" style="font-size:12px;">${Fmt.escapeHtml((r.snippet || '').slice(0, 90))}…</div>
                </span>
                <span class="dim" style="font-size:11px;">${Fmt.date(r.date)}</span>
              </a>`).join('')
            : `<div style="padding:16px;" class="dim">No matches yet — try another term.</div>`;
        } catch (err) {
          resultsBox.className = 'glass global-search-results';
          resultsBox.innerHTML = `<div style="padding:16px;" class="dim">${Fmt.escapeHtml(err.message)}</div>`;
        }
      }, 350);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.global-search-wrap')) {
        const box = document.getElementById('global-search-results');
        if (box) { box.innerHTML = ''; box.className = ''; }
      }
    });
  },
};
