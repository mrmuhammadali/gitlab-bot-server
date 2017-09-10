import * as utils from './utils'
import models from './models'
import {TelegramBot} from './TelegramBot'

const request = require('request');
const oauth2 = require('simple-oauth2').create(utils.GITLAB_CREDENTIALS)
const telegramBot = new TelegramBot()
import {get, unescape, words, without} from "lodash"

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
          session.send(utils.MESSAGE.CONNECT + AUTHORIZATION_URI)
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

  insertIntegration = (isSkype, chatId, session, spaceWikiName, spaceName) => {

    let opts = {}
    if (!isSkype) {
      opts = {chat_id: chatId, message_id: session.message_id}
    }

    models.Integration.findOne({where: {chatId, spaceWikiName}})
      .then(res => {
        if (res === null) {
          models.Integration.create({spaceWikiName, spaceName, chatId})
            .then(res => {
              if (isSkype) {
                session.send(`"${spaceName}"` + utils.MESSAGE.SPACE_INTEGRATED)
              } else {
                telegramBot.editMessageText(`"${spaceName}"` + utils.MESSAGE.SPACE_INTEGRATED, opts);
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

  deleteIntegration = (isSkype, chatId, session, integrationId, spaceName) => {
    let opts = {}
    if (!isSkype) {
      opts = { chat_id: chatId, message_id: session.message_id }
    }

    models.Integration.destroy({where: {id: integrationId}})
      .then(res => {
        if (res >= 1) {
          if (isSkype) {
            session.send(`"${spaceName}"` + utils.MESSAGE.SPACE_DELETED)
          } else {
            telegramBot.editMessageText(`"${spaceName}"` + utils.MESSAGE.SPACE_DELETED, opts);
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
    const spaceWikiName = data[0]
    const spaceName = data[1]

    const { text } = session.reply_to_message;
    const command = without(words(text), 'Assembla', 'Bot')[0]

    console.log("Command: ", command)

    switch (command) {
      case utils.COMMANDS.NEW_INTEGRATION: {
        this.insertIntegration(false, chat_id, session, spaceWikiName, spaceName);
        break;
      }
      case utils.COMMANDS.DELETE_INTEGRATION: {
        const integrationId = spaceWikiName
        this.deleteIntegration(false, chat_id, session, integrationId, spaceName)
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
      console.log(groups)
      if (groups.error) {
        if (isSkype) {
          session.send(utils.MESSAGE.INVALID_TOKEN)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.INVALID_TOKEN);
        }
      } else {
        const telegramProjects = []
        const skypeProjects = {}
        // for (let i = 0; i < responseBody.length; i++) {
        //   const { wiki_name, name } = responseBody[i]
        //   const callback_data = JSON.stringify([wiki_name, name]);
        //   console.log("Wiki Name: ", wiki_name)
        //   telegramProjects.push([{ text: name, callback_data }])
        //   skypeProjects[name] = { spaceWikiName: wiki_name, spaceName: name }
        // }

        Promise.all(groups.map(group => {
          request.get(`${utils.GITLAB_URL}/groups/${group.id}/projects`,{auth: { bearer: access_token }})
        })).then(resArray => {
          console.log('responseArray++++', resArray)
          resArray.map(res => {
            const { id: projectId, name: projectName, name_with_namespace, nameSpace: { id: groupId, name: groupName } } = res
            const callback_data = JSON.stringify([projectId, name_with_namespace]);
            telegramProjects.push([{ text: name_with_namespace, callback_data }])
          })
        if (isSkype) {
          session.beginDialog('askSpaceIntegrate', {spaces: skypeProjects});
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
      }
    });
  }

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
          for (let i = 0; i < integrations.length; i++) {
            console.log(integrations[i].dataValues.spaceName)
            integrationStr += `${(i+1)}. ${integrations[i].dataValues.spaceName}\n`
          }
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
          for (let i = 0; i < integrations.length; i++) {
            const {id: integrationId, spaceName} = integrations[i].dataValues
            const callback_data = JSON.stringify([integrationId, spaceName]);

            telegramProjects.push([{text: spaceName, callback_data}])
            skypeProjects[spaceName] = { integrationId, spaceName }
          }

          if (isSkype) {
            session.beginDialog('askSpaceDelete', { spaces: skypeProjects })
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