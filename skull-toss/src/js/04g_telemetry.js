  // ───────────────────────── telemetry: what happened in play, kept on this device ─────────────────────────
  // A small event log for playtests: runs starting and ending, every throw's result, bosses and power-ups. Nothing is
  // sent anywhere. It lives in memory for this session only (the last 500 events) and is gone on reload. Read it from
  // the console with SkullToss.telemetry(). An analytics backend (roadmap V39) would read these same events.
  const TELEMETRY_MAX = 500;
  const Telemetry = {
    started: Date.now(), events: [],
    emit(name, data = {}) {   // t: milliseconds since the page opened
      this.events.push({ name, t: Math.round(performance.now()), ...data });
      if (this.events.length > TELEMETRY_MAX) this.events.splice(0, this.events.length - TELEMETRY_MAX);
    }
  };
