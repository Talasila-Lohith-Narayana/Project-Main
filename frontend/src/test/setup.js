import "@testing-library/jest-dom";

// Polyfill ResizeObserver for Recharts ResponsiveContainer in JSDOM
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    if (typeof this.callback === "function") {
      this.callback([{ contentRect: { width: 500, height: 300 } }]);
    }
  }
  unobserve() {}
  disconnect() {}
};
