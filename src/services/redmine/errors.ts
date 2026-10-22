export class RedmineApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryable = false) {
    super(message);
    this.name = 'RedmineApiError';
  }
}

export const messageForStatus = (status: number) => ({
  401: 'API Key inválida ou expirada.', 403: 'O usuário não possui permissão para esta operação.',
  404: 'O recurso não foi encontrado no Redmine.', 422: 'O Redmine rejeitou os dados enviados.',
  429: 'O Redmine limitou temporariamente as requisições. Tente novamente mais tarde.',
}[status] ?? (status >= 500 ? 'O Redmine está indisponível no momento.' : 'Não foi possível concluir a requisição.'));
