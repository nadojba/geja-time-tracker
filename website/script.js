(function () {
  'use strict';

  var translations = {
    'pt-BR': {
      navFeatures: 'Recursos', navHow: 'Como funciona', navSecurity: 'Segurança', navInstall: 'Instalação',
      languageLabel: 'Idioma', installButton: 'Instalar extensão', eyebrow: 'Controle seu tempo com clareza',
      heroTitle: 'O tempo do seu Redmine,<br><em>do seu jeito.</em>',
      heroDescription: 'Cronometre sessões independentes, organize seus chamados e lance horas no Redmine com segurança — direto no navegador.',
      heroCta: 'Adicionar ao Chrome', viewGithub: 'Ver no GitHub', noBackend: 'Sem backend próprio', localStorage: 'Dados locais e seguros',
      timerTab: 'Timer', issuesTab: 'Chamados', hoursTab: 'Horas', activeSession: 'SESSÃO EM ANDAMENTO', issueTitle: 'Criar tela de gerenciamento', stop: 'Parar', pause: 'Pausar', launch: 'Lançar', todayRegistered: 'registrado hoje', pendingSessions: 'sessões pendentes', sessionSaved: 'Sessão salva', sessionSavedSub: '45 min prontos para lançar', synced: 'Sincronizado', builtFor: 'Feito para seu fluxo de trabalho',
      featuresEyebrow: 'Tudo no seu fluxo', featuresTitle: 'Menos atrito.<br><span>Mais tempo bem lançado.</span>', featuresDescription: 'Uma extensão compacta para transformar o acompanhamento de horas em uma parte natural do seu dia.',
      featureTimerTitle: 'Timer por sessão', featureTimerDescription: 'Cada início cria uma sessão nova. Pause, retome ou encerre sem perder o histórico real do trabalho.', featureIssuesTitle: 'Chamados organizados', featureIssuesDescription: 'Pesquise, filtre e agrupe chamados por projeto, versão, status ou prioridade.', featureLaunchTitle: 'Lançamento seguro', featureLaunchDescription: 'Revise duração, atividade, data e comentário antes de enviar qualquer apontamento.', readyToLaunch: 'Pronto para lançar', featureReportsTitle: 'Relatórios claros', featureReportsDescription: 'Veja hoje, semana e mês separando horas confirmadas das sessões ainda pendentes.', featureKanbanTitle: 'Kanban pessoal', featureKanbanDescription: 'Organize seus chamados em colunas locais sem alterar o status original no Redmine.', featureWidgetTitle: 'Sempre por perto', featureWidgetDescription: 'Use o popup, Side Panel, janela auxiliar ou widget direto na página do chamado.',
      howEyebrow: 'Feito para não atrapalhar', howTitle: 'Seu trabalho continua.<br><span>O tempo fica registrado.</span>', howDescription: 'O Geja acompanha a forma como você trabalha, sem impor um processo novo e sem alterar seus chamados.', stepOneTitle: 'Escolha o chamado', stepOneDescription: 'Encontre uma tarefa atribuída a você ou abra um chamado diretamente no Redmine.', stepTwoTitle: 'Inicie uma sessão', stepTwoDescription: 'O contador começa em zero e o estado se mantém sincronizado entre abas e janelas.', stepThreeTitle: 'Revise e lance', stepThreeDescription: 'Ao parar, a sessão fica pendente para você revisar e enviar quando estiver pronto.', quote: 'O tempo local não é misturado com o que já foi confirmado no Redmine. Você sempre sabe o que está pendente.', quoteCaption: 'Princípio do Geja Time Tracker',
      securityEyebrow: 'Privacidade por padrão', securityTitle: 'Seu tempo é seu.', securityDescription: 'A extensão conversa diretamente com a instância Redmine configurada. Não existe backend próprio, telemetria ou serviço intermediário recebendo sua API Key.', readSecurity: 'Leia a política técnica', securityLocalTitle: 'Credenciais locais', securityLocalDescription: 'A API Key fica somente no armazenamento protegido da extensão.', securityWorkerTitle: 'Chamadas centralizadas', securityWorkerDescription: 'O service worker é o único contexto que faz requests autenticados.', securityPermissionTitle: 'Permissão sob demanda', securityPermissionDescription: 'O acesso é solicitado somente para o domínio Redmine escolhido.',
      installTitle: 'Comece a registrar<br><span>com mais confiança.</span>', installDescription: 'Instale a extensão, conecte sua instância Redmine e tenha seus chamados sempre à mão.', installNow: 'Instalar agora', installStepOne: 'Adicione ao Chrome', installStepOneSub: 'A instalação leva poucos segundos.', installStepTwo: 'Configure o Redmine', installStepTwoSub: 'Informe URL e API Key da sua conta.', installStepThree: 'Comece a trabalhar', installStepThreeSub: 'Escolha um chamado e inicie sua primeira sessão.',
      changelogEyebrow: 'Evolução contínua', changelogTitle: 'Feito para melhorar<br><span>com você.</span>', allReleases: 'Ver releases', releaseOneTitle: 'Mais clareza para começar', releaseOneDescription: 'Landing pública, instalação guiada, links oficiais e documentação revisada.', releaseTwoTitle: 'Mais controle no seu fluxo', releaseTwoDescription: 'Cadastro de chamados, seções por projeto e descrições formatadas do Redmine.', footerDescription: 'Uma extensão independente para trabalhar melhor com o Redmine.', chromeStore: 'Chrome Web Store', reportIssue: 'Reportar problema', notOfficial: 'Não é um produto oficial do Redmine.'
    },
    en: {
      navFeatures: 'Features', navHow: 'How it works', navSecurity: 'Security', navInstall: 'Installation',
      languageLabel: 'Language', installButton: 'Install extension', eyebrow: 'Take control of your time',
      heroTitle: 'Your Redmine time,<br><em>your way.</em>',
      heroDescription: 'Track independent sessions, organize issues and log time in Redmine securely — right from your browser.',
      heroCta: 'Add to Chrome', viewGithub: 'View on GitHub', noBackend: 'No custom backend', localStorage: 'Local and secure data',
      timerTab: 'Timer', issuesTab: 'Issues', hoursTab: 'Hours', activeSession: 'SESSION IN PROGRESS', issueTitle: 'Build management screen', stop: 'Stop', pause: 'Pause', launch: 'Log time', todayRegistered: 'logged today', pendingSessions: 'pending sessions', sessionSaved: 'Session saved', sessionSavedSub: '45 min ready to log', synced: 'Synced', builtFor: 'Built for your workflow',
      featuresEyebrow: 'Everything in your flow', featuresTitle: 'Less friction.<br><span>Better time entries.</span>', featuresDescription: 'A focused extension that makes time tracking a natural part of your workday.',
      featureTimerTitle: 'Session-based timer', featureTimerDescription: 'Every start creates a new session. Pause, resume or finish without losing your real work history.', featureIssuesTitle: 'Organized issues', featureIssuesDescription: 'Search, filter and group issues by project, version, status or priority.', featureLaunchTitle: 'Safe time logging', featureLaunchDescription: 'Review duration, activity, date and comments before sending any time entry.', readyToLaunch: 'Ready to log', featureReportsTitle: 'Clear reports', featureReportsDescription: 'See today, this week and this month while separating confirmed and pending time.', featureKanbanTitle: 'Personal Kanban', featureKanbanDescription: 'Organize issues in local columns without changing their original Redmine status.', featureWidgetTitle: 'Always close by', featureWidgetDescription: 'Use the popup, Side Panel, helper window or widget directly on the issue page.',
      howEyebrow: 'Designed to stay out of the way', howTitle: 'Your work continues.<br><span>Your time is recorded.</span>', howDescription: 'Geja fits the way you already work, without imposing a new process or changing your issues.', stepOneTitle: 'Choose an issue', stepOneDescription: 'Find an issue assigned to you or open one directly in Redmine.', stepTwoTitle: 'Start a session', stepTwoDescription: 'The counter starts at zero and stays synchronized across tabs and windows.', stepThreeTitle: 'Review and log', stepThreeDescription: 'When you stop, the session stays pending for review before you send it.', quote: 'Local time is never mixed with what has already been confirmed in Redmine. You always know what is pending.', quoteCaption: 'Geja Time Tracker principle',
      securityEyebrow: 'Privacy by default', securityTitle: 'Your time is yours.', securityDescription: 'The extension talks directly to your configured Redmine instance. There is no custom backend, telemetry or intermediary service receiving your API Key.', readSecurity: 'Read the technical policy', securityLocalTitle: 'Local credentials', securityLocalDescription: 'Your API Key stays in the extension’s protected storage.', securityWorkerTitle: 'Centralized requests', securityWorkerDescription: 'The service worker is the only context that makes authenticated requests.', securityPermissionTitle: 'Permission on demand', securityPermissionDescription: 'Access is requested only for the Redmine domain you choose.',
      installTitle: 'Start tracking<br><span>with confidence.</span>', installDescription: 'Install the extension, connect your Redmine instance and keep your issues within reach.', installNow: 'Install now', installStepOne: 'Add to Chrome', installStepOneSub: 'Installation takes a few seconds.', installStepTwo: 'Configure Redmine', installStepTwoSub: 'Enter your account URL and API Key.', installStepThree: 'Start working', installStepThreeSub: 'Choose an issue and start your first session.',
      changelogEyebrow: 'Always evolving', changelogTitle: 'Built to get better<br><span>with you.</span>', allReleases: 'View releases', releaseOneTitle: 'A clearer way to start', releaseOneDescription: 'Public landing page, guided installation, official links and reviewed documentation.', releaseTwoTitle: 'More control in your flow', releaseTwoDescription: 'Issue creation, project sections and formatted Redmine descriptions.', footerDescription: 'An independent extension for a better Redmine workflow.', chromeStore: 'Chrome Web Store', reportIssue: 'Report an issue', notOfficial: 'Not an official Redmine product.'
    }
  };

  var storageKey = 'geja-landing-language';
  var supported = ['pt-BR', 'en'];
  var select = document.getElementById('language-select');
  var mobileButton = document.getElementById('mobile-menu-button');
  var mobileMenu = document.getElementById('mobile-menu');

  function preferredLanguage() {
    try {
      var saved = window.localStorage.getItem(storageKey);
      if (saved && supported.indexOf(saved) !== -1) return saved;
    } catch (error) { /* Private browsing may deny storage; the default still works. */ }
    return navigator.language && navigator.language.toLowerCase().indexOf('en') === 0 ? 'en' : 'pt-BR';
  }

  function setLanguage(language) {
    var current = supported.indexOf(language) !== -1 ? language : 'pt-BR';
    document.documentElement.lang = current;
    document.querySelectorAll('[data-i18n]').forEach(function (element) {
      var value = translations[current][element.dataset.i18n];
      if (value) element.innerHTML = value;
    });
    if (select) select.value = current;
    try { window.localStorage.setItem(storageKey, current); } catch (error) { /* Non-fatal fallback. */ }
  }

  setLanguage(preferredLanguage());
  if (select) select.addEventListener('change', function (event) { setLanguage(event.target.value); });
  if (mobileButton && mobileMenu) {
    mobileButton.addEventListener('click', function () {
      var open = mobileButton.getAttribute('aria-expanded') === 'true';
      mobileButton.setAttribute('aria-expanded', String(!open));
      mobileMenu.hidden = open;
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { mobileMenu.hidden = true; mobileButton.setAttribute('aria-expanded', 'false'); });
    });
  }
  var year = document.getElementById('current-year');
  if (year) year.textContent = String(new Date().getFullYear());
}());
