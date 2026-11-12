export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeocodeError";
  }
}

export class FixtureRefusedError extends Error {
  constructor() {
    super("Fixture mode is refused. GhanaDisaster does not serve sample alerts.");
    this.name = "FixtureRefusedError";
  }
}
