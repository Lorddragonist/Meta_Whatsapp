import sentToWhastapp from './httpRequest/sendToWhatsapp.js'

class WhatsAppService {
    async sendMessage(to, body, messageId) {
        try {
            const data = {
                messaging_product: 'whatsapp',
                to,
                text: { body },
            }
            await sentToWhastapp(data)
        } catch (error) {
            console.error('Error sending message:', error)
        }
    }

    async markAsRead(messageId) {
        try {
            const data = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId,
            }

            await sentToWhastapp(data)
        } catch (error) {
            console.error('Error marking message as read:', error)
        }
    }

    async sendInteractiveButtons(to, bodyText, buttons) {
        try {
            const data = {
                messaging_product: 'whatsapp',
                to,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: {
                        text: bodyText,
                    },
                    action: {
                        buttons: buttons,
                    },
                },
            }
            await sentToWhastapp(data)
        } catch (error) {
            console.log('Error sending interactive buttons:', error)
        }
    }

    async sendMediaMessage(to, mediaSelected) {
        try {
            const { type, mediaUrl, caption } = mediaSelected
            const mediaObject = {}

            switch (type) {
                case 'image':
                    mediaObject.image = { link: mediaUrl, caption: caption }
                    break
                case 'audio':
                    mediaObject.audio = { link: mediaUrl }
                    break
                case 'video':
                    mediaObject.video = { link: mediaUrl, caption: caption }
                    break
                case 'document':
                    mediaObject.document = {
                        link: mediaUrl,
                        caption: caption,
                        filename: caption,
                    }
                    break

                default:
                    throw new Error('Invalid media type')
            }

            const data = {
                messaging_product: 'whatsapp',
                to,
                type: type,
                ...mediaObject,
            }

            await sentToWhastapp(data)
        } catch (error) {
            console.error('Error sending media message')
        }
    }

    async sendContactMessage(to, contact) {
        try {
            const data = {
                messaging_product: 'whatsapp',
                to,
                type: 'contacts',
                contacts: [contact],
            }
            await sentToWhastapp(data)
        } catch (error) {
            console.error('Error sending contact message')
        }
    }

    async sendLocationMessage(to, location) {
        try {
            const data = {
                messaging_product: 'whatsapp',
                to,
                type: 'location',
                location: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    name: location.name,
                    address: location.address,
                },
            }
            await sentToWhastapp(data)
        } catch (error) {
            console.error('Error sending location message')
        }
    }
}

export default new WhatsAppService()
