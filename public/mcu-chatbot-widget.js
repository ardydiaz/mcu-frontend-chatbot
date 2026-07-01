(function () {
  var currentScript = document.currentScript;
  var origin = currentScript && currentScript.src
    ? new URL(currentScript.src).origin
    : 'http://localhost:5173';
  var chatbotUrl = currentScript && currentScript.dataset.chatbotUrl
    ? currentScript.dataset.chatbotUrl
    : origin + '/chatbot?embed=1&compact=1';
  var position = currentScript && currentScript.dataset.position
    ? currentScript.dataset.position
    : 'right';

  var panel = document.createElement('div');
  var button = document.createElement('button');
  var iframe = document.createElement('iframe');
  var isOpen = false;

  panel.setAttribute('aria-hidden', 'true');
  panel.style.position = 'fixed';
  panel.style.bottom = '92px';
  panel.style[position === 'left' ? 'left' : 'right'] = '24px';
  panel.style.width = 'min(420px, calc(100vw - 32px))';
  panel.style.height = 'min(620px, calc(100vh - 124px))';
  panel.style.border = '0';
  panel.style.borderRadius = '16px';
  panel.style.overflow = 'hidden';
  panel.style.background = '#fff';
  panel.style.boxShadow = '0 24px 70px rgba(0,0,0,.25)';
  panel.style.zIndex = '9998';
  panel.style.opacity = '0';
  panel.style.pointerEvents = 'none';
  panel.style.transform = 'translateY(16px) scale(.98)';
  panel.style.transition = 'opacity .2s ease, transform .2s ease';

  try {
    var iframeUrl = new URL(chatbotUrl, window.location.href);
    iframeUrl.searchParams.set('embedOrigin', window.location.origin);
    iframe.src = iframeUrl.toString();
  } catch {
    iframe.src = chatbotUrl;
  }
  iframe.title = 'MCU Guide chatbot';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.style.display = 'block';
  iframe.style.background = '#fff';

  button.type = 'button';
  button.setAttribute('aria-label', 'Open MCU Guide chatbot');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<span aria-hidden="true">M</span>';
  button.style.position = 'fixed';
  button.style.bottom = '24px';
  button.style[position === 'left' ? 'left' : 'right'] = '24px';
  button.style.width = '58px';
  button.style.height = '58px';
  button.style.border = '0';
  button.style.borderRadius = '999px';
  button.style.color = '#fff';
  button.style.font = '800 20px/1 Arial, sans-serif';
  button.style.background = 'linear-gradient(135deg, #5c297c, #2a003f)';
  button.style.boxShadow = '0 18px 40px rgba(42,0,63,.35)';
  button.style.cursor = 'pointer';
  button.style.zIndex = '9999';

  function setOpen(nextOpen) {
    isOpen = nextOpen;
    panel.setAttribute('aria-hidden', String(!isOpen));
    button.setAttribute('aria-expanded', String(isOpen));
    button.setAttribute('aria-label', isOpen ? 'Close MCU Guide chatbot' : 'Open MCU Guide chatbot');
    button.innerHTML = isOpen ? '<span aria-hidden="true">×</span>' : '<span aria-hidden="true">M</span>';
    panel.style.opacity = isOpen ? '1' : '0';
    panel.style.pointerEvents = isOpen ? 'auto' : 'none';
    panel.style.transform = isOpen ? 'translateY(0) scale(1)' : 'translateY(16px) scale(.98)';
  }

  button.addEventListener('click', function () {
    setOpen(!isOpen);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isOpen) {
      setOpen(false);
    }
  });

  panel.appendChild(iframe);
  document.body.appendChild(panel);
  document.body.appendChild(button);
})();
