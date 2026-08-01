/**
 * Drag & drop + click-to-browse file dropzone.
 * onFiles(fileList) is called with an array of File objects.
 */
const Dropzone = {
  mount(container, { onFiles, accept = '.pdf,.jpg,.jpeg,.png,.wav,.mp3' } = {}) {
    container.innerHTML = `
      <div class="dropzone" id="dz">
        <div class="dz-icon">📤</div>
        <div class="h3">Drag &amp; drop a file here</div>
        <div class="dim">or click to browse — PDF, JPG, PNG, JPEG, WAV, MP3 (max 25MB)</div>
        <input type="file" id="dz-input" accept="${accept}" multiple style="display:none" />
      </div>
    `;

    const dz = container.querySelector('#dz');
    const input = container.querySelector('#dz-input');

    dz.addEventListener('click', () => input.click());

    ['dragenter', 'dragover'].forEach((evt) =>
      dz.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.add('dragover');
      })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      dz.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.classList.remove('dragover');
      })
    );
    dz.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length && onFiles) onFiles(files);
    });
    input.addEventListener('change', () => {
      const files = Array.from(input.files || []);
      if (files.length && onFiles) onFiles(files);
      input.value = '';
    });
  },
};
