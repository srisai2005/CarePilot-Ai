const GlassCard = {
  open(extraClass = '') {
    return `<div class="glass card ${extraClass}">`;
  },
  close() {
    return `</div>`;
  },
  statCard(label, value, icon, badgeClass = 'badge-accent2') {
    return `
      <div class="glass card card-hover">
        <div class="row-between mb-12">
          <span class="badge ${badgeClass}"><span class="badge-dot"></span>${label}</span>
          <span style="font-size:20px;">${icon}</span>
        </div>
        <div class="h2">${value}</div>
      </div>`;
  },
};
