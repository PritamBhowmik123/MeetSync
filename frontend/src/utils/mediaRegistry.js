const activeStreams = new Set();

export function registerStream(stream) {
  if (!stream) return;
  activeStreams.add(stream);
}

export function unregisterStream(stream) {
  if (!stream) return;
  activeStreams.delete(stream);
}

export function stopAllStreams() {
  activeStreams.forEach((stream) => {
    try {
      stream.getTracks().forEach(t => t.stop());
    } catch (_) {}
  });
  activeStreams.clear();
}
