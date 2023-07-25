const logger = require('../util/logger.js');

const messageSender = async (client, messageDetails) => {
  let { from, to, type, message, urlni, filename } = messageDetails;
  const idSend = to + "@s.whatsapp.net";
  try {
    const sentMessage = await client.sendText(idSend, message);
    // logger.info(`Message sent to ${to} from ${from}`);
    return sentMessage;
  } catch (error) {
    logger.error(`Error in sending message to ${to} from ${from}`);
    // logger.error(message.error);
    logger.error(error.message);
    throw error
  }
}

const messageFinder = async (client, chatId, messageId) => {
    const message = client.getMessageById(chatId, messageId)
    if (!message || message === undefined) {
        throw new NotFoundError(`Message ${messageId} not found`);
    }
    return message
}

const messagesFetcher = async (client, chatId, limit) => {
    const messages = client.getMessages(chatId, getMessagesParams = { count : limit})
    if (!messages || messages === undefined) {
        throw new NotFoundError(`Messages not found`);
    }
    return messages
}
  
const messageFetcher = async (client, chatId, limit) => {
    const chat = await client.getChatById(chatId).catch(() => {
        throw new NotFoundError(`Chat ${chatId} not found`);
    })
    // console.log(chat);
    // Use a conditional statement to handle the 'limit' argument
    const messages = limit
        ? await chat.fetchMessages({ limit: limit }).catch(() => {
            throw new NotFoundError(`Messages not found`);
        })
        : await chat.fetchMessages().catch(() => {
            throw new NotFoundError(`Messages not found`);
        });
    console.log(messages)
    return messages
}  
module.exports = {messageSender, messageFinder, messageFetcher, messagesFetcher}