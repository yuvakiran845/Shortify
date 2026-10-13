// Copies text to the clipboard.
// 1. Try the modern Clipboard API (needs https or localhost, and permission).
// 2. If it is missing or blocked (plain-http pages, some in-app browsers and
//    iframes), fall back to selecting a hidden textarea and running "copy".
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Permission denied: try the fallback below.
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) throw new Error('Copy command was rejected');
}
