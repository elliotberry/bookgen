
const models = {

  'meta-llama/Llama-2-70b-chat-hf': {
    name: 'meta-llama/Llama-2-70b-chat-hf',
    tokenLimit: 4096,
  },
  "google/gemini-flash-8b-1.5-exp": {
    name: "google/gemini-flash-8b-1.5-exp",
    tokenLimit: 10000
  },
  "ai21/jamba-1-5-mini": {
    name: "ai21/jamba-1-5-mini",
    tokenLimit: 4096
  },
  "sao10k/l3.3-euryale-70b": {
    name: "sao10k/l3.3-euryale-70b",
    tokenLimit: 15000
  },
  "amazon/nova-micro-v1": {
    name: "amazon/nova-micro-v1",
    tokenLimit: 100000
  },
}

export default models;