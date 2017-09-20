import * as utils from './utils'
import models from './models'
import { TelegramBot } from './TelegramBot'

const request = require('request-promise');
const oauth2 = require('simple-oauth2').create(utils.GITLAB_CREDENTIALS)
const telegramBot = new TelegramBot()
import { get, words, without } from "lodash"

export class BotOperations {

  handleCommands = (command, isSkype, session) => {
    command = without(words(command), 'GitLab', 'Bot')[0].toLowerCase()
    const COMMANDS = utils.COMMANDS
    const chatId = isSkype ? get(session, 'message.address.conversation.id', '') + '' : get(session, 'chat.id', '') + ''

    switch (command){
      case COMMANDS.START:
      case COMMANDS.HELP: {
        if (isSkype) {
          session.send(utils.MESSAGE.INTRODUCE_BOT)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.INTRODUCE_BOT);
        }
        break;
      }
      case COMMANDS.CONNECT: {
        const AUTHORIZATION_URI = oauth2.authorizationCode.authorizeURL({
          client_id: utils.GITLAB_CREDENTIALS.client.id,
          redirect_uri: utils.BASE_URL + utils.AUTH_CALLBACK_ENDPOINT,
          response_type: 'code',
          state: chatId
        })

        if (isSkype) {
          session.send('## ' + utils.MESSAGE.CONNECT + AUTHORIZATION_URI)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.CONNECT + AUTHORIZATION_URI);
        }
        break;
      }
      case COMMANDS.NEW_INTEGRATION: {
        this.handleNewIntegration(isSkype, chatId, session)
        break;
      }
      case COMMANDS.LIST_INTEGRATION: {
        this.handleListIntegrations(isSkype, chatId, session)
        break;
      }
      case COMMANDS.DELETE_INTEGRATION: {
        this.handleDeleteIntegration(isSkype, chatId, session)
        break;
      }
      default: {
        if (isSkype) {
          session.send(utils.MESSAGE.COMMAND_NOT_FOUND)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.COMMAND_NOT_FOUND);
        }
      }
    }
  }

  insertIntegration = (isSkype, chatId, session, projectId, projectFullName) => {
    const opts = !isSkype && { chat_id: chatId, message_id: session.message_id }

    models.Integration.findOne({where: {chatId, projectId}})
      .then(res => {
        if (res === null) {
          models.Integration.create({ projectId, projectFullName, chatId })
            .then(res => {
              if (isSkype) {
                session.send(`"${projectFullName}"` + utils.MESSAGE.SPACE_INTEGRATED)
              } else {
                telegramBot.editMessageText(`"${projectFullName}"` + utils.MESSAGE.SPACE_INTEGRATED, opts);
              }
            })
            .catch(err => {
              if (isSkype) {
                session.send(utils.MESSAGE.DATABASE_ERROR)
              } else {
                telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
              }
            })
        } else {
          if (isSkype) {
            session.send(utils.MESSAGE.SPACE_ALREADY_EXIST)
          } else {
            telegramBot.editMessageText(utils.MESSAGE.SPACE_ALREADY_EXIST, opts);
          }
        }
      })

  }

  deleteIntegration = (isSkype, chatId, session, projectId, projectFullName) => {
    const opts = !isSkype && { chat_id: chatId, message_id: session.message_id }

    models.Integration.destroy({where: { projectId, chatId }})
      .then(res => {
        if (res >= 1) {
          if (isSkype) {
            session.send(`"${projectFullName}"` + utils.MESSAGE.SPACE_DELETED)
          } else {
            telegramBot.editMessageText(`"${projectFullName}"` + utils.MESSAGE.SPACE_DELETED, opts);
          }
        } else {
          if (isSkype) {
            session.send(utils.MESSAGE.DATABASE_ERROR)
          } else {
            telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
          }
        }
      })
      .catch(err => {
        if (isSkype) {
          session.send(utils.MESSAGE.DATABASE_ERROR)
        } else {
          telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
        }
      })
  }

  handleCallbackQuery = (callbackQuery) => {
    const session = callbackQuery.message;
    const chat_id = session.chat.id + '';
    const data = JSON.parse(callbackQuery.data);
    const projectId = data[0]
    const projectFullName = data[1]

    const { text } = session.reply_to_message;
    const command = without(words(text), 'GitLab', 'Bot')[0]

    console.log("Command: ", command)

    switch (command) {
      case utils.COMMANDS.NEW_INTEGRATION: {
        this.insertIntegration(false, chat_id, session, projectId, projectFullName);
        break;
      }
      case utils.COMMANDS.DELETE_INTEGRATION: {
        this.deleteIntegration(false, chat_id, session, projectId, projectFullName)
        break;
      }
    }
  }



  fetchProjects = (isSkype, chatId, session, access_token) => {
    const opts = {
      method: 'GET',
      uri: `${utils.GITLAB_URL}/groups`,
      auth: { bearer: access_token }
    }
    request(opts, (error, response, groups) => {
      groups = JSON.parse(groups)
      if (groups.error) {
        if (isSkype) {
          session.send(utils.MESSAGE.INVALID_TOKEN)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.INVALID_TOKEN);
        }
      } else {
        const requests = groups.map(group =>
          request.get(`${utils.GITLAB_URL}/groups/${group.id}/projects`, {auth: {bearer: access_token}})
        )

        Promise.all(requests)
          .then(responses => {
            const telegramProjects = []
            const skypeProjects = {}
            responses.map(response => {
              const projects = JSON.parse(response)
              projects.map(project => {
                console.log("+++project fetched: ", project.name)
                const {
                  id: projectId,
                  name: projectName,
                  name_with_namespace: projectFullName,
                  namespace: { id: groupId, name: groupName }
                } = project
                const callback_data = JSON.stringify([projectId, projectFullName]);
                telegramProjects.push([{text: projectFullName, callback_data}])
                skypeProjects[projectFullName] = { projectId, projectFullName }
              })
            })
            if (isSkype) {
              session.beginDialog('askSpaceIntegrate', {projects: skypeProjects});
            } else {
              const opts = {
                reply_to_message_id: session.message_id,
                reply_markup: {
                  inline_keyboard: telegramProjects
                }
              };
              telegramBot.sendMessage(chatId, utils.MESSAGE.CHOOSE_SAPCE_INTEGRATE, opts);
            }
          })
          .catch(errors => {
            if (isSkype) {
              session.send(utils.MESSAGE.INVALID_TOKEN)
            } else {
              telegramBot.sendMessage(chatId, utils.MESSAGE.INVALID_TOKEN);
            }
          })
      }
    });
  }

  // TODO refresh token
  refreshToken = (isSkype, chatId, session, refresh_token) => {
    const opts = {
      method: 'POST',
      uri: utils.REFRESH_TOKEN_URI + refresh_token
    }
    request(opts, (error, response, token) => {
      console.log("Token Error: ", error)
      if (token !== null) {
        token = JSON.parse(token)
        token = oauth2.accessToken.create(token)
        const {access_token, expires_at} = {...token.token}
        console.log("New Token: ", {...token.token})
        models.Chat.update({access_token, expires_at}, {where: {chatId}})
        this.fetchProjects(isSkype, chatId, session, access_token)
      }
    })
  }

  handleNewIntegration = (isSkype, chatId, session) => {
    models.Chat.findOne({where: {chatId}})
      .then( chat => {
        const {access_token, refresh_token} = get(chat, 'dataValues', '')
        this.fetchProjects(isSkype, chatId, session, access_token)
      })
  }

  handleListIntegrations = (isSkype, chatId, session) => {
    models.Integration.findAll({where:{chatId}})
      .then(integrations => {
        if (integrations !== null) {
          let integrationStr = ''
          integrations.map(({dataValues: integration}, index) => {
            console.log(integration.projectFullName)
            integrationStr += `${(index+1)}. ${integration.projectFullName}\n`
          })
          const message = integrationStr ? utils.MESSAGE.LIST_INTEGRATION + integrationStr
            : utils.MESSAGE.NOTHING_INTEGRATED

          if (isSkype) {
            session.send(message)
          } else {
            const reply_to_message_id = get(session, 'message_id', 0)
            telegramBot.sendMessage(chatId, message, {reply_to_message_id});
          }
        }
      })
  }

  handleDeleteIntegration = (isSkype, chatId, session) => {
    models.Integration.findAll({where:{chatId}})
      .then(integrations => {
        if (integrations !== null) {
          const telegramProjects = []
          const skypeProjects = {}
          integrations.map(({ dataValues: integration }) => {
            const { projectId, projectFullName } = integration
            const callback_data = JSON.stringify([projectId, projectFullName]);

            telegramProjects.push([{text: projectFullName, callback_data}])
            skypeProjects[projectFullName] = { projectId, projectFullName }
          })

          if (isSkype) {
            session.beginDialog('askSpaceDelete', { projects: skypeProjects })
          } else {
            const reply_to_message_id = get(session, 'message_id', 0)
            const opts = {
              reply_to_message_id,
              reply_markup: {
                inline_keyboard: telegramProjects
              }
            };
            telegramBot.sendMessage(chatId, utils.MESSAGE.CHOOSE_SAPCE_DELETE, opts);
          }
        }
      })
  }

}