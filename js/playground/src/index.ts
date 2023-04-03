import * as dotenv from 'dotenv';
import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  OpenAIApi,
} from 'openai';

import * as eng from '@js/prompt-engine';
import { Message } from '@js/prompt-engine';

dotenv.config();

class OpenAIClient implements eng.Client {
  openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async complete(messages: eng.Message[]): Promise<eng.Message> {
    const resp = await this.openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: messages.map((m) => ({
        role: m.role as ChatCompletionRequestMessageRoleEnum,
        content: m.content,
      })),
    });

    const msg = resp.data.choices[0].message!;
    return new Message(msg.role as eng.Role, msg.content);
  }
}

class CustomAgent extends eng.Agent {
  client: eng.Client;

  constructor(client: eng.Client) {
    super();
    this.client = client;
  }

  setup() {}

  processCompletion(msg: eng.Message, chain: eng.Chain): void {
    if (msg.content.includes('Thought: Do I need to use a tool? Yes')) {
      msg.isInnerDialogue = true;
    }
    chain.push(msg);
  }

  async executeNextChain(input: string): Promise<void> {
    const chain = new eng.Chain(this.client);

    chain.push(
      new Message(
        eng.Role.SYSTEM,
        `You are a helpful AI assistant, here are some details about your capabilities.
TOOLS:
------

Assistant has access to the following tools:
WEB_SEARCH -- a tool which can search the web and return the results

To use a tool, please use the following format:

\`\`\`
Thought: Do I need to use a tool? Yes
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
\`\`\`

When you have a response to say to the Human, or if you do not need to use a tool, you MUST use the format:

\`\`\`
Thought: Do I need to use a tool? No
Assistant: [your response here]
\`\`\`

The converation will begin now:`
      )
    );

    chain.push(new Message(eng.Role.USER, input));
    const completion = await chain.complete();
    this.processCompletion(completion, chain);

    this.history.push(chain);
  }
}

const client = new OpenAIClient();

const main = async () => {
  const agent = new CustomAgent(client);
  await agent.executeNextChain('Who is the current CEO of Microsoft?');
  agent.history.getFullHistory().forEach((m) => m.pprint());
};

main();
