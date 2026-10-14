/**
 * jsdom gaps that real browsers do not have, needed by gesture components (vaul drawers/sheets):
 * pointer capture, and a `transform` value in computed styles (jsdom reports an empty string, so
 * vaul's `style.transform || style.webkitTransform` falls through to undefined). Import once in a jsdom test file.
 */
const proto = Element.prototype as unknown as Record<string, unknown>;
proto.setPointerCapture ??= () => {};
proto.releasePointerCapture ??= () => {};
proto.hasPointerCapture ??= () => false;

const originalGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
  const style = originalGetComputedStyle(element, pseudo);
  if (style.transform) return style;
  return new Proxy(style, {
    get: (target, key) => (key === 'transform' ? 'none' : Reflect.get(target, key))
  });
}) as typeof window.getComputedStyle;
