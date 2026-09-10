import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Polyfills for APIs used in file-export tests under jsdom.
if (typeof window.URL.createObjectURL !== "function") {
  Object.defineProperty(window.URL, "createObjectURL", {
    writable: true,
    value: () => "blob:url",
  });
}
if (typeof window.URL.revokeObjectURL !== "function") {
  Object.defineProperty(window.URL, "revokeObjectURL", {
    writable: true,
    value: () => {},
  });
}
if (typeof Blob.prototype.text !== "function") {
  Object.defineProperty(Blob.prototype, "text", {
    writable: true,
    value: async function text(this: Blob): Promise<string> {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(this);
      });
    },
  });
}
