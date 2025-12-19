export type SessionRecord = {
  id: string;
  startedAt: string;
  endedAt: string;
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
