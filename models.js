import askOpenRouter from './askOpenRouter.js';
import askOpenRouter from './ask-open-AI.js';
const models = {
  'gpt4': {
    name: 'gpt-4-0314',
    tokenLimit: 4096,
    fn: askOpenRouter,
  },
  'gpt35': {
    name: 'gpt-3.5-turbo',
    tokenLimit: 4097,
    fn: askOpenRouter,
  },
  'meta-llama/Llama-2-70b-chat-hf': {
    name: 'meta-llama/Llama-2-70b-chat-hf',
    tokenLimit: 4096,
    fn: askOpenRouter,
  },
  "google/gemini-flash-8b-1.5-exp": {
    name: "google/gemini-flash-8b-1.5-exp",
    tokenLimit: 10000,
    fn: askOpenRouter
  },
}

export default models;