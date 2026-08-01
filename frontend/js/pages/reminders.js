const RemindersPage = {
  async render(container) {
    container.innerHTML = `<div class="page">${Loader.inline('Loading reminders…')}</div>`;
    let reminders = [];
    try {
      ({ reminders } = await API.listReminders());
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="glass card">⚠️ ${Fmt.escapeHtml(err.message)}</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="page page-enter" style="max-width:760px;">
        <div class="row-between mb-8">
          <div>
            <div class="eyebrow">Reminders</div>
            <h1 class="h2">Follow-ups &amp; appointments</h1>
          </div>
          <button class="btn btn-primary btn-sm" id="add-reminder-btn">+ New reminder</button>
        </div>
        <p class="dim mb-24">Follow-up dates found in your documents are added automatically.</p>

        <form id="reminder-form" class="glass card mb-24" style="display:none;">
          <div class="grid grid-2 mb-12">
            <input class="input" id="rf-title" placeholder="Title (e.g. Cardiologist follow-up)" required />
            <input class="input" id="rf-date" type="date" required />
          </div>
          <textarea class="textarea mb-12" id="rf-notes" placeholder="Notes (optional)"></textarea>
          <button class="btn btn-primary" type="submit">Save reminder</button>
        </form>

        <div id="reminders-list" class="stagger" style="display:flex;flex-direction:column;gap:12px;"></div>
      </div>
    `;

    const addBtn = document.getElementById('add-reminder-btn');
    const form = document.getElementById('reminder-form');
    addBtn.addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await API.createReminder({
          title: document.getElementById('rf-title').value,
          date: document.getElementById('rf-date').value,
          notes: document.getElementById('rf-notes').value,
        });
        Toast.success('Reminder added.');
        this.render(container);
      } catch (err) {
        Toast.error(err.message);
      }
    });

    this._renderList(reminders);
  },

  _renderList(reminders) {
    const listEl = document.getElementById('reminders-list');
    if (!reminders.length) {
      listEl.innerHTML = `<div class="glass card" style="text-align:center;padding:50px 24px;">
        <div style="font-size:36px;">⏰</div>
        <p class="dim mt-8">No reminders yet.</p>
      </div>`;
      return;
    }

    const sorted = [...reminders].sort((a, b) => new Date(a.date) - new Date(b.date));
    listEl.innerHTML = sorted.map((r) => {
      const { day, month } = Fmt.dateShort(r.date);
      return `
      <div class="glass reminder-row ${r.done ? 'done' : ''}" data-id="${r.id}">
        <div class="reminder-date-chip"><span class="d">${day}</span><span class="m">${month}</span></div>
        <div style="flex:1;">
          <div style="font-weight:700;">${Fmt.escapeHtml(r.title)}</div>
          ${r.notes ? `<div class="dim" style="font-size:12.5px;">${Fmt.escapeHtml(r.notes)}</div>` : ''}
        </div>
        <div class="check-circle ${r.done ? 'checked' : ''}" data-action="toggle">${r.done ? '✓' : ''}</div>
        <button class="btn btn-icon btn-ghost" data-action="delete" style="font-size:15px;">🗑️</button>
      </div>`;
    }).join('');

    listEl.querySelectorAll('[data-action="toggle"]').forEach((el) => {
      el.addEventListener('click', async () => {
        const row = el.closest('.reminder-row');
        const id = row.dataset.id;
        const nowDone = !row.classList.contains('done');
        try {
          await API.markReminderDone(id, nowDone);
          row.classList.toggle('done', nowDone);
          el.classList.toggle('checked', nowDone);
          el.textContent = nowDone ? '✓' : '';
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });

    listEl.querySelectorAll('[data-action="delete"]').forEach((el) => {
      el.addEventListener('click', async () => {
        const row = el.closest('.reminder-row');
        const id = row.dataset.id;
        if (!confirm('Delete this reminder?')) return;
        try {
          await API.deleteReminder(id);
          row.remove();
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });
  },
};
