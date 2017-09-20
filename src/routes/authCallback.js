import * as utils from '../utils'
import models from '../models'
import { TelegramBot } from "../TelegramBot"

const builder = require('botbuilder');
const router = require('express').Router()
const oauth2 = require('simple-oauth2').create(utils.GITLAB_CREDENTIALS)

const telegramBot = new TelegramBot()
const connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
const skypeBot = new builder.UniversalBot(connector);

export default router.get('', (req, res) => {
  const { code, state } = req.query
  const chatId = state
  const address = utils.SKYPE_ADDRESS
  address.conversation.id = chatId
  const reply = new builder.Message().address(address)
  const isSkype = /[a-z]/.test(chatId)

  oauth2.authorizationCode.getToken({
    code,
    grant_type: 'authorization_code',
    redirect_uri: utils.BASE_URL + utils.AUTH_CALLBACK_ENDPOINT
  }, (error, result) => {
    if (error) {
      console.log(utils.MESSAGE.ACCESS_TOKEN_ERROR, error)
      if (isSkype) {
        reply.text(utils.MESSAGE.AUTHORIZATION_FAILED)
        skypeBot.send(reply)
      } else {
        telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_FAILED)
      }
      return;
    }
    const token = oauth2.accessToken.create(result);

    console.log("Token: ", token)
    console.log("Auth ChatId: ", chatId)

    models.Chat.create({ chatId, ...token.token })
      .then(() => {
        if (isSkype) {
          reply.text(utils.MESSAGE.AUTHORIZATION_SUCCESSFUL)
          skypeBot.send(reply)
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_SUCCESSFUL)
        }
      })
      .catch(() => {
        models.Chat.update(token.token, { where: { chatId } })
          .then(() => {
            if (isSkype) {
              reply.text(utils.MESSAGE.AUTHORIZATION_SUCCESSFUL)
              skypeBot.send(reply)
            } else {
              telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_SUCCESSFUL)
            }
          })
          .catch(() => {
            if (isSkype) {
              reply.text(utils.MESSAGE.AUTHORIZATION_FAILED)
              skypeBot.send(reply)
            } else {
              telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_FAILED)
            }
          })
      })

    if (isSkype) {
      res.redirect(utils.SKYPE_BOT_URL);
    } else {
      res.redirect(utils.TELEGRAM_BOT_URL);
    }

  })
})