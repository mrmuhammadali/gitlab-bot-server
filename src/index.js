const bodyParser = require('body-parser')
const express = require('express')
const builder = require('botbuilder')
import { lowerCase, unescape, upperCase } from 'lodash'

import * as routes from './routes'
import * as eventTypes from './eventTypes'
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
  const event = req.headers["x-gitlab-event"]
  let str = ''
  let projectId = 0

  switch(event) {
    case eventTypes.Push_Hook:
    case eventTypes.Tag_Push_Hook: {
      const {
        object_kind: objectKind,
        user_name: name,
        user_username: username,
        project_id,
        project: { path_with_namespace: projectFullPath },
        commits,
        total_commits_count: totalCommitsCount
      } = req.body

      projectId = project_id
      str = `${upperCase(objectKind)}: \n${name} @${username} ${lowerCase(objectKind)}ed ${totalCommitsCount} in ${projectFullPath}.`
      str += event === eventTypes.Push_Hook ? `\nCommits: \n` : ''
      commits.map((commit, index) => {
        const { id, message, author: { name } } = commit
        str += `  ${index + 1}. ${name} committed ${message}\n`
      })
      break
    }

    case eventTypes.Issue_Hook: {
      const {
        user: { name, username },
        project: { path_with_namespace: projectFullPath },
        object_attributes: { title,  project_id, description, state, action, weight, due_date, url },
        assignees,
        assignee: { name: assigneeName, username: assigneeUsername }
      } = req.body

      projectId = project_id
      str = `ISSUE: 
      Created By: ${name} @${username} in ${projectFullPath} 
      Title: ${title} 
      Due Date: ${due_date} 
      Weight: ${weight} 
      State: ${state} 
      URL: ${url} 
      Assigned By: ${assigneeName} @${assigneeUsername} 
      Assigned To: \n`
      assignees.map(({ name, username }, index) => str += `  ${index + 1}. ${name} @${username}`)
      break
    }
  }

  projectId && models.Integration.findAll({where: {projectId}})
    .then(integrations => {
      if (integrations !== null) {
        integrations.map(({ dataValues: { chatId } }) => {
          console.log(chatId + ": ", projectId)

          if (/[a-z]/.test(chatId)) {
            const address = { ...SKYPE_ADDRESS, conversation: { id: chatId } }
            const reply = new builder.Message()
              .address(address)
              .text(unescape(str))

            skypeBot.send(reply)
          } else {
            telegramBot.sendMessage(chatId, unescape(str))
          }
        })
      }
    })

  res.json({ project_id: projectId, success: projectId !== 0 })
})

app.listen(process.env.PORT || 3030, () => {
  console.log(`GitLab Bot Server started at port: ${process.env.PORT || 3030}`);
});
