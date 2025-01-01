var totalUsage = 0;

const askOpenRouter = async (prompt, role, modelChoice = 'gpt-3.5-turbo', tokens = 5000, temp = 0.85, maxRetries = 3) => {
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
      const response = await fetch('https://gateway.ai.cloudflare.com/v1/e8308a9ca45585112db0d6f88a2cf0c9/penus/openrouter/v1/chat/completions', {
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
      console.log(`OpenRouter response time: ${elapsed}ms.`);

      if (response.ok) {
        return data.choices[0].message.content;
      } else {
        console.error('Error from OpenRouter API:', data);
        throw new Error(data.error || 'An unknown error occurred.');
      }
    } catch (error) {
      attempts += 1;
      console.error(`Attempt ${attempts} failed:`, error);

      if (attempts >= maxRetries) {
        console.error('Max retry attempts reached. Failing.');
        throw error;
      }

      console.log('Retrying...');
    }
  }
};

export {askOpenRouter};
