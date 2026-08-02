/* Thin fetch wrapper for the CarePilot AI backend. */
const API = (() => {
  const BASE = '/api';

  async function request(path, { method = 'GET', body, headers, raw } = {}) {
    const opts = { method, headers: { ...headers } };
    if (body instanceof FormData) {
      opts.body = body;
    } else if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }

    const resp = await fetch(BASE + path, opts);

    if (raw) {
      if (!resp.ok) throw new Error(`Request failed (${resp.status})`);
      return resp;
    }

    let data = null;
    const text = await resp.text();
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = { error: text }; }

    if (!resp.ok) {
      const err = new Error((data && data.error) || `Request failed (${resp.status})`);
      err.status = resp.status;
      err.details = data && data.details;
      throw err;
    }
    return data;
  }

  return {
    health: () => request('/health'),
    languages: () => request('/languages'),

    uploadFile: (file, docType, onProgress) =>
      new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append('file', file);
        if (docType) fd.append('docType', docType);
        fd.append('language', Store.language);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', BASE + '/upload');
        xhr.upload.onprogress = (e) => {
          if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error || 'Upload failed'));
          } catch (err) {
            reject(err);
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(fd);
      }),

    listRecords: () => request('/records'),
    getRecord: (id) => request(`/records/${id}`),
    deleteRecord: (id) => request(`/records/${id}`, { method: 'DELETE' }),
    simplifyRecord: (id) => request(`/records/${id}/simplify`, { method: 'POST' }),

    getSchedule: () => request('/schedule'),

    listReminders: () => request('/reminders'),
    createReminder: (payload) => request('/reminders', { method: 'POST', body: payload }),
    markReminderDone: (id, done) => request(`/reminders/${id}/done`, { method: 'POST', body: { done } }),
    deleteReminder: (id) => request(`/reminders/${id}`, { method: 'DELETE' }),

    chatHistory: () => request('/chat/history'),
    askChat: (question) => request('/chat', { method: 'POST', body: { question, language: Store.language } }),

    dictionary: (q) => request(`/dictionary${q ? `?q=${encodeURIComponent(q)}` : ''}`),

    search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

    ttsAudioUrl: async (text, voice) => {
      const resp = await request('/speech/tts', {
        method: 'POST',
        body: { text, voice: voice || Store.languageInfo().ttsVoice },
        raw: true,
      });
      const blob = await resp.blob();
      return URL.createObjectURL(blob);
    },
  };
})();
