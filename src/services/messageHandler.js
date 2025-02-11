import whatsappService from './whatsappService.js'
import appendToSheets from './googleSheetsService.js'
import openAiService from './openAiService.js'

class MessageHandler {
    constructor() {
        this.medias = ['video', 'image', 'audio', 'document']
        this.appointmentState = {}
        this.assistantState = {}
    }

    async handleIncomingMessage(message, senderInfo) {
        if (message?.type === 'text') {
            const incomingMessage = message.text.body.toLowerCase().trim()

            if (this.isGreeting(incomingMessage)) {
                await this.sendWelcomeMessage(
                    message.from,
                    message.id,
                    senderInfo
                )
                await this.sendWelcomeMenu(message.from)
            } else if (this.medias.includes(incomingMessage)) {
                await this.sendMedia(message.from, incomingMessage)
            } else if (this.appointmentState[message.from]) {
                await this.handleAppointmentFlow(message.from, incomingMessage)
            } else if (this.assistantState[message.from]) {
                await this.handleAssistantFlow(message.from, incomingMessage)
            } else {
                const response = `Echo: ${message.text.body}`
                await whatsappService.sendMessage(
                    message.from,
                    response,
                    message.id
                )
            }
            await whatsappService.markAsRead(message.id)
        } else if (message?.type === 'interactive') {
            const option = message?.interactive?.button_reply?.id
            await this.handleMenuOption(message.from, option)
            await whatsappService.markAsRead(message.id)
        }
    }

    isGreeting(message) {
        const greetings = [
            'hi',
            'hello',
            'hey',
            'hola',
            'buenas tardes',
            'buenos días',
            'buenas noches',
        ]
        return greetings.includes(message)
    }

    getSenderName(senderInfo) {
        return senderInfo.profile?.name || senderInfo.wa_id || 'there'
    }

    async sendWelcomeMessage(to, messageId, senderInfo) {
        const name = this.getSenderName(senderInfo)
        const welcomeMessage = `Hi ${name}.\nWelcome to the Whatsapp Chatbot. How can I help you today?`
        await whatsappService.sendMessage(to, welcomeMessage, messageId)
    }

    async sendWelcomeMenu(to) {
        const menuMessage = 'Please select an option from the menu'
        const buttons = [
            {
                type: 'reply',
                reply: {
                    id: 'option_1',
                    title: 'Schedule appointment',
                },
            },
            {
                type: 'reply',
                reply: {
                    id: 'option_2',
                    title: 'Location',
                },
            },
            {
                type: 'reply',
                reply: {
                    id: 'option_3',
                    title: 'Consult',
                },
            },
        ]

        await whatsappService.sendInteractiveButtons(to, menuMessage, buttons)
    }

    async handleMenuOption(to, option) {
        let response
        switch (option) {
            case 'option_1':
                this.appointmentState[to] = { step: 'name' }
                response = 'Please enter your name'
                break
            case 'option_2':
                response = 'We are waiting for you at our site...'
                await this.sendLocation(to)
                break
            case 'option_3':
                this.assistantState[to] = { step: 'question' }
                response = 'Tell me your question'
                break
            case 'option_6':
                response =
                    'Si esto es una emergencia por favor llame a este número'
                await this.sendContact(to)
                break
            default:
                response =
                    'Invalid option: Sorry, I did not understand that option'
                break
        }
        await whatsappService.sendMessage(to, response)
    }

    async sendMedia(to, incomingMessage) {
        const sources = [
            {
                mediaUrl:
                    'https://storage.googleapis.com/platzi-bucket-meta/MetaFiles/Hola%20Claro.mp3',
                caption: 'Audio Test',
                type: 'audio',
            },
            {
                mediaUrl:
                    'https://storage.googleapis.com/platzi-bucket-meta/MetaFiles/corp.mp4',
                caption: 'Corp Video',
                type: 'video',
            },
            {
                mediaUrl:
                    'https://storage.googleapis.com/platzi-bucket-meta/MetaFiles/cafelatte.jpg',
                caption: 'Coffelatte',
                type: 'image',
            },
            {
                mediaUrl:
                    'https://storage.googleapis.com/platzi-bucket-meta/MetaFiles/Python_Machine_Learning_----_(Chapter_1_Introduction_to_Machine_Learning).pdf',
                caption: 'Python Machine Learning',
                type: 'document',
            },
        ]

        const mediaSelected = sources.find(
            (source) => source.type === incomingMessage
        )

        await whatsappService.sendMediaMessage(to, mediaSelected)
    }

    completeAppointment(to) {
        const appointment = this.appointmentState[to]
        delete this.appointmentState[to]

        const userData = [
            to,
            appointment.name,
            appointment.service,
            appointment.date,
            appointment.time,
            new Date().toISOString(),
        ]

        appendToSheets(userData)

        return `Thank you ${appointment.name}, 
        Your appointment for ${appointment.service} on ${appointment.date} at ${appointment.time} has been scheduled.
        We will send you a reminder the day before the appointment.`
    }

    async handleAppointmentFlow(to, message) {
        const state = this.appointmentState[to]
        let response = ''
        switch (state.step) {
            case 'name':
                state.name = message
                state.step = 'service'
                response = 'Thank you, now tell me the service you want to book'
                break
            case 'service':
                state.service = message
                state.step = 'date'
                response =
                    'Thank you, now tell me the date of the appointment you want to schedule'
                break
            case 'date':
                state.date = message
                state.step = 'time'
                response =
                    'Thank you, now tell me the time of the appointment you want to schedule'
                break
            case 'time':
                state.time = message
                state.step = 'confirm'
                response = `Thank you, you want to book an appointment for ${state.service} on ${state.date} at ${state.time}. Please reply with 'yes' to confirm or 'no' to cancel`
                break
            case 'confirm':
                if (message === 'yes') {
                    response = this.completeAppointment(to)
                    state.step = 'done'
                } else if (message === 'no') {
                    response = 'Appointment canceled'
                    state.step = 'done'
                } else {
                    response = 'Invalid option, please reply with yes or no'
                }

                break
            case 'done':
                response = 'Thank you for using our appointment service'
                delete this.appointmentState[to]
                break
        }
        await whatsappService.sendMessage(to, response)
    }

    async handleAssistantFlow(to, message) {
        const state = this.assistantState[to]
        let response

        const menuMessage = 'Was the answer helpful?'
        const buttons = [
            {
                type: 'reply',
                reply: {
                    id: 'option_4',
                    title: 'Yes',
                },
            },
            {
                type: 'reply',
                reply: {
                    id: 'option_5',
                    title: 'No',
                },
            },
            {
                type: 'reply',
                reply: {
                    id: 'option_6',
                    title: 'Contact a human',
                },
            },
        ]

        if (state.step === 'question') {
            response = await openAiService(message)
        }

        delete this.assistantState[to]

        await whatsappService.sendMessage(to, response)
        await whatsappService.sendInteractiveButtons(to, menuMessage, buttons)
    }

    async sendContact(to) {
        const contact = {
            addresses: [
                {
                    street: '123 Calle de las Mascotas',
                    city: 'Ciudad',
                    state: 'Estado',
                    zip: '12345',
                    country: 'País',
                    country_code: 'PA',
                    type: 'WORK',
                },
            ],
            emails: [
                {
                    email: 'contacto@medpet.com',
                    type: 'WORK',
                },
            ],
            name: {
                formatted_name: 'MedPet Contacto',
                first_name: 'MedPet',
                last_name: 'Contacto',
                middle_name: '',
                suffix: '',
                prefix: '',
            },
            org: {
                company: 'MedPet',
                department: 'Atención al Cliente',
                title: 'Representante',
            },
            phones: [
                {
                    phone: '+1234567890',
                    wa_id: '1234567890',
                    type: 'WORK',
                },
            ],
            urls: [
                {
                    url: 'https://www.medpet.com',
                    type: 'WORK',
                },
            ],
        }

        await whatsappService.sendContactMessage(to, contact)
    }

    async sendLocation(to) {
        const location = {
            latitude: 4.766895885990346,
            longitude: -74.17861070385065,
            name: 'Triara',
            address: 'QR8C+QH Funza, Cundinamarca, Colombia',
        }
        
        await whatsappService.sendLocationMessage(to, location)
    }
}

export default new MessageHandler()
