import { EventEmitter } from 'events';

// Criamos uma instância única (Singleton) para a aplicação toda usar
class QueueEventBus extends EventEmitter {}

export const queueEventBus = new QueueEventBus();