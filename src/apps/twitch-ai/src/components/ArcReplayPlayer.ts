import {
  ARC_FRAME_HEIGHT,
  ARC_FRAME_WIDTH,
  moveReplayIndex,
  type ArcCoordinateForecast,
  type ArcRecordedObservation,
  type ArcRecording,
} from "../arc-replay";

const FRAME_INTERVAL_MS = 450;
const ARC_DISPLAY_PALETTE = [
  "#f7f7f7",
  "#c8c8c8",
  "#f24822",
  "#ffb900",
  "#fff100",
  "#000000",
  "#0078d4",
  "#744da9",
  "#00b7c3",
  "#22d3ee",
  "#bad80a",
  "#107c10",
  "#e3008c",
  "#ff8c00",
  "#8764b8",
  "#767676",
] as const;

/** Project the field to RGBA bytes without a DOM or canvas dependency. */
export function coordinateFieldPixels(
  forecast: ArcCoordinateForecast | undefined,
  observation: ArcRecordedObservation,
): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(ARC_FRAME_WIDTH * ARC_FRAME_HEIGHT * 4);
  if (forecast !== undefined) {
    for (const mass of forecast.masses) {
      const offset = (mass.y * ARC_FRAME_WIDTH + mass.x) * 4;
      pixels[offset] = 255;
      pixels[offset + 1] = 40;
      pixels[offset + 2] = 40;
      pixels[offset + 3] = Math.round(mass.probability * 255);
    }
  }
  const committed = observation.action.point;
  if (observation.action.id === "ACTION6" && committed !== undefined) {
    const offset = (committed.y * ARC_FRAME_WIDTH + committed.x) * 4;
    pixels[offset] = 0;
    pixels[offset + 1] = 255;
    pixels[offset + 2] = 255;
    pixels[offset + 3] = 255;
  }
  return pixels;
}

/** Canvas presenter for a committed ARC session. It never fetches or mutates it. */
export class ArcReplayPlayer {
  private readonly recording: ArcRecording;
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly fieldCanvas: HTMLCanvasElement;
  private readonly fieldContext: CanvasRenderingContext2D;
  private readonly tickReadout: HTMLElement;
  private readonly actionReadout: HTMLElement;
  private readonly stateReadout: HTMLElement;
  private readonly levelReadout: HTMLElement;
  private readonly fieldReadout: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly scrubber: HTMLInputElement;
  private index = 0;
  private timer: number | null = null;

  public constructor(containerId: string, recording: ArcRecording) {
    this.recording = recording;
    const panel = document.createElement("section");
    panel.className = "stream-panel arc-replay-panel";

    const heading = document.createElement("div");
    heading.className = "arc-replay-heading";
    const title = document.createElement("div");
    title.className = "arc-replay-title";
    title.textContent = recording.title;
    const badge = document.createElement("span");
    badge.className = "recorded-badge";
    badge.textContent = "RECORDED";
    heading.append(title, badge);

    const screen = document.createElement("div");
    screen.className = "screen-container arc-screen-container";
    this.canvas = document.createElement("canvas");
    this.canvas.width = ARC_FRAME_WIDTH;
    this.canvas.height = ARC_FRAME_HEIGHT;
    this.canvas.setAttribute("aria-label", "Recorded ARC ZetaChase frame");
    const context = this.canvas.getContext("2d");
    if (context === null) throw new Error("2d canvas context unavailable");
    this.context = context;
    this.fieldCanvas = document.createElement("canvas");
    this.fieldCanvas.className = "arc-coordinate-field";
    this.fieldCanvas.width = ARC_FRAME_WIDTH;
    this.fieldCanvas.height = ARC_FRAME_HEIGHT;
    this.fieldCanvas.setAttribute("aria-label", "ACTION6 coordinate probability field and committed point");
    const fieldContext = this.fieldCanvas.getContext("2d");
    if (fieldContext === null) throw new Error("2d coordinate-field context unavailable");
    this.fieldContext = fieldContext;
    screen.append(this.canvas, this.fieldCanvas);

    const readout = document.createElement("div");
    readout.className = "arc-replay-readout mono";
    this.tickReadout = document.createElement("span");
    this.actionReadout = document.createElement("span");
    this.stateReadout = document.createElement("span");
    this.levelReadout = document.createElement("span");
    this.fieldReadout = document.createElement("span");
    readout.append(this.tickReadout, this.actionReadout, this.stateReadout, this.levelReadout, this.fieldReadout);

    const controls = document.createElement("div");
    controls.className = "arc-replay-controls";
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous";
    previous.addEventListener("click", () => {
      this.move(-1, false);
    });
    this.playButton = document.createElement("button");
    this.playButton.type = "button";
    this.playButton.addEventListener("click", () => {
      this.togglePlayback();
    });
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";
    next.addEventListener("click", () => {
      this.move(1, false);
    });
    this.scrubber = document.createElement("input");
    this.scrubber.type = "range";
    this.scrubber.min = "0";
    this.scrubber.max = String(recording.steps.length - 1);
    this.scrubber.step = "1";
    this.scrubber.value = "0";
    this.scrubber.setAttribute("aria-label", "Recorded ARC replay position");
    this.scrubber.addEventListener("input", () => {
      this.index = Number(this.scrubber.value);
      this.render();
    });
    controls.append(previous, this.playButton, next, this.scrubber);

    const provenance = document.createElement("p");
    provenance.className = "arc-replay-provenance";
    provenance.textContent =
      "Offline committed replay. Red is the source-produced pre-action coordinate mass; cyan is the committed ACTION6 point. No key or network request.";

    panel.append(heading, screen, readout, controls, provenance);
    document.getElementById(containerId)?.appendChild(panel);
    this.render();
    this.startPlayback();
  }

  public destroy(): void {
    this.stopPlayback();
  }

  private move(delta: number, wrap: boolean): void {
    this.index = moveReplayIndex(this.recording, this.index, delta, wrap);
    this.render();
  }

  private togglePlayback(): void {
    if (this.timer === null) this.startPlayback();
    else this.stopPlayback();
  }

  private startPlayback(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      this.move(1, true);
    }, FRAME_INTERVAL_MS);
    this.playButton.textContent = "Pause";
  }

  private stopPlayback(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playButton.textContent = "Play";
  }

  private render(): void {
    const step = this.recording.steps[this.index];
    if (step === undefined) return;
    const frame = step.observation.framesHex.at(-1);
    if (frame === undefined) return;
    const pixels = this.context.createImageData(ARC_FRAME_WIDTH, ARC_FRAME_HEIGHT);
    for (let cell = 0; cell < frame.length; cell++) {
      const paletteIndex = Number.parseInt(frame[cell] ?? "0", 16);
      const color = ARC_DISPLAY_PALETTE[paletteIndex] ?? ARC_DISPLAY_PALETTE[5];
      const offset = cell * 4;
      pixels.data[offset] = Number.parseInt(color.slice(1, 3), 16);
      pixels.data[offset + 1] = Number.parseInt(color.slice(3, 5), 16);
      pixels.data[offset + 2] = Number.parseInt(color.slice(5, 7), 16);
      pixels.data[offset + 3] = 255;
    }
    this.context.putImageData(pixels, 0, 0);
    this.renderCoordinateField(step.coordinateForecast, step.observation);
    this.scrubber.value = String(this.index);
    this.tickReadout.textContent = `Frame ${String(this.index + 1)}/${String(this.recording.steps.length)}`;
    const actionPoint = step.observation.action.point;
    this.actionReadout.textContent = actionPoint
      ? `Action ${step.observation.action.id} (${String(actionPoint.x)},${String(actionPoint.y)})`
      : `Action ${step.observation.action.id}`;
    this.stateReadout.textContent = `State ${step.observation.state}`;
    this.levelReadout.textContent = `Levels ${String(step.observation.levelsCompleted)}/${String(step.observation.winLevels)}`;
    this.fieldReadout.textContent = step.coordinateForecast
      ? `Field ${String(step.coordinateForecast.masses.length)} cells, next (${String(step.coordinateForecast.selected.x)},${String(step.coordinateForecast.selected.y)})`
      : "Field --";
  }

  private renderCoordinateField(
    forecast: ArcCoordinateForecast | undefined,
    observation: ArcRecordedObservation,
  ): void {
    const image = this.fieldContext.createImageData(ARC_FRAME_WIDTH, ARC_FRAME_HEIGHT);
    image.data.set(coordinateFieldPixels(forecast, observation));
    this.fieldContext.putImageData(image, 0, 0);
    if (forecast !== undefined) {
      this.fieldContext.strokeStyle = "rgb(255 255 255)";
      this.fieldContext.lineWidth = 1;
      this.fieldContext.strokeRect(forecast.selected.x - 1, forecast.selected.y - 1, 3, 3);
    }
  }
}
