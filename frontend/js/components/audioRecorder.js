/**
 * Records audio from the browser microphone and produces a real 16kHz
 * mono WAV/PCM file — the format the Azure Speech-to-text REST API for
 * short audio actually supports (it only accepts WAV/PCM or OGG/OPUS;
 * the WebM/Opus output of MediaRecorder, used in an earlier version of
 * this file, isn't in that list and gets silently misread as empty audio).
 *
 * Uses the Web Audio API to capture raw PCM samples directly, resamples
 * them to 16kHz, and hand-encodes a standard WAV header — no server-side
 * conversion or extra dependencies needed.
 */
const AudioRecorder = {
  mount(container, { onRecorded } = {}) {
    const TARGET_SAMPLE_RATE = 16000;

    let audioContext = null;
    let sourceNode = null;
    let processorNode = null;
    let stream = null;
    let recordedChunks = []; // Float32Array chunks at the context's native sample rate
    let seconds = 0;
    let timerId = null;
    let recording = false;

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

    // Linear-interpolation resample from the context's native rate (usually
    // 44100/48000) down to 16000 Hz, which is what the Speech REST API expects.
    function resample(float32Data, fromRate, toRate) {
      if (fromRate === toRate) return float32Data;
      const ratio = fromRate / toRate;
      const newLength = Math.round(float32Data.length / ratio);
      const result = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const srcIndex = i * ratio;
        const i0 = Math.floor(srcIndex);
        const i1 = Math.min(i0 + 1, float32Data.length - 1);
        const frac = srcIndex - i0;
        result[i] = float32Data[i0] * (1 - frac) + float32Data[i1] * frac;
      }
      return result;
    }

    function floatTo16BitPCM(float32Data) {
      const out = new Int16Array(float32Data.length);
      for (let i = 0; i < float32Data.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Data[i]));
        out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      return out;
    }

    function encodeWav(pcm16, sampleRate) {
      const bytesPerSample = 2;
      const blockAlign = bytesPerSample; // mono
      const byteRate = sampleRate * blockAlign;
      const dataSize = pcm16.length * bytesPerSample;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // fmt chunk size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true); // bits per sample
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);

      let offset = 44;
      for (let i = 0; i < pcm16.length; i++, offset += 2) {
        view.setInt16(offset, pcm16[i], true);
      }

      return new Blob([buffer], { type: 'audio/wav' });
    }

    function mergeChunks(chunks) {
      const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      return merged;
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        Toast.error('Microphone access denied or unavailable.');
        return;
      }

      recordedChunks = [];
      seconds = 0;
      timerEl.textContent = '00:00';
      recording = true;

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      sourceNode = audioContext.createMediaStreamSource(stream);
      // ScriptProcessorNode is deprecated but has universal browser support
      // and is more than adequate for capturing short voice notes.
      processorNode = audioContext.createScriptProcessor(4096, 1, 1);

      processorNode.onaudioprocess = (e) => {
        if (!recording) return;
        recordedChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

      btn.textContent = '■';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger', 'glass');
      timerId = setInterval(() => {
        seconds += 1;
        timerEl.textContent = fmtTime(seconds);
      }, 1000);
    }

    function stop() {
      recording = false;
      clearInterval(timerId);

      processorNode?.disconnect();
      sourceNode?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());

      const nativeRate = audioContext.sampleRate;
      audioContext.close();

      btn.textContent = '●';
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-danger', 'glass');

      if (!recordedChunks.length) return;

      const merged = mergeChunks(recordedChunks);
      const resampled = resample(merged, nativeRate, TARGET_SAMPLE_RATE);
      const pcm16 = floatTo16BitPCM(resampled);
      const wavBlob = encodeWav(pcm16, TARGET_SAMPLE_RATE);

      const file = new File([wavBlob], `voice-note-${Date.now()}.wav`, { type: 'audio/wav' });
      if (onRecorded) onRecorded(file);
    }

    btn.addEventListener('click', () => {
      if (!recording) start();
      else stop();
    });
  },
};
