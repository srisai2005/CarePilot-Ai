const Toast = {
  show(message, type = 'info', duration = 4000) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = `toast glass ${type}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
};
