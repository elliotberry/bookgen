const askOpenRouter = async (prompt, role, modelChoice = 'gpt-3.5-turbo', tokens = 5000, temp = 0.85) => {
    const now = new Date();
    let roleContent = "You are a ChatGPT-powered chatbot.";

    switch (role) {
        case 'machine':
            roleContent = "You are a computer program attempting to comply with the user's wishes.";
            break;
        case 'writer':
            roleContent = "You are a professional fiction writer who is a best-selling author. You use all of the rhetorical devices you know to write a compelling book.";
            break;
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, // Use OpenRouter's API key
                "HTTP-Referer": "http://bookgen.fun",
                "X-Title": "bookgen"
            },
            body: JSON.stringify({
                model: modelChoice,
                messages: [
                    { role: "system", content: roleContent },
                    { role: "user", content: prompt },
                ],
                max_tokens: tokens,
                temperature: temp,
            }),
        });

        const data = await response.json();

        const elapsed = new Date() - now;
        console.log(`\nOpenRouter response time: ${elapsed}ms\n`);

        if (response.ok) {
            return data;
        } else {
            console.error("Error from OpenRouter API:", data);
            throw new Error(data.error || 'An unknown error occurred.');
        }
    } catch (error) {
        console.error("Error in askOpenRouter function:", error);
        throw error;
    }
};

export {askOpenRouter};