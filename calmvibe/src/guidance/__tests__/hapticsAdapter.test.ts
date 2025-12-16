import { HapticsAdapter } from '../types';

const createAdapter = (impl: HapticsAdapter) => impl;

describe('HapticsAdapter (default stub)', () => {
  it('playが成功を返す', async () => {
    const adapter = createAdapter({
      play: jest.fn().mockResolvedValue({ ok: true }),
      stop: jest.fn().mockResolvedValue({ ok: true }),
    });
    await expect(adapter.play([0])).resolves.toEqual({ ok: true });
  });

  it('stopが成功を返す', async () => {
    const adapter = createAdapter({
      play: jest.fn().mockResolvedValue({ ok: true }),
      stop: jest.fn().mockResolvedValue({ ok: true }),
    });
    await expect(adapter.stop()).resolves.toEqual({ ok: true });
  });
});
