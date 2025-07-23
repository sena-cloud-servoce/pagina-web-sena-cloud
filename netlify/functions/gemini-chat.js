// Importa las dependencias necesarias.
// Asegúrate de instalar 'node-fetch' si tu entorno Node.js no lo soporta nativamente (para versiones antiguas).
// En Netlify Functions, 'fetch' suele estar disponible.

// La clave de API de Gemini NO DEBE estar hardcodeada aquí.
// Debe ser gestionada como una variable de entorno en Netlify.
// Por ejemplo, puedes configurarla en las "Environment variables" de tu sitio en Netlify.
// Netlify las inyectará en process.env.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // ¡Importante! Configura esta variable en Netlify

// Esta es la función principal que Netlify Functions ejecutará.
exports.handler = async (event, context) => {
    // Solo procesa solicitudes POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    try {
        // Parsea el cuerpo de la solicitud JSON para obtener el prompt del usuario.
        // Se espera un 'chatHistory' opcional para mantener el contexto.
        const { prompt, chatHistory = [] } = JSON.parse(event.body);

        // Verifica si la clave API está presente.
        if (!GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is not set in environment variables.");
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Server configuration error: Gemini API key is missing.' }),
            };
        }

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing prompt in request body' }),
            };
        }

        // Prepara el historial de chat para enviarlo a la API de Gemini.
        // La API de Gemini espera un formato específico para el historial de chat:
        // [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
        const contents = [
            ...chatHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })),
            { role: "user", parts: [{ text: prompt }] }
        ];

        // Configura el payload para la API de Gemini.
        const payload = {
            contents: contents,
            generationConfig: {
                // Puedes ajustar estos parámetros para controlar la respuesta del modelo.
                temperature: 0.7, // Controla la aleatoriedad de la respuesta (0.0 a 1.0)
                maxOutputTokens: 200, // Limita la longitud de la respuesta
            },
        };

        // URL de la API de Gemini (usando gemini-2.0-flash como ejemplo)
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        // Realiza la solicitud a la API de Gemini.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Verifica si la solicitud a Gemini fue exitosa.
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error from Gemini API:", errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Error calling Gemini API', details: errorData }),
            };
        }

        const result = await response.json();

        // Extrae la respuesta del bot.
        // Asegúrate de que la estructura de la respuesta sea la esperada.
        let botResponse = 'Lo siento, no pude generar una respuesta en este momento.';
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            botResponse = result.candidates[0].content.parts[0].text;
        }

        // Devuelve la respuesta del bot al frontend.
        return {
            statusCode: 200,
            body: JSON.stringify({ response: botResponse }),
        };

    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
        };
    }
};
