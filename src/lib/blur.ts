// Slika s kamere prolazi kroz platno (canvas) prije slanja: kad je uključen blur,
// sagovornik dobija samo zamućenu sliku i ne može je "odmutiti" kod sebe.

export function processedStream(raw: MediaStream, state: () => { blurred: boolean; cameraOff: boolean }) {
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = raw;
  video.play().catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d")!;
  // Mala sličica razvučena preko cijelog platna daje jak blur koji radi u svim preglednicima.
  const small = document.createElement("canvas");
  small.width = 16;
  small.height = 12;
  const sctx = small.getContext("2d")!;

  const timer = setInterval(() => {
    const { blurred, cameraOff } = state();
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (cameraOff || video.readyState < 2) {
      ctx.fillStyle = "#1f120a";
      ctx.fillRect(0, 0, w, h);
      return;
    }
    if (blurred) {
      sctx.drawImage(video, 0, 0, small.width, small.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(small, 0, 0, w, h);
    } else {
      ctx.drawImage(video, 0, 0, w, h);
    }
  }, 1000 / 20);

  const stream = canvas.captureStream(20);
  raw.getAudioTracks().forEach((t) => stream.addTrack(t));
  return {
    stream,
    stop() {
      clearInterval(timer);
      raw.getTracks().forEach((t) => t.stop());
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
