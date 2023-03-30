enum Role {
  SYSTEM = 'system',
  ASSISTANT = 'assistant',
  USER = 'user',
}

class Message {
  constructor(public role: string, public content: string) {}
}

interface Client {
  prompt(chain: Chain): Promise<Chain>;
}

class Chain {
  private messages: Message[] = [];

  constructor(private client: Client) {}
}
