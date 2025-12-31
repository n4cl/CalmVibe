import { SqliteSessionRepository } from '../sqliteRepository.web';

describe('SqliteSessionRepository listPage', () => {
  it('limit件を返し、hasNextとnextCursorで続きが判定できる', async () => {
    const repo = new SqliteSessionRepository();
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'VIBRATION' });
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'BREATH' });
    await repo.save({ id: '0', recordedAt: '2025-12-16T11:00:00.000Z', guideType: 'VIBRATION' });

    const first = await repo.listPage({ limit: 2 });
    expect(first.records).toHaveLength(2);
    expect(first.hasNext).toBe(true);
    expect(first.nextCursor).toBeTruthy();
    expect(first.records[0].recordedAt).toBe('2025-12-17T12:00:00.000Z');
    expect(first.records[1].recordedAt).toBe('2025-12-17T12:00:00.000Z');
    expect(Number(first.records[0].id)).toBeGreaterThan(Number(first.records[1].id));

    const second = await repo.listPage({ limit: 2, cursor: first.nextCursor });
    expect(second.records).toHaveLength(1);
    expect(second.hasNext).toBe(false);
    expect(second.nextCursor).toBeNull();
    expect(second.records[0].recordedAt).toBe('2025-12-16T11:00:00.000Z');
  });
});

describe('SqliteSessionRepository update', () => {
  it('既存レコードを更新できる', async () => {
    const repo = new SqliteSessionRepository();
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'VIBRATION', preHr: 80 });
    const listBefore = await repo.list();
    const targetId = listBefore[0].id;

    await repo.update({ id: targetId, guideType: 'BREATH', preHr: 72, improvement: 4 });

    const listAfter = await repo.list();
    expect(listAfter[0].id).toBe(targetId);
    expect(listAfter[0].guideType).toBe('BREATH');
    expect(listAfter[0].preHr).toBe(72);
    expect(listAfter[0].improvement).toBe(4);
  });
});

describe('SqliteSessionRepository deleteMany', () => {
  it('指定したIDを削除できる', async () => {
    const repo = new SqliteSessionRepository();
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'VIBRATION' });
    await repo.save({ id: '0', recordedAt: '2025-12-16T12:00:00.000Z', guideType: 'BREATH' });
    await repo.save({ id: '0', recordedAt: '2025-12-15T12:00:00.000Z', guideType: 'VIBRATION' });
    const before = await repo.list();
    const targetIds = [before[0].id, before[2].id];

    await repo.deleteMany(targetIds);

    const after = await repo.list();
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before[1].id);
  });

  it('空配列はno-opになる', async () => {
    const repo = new SqliteSessionRepository();
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'VIBRATION' });
    const before = await repo.list();

    await repo.deleteMany([]);

    const after = await repo.list();
    expect(after).toHaveLength(before.length);
    expect(after[0].id).toBe(before[0].id);
  });

  it('存在しないIDは無視される', async () => {
    const repo = new SqliteSessionRepository();
    await repo.save({ id: '0', recordedAt: '2025-12-17T12:00:00.000Z', guideType: 'VIBRATION' });
    const before = await repo.list();

    await repo.deleteMany(['999']);

    const after = await repo.list();
    expect(after).toHaveLength(before.length);
    expect(after[0].id).toBe(before[0].id);
  });
});
