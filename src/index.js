// libs
import bodyParser from 'body-parser'
import express from 'express'
import {
  ChatConnector, UniversalBot, Prompts
} from 'botbuilder'

// src
import * as routes from './routes'
import models from './models'
import {
  AUTH_CALLBACK_ENDPOINT,
  MESSAGE,
  SKYPE_BOT_URL,
  SKYPE_ADDRESS,
  SKYPE_CREDENTIALS,
} from './constants'
import { TelegramBot } from './TelegramBot'
import { BotOperations } from './botOperations'

const telegramBot = new TelegramBot()
const botOperations = new BotOperations()
const connector = new ChatConnector(SKYPE_CREDENTIALS)
const app = express()
  .use(bodyParser.json())
  .use(AUTH_CALLBACK_ENDPOINT, routes.authCallback)
  .use('/webhook', routes.webhook)

app.get('/', (req, res) => res.redirect(SKYPE_BOT_URL))

app.get('/get-all', (req, res) => {
  models.Chat.findAll({ include: [models.Integration] }).then(chats => {
    if (chats !== null) {
      const data = chats.map(chat => chat.get({ plain: true }))
      res.json(data)
    }
  })
})

app.post('/skype-messaging', connector.listen())

const skypeBot = new UniversalBot(connector, session => {
  const { address, text } = session.message
  console.log('Session: ', address)
  botOperations.handleCommands(text, true, session)
})

skypeBot.dialog('askSpaceIntegrate', [
  (session, args) => {
    session.dialogData.projects = args.projects
    Prompts.choice(
      session,
      MESSAGE.CHOOSE_SAPCE_INTEGRATE,
      args.projects,
    )
  },
  (session, results) => {
    const { index, entity } = results.response
    const { projectId, projectFullName } = session.dialogData.projects[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.insertIntegration(
      true,
      chatId,
      session,
      projectId,
      projectFullName,
    )
  },
])

skypeBot.dialog('askSpaceDelete', [
  (session, args) => {
    session.dialogData.projects = args.projects
    Prompts.choice(session, MESSAGE.CHOOSE_SAPCE_DELETE, args.projects)
  },
  (session, results) => {
    const { index, entity } = results.response
    const { projectId, projectFullName } = session.dialogData.projects[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.deleteIntegration(
      true,
      chatId,
      session,
      projectId,
      projectFullName,
    )
  },
])

// const address = { ...SKYPE_ADDRESS, conversation: { id: '29:1Q4GY9DQHXFyfbdlyJCp4S5Sw2KiUbS-1c68EGArOS287_ThoI4q6zH3cVhiWSLBC' } }
// const reply = new builder.Message()
//   .address(address)
//   .text(`**PUSH:**
//   ---
//   *Muhammad Ali @mrmuhammadali* **pushed** 1 commits in emumba/aera/sauron.
//   ---
//   Commits:
//     1. *Muhammad Ali* **committed** Separates View from Logic`)
//
// skypeBot.send(reply)

telegramBot.onText(/\/(.+)/, (msg, match) => {
  botOperations.handleCommands(match[1], false, msg)
})

telegramBot.on('callback_query', callbackQuery => {
  botOperations.handleCallbackQuery(callbackQuery)
})

app.listen(process.env.PORT || 3030, () => {
  console.log(`GitLab Bot Server started at port: ${process.env.PORT || 3030}`)
})
