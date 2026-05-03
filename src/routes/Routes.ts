import { Socket } from "net";
import type { Request }  from "../@types/contracts/Request";
import { MessageController } from "../modules/message/controller/MessageController";
import { MessageRepositoryImpl } from "@/modules/message/domain/repository/MessageRepositoryimpl";
import { ErrorHandler } from "../infra/middleware/Error";

export class Routes {
    private messageRepository =  new MessageRepositoryImpl();
    private messageController = new MessageController(this.messageRepository);

	public handle(request:Request, socket:Socket):void  {
        
        if (request.method == 'POST' && request.path == 'publish'){
            this.messageController.publish(request, socket);
        }
        else if (request.method == 'POST' && request.path == 'retry'){
            this.messageController.retry(request, socket);
        }
        else {
            ErrorHandler.handle("Rota não encontrada", socket);       
        }
    }
}