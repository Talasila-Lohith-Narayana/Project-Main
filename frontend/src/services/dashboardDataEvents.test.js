import { afterEach, describe, expect, it, vi } from "vitest";

describe("dashboardDataEvents", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies subscribers in other tabs through BroadcastChannel", async () => {
    class TestBroadcastChannel {
      static channels = [];

      constructor(name) {
        this.name = name;
        this.listeners = new Set();
        TestBroadcastChannel.channels.push(this);
      }

      addEventListener(type, listener) {
        if (type === "message") this.listeners.add(listener);
      }

      removeEventListener(type, listener) {
        if (type === "message") this.listeners.delete(listener);
      }
      close() {
        this.listeners.clear();
      }
      postMessage(data) {
        TestBroadcastChannel.channels
          .filter((candidate) => candidate !== this && candidate.name === this.name)
          .forEach((candidate) => {
            candidate.listeners.forEach((listener) => listener({ data }));
          });
      }
    }
    vi.stubGlobal("BroadcastChannel", TestBroadcastChannel);
    vi.resetModules();
    const { subscribeToDashboardDataChanges } = await import("./dashboardDataEvents");
    const onChange = vi.fn();
    const unsubscribe = subscribeToDashboardDataChanges(onChange);
    const otherTab = new TestBroadcastChannel("customer-sphere-dashboard-data");

    otherTab.postMessage({ timestamp: Date.now() });
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    otherTab.postMessage({ timestamp: Date.now() });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
