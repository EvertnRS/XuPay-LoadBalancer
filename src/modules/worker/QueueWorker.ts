import { prismaClient } from "../../infra/database/prismaClient";
import { queueEventBus } from "../../infra/event/QueueEventBus";
import { QueueMessageRepositoryImpl } from "../queue/domain/repository/QueueMessageRepositoryImpl";

export class QueueWorker {
    private isProcessing = false;
    private queueMessageRepositoryImpl = new QueueMessageRepositoryImpl();

    public start() {
        console.log("[Worker] Observer iniciado. Aguardando eventos NEW_MESSAGE...");
        
        queueEventBus.on('NEW_MESSAGE', async () => {
            await this.processQueue();
        });
        this.processQueue(); 
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (true) {
                const nextMessage = await this.queueMessageRepositoryImpl.findFirstPendingMessage();

                if (!nextMessage) {
                    break;
                }

                console.log(`[Worker] Observer pegou a mensagem ID: ${nextMessage.id}`);

                await this.queueMessageRepositoryImpl.updateMessage({
                    ...nextMessage,
                    status: 'PROCESSING'
                });

                await new Promise(resolve => setTimeout(resolve, 1000)); 

                await this.queueMessageRepositoryImpl.updateMessage({
                    ...nextMessage,
                    status: 'DONE'
                });

                console.log(`[Worker] Mensagem ID: ${nextMessage.id} concluída.`);
            }
        } catch (error) {
            console.error("[Worker] Erro ao processar mensagem:", error);
            // Aqui entra a lógica de falha (Retry Handler)
        } finally {
            this.isProcessing = false;
        }
    }
}