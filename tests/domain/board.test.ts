import { describe, expect, it } from 'vitest';
import { addBoardIssue, createPersonalBoard, defaultBoard, ensureBoardCards, ensureBoardColumns, moveBoardCard, normalizeBoard } from '@/domain/board';
import type { RedmineIssue } from '@/services/redmine/client';

const issue = (id: number): RedmineIssue => ({
  id,
  subject: `Chamado ${id}`,
  project: { id: 1, name: 'Projeto' },
});

describe('board local', () => {
  it('adiciona chamados novos sem apagar a organização existente', () => {
    const board = defaultBoard();
    const organized = { ...board, cards: [{ issueId: 10, columnId: 'board-progress', order: 0 }] };
    const next = ensureBoardCards(organized, [issue(10), issue(11)]);
    expect(next.cards).toEqual([
      { issueId: 10, columnId: 'board-progress', order: 0 },
      { issueId: 11, columnId: 'board-todo', order: 1 },
    ]);
  });

  it('cria colunas a partir dos status na primeira abertura', () => {
    const board = ensureBoardCards(defaultBoard(), [
      { ...issue(10), status: { id: 1, name: 'Novo' } },
      { ...issue(11), status: { id: 2, name: 'Em andamento' } },
    ]);
    expect(board.columns.map((column) => column.title)).toEqual(['Novo', 'Em andamento']);
    expect(board.cards.map((card) => card.columnId)).toEqual([
      board.columns[0].id,
      board.columns[1].id,
    ]);
  });

  it('prepara colunas a partir dos status sem adicionar chamados automaticamente', () => {
    const board = ensureBoardColumns(defaultBoard(), [
      { ...issue(10), status: { id: 1, name: 'Novo' } },
      { ...issue(11), status: { id: 2, name: 'Em andamento' } },
    ]);

    expect(board.columns.map((column) => column.title)).toEqual(['Novo', 'Em andamento']);
    expect(board.cards).toEqual([]);
  });

  it('adiciona um chamado explicitamente e não duplica o card', () => {
    const board = ensureBoardColumns(defaultBoard(), [issue(10)]);
    const added = addBoardIssue(board, 10);
    const duplicated = addBoardIssue(added, 10);

    expect(added.cards).toEqual([{ issueId: 10, columnId: added.columns[0].id, order: 0 }]);
    expect(duplicated).toEqual(added);
  });

  it('diferencia boards novos de boards migrados', () => {
    expect(createPersonalBoard('account', 'Novo').manualCardSelection).toBe(true);
    expect(createPersonalBoard('account', 'Legado', defaultBoard(), false).manualCardSelection).toBe(false);
  });

  it('descarta cards que apontam para colunas removidas', () => {
    const normalized = normalizeBoard({
      columns: [{ id: 'one', title: 'Uma', color: '#000', order: 4 }],
      cards: [{ issueId: 1, columnId: 'missing', order: 0 }],
    });
    expect(normalized.columns[0].order).toBe(0);
    expect(normalized.cards).toEqual([]);
  });

  it('reordena um card antes de outro e preserva a coluna de destino', () => {
    const board = {
      ...defaultBoard(),
      cards: [
        { issueId: 1, columnId: 'board-todo', order: 0 },
        { issueId: 2, columnId: 'board-todo', order: 1 },
        { issueId: 3, columnId: 'board-progress', order: 2 },
      ],
    };
    const moved = moveBoardCard(board, 3, 1, 'board-todo');
    expect(moved.cards.map((card) => [card.issueId, card.columnId])).toEqual([
      [3, 'board-todo'],
      [1, 'board-todo'],
      [2, 'board-todo'],
    ]);
  });
});
