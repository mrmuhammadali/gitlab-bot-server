import * as utils from '../utils'
import models from '../models'
import { TelegramBot } from "../TelegramBot"
import * as eventTypes from '../eventTypes'

const builder = require('botbuilder');
const router = require('express').Router()
import { lowerCase, size, unescape, upperCase } from 'lodash'

const telegramBot = new TelegramBot()
const connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
const skypeBot = new builder.UniversalBot(connector);

export default router.post('/webhook', (req, res) => {
  console.log("++++Request Body++++", req.body)
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
      str = `${upperCase(objectKind)}: \n${name} @${username} ${lowerCase(objectKind)}ed ${totalCommitsCount ? `${totalCommitsCount} commits` : ''} in ${projectFullPath}.`
      str += event === eventTypes.Push_Hook ? `
      Commits: \n` : ''
      commits.map((commit, index) => {
        const { id, message, author: { name } } = commit
        str += ` ${index + 1}. ${message}`
      })
      break
    }

    case eventTypes.Issue_Hook: {
      const {
        user: { name, username },
        project: { path_with_namespace: projectFullPath },
        object_attributes: { iid, title,  project_id, description, state, action, weight, due_date, url },
        assignees = []
      } = req.body

      projectId = project_id
      str = `ISSUE #${iid}: 
      ${name} @${username} ${state} issue in ${projectFullPath}. 
      Title: ${title} 
      Due Date: ${due_date} 
      URL: ${url} `
      str += assignees.length > 0 ? `
      Assigned To: \n` : ''
      assignees.map(({ name, username }, index) => str += `  ${index + 1}. ${name} @${username}`)
      break
    }

    case eventTypes.Note_Hook: {
      const {
        user: { name, username },
        project_id,
        project: { path_with_namespace: projectFullPath },
        object_attributes: { note, noteable_type: notableType, url },
        issue = {}
      } = req.body
      const { iid = -1, title = '', description = '', state = '' } = issue

      projectId = project_id

      if (size(issue) > 0) {
        str = `ISSUE #${iid}:
        ${name} @${username} commented on issue #${iid} in ${projectFullPath}. 
        Issue State: ${state} 
        Title: ${title} 
        URL: ${url}`
      }
      break
    }
  }

  projectId && models.Integration.findAll({where: {projectId}})
    .then(integrations => {
      if (integrations !== null) {
        integrations.forEach(integration => {
          const { chatId } = integration.get({plain: true})
          console.log(chatId + ": ", projectId)

          if (/[a-z]/.test(chatId)) {
            const address = { ...utils.SKYPE_ADDRESS, conversation: { id: chatId } }
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