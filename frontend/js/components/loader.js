const Loader = {
  fullPage() {
    return `
      <div class="page">
        <div class="grid grid-3">
          ${Array.from({ length: 6 }).map(() => `<div class="skeleton" style="height:150px"></div>`).join('')}
        </div>
      </div>`;
  },
  inline(text = 'Loading…') {
    return `<div class="row gap-12" style="padding:24px; justify-content:center;">
      <div class="spinner"></div><span class="muted">${Fmt.escapeHtml(text)}</span>
    </div>`;
  },
  spinnerSmall() {
    return `<div class="spinner"></div>`;
  },
};
