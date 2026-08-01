const TimelinePage = {
  async render(container) {
    container.innerHTML = `<div class="page">${Loader.inline('Building your timeline…')}</div>`;
    let records = [];
    try {
      ({ records } = await API.listRecords());
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="glass card">⚠️ ${Fmt.escapeHtml(err.message)}</div></div>`;
      return;
    }

    const sorted = [...records].sort((a, b) => {
      const da = new Date(a.documentDate || a.uploadedAt);
      const db_ = new Date(b.documentDate || b.uploadedAt);
      return db_ - da;
    });

    container.innerHTML = `
      <div class="page page-enter" style="max-width:820px;">
        <div class="eyebrow">Health Timeline</div>
        <h1 class="h2 mb-24">Your care history</h1>
        ${sorted.length ? `
          <div class="timeline">
            ${sorted.map((r) => `
              <div class="timeline-item">
                <div class="timeline-date">${Fmt.date(r.documentDate || r.uploadedAt)}</div>
                <a href="#/records/${r.id}" class="glass card card-hover" style="display:block;">
                  <div class="row gap-12 mb-8">
                    <span>${Fmt.docIcon(r.docType)}</span>
                    <span style="font-weight:700;">${Fmt.escapeHtml(r.fileName)}</span>
                    <span class="badge">${Fmt.escapeHtml(r.docType)}</span>
                  </div>
                  <div class="dim" style="font-size:13.5px;">${Fmt.escapeHtml((r.summaryMarkdown || '').replace(/[#*-]/g, '')).slice(0, 140)}…</div>
                </a>
              </div>`).join('')}
          </div>
        ` : `
          <div class="glass card" style="text-align:center;padding:60px 24px;">
            <div style="font-size:40px;">🗓️</div>
            <p class="dim mt-8">No records yet — upload something to start your timeline.</p>
            <a href="#/upload" class="btn btn-primary mt-16">Upload a document</a>
          </div>
        `}
      </div>
    `;
  },
};
