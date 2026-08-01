const SchedulePage = {
  async render(container) {
    container.innerHTML = `<div class="page">${Loader.inline('Building your medicine schedule…')}</div>`;
    let schedule;
    try {
      ({ schedule } = await API.getSchedule());
    } catch (err) {
      container.innerHTML = `<div class="page"><div class="glass card">⚠️ ${Fmt.escapeHtml(err.message)}</div></div>`;
      return;
    }

    const totalMeds = Object.values(schedule).reduce((sum, arr) => sum + arr.length, 0);

    container.innerHTML = `
      <div class="page page-enter">
        <div class="eyebrow">Medicine Schedule</div>
        <h1 class="h2 mb-8">When to take what</h1>
        <p class="dim mb-24">
          Pulled automatically from every prescription you've uploaded, sorted into
          <strong>Morning</strong>, <strong>Afternoon</strong>, and <strong>Night</strong> so it's easy to
          follow at a glance.
        </p>

        ${totalMeds ? `
          <div class="grid grid-3 stagger">
            ${ScheduleCard.renderColumn('Morning', schedule.Morning)}
            ${ScheduleCard.renderColumn('Afternoon', schedule.Afternoon)}
            ${ScheduleCard.renderColumn('Night', schedule.Night)}
          </div>
          ${schedule.Multiple.length ? `
          <div class="mt-24">
            ${ScheduleCard.renderColumn('Multiple / Unclear timing', schedule.Multiple)}
          </div>` : ''}
          <div class="glass card mt-24" style="text-align:center;">
            <p class="dim">Not sure what a dose or abbreviation means?</p>
            <a href="#/dictionary" class="btn btn-sm glass mt-8">📖 Open the medical dictionary</a>
            <a href="#/chat" class="btn btn-sm glass mt-8">💬 Ask the AI chat</a>
          </div>
        ` : `
          <div class="glass card" style="text-align:center;padding:60px 24px;">
            <div style="font-size:40px;">💊</div>
            <div class="h3 mt-8 mb-8">No medicines found yet</div>
            <p class="dim mb-16">Upload a prescription and CarePilot AI will build your schedule automatically.</p>
            <a href="#/upload?type=Prescription" class="btn btn-primary">Upload a prescription</a>
          </div>
        `}
      </div>
    `;
  },
};
