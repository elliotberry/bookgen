import 'dotenv/config';
import chalk from 'chalk';

import models from './models.js';

const askOpenRouter = async (prompt, role, modelChoice = 'mistralai/ministral-8b', tokens = 5000, temporary = 0.85, maxRetries = 3) => {
  const now = new Date();
  let roleContent = 'You are a professional writer.';

  switch (role) {
    case 'machine': {
      roleContent = "You are a computer program attempting to comply with the user's wishes.";
      break;
    }
    case 'writer': {
      roleContent = 'You are a professional fiction writer who is a best-selling author. You use all of the rhetorical devices you know to write a compelling book.';
      break;
    }
    default: {
      throw new Error("Invalid role provided. Must be 'machine' or 'writer'.");
    }
  }

  tokens = models[modelChoice].tokenLimit;

  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const response = await fetch(process.env.API_ENDPOINT, {
        body: JSON.stringify({
          max_tokens: tokens,
          messages: [
            {content: roleContent, role: 'system'},
            {content: prompt, role: 'user'},
          ],
          model: modelChoice,
          temperature: temporary,
        }),
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // Use OpenRouter's API key
          'cf-aig-metadata': JSON.stringify({
            app: 'BookJen',
          }),
          'Content-Type': 'application/json',

        },
        method: 'POST',
      });

      const data = await response.json();
      const elapsed = Date.now() - now;

      if (response.ok) {
        return data.choices[0].message.content;
      } else {
        console.error('Error from OpenRouter API:', data);
        throw new Error(data.error || 'An unknown error occurred.');
      }
    } catch (error) {
      attempts += 1;
      console.error(chalk.red(`Attempt ${attempts} failed:`, error));

      if (attempts >= maxRetries) {
        console.error(chalk.red('Max retry attempts reached. Failing.'));
        throw error;
      }

      console.log('Retrying...');
    }
  }
};

export {askOpenRouter};
