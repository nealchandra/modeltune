enum Role {
  SYSTEM = 'system',
  ASSISTANT = 'assistant',
  USER = 'user',
}

class Message {
  constructor(
    public role: string,
    public content: string,
    public isInnerDialogue: boolean = false
  ) {}

  getColorCode() {
    const colorCodes = {
      system: '\x1b[90m%s\x1b[0m',
      assistant: '\x1b[33m%s\x1b[0m',
      user: '\x1b[36m%s\x1b[0m',
    };

    const colorCode = colorCodes[this.role as keyof typeof colorCodes];

    if (this.isInnerDialogue) {
      colorCode.replace('b[', 'b[1');
    }

    return colorCode;
  }

  pprint() {
    console.log(
      `${this.getColorCode()}`,
      `${this.role.toUpperCase()}: ${this.content}`
    );
  }
}

interface Client {
  complete(messages: Message[]): Promise<Message>;
}

/**
 * A chain is a sequence of messages, where typically the first message is a prompt from the end-user, and the last message
 * is a reply to the end user. Agents can inject and execute messages in the middle of the chain to steer the language model
 * to the desired outcome.
 */
class Chain {
  private messages: Message[] = [];

  constructor(private client: Client) {}

  push(message: Message) {
    this.messages.push(message);
  }

  peek(): Message {
    return this.messages[this.messages.length - 1];
  }

  getMessages() {
    return this.messages;
  }

  async complete() {
    return await this.client.complete(this.messages);
  }

  getCollapsed() {
    return this.messages.filter((m) => !m.isInnerDialogue);
  }
}

/**
 * A history is a sequence of chains. Typically collapsing all chains in a history will yield the message history
 * that the end user sees.
 *
 * A history does not have a client, because it does not directly execute any prompts. It is a collection of chains,
 * each of which could have a different client or target language model.
 */
class ConversationHistory {
  private conversation: Chain[] = [];

  constructor() {}

  push(chain: Chain) {
    this.conversation.push(chain);
  }

  getAbridgedHistory(): Message[] {
    return ([] as Message[]).concat(
      ...this.conversation.map((chain) => chain.getCollapsed())
    );
  }

  getFullHistory(): Message[] {
    return ([] as Message[]).concat(
      ...this.conversation.map((chain) => chain.getMessages())
    );
  }
}

/**
 * An agent drives conversation by executing a sequence of chains to produce a history, including the initial prompt.
 */
abstract class Agent {
  history: ConversationHistory;

  constructor() {
    this.history = new ConversationHistory();
  }

  /* Seeds the conversation history with relevant prompts to initialize the conversation. This can
   * include few-shot examples or other in-context learning examples to seed the language model.
   */
  abstract setup(): void | Promise<void>;

  /* Creates the next chain in the conversation, taking the end-user prompt as input. */
  abstract createChain(history: Message[], input: string): Promise<Chain>;

  abstract executeNextChain(chain: Chain, input: string): void;

  async prompt(input: string) {
    const chain = await this.createChain(
      this.history.getAbridgedHistory(),
      input
    );
    this.history.push(chain);

    const resp = await chain.complete();

    return await this.executeNextChain(chain, input);
  }
}

export { Role, Message, type Client, Chain, ConversationHistory, Agent };
