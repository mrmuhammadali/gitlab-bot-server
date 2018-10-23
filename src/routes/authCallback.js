// src
import * as constants from '../constants'
import models from '../models'
import { TelegramBot } from '../TelegramBot'
import {
  ChatConnector, UniversalBot, Message
} from 'botbuilder'

// libs
import { Router } from 'express'
import getOr from 'lodash/fp/getOr'
import { create as oauth2Create } from "simple-oauth2"

const router = Router()
const telegramBot = new TelegramBot()
const connector = new ChatConnector(constants.SKYPE_CREDENTIALS)
const skypeBot = new UniversalBot(connector)

function getToken(connection, options) {
  return new Promise((resolve, reject) => {
    return connection.authorizationCode.getToken(options, (error, result) => {
      if (error) {
        return reject(error)
      }
      const token = connection.accessToken.create(result)

      return resolve(token)
    })
  })
}

function getSkypeAddress(conversationId) {
  return {
    conversation: { id: conversationId },
    bot: { id: process.env.MICROSOFT_APP_ID },
    serviceUrl: 'https://smba.trafficmanager.net/apis/',
  }
}

router.get('', (req, res) => {
  const code = getOr('', 'query.code')(req)
  const chatId = getOr('', 'query.state')(req)
  const address = getSkypeAddress(chatId)
  const reply = new Message().address(address)
  const isSkype = /[a-z]/.test(chatId)
  const options = {
    code,
    grant_type: 'authorization_code',
    redirect_uri: constants.BASE_URL + constants.AUTH_CALLBACK_ENDPOINT,
  }
  const oauth2Connection = oauth2Create(constants.GITLAB_CREDENTIALS)

  return getToken(oauth2Connection, options)
    .then(token => {
      console.log('Token: ', token)
      console.log('Auth ChatId: ', chatId)

      models.Chat.create({ chatId, ...token.token })
        .then(() => {
          if (isSkype) {
            reply.text(constants.MESSAGE.AUTHORIZATION_SUCCESSFUL)
            skypeBot.send(reply)
          } else {
            telegramBot.sendMessage(
              chatId,
              constants.MESSAGE.AUTHORIZATION_SUCCESSFUL,
            )
          }
        })
        .catch(() => {
          models.Chat.update(token.token, { where: { chatId } })
            .then(() => {
              if (isSkype) {
                reply.text(constants.MESSAGE.AUTHORIZATION_SUCCESSFUL)
                skypeBot.send(reply)
              } else {
                telegramBot.sendMessage(
                  chatId,
                  constants.MESSAGE.AUTHORIZATION_SUCCESSFUL,
                )
              }
            })
            .catch(() => {
              if (isSkype) {
                reply.text(constants.MESSAGE.AUTHORIZATION_FAILED)
                skypeBot.send(reply)
              } else {
                telegramBot.sendMessage(
                  chatId,
                  constants.MESSAGE.AUTHORIZATION_FAILED,
                )
              }
            })
        })

      if (isSkype) {
        res.redirect(constants.SKYPE_BOT_URL)
      } else {
        res.redirect(constants.TELEGRAM_BOT_URL)
      }
    })
    .catch(error => {
      console.log(constants.MESSAGE.ACCESS_TOKEN_ERROR, error)
      if (isSkype) {
        reply.text(constants.MESSAGE.AUTHORIZATION_FAILED)
        skypeBot.send(reply)
      } else {
        telegramBot.sendMessage(chatId, constants.MESSAGE.AUTHORIZATION_FAILED)
      }
    })
})

export default router
