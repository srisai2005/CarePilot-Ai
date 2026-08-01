const DashboardPage = {
  _records: [],

  async render(container) {
    container.innerHTML = `<div class="page">${Loader.fullPage()}</div>`;

    let records = [];
    let reminders = [];
    try {
      [{ records }, { reminders }] = await Promise.all([API.listRecords(), API.listReminders()]);
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="glass card">⚠️ ${Fmt.escapeHtml(err.message)}</div></div>`;
      return;
    }

    this._records = records;
    const upcoming = reminders.filter((r) => !r.done).slice(0, 3);
    const medCount = records.reduce((sum, r) => sum + (r.medicines?.length || 0), 0);

    container.innerHTML = `
      <div class="page page-enter">
        <div class="row-between mb-24" style="flex-wrap:wrap;gap:12px;">
          <div>
            <div class="eyebrow">Dashboard</div>
            <h1 class="h2">Your medical records</h1>
            <p class="dim mt-8" style="max-width:520px;">
              Tap any card below to open it up and see the plain-language summary, listen to it,
              or ask the AI about it — right here, no extra clicks.
            </p>
          </div>
          <a href="#/upload" class="btn btn-primary">+ Upload document</a>
        </div>

        <div class="grid grid-4 mb-24 stagger" id="stat-cards"></div>

        ${upcoming.length ? `
        <div class="glass card mb-24">
          <div class="row-between mb-12">
            <h3 class="h3">⏰ Upcoming follow-ups</h3>
            <a href="#/reminders" class="dim" style="font-size:13px;">View all →</a>
          </div>
          <div class="grid grid-3">
            ${upcoming.map((r) => `
              <a href="#/reminders" class="glass card card-hover" style="padding:14px;display:block;">
                <div style="font-weight:700;font-size:13.5px;">${Fmt.escapeHtml(r.title)}</div>
                <div class="dim" style="font-size:12px;">${Fmt.date(r.date)}</div>
              </a>`).join('')}
          </div>
        </div>` : ''}

        <div class="row-between mb-16">
          <h3 class="h3">All records</h3>
        </div>

        ${records.length ? `
          <div class="grid grid-3 stagger" id="records-grid"></div>
        ` : `
          <div class="glass card" style="text-align:center; padding:60px 24px;">
            <div style="font-size:40px;margin-bottom:10px;">🗂️</div>
            <div class="h3 mb-8">No records yet</div>
            <p class="dim mb-16">Upload your first prescription, lab report, or voice note to get started.</p>
            <a href="#/upload" class="btn btn-primary">Upload a document</a>
          </div>
        `}
      </div>
    `;

    document.getElementById('stat-cards').innerHTML = `
      <a href="#/dashboard" class="glass card card-hover" style="display:block;">${this._statInner('Total Records', records.length, '📁', 'badge-accent2')}</a>
      <a href="#/schedule" class="glass card card-hover" style="display:block;">${this._statInner('Medicines Tracked', medCount, '💊', 'badge-good')}</a>
      <a href="#/reminders" class="glass card card-hover" style="display:block;">${this._statInner('Upcoming Reminders', reminders.filter((r) => !r.done).length, '⏰', 'badge-warn')}</a>
      <a href="#/timeline" class="glass card card-hover" style="display:block;">${this._statInner('Documents This Month', records.filter((r) => this._isThisMonth(r.uploadedAt)).length, '📆', 'badge-accent2')}</a>
    `;

    if (records.length) {
      const grid = document.getElementById('records-grid');
      grid.innerHTML = records.map((r) => this._recordCard(r)).join('');
      this._wireCards(grid);
    }
  },

  _statInner(label, value, icon, badgeClass) {
    return `
      <div class="row-between mb-12">
        <span class="badge ${badgeClass}"><span class="badge-dot"></span>${label}</span>
        <span style="font-size:20px;">${icon}</span>
      </div>
      <div class="h2">${value}</div>`;
  },

  _isThisMonth(iso) {
    const d = new Date(iso);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  },

  _recordCard(r) {
    const plainSummary = (r.summaryMarkdown || '').replace(/[#*_`]/g, '').replace(/^- /gm, '• ');
    return `
      <div class="glass record-card card-hover" data-id="${r.id}">
        <div class="record-card-header" data-action="toggle">
          <div class="row gap-12">
            <div class="icon-chip">${Fmt.docIcon(r.docType)}</div>
            <div>
              <div class="title">${Fmt.escapeHtml(r.fileName)}</div>
              <div class="meta">${Fmt.escapeHtml(r.docType)} · ${Fmt.timeAgo(r.uploadedAt)}</div>
              <div class="tags">
                ${r.medicines?.length ? `<span class="badge badge-good">${r.medicines.length} medicine${r.medicines.length > 1 ? 's' : ''}</span>` : ''}
                ${r.followUp?.date ? `<span class="badge badge-warn">Follow-up ${Fmt.date(r.followUp.date)}</span>` : ''}
                ${r.tests?.length ? `<span class="badge badge-accent2">${r.tests.length} test${r.tests.length > 1 ? 's' : ''}</span>` : ''}
              </div>
            </div>
          </div>
          <span class="record-card-chevron">▾</span>
        </div>
        <div class="record-card-body">
          <div class="summary-preview">${Fmt.escapeHtml(plainSummary).slice(0, 220)}${plainSummary.length > 220 ? '…' : ''}</div>
          <div class="quick-actions">
            <button class="btn btn-sm glass" data-action="listen">🔊 Listen</button>
            <button class="btn btn-sm glass" data-action="ask">💬 Ask AI about this</button>
            <a href="#/records/${r.id}" class="btn btn-sm btn-primary">Open full record →</a>
            <button class="btn btn-sm btn-danger glass" data-action="delete">🗑️ Delete</button>
          </div>
        </div>
      </div>`;
  },

  _wireCards(grid) {
    grid.querySelectorAll('.record-card').forEach((card) => {
      const id = card.dataset.id;
      const record = this._records.find((r) => r.id === id);

      card.querySelector('[data-action="toggle"]').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });

      const listenBtn = card.querySelector('[data-action="listen"]');
      listenBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const plainText = (record.summaryMarkdown || '').replace(/[#*_`-]/g, '');
        listenBtn.disabled = true;
        listenBtn.textContent = '🔊 Loading…';
        try {
          const url = await API.ttsAudioUrl(plainText);
          const audio = new Audio(url);
          audio.play();
        } catch (err) {
          Toast.error(err.message);
        } finally {
          listenBtn.disabled = false;
          listenBtn.textContent = '🔊 Listen';
        }
      });

      const askBtn = card.querySelector('[data-action="ask"]');
      askBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const question = `Can you explain my ${record.docType.toLowerCase()} "${record.fileName}" in simple terms?`;
        location.hash = `#/chat?ask=${encodeURIComponent(question)}`;
      });

      const deleteBtn = card.querySelector('[data-action="delete"]');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${record.fileName}"? This can't be undone.`)) return;
        try {
          await API.deleteRecord(id);
          card.remove();
          Toast.success('Record deleted.');
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  },
};
