export type PlaybackMilestoneStatus = {
  loaded: boolean;
  playing: boolean;
  buffering: boolean;
};

export class BoundedPlaybackTraceBuffer {
  private values: string[] = [];
  private enabled = true;

  constructor(private readonly capacity = 480) {}

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  clear(): void {
    this.values = [];
  }

  record(entry: string): void {
    if (!this.enabled) return;
    this.values = [...this.values.slice(-(this.capacity - 1)), entry];
  }

  entries(): string[] {
    return [...this.values];
  }
}

export class PlaybackCommandMilestones {
  private command: string | null = null;
  private loadedSeen = false;
  private playingSeen = false;
  private bufferingFalseSeen = false;

  begin(command: string): void {
    this.command = command;
    this.loadedSeen = false;
    this.playingSeen = false;
    this.bufferingFalseSeen = false;
  }

  pendingCommand(): string | null {
    return this.command;
  }

  clear(): void {
    this.command = null;
  }

  observe(status: PlaybackMilestoneStatus): string[] {
    if (!this.command) return [];
    const events: string[] = [];
    if (status.loaded && !this.loadedSeen) {
      this.loadedSeen = true;
      events.push("FIRST_LOADED");
    }
    if (status.loaded && status.playing && !this.playingSeen) {
      this.playingSeen = true;
      events.push("FIRST_PLAYING");
    }
    if (status.loaded && !status.buffering && !this.bufferingFalseSeen) {
      this.bufferingFalseSeen = true;
      events.push("FIRST_BUFFERING_FALSE");
    }

    const isPlayCommand = this.command === "play" || this.command === "resume" || this.command === "replay";
    if ((isPlayCommand && this.playingSeen) || (!isPlayCommand && this.loadedSeen && this.bufferingFalseSeen)) {
      this.command = null;
    }
    return events;
  }
}
