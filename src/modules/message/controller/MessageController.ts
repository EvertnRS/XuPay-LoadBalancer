import { Socket } from "net";
import { Request, isValidBodyRequest} from "@/@types/contracts/Request";
import { MessageService } from "../service/MessageService";
import { IMessageRepository } from "../domain/repository/IMessageRepository";

export class MessageController{
    constructor(
        private messageRepository: IMessageRepository,
        private messageService: MessageService  = new MessageService(this.messageRepository)
    ) {}

    public publish(request: Request, socket: Socket): void {
        const messageBody = isValidBodyRequest(request.body, socket);
        if (!messageBody) {
            return;
        }
        this.messageService.publish(messageBody, socket);
    }

    public retry(request: Request, socket: Socket): void {
        const messageBody = isValidBodyRequest(request.body, socket);
        if (!messageBody) {
            return;
        }
        this.messageService.retry(messageBody, socket);
    }
}