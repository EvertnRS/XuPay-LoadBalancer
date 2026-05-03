import { MessageBody } from "@/@types/contracts/MessageBody";
import { Socket } from "net";
import { MessageRepositoryImpl } from "../domain/repository/MessageRepositoryimpl";
import { QueueMessageRepositoryImpl } from "../../queue/domain/repository/QueueMessageRepositoryImpl";
import crypto from "crypto";
import { queueEventBus } from "../../../infra/event/QueueEventBus";
import { ErrorHandler } from "@/infra/middleware/Error";

export class MessageService {
    constructor(
        private messageRepository: MessageRepositoryImpl,
        private queueMessageRepository: QueueMessageRepositoryImpl = new QueueMessageRepositoryImpl()
    ) {}    

    public async publish(message:MessageBody, socket: Socket): Promise<void> {
        const existingMessage = await this.messageRepository.findByTimestamp(new Date(message.timestamp));
        if (existingMessage) {
            return ErrorHandler.handle("Mensagem já existe", socket);
        }

        const payloadHash = await this.generatePayloadHash(message.payload);
         
         const savedMessage = await this.messageRepository.saveMessage({
            source: message.source,
            type: message.type,
            payload: payloadHash,
            timestamp: new Date(message.timestamp)
        });

        //TODO: Refatorar para a camada de serviço de fila, não acoplar diretamente o repositório aqui
        await this.queueMessageRepository.saveMessage({
            messageId: savedMessage.id,
            retryCount: 0
        });

        queueEventBus.emit('NEW_MESSAGE');
        
        socket.write(`Mensagem publicada: ${message.type} - ${message.payload} - ${message.timestamp}`);
        socket.end();
    }

    public retry(message: MessageBody, socket: Socket): void {
        

        socket.write(`Mensagem republicada: ${message.type} - ${message.payload} - ${message.timestamp}`);
        socket.end();
    }

    //TODO: Refatorar para usar um serviço de hashing e não acoplar diretamente o hash aqui
    private async generatePayloadHash(payload: string): Promise<string> {
        return crypto
            .createHash("sha256")
            .update(payload)
            .digest("hex");
        }
    
}