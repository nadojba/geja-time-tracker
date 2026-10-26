import { describe, expect, it } from 'vitest';
import { StateRepository } from '@/services/storage/repository';
import { createPersonalBoard, defaultBoard } from '@/domain/board';

describe('StateRepository', () => {
  it('serializa atualizações concorrentes sem perder alterações', async () => {
    const values = new Map<string, unknown>(); const storage = { get: async (key: string) => values.get(key), set: async (key: string, value: unknown) => { values.set(key, value); } };
    const repository = new StateRepository(storage);
    await Promise.all([repository.update((state) => ({ ...state, sessions: [...state.sessions, { id: 'a' } as never] })), repository.update((state) => ({ ...state, sessions: [...state.sessions, { id: 'b' } as never] }))]);
    expect((await repository.load()).sessions.map((session) => session.id)).toEqual(['a', 'b']);
  });

  it('migra os cards do board selecionado para o board único', async () => {
    const values = new Map<string, unknown>();
    const legacyBoard = {
      ...createPersonalBoard('account', 'Suporte'),
      cards: [{ issueId: 101, columnId: 'board-todo', order: 0 }],
    };
    values.set('redmine-time-tracker-state', {
      schemaVersion: 1,
      account: { accountId: 'account', redmineUrl: 'https://redmine.example', apiKey: 'secret', user: { id: 1, name: 'Usuário', login: 'user' }, connectedAt: new Date().toISOString() },
      board: defaultBoard(),
      boards: [legacyBoard],
      activeBoardId: legacyBoard.id,
      sessions: [],
    });
    const storage = { get: async (key: string) => values.get(key), set: async (key: string, value: unknown) => { values.set(key, value); } };
    const loaded = await new StateRepository(storage).load();

    expect(loaded.board.cards).toEqual(legacyBoard.cards);
  });

  it('recupera a fila depois de uma mutação que falhou', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: async (key: string) => values.get(key), set: async (key: string, value: unknown) => { values.set(key, value); } };
    const repository = new StateRepository(storage);
    await expect(repository.update(() => { throw new Error('falha transitória'); })).rejects.toThrow('falha transitória');
    await repository.update((state) => ({ ...state, sessions: [{ id: 'recovered' } as never] }));
    expect((await repository.load()).sessions.map((session) => session.id)).toEqual(['recovered']);
  });

  it('persiste a preferência de idioma para a próxima abertura', async () => {
    const values = new Map<string, unknown>();
    const storage = { get: async (key: string) => values.get(key), set: async (key: string, value: unknown) => { values.set(key, value); } };
    const repository = new StateRepository(storage);
    await repository.update((state) => ({ ...state, preferences: { ...state.preferences, language: 'en' } }));
    expect((await new StateRepository(storage).load()).preferences.language).toBe('en');
  });
});
