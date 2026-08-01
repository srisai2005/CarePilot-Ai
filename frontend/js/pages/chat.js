const ChatPage = {
  sending: false,

  async render(container, params) {
    container.innerHTML = `
      <div class="page page-enter">
        <div class="eyebrow">AI Chat</div>
        <h1 class="h2 mb-8">Ask about your records — or anything medical</h1>
        <p class="dim mb-24">
          Ask about your own uploaded documents, or ask general questions like "what is an
          antibiotic?" or "what does HbA1c mean?". Answers are always explained simply, and
          CarePilot AI never diagnoses or recommends treatment.
        </p>

        <div class="glass chat-shell">
          <div class="chat-window">
            <div class="chat-messages" id="chat-messages"></div>
            <div class="chat-input-row">
              <textarea class="textarea" id="chat-input" rows="1" placeholder="e.g. What is Amoxicillin for? Or: what does BP mean?"></textarea>
              <button class="btn btn-primary btn-icon" id="chat-send" title="Send">➤</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const messagesEl = document.getElementById('chat-messages');
    let history = [];
    try {
      ({ history } = await API.chatHistory());
    } catch (_) { /* ignore, start fresh */ }

    if (history.length) {
      messagesEl.innerHTML = history.map((m) => this._bubble(m)).join('');
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else {
      messagesEl.innerHTML = `
        <div class="chat-empty">
          <div style="font-size:34px;">💬</div>
          <div class="h3 mt-8 mb-8">Ask me anything medical</div>
          <p class="dim">I can explain your uploaded documents, or just answer general questions — try one below.</p>
          <div class="suggested-q">
            <button class="btn btn-sm glass suggested">What medicines am I currently taking?</button>
            <button class="btn btn-sm glass suggested">When is my next follow-up appointment?</button>
            <button class="btn btn-sm glass suggested">What does CBC mean?</button>
            <button class="btn btn-sm glass suggested">What is an antibiotic?</button>
            <button class="btn btn-sm glass suggested">What is blood pressure?</button>
          </div>
        </div>`;
      messagesEl.querySelectorAll('.suggested').forEach((btn) => {
        btn.addEventListener('click', () => this._send(btn.textContent));
      });
    }

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    sendBtn.addEventListener('click', () => this._send(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this._send(input.value);
      }
    });

    // Support deep links like #/chat?ask=... (used by "Ask AI about this" on the dashboard)
    const prefill = params?.query?.get ? params.query.get('ask') : null;
    if (prefill) {
      this._send(prefill);
    }
  },

  _bubble(m) {
    const body = m.role === 'assistant' ? Fmt.markdownLite(m.content) : Fmt.escapeHtml(m.content);
    const sources = (m.sources || []).length
      ? `<div class="msg-sources">${m.sources.map((s) => `<span class="badge badge-accent2">${Fmt.docIcon(s.docType)} ${Fmt.escapeHtml(s.docType)} · ${Fmt.date(s.date)}</span>`).join('')}</div>`
      : '';
    return `<div class="msg ${m.role}">${body}${sources}</div>`;
  },

  async _send(text) {
    const question = (text || '').trim();
    if (!question || this.sending) return;
    this.sending = true;

    const messagesEl = document.getElementById('chat-messages');
    if (messagesEl.querySelector('.chat-empty')) messagesEl.innerHTML = '';

    messagesEl.insertAdjacentHTML('beforeend', this._bubble({ role: 'user', content: question }));
    const typingId = `typing-${Date.now()}`;
    messagesEl.insertAdjacentHTML('beforeend', `
      <div class="msg assistant" id="${typingId}">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>`);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    const input = document.getElementById('chat-input');
    if (input) input.value = '';

    try {
      const result = await API.askChat(question);
      document.getElementById(typingId)?.remove();
      messagesEl.insertAdjacentHTML('beforeend', this._bubble({
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
      }));
    } catch (err) {
      document.getElementById(typingId)?.remove();
      messagesEl.insertAdjacentHTML('beforeend', this._bubble({
        role: 'assistant',
        content: `⚠️ ${err.message}`,
      }));
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
    this.sending = false;
  },
};
