import dotenv from 'dotenv';


dotenv.config();


async function askOpenRouter(prompt, role = "user", model = "meta-llama/Llama-2-70b-chat-hf", tokens = 5000, temperature = 0.85) {
    const startTime = Date.now();
    const roles = {
        "assistant": "You are a helpful and knowledgeable assistant.",
        "machine": "You are a computer program attempting to comply with the user's wishes.",
        "system": "You are an AI assistant ready to help.",
        "user": "You are a user asking a question.",
        "writer": "You are a professional fiction writer who is a best-selling author. You use all of the rhetorical devices you know to write a compelling book.",
    };

    const messages = [{ content: roles[role], role: "system" }, { content: prompt, role: "user" }];

    const requestBody = {
        max_tokens: tokens,
        messages,
        model,
        temperature,
    };

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            body: JSON.stringify(requestBody),
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
            },
            method: "POST"
        });
        if (!response.ok) {
            console.error("OpenRouter API error:", response.statusText);
            return { error: response.statusText, text: 'error' };
        }
        const data = await response.json();
        const elapsed = Date.now() - startTime;
        console.log(`\nOpenRouter + Llama 2 response time: ${elapsed}ms\n`);

        if (data && data.choices) {
            return data.choices[0].message;
        } else {
            console.error("Unexpected response format:", data);
            return { error: 'Unexpected response format', text: 'error' };
        }

    } catch (error) {
        console.error("OpenRouter API error:", error);
        return { error: error.message, text: 'error' }; 
    }
}

export default askOpenRouter;
