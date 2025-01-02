import chalk from 'chalk';
import 'dotenv/config';

const askOpenRouter = async (prompt, role, modelChoice = 'mistralai/ministral-8b', tokens = 5000, temp = 0.85, maxRetries = 3) => {
  const now = new Date();
  let roleContent = 'You are a ChatGPT-powered chatbot.';

  switch (role) {
    case 'machine':
      roleContent = "You are a computer program attempting to comply with the user's wishes.";
      break;
    case 'writer':
      roleContent = 'You are a professional fiction writer who is a best-selling author. You use all of the rhetorical devices you know to write a compelling book.';
      break;
  }

  let attempts = 0;
  while (attempts < maxRetries) {
    try {
      const response = await fetch(process.env.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'cf-aig-metadata': JSON.stringify({
            app: 'BookJen',
          }),
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // Use OpenRouter's API key

        },
        body: JSON.stringify({
          model: modelChoice,
          messages: [
            {role: 'system', content: roleContent},
            {role: 'user', content: prompt},
          ],
          max_tokens: tokens,
          temperature: temp,
        }),
      });

      const data = await response.json();
      const elapsed = new Date() - now;

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
