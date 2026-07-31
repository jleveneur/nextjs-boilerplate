// oxlint-disable-next-line import/no-unassigned-import -- registers jest-dom matchers
import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }),
});

/**
 * Base UI constructs PointerEvents in click handlers. jsdom does not implement
 * PointerEvent as a constructor until recent versions — polyfill for tests.
 */
if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    readonly width: number;
    readonly height: number;
    readonly pressure: number;
    readonly tangentialPressure: number;
    readonly tiltX: number;
    readonly tiltY: number;
    readonly twist: number;
    readonly pointerType: string;
    readonly isPrimary: boolean;

    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 1;
      this.width = params.width ?? 1;
      this.height = params.height ?? 1;
      this.pressure = params.pressure ?? 0;
      this.tangentialPressure = params.tangentialPressure ?? 0;
      this.tiltX = params.tiltX ?? 0;
      this.tiltY = params.tiltY ?? 0;
      this.twist = params.twist ?? 0;
      this.pointerType = params.pointerType ?? "mouse";
      this.isPrimary = params.isPrimary ?? true;
    }
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- jsdom test polyfill
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent;
}

/** axe color-contrast probes canvas; jsdom has no implementation. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- canvas stub for axe
HTMLCanvasElement.prototype.getContext = (() => ({
  fillRect() {},
  clearRect() {},
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
  putImageData() {},
  createImageData: () => ({ data: new Uint8ClampedArray(4) }),
  setTransform() {},
  resetTransform() {},
  drawImage() {},
  save() {},
  restore() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  closePath() {},
  stroke() {},
  fill() {},
  measureText: () => ({ width: 0 }),
  transform() {},
  translate() {},
  scale() {},
  rotate() {},
  arc() {},
  fillText() {},
  strokeText() {},
})) as unknown as typeof HTMLCanvasElement.prototype.getContext;
