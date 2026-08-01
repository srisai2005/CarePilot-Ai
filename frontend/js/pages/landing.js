const LandingPage = {
  render(container) {
    container.innerHTML = `
      <div class="page-enter">
        <section class="hero">
          <div class="hero-badge-row stagger">
            <span class="badge badge-accent2">🔷 Azure AI Vision</span>
            <span class="badge badge-accent2">🔷 Azure AI Language</span>
            <span class="badge badge-accent2">🔷 Azure OpenAI</span>
            <span class="badge badge-accent2">🔷 Azure AI Search</span>
            <span class="badge badge-accent2">🔷 Azure AI Speech</span>
          </div>
          <div class="eyebrow animate-fadeup">Season of AI 2.0 · Final Capstone</div>
          <h1 class="h1 animate-fadeup">
            Understand what happened<br/>at the hospital — <span class="gradient-text">in plain language.</span>
          </h1>
          <p class="sub animate-fadeup">
            Upload a prescription, lab report, medicine label, or a recording of the doctor's
            instructions. CarePilot AI reads it, explains it so simply that kids and grandparents
            can follow along, builds your medicine schedule, and answers any medical question —
            from your own records or medical terms in general.
          </p>
          <div class="hero-cta animate-fadeup">
            <a href="#/upload" class="btn btn-primary">Upload your first document →</a>
            <a href="#/dashboard" class="btn btn-ghost glass">View dashboard</a>
          </div>
          <p class="hero-disclaimer animate-fadeup">
            ⚠️ CarePilot AI explains and organizes documents your clinician already wrote, and
            answers general medical questions. It does not diagnose conditions or recommend
            treatments — always follow your doctor's advice.
          </p>
        </section>

        <section class="page">
          <div class="row-between mb-24">
            <h2 class="h2">Everything after your visit, in one place</h2>
          </div>
          <p class="dim mb-16" style="margin-top:-10px;">Tap any card below to jump straight in.</p>
          <div class="grid grid-3 feature-grid stagger">
            ${this._feature('📋', 'Prescriptions & Lab Reports', 'Azure AI Vision OCR reads scanned or photographed documents, even messy handwriting-adjacent print.', '#/upload?type=' + encodeURIComponent('Prescription'))}
            ${this._feature('💊', 'Medicine Photos', 'Snap a photo of a medicine strip or bottle label to get its name, dosage, and purpose explained.', '#/upload?type=' + encodeURIComponent('Medicine Label'))}
            ${this._feature('🎙️', 'Doctor Voice Notes', "Record or upload what the doctor said — Azure AI Speech transcribes it, then we structure the instructions.", '#/upload?type=' + encodeURIComponent('Doctor Voice Note'))}
            ${this._feature('🧠', 'Plain-Language Summaries', 'Azure OpenAI turns dense medical text into a short, clear explanation anyone can understand — and can simplify it even further on request.', '#/dashboard')}
            ${this._feature('⏰', 'Schedule & Reminders', 'Medicines are automatically sorted into Morning / Afternoon / Night, with follow-up visits tracked.', '#/schedule')}
            ${this._feature('💬', 'Private AI Chat', 'Ask anything — about your own uploaded records, or general medical terms and questions — explained clearly for every age.', '#/chat')}
          </div>
        </section>

        <section class="page">
          <div class="glass card" style="padding:36px;">
            <div class="eyebrow mb-12">How it works</div>
            <div class="flow-strip">
              <span class="flow-step">1. Upload document</span>
              <span class="flow-arrow">→</span>
              <span class="flow-step">2. OCR / Speech-to-text</span>
              <span class="flow-arrow">→</span>
              <span class="flow-step">3. AI extraction &amp; summary</span>
              <span class="flow-arrow">→</span>
              <span class="flow-step">4. Schedule + reminders</span>
              <span class="flow-arrow">→</span>
              <span class="flow-step">5. Ask anything, anytime</span>
            </div>
          </div>
        </section>

        <section class="cta-band">
          <h2 class="h2">Ready to make sense of your paperwork?</h2>
          <p>No signup friction — start uploading right away.</p>
          <a href="#/upload" class="btn btn-primary">Get started</a>
        </section>
      </div>
    `;
  },

  _feature(icon, title, body, href) {
    return `
      <a href="${href}" class="glass feature-card card-hover feature-card-link">
        <div class="feature-icon">${icon}</div>
        <h3>${title}</h3>
        <p>${body}</p>
        <span class="feature-try">Try it <span class="feature-try-arrow">→</span></span>
      </a>`;
  },
};
