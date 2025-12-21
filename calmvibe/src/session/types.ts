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

export type SessionListCursor = {
  recordedAt: string;
  id: string;
};

export type SessionRecordUpdate = {
  id: string;
  guideType: 'VIBRATION' | 'BREATH';
  bpm?: number;
  preHr?: number;
  postHr?: number;
  improvement?: number;
  breathConfig?: unknown;
};

export type SessionPageResult = {
  records: SessionRecord[];
  nextCursor?: SessionListCursor | null;
  hasNext: boolean;
};

export interface SessionRepository {
  save(record: SessionRecord): Promise<void>;
  update(input: SessionRecordUpdate): Promise<void>;
  list(): Promise<SessionRecord[]>;
  listPage(input: { limit: number; cursor?: SessionListCursor | null }): Promise<SessionPageResult>;
  get(id: string): Promise<SessionRecord | null>;
}
