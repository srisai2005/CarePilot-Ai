/* Tiny global state + shared formatting helpers used across pages. */
const Store = {
  recordsCache: null,
  lastRoute: '/',
  languages: [], // populated from /api/languages on boot: [{code, label, ttsVoice}]
  get language() {
    return localStorage.getItem('carepilot_language') || 'en-US';
  },
  set language(code) {
    localStorage.setItem('carepilot_language', code);
  },
  languageInfo(code = Store.language) {
    return Store.languages.find((l) => l.code === code) || { code, label: code, ttsVoice: 'en-US-JennyNeural' };
  },
};

const Fmt = {
  date(d) {
    if (!d) return '—';
    const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },
  dateShort(d) {
    if (!d) return { day: '--', month: '---' };
    const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
    if (isNaN(dt.getTime())) return { day: '--', month: '---' };
    return {
      day: dt.getDate(),
      month: dt.toLocaleDateString('en-US', { month: 'short' }),
    };
  },
  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return Fmt.date(iso);
  },
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  },
  markdownLite(md) {
    if (!md) return '';
    let html = Fmt.escapeHtml(md);
    html = html.replace(/^### (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*)$/gm, '<h4>$1</h4>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|\n)[-*] (.*)/g, '$1<li>$2</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, (m) => `<ul>${m}</ul>`);
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.split(/\n{2,}/).map((block) => {
      if (/^<h4>|^<ul>/.test(block.trim())) return block;
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    }).join('');
    return html;
  },
  docIcon(docType) {
    const t = (docType || '').toLowerCase();
    if (t.includes('lab')) return '🧪';
    if (t.includes('voice')) return '🎙️';
    if (t.includes('photo') || t.includes('medicine')) return '💊';
    if (t.includes('prescription')) return '📋';
    return '📄';
  },
};

const DOC_TYPES = ['Prescription', 'Lab Report', 'Medicine Label', 'Doctor Voice Note', 'Document'];
