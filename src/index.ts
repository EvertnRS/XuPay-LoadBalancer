import net from 'net';
import { ResponseParser } from './infra/parser/ResponseParser';
import { ErrorHandler } from './infra/middleware/Error';
import { Routes } from './routes/Routes';

const routes = new Routes();

const server = net.createServer((socket: net.Socket) => {
    console.log('Cliente conectado');

    socket.on('data', (data: Buffer) => {
        console.log('Recebido');
        
        try{
            const request = ResponseParser.deserialize(data.toString());

            if (!request) {
                throw new Error("Requisição mal formatada " + data.toString());
            }

            routes.handle(request, socket);
            
        } catch (error) {
            return ErrorHandler.handle("Erro ao processar requisição", socket);
        }
        });

        socket.on('end', () => {
            console.log('Cliente desconectado');
        });
    });

server.listen(5500, () => {
    console.log('Servidor de processamento rodando na porta 5500');
});