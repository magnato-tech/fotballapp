export class CameraService {
  private stream: MediaStream | null = null;

  async start(videoEl: HTMLVideoElement): Promise<void> {
    if (this.stream) this.stop();

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: false,
    };

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = this.stream;
    await new Promise<void>((resolve, reject) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play().then(resolve).catch(reject);
      };
      videoEl.onerror = reject;
    });
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  get isRunning(): boolean {
    return this.stream !== null;
  }
}
