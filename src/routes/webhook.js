// libs
const builder = require('botbuilder');
const router = require('express').Router()
import capitalize from 'lodash/capitalize'
import drop from 'lodash/drop'
import forEachRight from 'lodash/forEachRight'
import lowerCase from 'lodash/lowerCase'
import size from 'lodash/size'
import startCase from 'lodash/startCase'
import unescape from 'lodash/unescape'
import upperCase from 'lodash/upperCase'

// src
import * as utils from '../constants'
import models from '../models'
import { TelegramBot } from "../TelegramBot"
import * as eventTypes from '../eventTypes'

const telegramBot = new TelegramBot()
const connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
const skypeBot = new builder.UniversalBot(connector);

const reduceCommits = (commits, commitCount) => {
  if (commitCount > 20) {
    return drop(commits, 10)
  } else if (commitCount - 10 > 0) {
    return drop(commits, commitCount - 10)
  }

  return commits
}

export default router.post('', (req, res) => {
  console.log("++++Request Body++++", req.body)
  const event = req.headers["x-gitlab-event"]
  let str = ''
  let projectId = 0

  switch(event) {
    case eventTypes.PUSH_HOOK:
    case eventTypes.TAG_PUSH_HOOK: {
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

      const branch = ref && ref.substr(ref.lastIndexOf('/') + 1)
      projectId = project_id
      str = `**${upperCase(objectKind)}:**
      \n------\n\n*${startCase(name)} [@${username}](https://gitlab.com/${username})* **${lowerCase(objectKind)}ed** ${totalCommitsCount ? `${totalCommitsCount} commit(s)` : ''} in${branch ? ` branch '[${branch}](${webUrl}/tree/${branch})' of` : ''} [${projectFullPath}](${webUrl}).
      \n------\n`
      str += event === eventTypes.Push_Hook ? `${totalCommitsCount > 10 ? 'Last 10 ' : ''}Commits:\n\n` : ''
      const reducedCommits = reduceCommits(commits, totalCommitsCount)
      forEachRight(reducedCommits, (commit, index) => {
        const { id, message, author: { name }, url } = commit
        str += `  ${Math.abs(index - commits.length)}. *${startCase(name)}* **committed**: [${message}](${url})\n`
      })
      break
    }

    case eventTypes.ISSUE_HOOK: {
      const {
        user: { name, username },
        project: { path_with_namespace: projectFullPath, web_url: webUrl },
        object_attributes: { iid, title,  project_id, description, state, action, weight, due_date, url },
        assignees = []
      } = req.body

      projectId = project_id
      str = `**[ISSUE #${iid}](${url}):**
      \n---\n\n*${startCase(name)} [@${username}](https://gitlab.com/${username})* **${state} issue** in [${projectFullPath}](${webUrl}).
      \n---\n
      Title: ${capitalize(title)}
      Due Date: ${due_date} \n\n`
      str += assignees.length > 0 ? `Assigned To: \n\n` : ''
      assignees.forEach(({ name, username }, index) =>
        str += `  ${index + 1}. *${startCase(name)} [@${username}](https://gitlab.com/${username})*`
      )
      break
    }

    case eventTypes.NOTE_HOOK: {
      const {
        user: { name, username },
        project_id,
        project: { path_with_namespace: projectFullPath, web_url: webUrl },
        object_attributes: { note, noteable_type: notableType, url },
        issue = {}
      } = req.body
      const { iid = -1, title = '', description = '', state = '' } = issue

      projectId = project_id

      if (size(issue) > 0) {
        str = `**[ISSUE #${iid}](${url}):**
        \n---\n\n*${startCase(name)} [@${username}](https://gitlab.com/${username})* **commented** on issue #${iid} in [${projectFullPath}](${webUrl}).
        \n---\n
        Issue State: ${state} \n
        Title: ${capitalize(title)} \n
        Note: ${capitalize(note)}`
      }
      break
    }
    case eventTypes.MERGE_REQUEST_HOOK: {
      const {
        object_kind: objectKind,
        user: { name, username },
        project: { path_with_namespace: projectFullPath, web_url: webUrl },
        object_attributes: {
          target_project_id: project_id,
          target_branch,
          source_branch,
          source: { path_with_namespace: sourceProjectFullPath, web_url: sourceWebUrl },
          target: { path_with_namespace: targetProjectFullPath, web_url: targetWebUrl },
          last_commit: { message: commitMessage, author: { name: commitAuthorName }, url: commitUrl },
          url: mergeRequestUrl
        },
      } = req.body

      const branchMessage = sourceProjectFullPath === targetProjectFullPath ?
        `${source_branch} in ${target_branch} of ${targetProjectFullPath}` :
        `${source_branch} of ${sourceProjectFullPath} in ${target_branch} of ${targetProjectFullPath}`

      projectId = project_id

      str = `**[${upperCase(objectKind)}](${mergeRequestUrl}):**
        \n---\n\n*${startCase(name)} [@${username}](https://gitlab.com/${username})* **requested to merge** ${branchMessage}.
        \n---\n
        Last Commit: *${startCase(commitAuthorName)}* **committed**: [${commitMessage}](${commitUrl})`

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
