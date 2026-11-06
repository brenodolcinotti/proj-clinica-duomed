/**
 * Registro da tarefa periódica. A definição fica no escopo do módulo.
 *
 * Para manter o caminho Expo Go da aula, BACKGROUND_REAL inicia como false.
 * Para testar a tarefa periódica em um development build, altere para true,
 * gere/recompile o app nativo e instale esse build no aparelho.
 */
import { sincronizarAgenda, precisaSincronizar } from './sincronizacao';

export const NOME_TAREFA_BACKGROUND = 'duomed-sincronizar-agenda-v1';
export const INTERVALO_MINIMO_BACKGROUND_MINUTOS = 15;
export const BACKGROUND_REAL = false;

let TaskManager = null;
let BackgroundTask = null;

if (BACKGROUND_REAL) {
  // Os módulos nativos são carregados apenas quando o modo real é habilitado.
  TaskManager = require('expo-task-manager');
  BackgroundTask = require('expo-background-task');

  if (!TaskManager.isTaskDefined(NOME_TAREFA_BACKGROUND)) {
    TaskManager.defineTask(NOME_TAREFA_BACKGROUND, async ({ error } = {}) => {
      try {
        if (error) return BackgroundTask.BackgroundTaskResult.Failed;
        if (!(await precisaSincronizar(INTERVALO_MINIMO_BACKGROUND_MINUTOS))) {
          return BackgroundTask.BackgroundTaskResult.Success;
        }
        const registro = await sincronizarAgenda('background', { tempoLimiteMs: 25_000 });
        return registro?.sucesso
          ? BackgroundTask.BackgroundTaskResult.Success
          : BackgroundTask.BackgroundTaskResult.Failed;
      } catch (_) {
        // Nenhuma exceção pode escapar da tarefa do sistema operacional.
        return BackgroundTask.BackgroundTaskResult.Failed;
      }
    });
  }
}

export async function registrarTarefa() {
  if (!BACKGROUND_REAL || !TaskManager || !BackgroundTask) {
    return { disponivel: false, registrada: false, motivo: 'Ative BACKGROUND_REAL e use um development build.' };
  }

  const disponivel = await TaskManager.isAvailableAsync();
  if (!disponivel) {
    return { disponivel: false, registrada: false, motivo: 'O sistema não disponibilizou tarefas em background neste ambiente.' };
  }

  const jaRegistrada = await TaskManager.isTaskRegisteredAsync(NOME_TAREFA_BACKGROUND);
  if (!jaRegistrada) {
    await BackgroundTask.registerTaskAsync(NOME_TAREFA_BACKGROUND, {
      minimumInterval: INTERVALO_MINIMO_BACKGROUND_MINUTOS,
    });
  }
  return { disponivel: true, registrada: true };
}

export async function cancelarTarefa() {
  if (!BACKGROUND_REAL || !TaskManager || !BackgroundTask) {
    return { disponivel: false, registrada: false };
  }
  const jaRegistrada = await TaskManager.isTaskRegisteredAsync(NOME_TAREFA_BACKGROUND);
  if (jaRegistrada) {
    await BackgroundTask.unregisterTaskAsync(NOME_TAREFA_BACKGROUND);
  }
  return { disponivel: true, registrada: false };
}

export async function estadoDaTarefa() {
  if (!BACKGROUND_REAL || !TaskManager || !BackgroundTask) {
    return { disponivel: false, registrada: false, modo: 'Expo Go / tarefa periódica desligada' };
  }
  const disponivel = await TaskManager.isAvailableAsync();
  const registrada = disponivel
    ? await TaskManager.isTaskRegisteredAsync(NOME_TAREFA_BACKGROUND)
    : false;
  return { disponivel, registrada, modo: disponivel ? 'background disponível' : 'background indisponível' };
}

export async function forcarTarefaBackgroundParaTeste() {
  if (!BACKGROUND_REAL || !BackgroundTask) {
    throw new Error('A tarefa periódica está desligada. Ative BACKGROUND_REAL e gere um development build.');
  }
  if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    throw new Error('O gatilho manual de teste só funciona em modo de desenvolvimento.');
  }
  const registrada = await TaskManager.isTaskRegisteredAsync(NOME_TAREFA_BACKGROUND);
  if (!registrada) throw new Error('Registre a tarefa antes de forçar sua execução.');
  return BackgroundTask.triggerTaskWorkerForTestingAsync();
}
