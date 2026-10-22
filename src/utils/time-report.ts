import type { TimeSession } from '@/domain/types';

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor(seconds % 3600 / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${remainingSeconds}`;
};

const statusLabel: Record<TimeSession['status'], string> = {
  running: 'Em andamento',
  paused: 'Pausada',
  pending: 'Pendente',
  submitting: 'Enviando',
  submitted: 'Lançada',
  reconciliation_required: 'Requer reconciliação',
};

export function createTimeReportHtml(input: { sessions: TimeSession[]; accountName?: string; redmineUrl?: string; generatedAt?: Date }): string {
  const generatedAt = input.generatedAt ?? new Date();
  const sessions = [...input.sessions].sort((left, right) => right.spentOn.localeCompare(left.spentOn) || right.createdAt.localeCompare(left.createdAt));
  const totalSeconds = sessions.reduce((total, session) => total + session.durationSeconds, 0);
  const pendingSeconds = sessions.filter((session) => session.status === 'pending' || session.status === 'reconciliation_required').reduce((total, session) => total + session.durationSeconds, 0);
  const submittedSeconds = sessions.filter((session) => session.status === 'submitted').reduce((total, session) => total + session.durationSeconds, 0);
  const generatedLabel = generatedAt.toLocaleString('pt-BR');
  const rows = sessions.length ? sessions.map((session) => `<tr><td>#${session.issueId}</td><td>#${session.projectId}</td><td>${escapeHtml(session.spentOn)}</td><td class="duration">${formatDuration(session.durationSeconds)}</td><td><span class="status status-${session.status}">${statusLabel[session.status]}</span></td><td>${escapeHtml(session.description || '—')}</td></tr>`).join('') : '<tr><td class="empty" colspan="6">Nenhuma sessão encontrada.</td></tr>';

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de horas — Geja Time Tracker - Redmine</title><style>
    @page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#17233e;font:12px/1.45 Arial,sans-serif}header{border-bottom:2px solid #2e5bd7;margin-bottom:20px;padding-bottom:14px}h1{margin:0 0 4px;font-size:22px}h2{margin:0 0 16px;font-size:16px}p{margin:3px 0;color:#66748e}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 22px}.metric{border:1px solid #d8e1ef;border-radius:8px;padding:10px;background:#f7f9fc}.metric strong{display:block;margin-top:3px;font-size:18px;color:#172d68}.metric span{color:#66748e;font-size:10px;text-transform:uppercase;letter-spacing:.05em}table{border-collapse:collapse;width:100%;table-layout:fixed}th{background:#edf2fa;color:#344563;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em}th,td{border-bottom:1px solid #e1e7f0;padding:8px 6px;vertical-align:top;overflow-wrap:anywhere}th:nth-child(1){width:8%}th:nth-child(2){width:10%}th:nth-child(3){width:14%}th:nth-child(4){width:13%}th:nth-child(5){width:19%}.duration{font-variant-numeric:tabular-nums;font-weight:bold}.status{display:inline-block;border-radius:999px;padding:3px 6px;font-size:10px}.status-pending,.status-reconciliation_required{background:#fff2d6;color:#8b5a00}.status-submitted{background:#def7e8;color:#087443}.status-running,.status-paused,.status-submitting{background:#e5edff;color:#244cae}.empty{text-align:center;color:#66748e;padding:24px}footer{margin-top:20px;color:#8995a8;font-size:10px}@media print{.no-print{display:none}}
  </style></head><body><header><h1>Relatório de horas</h1><p>Geja Time Tracker - Redmine</p><p>Conta: ${escapeHtml(input.accountName || 'Não identificada')}${input.redmineUrl ? ` · ${escapeHtml(input.redmineUrl)}` : ''}</p><p>Gerado em ${escapeHtml(generatedLabel)}</p></header><h2>Resumo das sessões</h2><section class="summary"><div class="metric"><span>Total</span><strong>${formatDuration(totalSeconds)}</strong></div><div class="metric"><span>Pendente</span><strong>${formatDuration(pendingSeconds)}</strong></div><div class="metric"><span>Lançado no Redmine</span><strong>${formatDuration(submittedSeconds)}</strong></div></section><h2>Detalhamento</h2><table><thead><tr><th>Chamado</th><th>Projeto</th><th>Data</th><th>Duração</th><th>Status</th><th>Descrição</th></tr></thead><tbody>${rows}</tbody></table><footer>Relatório gerado localmente pelo Geja Time Tracker - Redmine. As sessões pendentes ainda não representam horas confirmadas no Redmine.</footer></body></html>`;
}

export function printTimeReport(input: Parameters<typeof createTimeReportHtml>[0]): void {
  const reportWindow = window.open('', '_blank', 'width=960,height=760');
  if (!reportWindow) throw new Error('O Chrome bloqueou a janela do relatório. Permita pop-ups para a extensão e tente novamente.');
  reportWindow.document.open();
  reportWindow.document.write(createTimeReportHtml(input));
  reportWindow.document.close();
  reportWindow.focus();
  window.setTimeout(() => reportWindow.print(), 250);
}
