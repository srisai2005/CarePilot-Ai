/**
 * Records audio from the browser microphone (MediaRecorder) so a patient can
 * capture the doctor's voice note directly, instead of only uploading a file.
 * Produces a WAV-compatible blob wrapped as a File for the normal upload flow.
 */
const AudioRecorder = {
  mount(container, { onRecorded } = {}) {
    let mediaRecorder = null;
    let chunks = [];
    let stream = null;
    let seconds = 0;
    let timerId = null;

    container.innerHTML = `
      <div class="glass card" style="text-align:center;">
        <div class="h3 mb-8">🎙️ Record a voice note</div>
        <div class="dim mb-16">Capture the doctor's spoken instructions right here.</div>
        <button class="btn btn-primary btn-icon pulse-glow" id="rec-btn" style="width:64px;height:64px;font-size:22px;">●</button>
        <div class="dim mt-12" id="rec-timer">00:00</div>
      </div>
    `;

    const btn = container.querySelector('#rec-btn');
    const timerEl = container.querySelector('#rec-timer');

    function fmtTime(s) {
      const m = String(Math.floor(s / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      return `${m}:${sec}`;
    }

    btn.addEventListener('click', async () => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
          Toast.error('Microphone access denied or unavailable.');
          return;
        }
        chunks = [];
        seconds = 0;
        timerEl.textContent = '00:00';
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          clearInterval(timerId);
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
          if (onRecorded) onRecorded(file);
        };
        mediaRecorder.start();
        btn.textContent = '■';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-danger', 'glass');
        timerId = setInterval(() => {
          seconds += 1;
          timerEl.textContent = fmtTime(seconds);
        }, 1000);
      } else {
        mediaRecorder.stop();
        btn.textContent = '●';
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-danger', 'glass');
      }
    });
  },
};
