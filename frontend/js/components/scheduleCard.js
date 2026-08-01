const ScheduleCard = {
  SLOT_ICONS: { Morning: '🌅', Afternoon: '☀️', Night: '🌙', Multiple: '🔁' },

  renderColumn(slot, meds) {
    return `
      <div class="glass schedule-col">
        <h3><span>${this.SLOT_ICONS[slot] || '💊'}</span> ${slot}</h3>
        ${meds.length
          ? meds.map((m) => `
            <div class="med-pill">
              <div class="med-name">${Fmt.escapeHtml(m.name)}</div>
              <div class="med-detail">
                ${[m.dosage, m.frequency, m.duration].filter(Boolean).map(Fmt.escapeHtml).join(' · ') || 'See prescription for details'}
              </div>
              <div class="med-detail dim">from ${Fmt.escapeHtml(m.docType)} · ${Fmt.date(m.addedOn)}</div>
            </div>`).join('')
          : `<div class="empty-slot">No medicines scheduled for ${slot.toLowerCase()}.</div>`
        }
      </div>`;
  },
};
