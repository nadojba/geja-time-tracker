import type { RedmineIssue } from '@/services/redmine/client';

export interface IssueFilters {
  text?: string;
  projectId?: string;
  statusId?: string;
  priorityId?: string;
  pendingIssueIds?: ReadonlySet<number>;
  workedTodayIssueIds?: ReadonlySet<number>;
}

export interface IssueSortOptions {
  sortByPriority: boolean;
  activeIssueId?: number;
  pinnedIssueIds?: Set<number>;
}

export interface IssueGroup {
  key: string;
  label: string;
  project: string;
  version?: string;
  issues: RedmineIssue[];
}

export function filterIssues(
  issues: RedmineIssue[],
  filters: IssueFilters,
): RedmineIssue[] {
  const text = filters.text?.trim().toLocaleLowerCase('pt-BR');
  return issues.filter((issue) => {
    if (
      text &&
      !`${issue.id} ${issue.subject}`.toLocaleLowerCase('pt-BR').includes(text)
    )
      return false;
    if (filters.projectId && String(issue.project.id) !== filters.projectId)
      return false;
    if (filters.statusId && String(issue.status?.id) !== filters.statusId)
      return false;
    if (filters.priorityId && String(issue.priority?.id) !== filters.priorityId)
      return false;
    if (filters.pendingIssueIds && !filters.pendingIssueIds.has(issue.id))
      return false;
    if (
      filters.workedTodayIssueIds &&
      !filters.workedTodayIssueIds.has(issue.id)
    )
      return false;
    return true;
  });
}

export function sortIssues(
  issues: RedmineIssue[],
  options: IssueSortOptions,
): RedmineIssue[] {
  return [...issues].sort((left, right) => {
    if (options.activeIssueId) {
      if (left.id === options.activeIssueId) return -1;
      if (right.id === options.activeIssueId) return 1;
    }
    if (options.pinnedIssueIds?.size) {
      const leftPinned = options.pinnedIssueIds.has(left.id);
      const rightPinned = options.pinnedIssueIds.has(right.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;
    }
    if (options.sortByPriority) {
      const priorityDifference =
        (right.priority?.id ?? 0) - (left.priority?.id ?? 0);
      if (priorityDifference) return priorityDifference;
    }
    return left.id - right.id;
  });
}

export function groupIssues(
  issues: RedmineIssue[],
  byTargetVersion: boolean,
): IssueGroup[] {
  const groups = new Map<string, IssueGroup>();
  for (const issue of issues) {
    const project = issue.project.name;
    const version = issue.fixed_version?.name ?? 'Sem versão';
    const label = byTargetVersion ? `${project} · ${version}` : project;
    const key = byTargetVersion
      ? `${issue.project.id}:${issue.fixed_version?.id ?? 'none'}`
      : String(issue.project.id);
    const group = groups.get(key) ?? {
      key,
      label,
      project,
      version: byTargetVersion ? version : undefined,
      issues: [],
    };
    group.issues.push(issue);
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) =>
    left.version === 'Sem versão'
      ? 1
      : right.version === 'Sem versão'
        ? -1
        : left.label.localeCompare(right.label, 'pt-BR'),
  );
}
