import askOpenRouter from './ask-open-AI.js';
import models from './models.js';
const itemsToPopulateHashMap = {
    'mainCharacters': 'main characters list',
    'minorCharacters': 'minor characters list',
    'plotOutline': 'plot',
    'plotSettings': 'setting',
    'writingAdjectives': 'writing adjectives list',
    'writingStyle': 'writing style'
  }

const overviewItems = async (state) => {
    console.log('\nPopulating state from raw outline.\n')
  const {modelChoice, padAmount} = state.opts;
    for await (const [key, keyValue] of Object.entries(itemsToPopulateHashMap)) {
      
      const statePopulatorPrompt = `I'm going to give you the outline of a book. From this outline, tell me the ${keyValue}. Use close to ${models[modelChoice].tokenLimit - (500 + state.rawOutline + padAmount)} words for this page. Here is the outline: ${state.rawOutline}`;
  
      let statePopulatorResult = await askOpenRouter(statePopulatorPrompt, 'machine', models[modelChoice].name, (models[modelChoice].tokenLimit - (state.rawOutline.length + padAmount)), 0.9)
  
      console.log(statePopulatorResult)
      statePopulatorResult = statePopulatorResult.choices[0].message.content;
  
      state.update(key, statePopulatorResult);
      process.stdout.write(`\n\u001B[36m here is the ${keyValue}: ${statePopulatorResult}\n`);
    }
    return state;
}
export default overviewItems;

