    // netlify/functions/gemini-chat.js
    const fetch = require('node-fetch');

    exports.handler = async function(event, context) {
        if (event.httpMethod !== 'POST') {
            return {
                statusCode: 405,
                body: 'Method Not Allowed',
                headers: { 'Allow': 'POST' }
            };
        }

        try {
            const { prompt } = JSON.parse(event.body);
            const apiKey = process.env.GEMINI_API_KEY;

            if (!apiKey) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'GEMINI_API_KEY no configurada.' })
                };
            }

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }]
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    statusCode: response.status,
                    body: JSON.stringify({ error: `Error de la API de Gemini: ${response.status} - ${errorText}` })
                };
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ response: text })
                };
            } else {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Respuesta inesperada del modelo de IA.' })
                };
            }

        } catch (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: `Error interno del servidor: ${error.message}.` })
            };
        }
    };
    