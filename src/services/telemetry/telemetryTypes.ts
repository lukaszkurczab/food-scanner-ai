export type TelemetryPrimitive = string | number | boolean | null;

export type TelemetryPropertyValue =
  | TelemetryPrimitive
  | TelemetryPrimitive[];

export type TelemetryProps = Record<string, TelemetryPropertyValue>;

export type TelemetryEvent = {
  eventId: string;
  name: string;
  ts: string;
  props?: TelemetryProps;
};

export type TelemetryBatchPayload = {
  sessionId: string;
  app: {
    platform: string;
    appVersion: string;
    build?: string | null;
  };
  device: {
    locale?: string | null;
    tzOffsetMin?: number | null;
  };
  events: TelemetryEvent[];
};
