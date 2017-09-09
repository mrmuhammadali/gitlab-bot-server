const bodyParser = require('body-parser');
const express = require('express');
const builder = require('botbuilder');
import unescape from 'lodash/unescape'
import _ from 'lodash'

import * as routes from './routes'
import models from './models'
import {TELEGRAM_BOT_URL, SKYPE_ADDRESS, SKYPE_CREDENTIALS, MESSAGE} from './utils'
import {TelegramBot} from './TelegramBot'
import {BotOperations} from './botOperations'

const telegramBot = new TelegramBot()
const botOperations = new BotOperations()
const app = express()
  .use(bodyParser.json())
  .use('/auth-callback', routes.authCallback)

app.get('/', (req, res) => res.redirect(TELEGRAM_BOT_URL) )

app.get('/get-all', (req, res) => {
  models.Chat.findAll({ include: [models.Integration]})
    .then(chats => {
      if (chats !== null) {
        const data = []
        for (let i = 0; i < chats.length; i++) {
          data.push(chats[i].dataValues)
        }
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
    session.dialogData.spaces = args.spaces
    builder.Prompts.choice(session, MESSAGE.CHOOSE_SAPCE_INTEGRATE, args.spaces);
  }, (session, results) => {
    const { index, entity } = results.response
    const { spaceWikiName, spaceName } = session.dialogData.spaces[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.insertIntegration(true, chatId, session, spaceWikiName, spaceName)
  }
]);

skypeBot.dialog('askSpaceDelete', [
  (session, args) => {
    session.dialogData.spaces = args.spaces
    builder.Prompts.choice(session, MESSAGE.CHOOSE_SAPCE_DELETE, args.spaces);
  }, (session, results) => {
    const { index, entity } = results.response
    const { integrationId, spaceName } = session.dialogData.spaces[entity]
    const { id: chatId } = session.message.address.conversation

    botOperations.deleteIntegration(true, chatId, session, integrationId, spaceName)
  }
]);

app.post('/webhook', (req, res) => {
  const {
    spaceWikiName, author, object, space, action, title, body,
    link, repositoryUrl, repositorySuffix, branch, commitId
  } = req.body
  let str = unescape(`${object}:\n${author} ${action} '${title}' in '${space}'`)
  if (body.lastIndexOf('------------------------------+----------------------------------------------') > 0) {
    str += '\n\n' + body.substr(
      body.lastIndexOf('------------------------------+----------------------------------------------') + 77
    )
  }
  console.log("Webhook Response Body: ", body)
  models.Integration.findAll({where: {spaceWikiName}})
    .then(integrations => {
      if (integrations !== null) {
        for (let i = 0; i < integrations.length; i++) {
          const {spaceWikiName, chatId} = integrations[i].dataValues
          console.log(chatId + ": ", spaceWikiName)
          if (/[a-z]/.test(chatId)) {
            const address = SKYPE_ADDRESS
            address.conversation.id = chatId
            const reply = new builder.Message()
              .address(address)
              .text(str);
            skypeBot.send(reply);
          } else {
            telegramBot.sendMessage(chatId, str)
          }
        }
      }
    })
  res.json({name: spaceWikiName})
})

telegramBot.onText(/\/(.+)/, (msg, match) => {
  botOperations.handleCommands(match[1], false, msg)
});

telegramBot.on('callback_query',  (callbackQuery) => {
  botOperations.handleCallbackQuery(callbackQuery)
});

app.listen(process.env.PORT || 3030, () => {
  console.log(`Assembla Bot Server started at port: ${process.env.PORT || 3030}`);
});
