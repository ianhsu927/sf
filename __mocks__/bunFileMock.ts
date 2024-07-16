export function file(path) {
  return {
    text: async () => "Mock file content",
    json: async () => ({ key: "Mock JSON content" }),
    arrayBuffer: async () => new ArrayBuffer(8),
    blob: async () => new Blob(["Mock Blob content"]),
  };
}
