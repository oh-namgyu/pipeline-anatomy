/**
 * The one piece of formatting lesson text may carry: `code spans`.
 *
 * Lesson prose names stages and artifacts in backticks. Rendering them raw
 * looks like noise, so this splits on backticks and builds real <code>
 * elements — every string still lands as a text node, never as markup, so
 * there is nothing for an injection to ride on.
 *
 * Ported from cc-anatomy @ 117b48caa69e774c71e54303e456a84f8d908cc5 (MIT,
 * same author). Fixes made there should be reconciled with this copy.
 */

/** Replace the contents of `el` with `text`, turning `code spans` into <code>. */
export function paintText(el, text) {
  el.textContent = '';
  const parts = String(text == null ? '' : text).split('`');
  parts.forEach((part, index) => {
    if (!part) return;
    if (index % 2 === 1) {
      const code = document.createElement('code');
      code.textContent = part;
      el.appendChild(code);
    } else {
      el.appendChild(document.createTextNode(part));
    }
  });
}
