const bodyParser = require('body-parser')
const express = require('express')
const builder = require('botbuilder')
import unescape from 'lodash/unescape'

import * as routes from './routes'
import models from './models'
import { TELEGRAM_BOT_URL, SKYPE_ADDRESS, SKYPE_CREDENTIALS, MESSAGE, AUTH_CALLBACK_ENDPOINT } from './utils'
import { TelegramBot } from './TelegramBot'
import { BotOperations } from './botOperations'

const telegramBot = new TelegramBot()
const botOperations = new BotOperations()
const app = express()
  .use(bodyParser.json())
  .use(AUTH_CALLBACK_ENDPOINT, routes.authCallback)

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

// Create chat bot
const connector = new builder.ChatConnector(SKYPE_CREDENTIALS);

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

telegramBot.onText(/\/(.+)/, (msg, match) => {
  botOperations.handleCommands(match[1], false, msg)
});

telegramBot.on('callback_query',  (callbackQuery) => {
  botOperations.handleCallbackQuery(callbackQuery)
});

app.post('/webhook', (req, res) => {
  console.log("++Webhook Request: ", req)
  const {
    object_kind: objectKind,
    user_id: userId,
    user_name: name,
    user_username: username,
    project_id: projectId,
    project: { path_with_namespace: projectFullPath },
    repository: { name: repositoryName },
    commits,
    total_commits_count: totalCommitsCount
  } = req.body

  const str = unescape(`${object}:\n${author} ${action} '${title}' in '${space}'`)

  models.Integration.findAll({where: {projectId}})
    .then(integrations => {
      if (integrations !== null) {
        integrations.map(({ dataValues: integration }) => {
          const { projectFullName, chatId } = integration
          console.log(chatId + ": ", projectFullName)
          if (/[a-z]/.test(chatId)) {
            const address = { ...SKYPE_ADDRESS, conversation: { id: chatId } }
            const reply = new builder.Message()
              .address(address)
              .text(str)
            skypeBot.send(reply)
          } else {
            telegramBot.sendMessage(chatId, str)
          }
        })
      }
    })

  res.json({ project_id: projectId, success: true })
})

app.listen(process.env.PORT || 3030, () => {
  console.log(`GitLab Bot Server started at port: ${process.env.PORT || 3030}`);
});
