const DictionaryPage = {
  async render(container) {
    container.innerHTML = `
      <div class="page page-enter" style="max-width:760px;">
        <div class="eyebrow">Reference</div>
        <h1 class="h2 mb-8">Medical abbreviation dictionary</h1>
        <p class="dim mb-24">Quickly decode shorthand you see on prescriptions and lab reports.</p>
        <input class="input mb-16" id="dict-search" placeholder="Search e.g. 'BD', 'CBC', 'fasting'…" />
        <div id="dict-list" class="glass"></div>
      </div>
    `;

    const listEl = document.getElementById('dict-list');
    const searchInput = document.getElementById('dict-search');

    const load = async (q) => {
      listEl.innerHTML = Loader.inline('Searching…');
      try {
        const { entries } = await API.dictionary(q);
        listEl.innerHTML = entries.length
          ? entries.map((e) => `
            <div class="dict-row">
              <span class="dict-abbr">${Fmt.escapeHtml(e.abbr)}</span>
              <span class="dict-meaning">${Fmt.escapeHtml(e.meaning)}</span>
              <span class="badge">${Fmt.escapeHtml(e.category)}</span>
            </div>`).join('')
          : `<div style="padding:24px;" class="dim">No matches found.</div>`;
      } catch (err) {
        listEl.innerHTML = `<div style="padding:24px;">⚠️ ${Fmt.escapeHtml(err.message)}</div>`;
      }
    };

    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => load(searchInput.value.trim()), 250);
    });

    load('');
  },
};
