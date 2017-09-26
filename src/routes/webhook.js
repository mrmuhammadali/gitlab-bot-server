import * as utils from '../utils'
import models from '../models'
import { TelegramBot } from "../TelegramBot"
import * as eventTypes from '../eventTypes'

const builder = require('botbuilder');
const router = require('express').Router()
import { capitalize, lowerCase, size, startCase, unescape, upperCase } from 'lodash'

const telegramBot = new TelegramBot()
const connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
const skypeBot = new builder.UniversalBot(connector);

export default router.post('', (req, res) => {
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
        ref = '',
        project: { path_with_namespace: projectFullPath, web_url: webUrl },
        commits,
        total_commits_count: totalCommitsCount
      } = req.body

      const branch = ref && ref.substr(ref.lastIndexOf('/'))
      projectId = project_id
      str = `**${upperCase(objectKind)}:**
      \n---\n\n*${startCase(name)} [@${username}](https://gitlab.com/${username})* **${lowerCase(objectKind)}ed** ${totalCommitsCount ? `${totalCommitsCount} commits` : ''} in${branch ? ` branch '${branch}' of` : ''} [${projectFullPath}](${webUrl}).
      \n---\n`
      str += event === eventTypes.Push_Hook ? `Commits:\n\n` : ''
      commits.map((commit, index) => {
        const { id, message, author: { name }, url } = commit
        str += `  ${index + 1}. *${startCase(name)}* **committed**: ${message}\n[Visit Commit](${url})\n`
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
      str = `**ISSUE #${iid}:**
      \n---\n\n*${startCase(name)} @${username}* **${state} issue** in ${projectFullPath}. 
      \n---\n
      Title: ${capitalize(title)} 
      Due Date: ${due_date} \n\n[Visit Issue](${url}) \n\n`
      str += assignees.length > 0 ? `Assigned To: \n\n` : ''
      assignees.map(({ name, username }, index) => str += `  ${index + 1}. *${startCase(name)} @${username}*`)
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
        str = `**ISSUE #${iid}:**
        \n---\n\n*${startCase(name)} @${username}* **commented** on issue #${iid} in ${projectFullPath}.
        \n---\n
        Issue State: ${state} \n
        Title: ${capitalize(title)} \n\n[Visit Issue](${url})`
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