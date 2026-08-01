const RecordDetailPage = {
  async render(container, params) {
    container.innerHTML = `<div class="page">${Loader.inline('Loading record…')}</div>`;
    let record;
    try {
      ({ record } = await API.getRecord(params.id));
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="glass card">⚠️ ${Fmt.escapeHtml(err.message)}</div></div>`;
      return;
    }

    const simplifiedLevels = record.simplifiedSummaries || [];
    const currentLevel = simplifiedLevels.length; // 0 = original
    const currentSummary = currentLevel ? simplifiedLevels[currentLevel - 1] : record.summaryMarkdown;
    const atMax = currentLevel >= 3;

    container.innerHTML = `
      <div class="page page-enter">
        <a href="#/dashboard" class="dim" style="font-size:13px;">← Back to dashboard</a>

        <div class="row-between mt-16 mb-24" style="flex-wrap:wrap;gap:12px;">
          <div class="row gap-12">
            <div class="icon-chip glass" style="width:52px;height:52px;font-size:24px;">${Fmt.docIcon(record.docType)}</div>
            <div>
              <h1 class="h2">${Fmt.escapeHtml(record.fileName)}</h1>
              <div class="dim">${Fmt.escapeHtml(record.docType)} · Uploaded ${Fmt.date(record.uploadedAt)}</div>
            </div>
          </div>
          <div class="row gap-12">
            <button class="btn btn-sm glass" id="tts-btn">🔊 Read summary aloud</button>
            <button class="btn btn-sm btn-danger glass" id="delete-btn">Delete</button>
          </div>
        </div>

        <div class="grid detail-grid">
          <div class="stagger" style="display:flex;flex-direction:column;gap:18px;">
            <div class="glass card">
              <div class="row-between mb-12" style="flex-wrap:wrap;gap:8px;">
                <h3 class="h3">🧠 Plain-language summary</h3>
                ${currentLevel ? `<span class="badge badge-accent2">Simplified ×${currentLevel}</span>` : ''}
              </div>
              <div id="summary-html">${Fmt.markdownLite(currentSummary)}</div>
              <div class="row gap-12 mt-16" style="flex-wrap:wrap;">
                <button class="btn btn-sm glass" id="simplify-btn" ${atMax ? 'disabled' : ''}>
                  ${atMax ? '✅ Already at the simplest level' : '🧸 Still confusing? Explain even simpler'}
                </button>
              </div>
              <div id="tts-player"></div>
            </div>

            ${record.medicines?.length ? `
            <div class="glass card">
              <h3 class="h3 mb-12">💊 Medicines</h3>
              <div class="grid grid-2">
                ${record.medicines.map((m) => `
                  <div class="med-pill">
                    <div class="med-name">${Fmt.escapeHtml(m.name)}</div>
                    <div class="med-detail">${[m.dosage, m.frequency, m.duration].filter(Boolean).map(Fmt.escapeHtml).join(' · ') || '—'}</div>
                    <span class="badge badge-accent2 mt-8" style="width:fit-content;">${m.timing || 'Multiple'}</span>
                  </div>`).join('')}
              </div>
            </div>` : ''}

            ${record.tests?.length ? `
            <div class="glass card">
              <h3 class="h3 mb-12">🧪 Test results</h3>
              ${record.tests.map((t) => `
                <div class="kv-row">
                  <span>${Fmt.escapeHtml(t.name)}</span>
                  <span class="muted">${Fmt.escapeHtml(t.result || '—')}${t.referenceRange ? ` <span class="dim">(ref: ${Fmt.escapeHtml(t.referenceRange)})</span>` : ''}</span>
                </div>`).join('')}
            </div>` : ''}

            <div class="glass card">
              <h3 class="h3 mb-12">📄 Extracted text</h3>
              <div class="raw-text-box">${Fmt.escapeHtml(record.rawText)}</div>
            </div>
          </div>

          <div class="stagger" style="display:flex;flex-direction:column;gap:18px;">
            <div class="glass card">
              <h3 class="h3 mb-12">Details</h3>
              <div class="kv-row"><span class="dim">Hospital / Clinic</span><span>${Fmt.escapeHtml(record.hospitalOrClinic || '—')}</span></div>
              <div class="kv-row"><span class="dim">Doctor(s)</span><span>${(record.doctors || []).map(Fmt.escapeHtml).join(', ') || '—'}</span></div>
              <div class="kv-row"><span class="dim">Document date</span><span>${Fmt.date(record.documentDate)}</span></div>
              ${record.followUp?.date ? `<div class="kv-row"><span class="dim">Follow-up</span><span>${Fmt.date(record.followUp.date)}</span></div>` : ''}
            </div>

            ${record.dates?.length ? `
            <div class="glass card">
              <h3 class="h3 mb-12">📆 Key dates</h3>
              ${record.dates.map((d) => `<div class="kv-row"><span class="dim">${Fmt.escapeHtml(d.label)}</span><span>${Fmt.date(d.date)}</span></div>`).join('')}
            </div>` : ''}

            <div class="glass card">
              <h3 class="h3 mb-12">💬 Ask about this record</h3>
              <p class="dim mb-12" style="font-size:13px;">Jump into AI Chat with a question about this document already typed in.</p>
              <a href="#/chat?ask=${encodeURIComponent(`Can you explain my ${record.docType.toLowerCase()} "${record.fileName}" in simple terms?`)}" class="btn btn-primary btn-block">Ask AI about this record</a>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this record permanently?')) return;
      try {
        await API.deleteRecord(record.id);
        Toast.success('Record deleted.');
        location.hash = '#/dashboard';
      } catch (err) {
        Toast.error(err.message);
      }
    });

    document.getElementById('tts-btn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const summaryEl = document.getElementById('summary-html');
      const plainText = summaryEl.textContent;
      btn.disabled = true;
      btn.textContent = '🔊 Generating audio…';
      try {
        const url = await API.ttsAudioUrl(plainText);
        document.getElementById('tts-player').innerHTML = `<audio controls autoplay src="${url}" style="width:100%;margin-top:12px;"></audio>`;
      } catch (err) {
        Toast.error(err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔊 Read summary aloud';
      }
    });

    const simplifyBtn = document.getElementById('simplify-btn');
    if (simplifyBtn) {
      simplifyBtn.addEventListener('click', async () => {
        simplifyBtn.disabled = true;
        simplifyBtn.textContent = '🧸 Making this simpler…';
        try {
          const { record: updated, alreadyAtSimplest } = await API.simplifyRecord(record.id);
          record.simplifiedSummaries = updated.simplifiedSummaries;
          const levels = record.simplifiedSummaries || [];
          const newSummary = levels[levels.length - 1];
          document.getElementById('summary-html').innerHTML = Fmt.markdownLite(newSummary);
          const badgeHost = simplifyBtn.closest('.glass.card').querySelector('.row-between');
          const existingBadge = badgeHost.querySelector('.badge');
          if (existingBadge) existingBadge.remove();
          badgeHost.insertAdjacentHTML('beforeend', `<span class="badge badge-accent2">Simplified ×${levels.length}</span>`);
          if (alreadyAtSimplest) {
            simplifyBtn.textContent = '✅ Already at the simplest level';
            simplifyBtn.disabled = true;
          } else {
            simplifyBtn.textContent = '🧸 Still confusing? Explain even simpler';
            simplifyBtn.disabled = false;
          }
          Toast.success('Explained more simply.');
        } catch (err) {
          Toast.error(err.message);
          simplifyBtn.disabled = false;
          simplifyBtn.textContent = '🧸 Still confusing? Explain even simpler';
        }
      });
    }
  },
};
