import { describe, expect, it } from 'vitest';
import { StateRepository } from '@/services/storage/repository';

describe('StateRepository', () => {
  it('serializa atualizações concorrentes sem perder alterações', async () => {
    const values = new Map<string, unknown>(); const storage = { get: async (key: string) => values.get(key), set: async (key: string, value: unknown) => { values.set(key, value); } };
    const repository = new StateRepository(storage);
    await Promise.all([repository.update((state) => ({ ...state, sessions: [...state.sessions, { id: 'a' } as never] })), repository.update((state) => ({ ...state, sessions: [...state.sessions, { id: 'b' } as never] }))]);
    expect((await repository.load()).sessions.map((session) => session.id)).toEqual(['a', 'b']);
  });
});
