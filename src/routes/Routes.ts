import { Socket } from "net";
import type { Request }  from "../@types/contracts/Request";
import { ErrorHandler } from "../infra/middleware/Error";
import { LoadBalanceController } from "../modules/loadbalance/controller/LoadBalanceController";
import { LoadBalanceService } from "../modules/loadbalance/service/LoadBalanceService";

export class Routes {
    private loadBalanceService: LoadBalanceService;
    private loadBalanceController: LoadBalanceController;
    
    constructor() {
        this.loadBalanceService = new LoadBalanceService();
        this.loadBalanceController = new LoadBalanceController(this.loadBalanceService);
    }

	public handle(request:Request, socket:Socket): void  {
        
        if (request.method == 'POST' && request.path == 'redirect') {
            this.loadBalanceController.redirect(request, socket);
        }
        else {
            ErrorHandler.handle("Rota não encontrada", socket);       
        }
    }
}