const UploadPage = {
  selectedDocType: null,
  queue: [],

  DOC_TYPE_META: {
    'Prescription': '📋',
    'Lab Report': '🧪',
    'Medicine Label': '💊',
    'Doctor Voice Note': '🎙️',
    'Document': '📄',
  },

  render(container, params) {
    this.queue = [];
    const presetType = params?.query?.get ? params.query.get('type') : null;
    this.selectedDocType = DOC_TYPES.includes(presetType) ? presetType : null;

    container.innerHTML = `
      <div class="page page-enter" style="max-width:960px;">
        <div class="eyebrow">Upload</div>
        <h1 class="h2 mb-8">Add a document</h1>
        <p class="dim mb-24">Prescriptions, lab reports, medicine photos, or a doctor's voice note — we'll handle the rest.</p>

        <div class="grid grid-2" style="align-items:start;">
          <div class="glass card">
            <div class="h3 mb-8">📤 Upload a file</div>
            <div class="dim mb-4" style="font-size:13px;">What kind of document is this? (optional — we'll also guess)</div>
            <div class="doctype-cards" id="doctype-cards">
              ${DOC_TYPES.map((t) => `
                <button class="doctype-card ${this.selectedDocType === t ? 'selected' : ''}" data-type="${t}">
                  <span class="dc-icon">${this.DOC_TYPE_META[t] || '📄'}</span>
                  <span class="dc-label">${t}</span>
                </button>`).join('')}
            </div>
            <div id="dropzone-mount" class="mt-16"></div>
          </div>

          <div class="glass card">
            <div class="h3 mb-8">🎙️ Or record right now</div>
            <p class="dim mb-16" style="font-size:13px;">Capture the doctor's spoken instructions directly — no file needed.</p>
            <div id="recorder-mount"></div>
          </div>
        </div>

        <div class="mt-24">
          <div class="row-between mb-12">
            <h3 class="h3">Upload progress</h3>
          </div>
          <div id="upload-queue" class="upload-queue">
            <div class="glass card dim" style="text-align:center;" id="queue-empty">Nothing uploaded yet in this session.</div>
          </div>
        </div>
      </div>
    `;

    container.querySelectorAll('.doctype-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const isSame = this.selectedDocType === btn.dataset.type;
        container.querySelectorAll('.doctype-card').forEach((b) => b.classList.remove('selected'));
        this.selectedDocType = isSame ? null : btn.dataset.type;
        if (!isSame) btn.classList.add('selected');
      });
    });

    Dropzone.mount(document.getElementById('dropzone-mount'), {
      onFiles: (files) => this._handleFiles(files),
    });

    AudioRecorder.mount(document.getElementById('recorder-mount'), {
      onRecorded: (file) => this._handleFiles([file]),
    });
  },

  _handleFiles(files) {
    const queueEl = document.getElementById('upload-queue');
    document.getElementById('queue-empty')?.remove();
    files.forEach((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item = { id, file, status: 'uploading', progress: 0, recordId: null };
      this.queue.push(item);
      this._renderItem(queueEl, item);
      this._upload(item);
    });
  },

  _renderItem(queueEl, item) {
    const row = document.createElement('div');
    row.className = 'glass upload-item';
    row.id = `upload-item-${item.id}`;
    row.innerHTML = this._itemInner(item);
    queueEl.prepend(row);
  },

  _fileIcon(file) {
    const name = (file.name || '').toLowerCase();
    if (/\.(wav|mp3|webm)$/.test(name)) return '🎙️';
    if (/\.pdf$/.test(name)) return '📄';
    return '🖼️';
  },

  _itemInner(item) {
    const statusIcon = item.status === 'done' ? '✅' : item.status === 'error' ? '❌' : '';
    const statusText =
      item.status === 'uploading' ? `Analyzing with Azure AI…` :
      item.status === 'done' ? 'Ready to view' :
      item.status === 'error' ? (item.error || 'Something went wrong') : '';

    return `
      <div class="upload-item-top">
        <span class="file-type-icon">${this._fileIcon(item.file)}</span>
        <span class="name">${Fmt.escapeHtml(item.file.name)}</span>
        <span>${statusIcon || Loader.spinnerSmall()}</span>
      </div>
      <div class="status">${Fmt.escapeHtml(statusText)}</div>
      ${item.status === 'uploading' ? `
        <div class="progress-track" style="width:100%;">
          <div class="progress-fill" style="width:${item.progress}%"></div>
        </div>` : ''}
      ${item.status === 'done' ? `<a class="btn btn-sm btn-primary mt-8" href="#/records/${item.recordId}">View explained record →</a>` : ''}
      ${item.status === 'error' ? `<button class="btn btn-sm glass mt-8" data-retry="${item.id}">Try again</button>` : ''}
    `;
  },

  async _upload(item) {
    try {
      const { record } = await API.uploadFile(item.file, this.selectedDocType, (pct) => {
        item.progress = pct;
        const row = document.getElementById(`upload-item-${item.id}`);
        if (row) row.innerHTML = this._itemInner(item);
      });
      item.status = 'done';
      item.recordId = record.id;
      Toast.success(`"${record.fileName}" processed successfully.`);
    } catch (err) {
      item.status = 'error';
      item.error = err.message;
      Toast.error(err.message);
    }
    const row = document.getElementById(`upload-item-${item.id}`);
    if (row) {
      row.innerHTML = this._itemInner(item);
      const retryBtn = row.querySelector('[data-retry]');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          item.status = 'uploading';
          item.progress = 0;
          row.innerHTML = this._itemInner(item);
          this._upload(item);
        });
      }
    }
  },
};
