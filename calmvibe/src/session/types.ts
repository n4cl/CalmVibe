export type SessionRecord = {
  id: string;
  recordedAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  guideType: 'VIBRATION' | 'BREATH';
  bpm?: number;
  preHr?: number;
  postHr?: number;
  improvement?: number;
  breathConfig?: unknown;
};

export interface SessionRepository {
  save(record: SessionRecord): Promise<void>;
  list(): Promise<SessionRecord[]>;
  get(id: string): Promise<SessionRecord | null>;
}
