import models from './models.js';

async function outlineGenerator(model, { plotGenre}, {desiredPages, padAmount}) {
  let tokenLimit = model.tokenLimit;
  const outlinePrompt = `Generate the outline of an original ${desiredPages}-page ${plotGenre} fiction book. Imagine and then carefully label the following: a detailed plot, characters with names, settings and writing style. You have ${model.tokenLimit - (40 + padAmount)} words remaining to write the outline. It is CRITICAL you as many words as possible.`;

  console.log(`Generating Outline...`);

  let outline = await model.fn(outlinePrompt, 'writer', model.name, model.tokenLimit - (40 + padAmount), 0.9);

  console.log(`Here is the raw outline:`);
  console.log(outline);

  return {outline};
}

export default outlineGenerator;
