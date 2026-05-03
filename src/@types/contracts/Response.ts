export type Response = {
  method: string;
  path: string;
  body: {
    source: string;
    type: string;
    payload: {
        queueMessageId: string;
        service: string;
        apiPayload: string;
    };
    timestamp: string;
  }
};
