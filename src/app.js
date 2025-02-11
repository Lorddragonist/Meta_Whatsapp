import express from 'express'
import config from './config/env.js'
import webhookRoutes from './routes/webhookRoutes.js'

const app = express()
app.use(express.json())

app.use('/', webhookRoutes)

app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to the Whatsapp Chatbot.</h1>
        <p>Available routes</p>
        <ul>
            <li>/webhook</li>
        </ul>
        `)
})

app.listen(config.PORT, () => {
    console.log(`Server is listening on port:  ${config.PORT}`)
})
