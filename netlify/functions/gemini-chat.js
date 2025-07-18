    // netlify/functions/gemini-chat.js

    // Import the Google Generative AI library.
    // This library needs to be installed as a dependency (see step 3 below).
    const { GoogleGenerativeAI } = require('@google/generative-ai');

    // The main handler function for your Netlify Serverless Function.
    // It receives the event (HTTP request details) and context (Netlify environment info).
    exports.handler = async function(event, context) {
        // 1. Enforce POST method: Ensure only POST requests are processed.
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405, // Method Not Allowed
                body: JSON.stringify({ error: 'Method Not Allowed' })
            };
        }

        // 2. Retrieve API Key: Get the Google Gemini API key from Netlify's environment variables.
        // This variable MUST be set in your Netlify site settings for security.
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            console.error("GEMINI_API_KEY environment variable is not set.");
            return {
                statusCode: 500, // Internal Server Error
                body: JSON.stringify({ error: 'Server configuration error: API Key missing.' })
            };
        }

        try {
            // 3. Parse Request Body: Extract the chat history sent from your frontend.
            const { chatHistory } = JSON.parse(event.body);

            // 4. Initialize Gemini AI: Create a new instance of the Google Generative AI client.
            const genAI = new GoogleGenerativeAI(API_KEY);
            // Select the generative model. 'gemini-pro' is a general-purpose model.
            // You might consider 'gemini-1.5-flash' for faster, cost-effective responses.
            const model = genAI.getGenerativeModel({ model: "gemini-pro" }); 

            // 5. Start Chat Session: Initialize a chat session with the provided history.
            const chat = model.startChat({
                history: chatHistory,
                generationConfig: {
                    maxOutputTokens: 500, // Limit the length of the bot's response
                },
            });

            // 6. Get Last User Message: Extract the most recent user message from the history.
            const lastUserMessage = chatHistory[chatHistory.length - 1].parts[0].text;

            // 7. Send Message to Gemini: Send the user's message to the Gemini API.
            const result = await chat.sendMessage(lastUserMessage);
            const response = await result.response;
            const text = response.text(); // Get the text content of the AI's response

            // 8. Return Success Response: Send the AI's response back to the frontend.
            return {
                statusCode: 200, // OK
                headers: {
                    'Content-Type': 'application/json', // Indicate JSON response
                },
                body: JSON.stringify({ text: text }) // The AI's response
            };

        } catch (error) {
            // 9. Handle Errors: Log and return an error response if something goes wrong.
            console.error("Error communicating with Gemini API:", error);
            return {
                statusCode: 500, // Internal Server Error
                body: JSON.stringify({ error: `Error processing request: ${error.message}` })
            };
        }
    };
    