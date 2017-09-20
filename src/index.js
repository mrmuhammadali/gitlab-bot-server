const bodyParser = require('body-parser')
const express = require('express')
const builder = require('botbuilder')

import * as routes from './routes'
import models from './models'
import { TELEGRAM_BOT_URL, SKYPE_CREDENTIALS, SKYPE_ADDRESS, MESSAGE, AUTH_CALLBACK_ENDPOINT } from './utils'
import { TelegramBot } from './TelegramBot'
import { BotOperations } from './botOperations'

const telegramBot = new TelegramBot()
const botOperations = new BotOperations()
const connector = new builder.ChatConnector(SKYPE_CREDENTIALS);
const app = express()
  .use(bodyParser.json())
  .use(AUTH_CALLBACK_ENDPOINT, routes.authCallback)
  .use("/webhook", routes.webhook)

app.get('/', (req, res) => res.redirect(TELEGRAM_BOT_URL) )

app.get('/get-all', (req, res) => {
  models.Chat.findAll({ include: [models.Integration]})
    .then(chats => {
      if (chats !== null) {
        const data = chats.map(({ dataValues }) => dataValues)
        res.json(data);
      }
    })
})

app.post('/skype-messaging', connector.listen());

const skypeBot = new builder.UniversalBot(connector, (session) => {
  const { address, text } = session.message
  console.log("Session: ", address)
  botOperations.handleCommands(text, true, session)
});

skypeBot.dialog('askSpaceIntegrate', [
  (session, args) => {
    session.dialogData.projects = args.projects
    builder.Prompts.choice(session, MESSAGE.CHOOSE_SAPCE_INTEGRATE, args.projects);
  }, (session, results) => {
    const { index, entity } = results.response
    const { projectId, projectFullName } = session.dialogData.projects[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.insertIntegration(true, chatId, session, projectId, projectFullName)
  }
]);

skypeBot.dialog('askSpaceDelete', [
  (session, args) => {
    session.dialogData.projects = args.projects
    builder.Prompts.choice(session, MESSAGE.CHOOSE_SAPCE_DELETE, args.projects);
  }, (session, results) => {
    const { index, entity } = results.response
    const { projectId, projectFullName } = session.dialogData.projects[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.deleteIntegration(true, chatId, session, projectId, projectFullName)
  }
]);

// const address = { ...SKYPE_ADDRESS, conversation: { id: '29:1Q4GY9DQHXFyfbdlyJCp4S5Sw2KiUbS-1c68EGArOS287_ThoI4q6zH3cVhiWSLBC' } }
// const reply = new builder.Message()
//   .address(address)
//   .text(`**PUSH:**
//   ---`)
//
// skypeBot.send(reply)

telegramBot.onText(/\/(.+)/, (msg, match) => {
  botOperations.handleCommands(match[1], false, msg)
});

telegramBot.on('callback_query',  (callbackQuery) => {
  botOperations.handleCallbackQuery(callbackQuery)
});

app.listen(process.env.PORT || 3030, () => {
  console.log(`GitLab Bot Server started at port: ${process.env.PORT || 3030}`);
});
