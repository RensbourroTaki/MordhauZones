// <mz-rich text="..."> – shows a text from content.js with light formatting.
// Allowed: <b> <i> <u> <mark> (gold highlight) <a href> <br> <ul>/<ol>/<li>, and line breaks (\n).
// Everything else is reduced to its plain text, so content can never inject scripts or break the layout.
(function () {
  'use strict';
  const KEEP = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u', MARK: 'mark', A: 'a', BR: 'br', UL: 'ul', OL: 'ol', LI: 'li' };
  const BLOCK = { DIV: 1, P: 1 };
  const safeHref = h => /^(https?:\/\/|mailto:)/i.test(String(h || '').trim()) ? String(h).trim() : null;

  function clean(src, out) {
    for (const n of Array.from(src.childNodes)) {
      if (n.nodeType === 3) {
        const parts = n.data.split('\n');
        parts.forEach((p, i) => { if (i) out.appendChild(document.createElement('br')); if (p) out.appendChild(document.createTextNode(p)); });
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = KEEP[n.tagName];
      if (BLOCK[n.tagName]) {  // editor line wrappers -> line break
        if (out.lastChild && out.lastChild.nodeName !== 'BR') out.appendChild(document.createElement('br'));
        clean(n, out);
        continue;
      }
      if (!tag) { clean(n, out); continue; }
      const el = document.createElement(tag);
      if (tag === 'a') {
        const h = safeHref(n.getAttribute('href'));
        if (!h) { clean(n, out); continue; }
        el.setAttribute('href', h); el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer');
      }
      if (tag !== 'br') clean(n, el);
      out.appendChild(el);
    }
    return out;
  }
  // string -> cleaned DOM fragment (also used by the local editor)
  function toFragment(text) {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(text == null ? '' : text);
    const frag = clean(tpl.content, document.createDocumentFragment());
    while (frag.lastChild && frag.lastChild.nodeName === 'BR') frag.removeChild(frag.lastChild);
    return frag;
  }
  function toHtml(text) { const d = document.createElement('div'); d.appendChild(toFragment(text)); return d.innerHTML; }

  const css = document.createElement('style');
  css.textContent =
    'mz-rich mark{background:none;color:#d2ab55;font-weight:700}' +
    'mz-rich a{color:#d2ab55;text-decoration:underline;text-underline-offset:2px}' +
    'mz-rich ul,mz-rich ol{margin:.35em 0;padding-left:1.3em}mz-rich li{margin:.15em 0}' +
    'mz-rich li::marker{color:#d2ab55}';
  document.head.appendChild(css);

  class MzRich extends HTMLElement {
    static get observedAttributes() { return ['text']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }
    render() {
      const t = this.getAttribute('text') || '';
      if (t === this._last) return;
      this._last = t;
      // plain text (the usual case) without any markup: no parsing needed
      if (!/[<\n&]/.test(t)) { this.textContent = t; return; }
      this.replaceChildren(toFragment(t));
    }
  }
  if (!customElements.get('mz-rich')) customElements.define('mz-rich', MzRich);
  window.MZ_RICH = { toFragment, toHtml };
})();
