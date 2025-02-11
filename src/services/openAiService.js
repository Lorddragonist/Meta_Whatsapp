import OpenAI from 'openai'
import config from '../config/env.js'

const client = new OpenAI({
    apiKey: config.CHATGPT_API_KEY,
})

const prompt = `
'Comportarte como un software engineer especializado en datos, deberás de resolver las preguntas lo más simple posible. Responde en texto plano, como si fuera una conversación por WhatsApp, no saludes, no generas conversaciones, solo respondes con la pregunta del usuario.
`

const openAiService = async (message) => {
    try {
        const response = await client.chat.completions.create({
            messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: message },
            ],
            model: 'gpt-4o-mini',
        })
        return response.choices[0].message.content
    } catch (error) {
        console.log('Error in OpenAI', error)
    }
}

export default openAiService
