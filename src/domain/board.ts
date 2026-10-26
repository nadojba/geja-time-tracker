import type { RedmineIssue } from '@/services/redmine/client';

export interface BoardColumn { id: string; title: string; color: string; order: number; }
export interface BoardCard { issueId: number; columnId: string; order: number; }
export interface BoardState { columns: BoardColumn[]; cards: BoardCard[]; }
export interface PersonalBoard extends BoardState {
  id: string;
  accountId: string;
  name: string;
  description: string;
  projectIds: number[];
  manualCardSelection: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createPersonalBoard(accountId: string, name: string, legacy?: BoardState, manualCardSelection = true): PersonalBoard {
  const now = new Date().toISOString();
  return {
    ...(legacy ?? defaultBoard()),
    id: `personal-board-${crypto.randomUUID()}`,
    accountId,
    name,
    description: '',
    projectIds: [],
    manualCardSelection,
    createdAt: now,
    updatedAt: now,
  };
}

export const defaultBoard = (): BoardState => ({
  columns: [
    { id: 'board-todo', title: 'A fazer', color: '#5579d8', order: 0 },
    { id: 'board-progress', title: 'Em andamento', color: '#d89a22', order: 1 },
    { id: 'board-done', title: 'Concluído', color: '#26966f', order: 2 },
  ],
  cards: [],
});

export function ensureBoardColumns(board: BoardState, issues: RedmineIssue[]): BoardState {
  const initialIds = new Set(['board-todo', 'board-progress', 'board-done']);
  const isInitialBoard = board.cards.length === 0 && board.columns.length === initialIds.size && board.columns.every((column) => initialIds.has(column.id));
  const columns = isInitialBoard
    ? [...new Map(issues.map((issue) => [issue.status?.name ?? 'Sem status', issue.status?.name ?? 'Sem status'])).keys()].map((title, index) => ({
        id: `status-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        color: ['#5579d8', '#d89a22', '#7b61c9', '#26966f', '#d84d5b'][index % 5],
        order: index,
      }))
    : board.columns;
  return { ...board, columns };
}

export function ensureBoardCards(board: BoardState, issues: RedmineIssue[]): BoardState {
  const prepared = ensureBoardColumns(board, issues);
  const columns = prepared.columns;
  const known = new Set(prepared.cards.map((card) => card.issueId));
  const fallback = columns[0]?.id;
  if (!fallback) return prepared;
  return {
    ...prepared,
    cards: prepared.cards.concat(issues.filter((issue) => !known.has(issue.id)).map((issue, index) => ({
      issueId: issue.id,
      columnId: columns.find((column) => column.title === (issue.status?.name ?? 'Sem status'))?.id ?? fallback,
      order: prepared.cards.length + index,
    }))),
  };
}

export function addBoardIssue(board: BoardState, issueId: number): BoardState {
  if (board.cards.some((card) => card.issueId === issueId) || !board.columns.length) return board;
  return {
    ...board,
    cards: [...board.cards, {
      issueId,
      columnId: board.columns[0].id,
      order: board.cards.length,
    }],
  };
}

export function normalizeBoard(value: unknown): BoardState {
  const fallback = defaultBoard();
  if (!value || typeof value !== 'object') return fallback;
  const input = value as Partial<BoardState>;
  const columns = Array.isArray(input.columns) && input.columns.length
    ? input.columns.filter((column): column is BoardColumn => Boolean(column && column.id && column.title)).map((column, index) => ({ ...column, order: index }))
    : fallback.columns;
  const validColumns = new Set(columns.map((column) => column.id));
  const cards = Array.isArray(input.cards)
    ? input.cards.filter((card): card is BoardCard => Boolean(card && Number.isInteger(card.issueId) && validColumns.has(card.columnId))).map((card, index) => ({ ...card, order: index }))
    : [];
  return { columns, cards };
}

export function moveBoardCard(
  board: BoardState,
  issueId: number,
  targetIssueId: number,
  targetColumnId: string,
): BoardState {
  const cards = [...board.cards];
  const sourceIndex = cards.findIndex((card) => card.issueId === issueId);
  const targetIndex = cards.findIndex((card) => card.issueId === targetIssueId);
  if (sourceIndex < 0 || targetIndex < 0) return board;
  const [source] = cards.splice(sourceIndex, 1);
  const adjustedTargetIndex = cards.findIndex((card) => card.issueId === targetIssueId);
  cards.splice(Math.max(0, adjustedTargetIndex), 0, { ...source, columnId: targetColumnId });
  return { ...board, cards: cards.map((card, index) => ({ ...card, order: index })) };
}
