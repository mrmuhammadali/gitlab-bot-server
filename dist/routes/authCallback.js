'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = require('../utils');

var utils = _interopRequireWildcard(_utils);

var _models = require('../models');

var _models2 = _interopRequireDefault(_models);

var _TelegramBot = require('../TelegramBot');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var builder = require('botbuilder');
var router = require('express').Router();
var oauth2 = require('simple-oauth2').create(utils.GITLAB_CREDENTIALS);

var telegramBot = new _TelegramBot.TelegramBot();
var connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
var skypeBot = new builder.UniversalBot(connector);

exports.default = router.get('', function (req, res) {
  var _req$query = req.query,
      code = _req$query.code,
      state = _req$query.state;

  var chatId = state;
  var address = utils.SKYPE_ADDRESS;
  address.conversation.id = chatId;
  var reply = new builder.Message().address(address);
  var isSkype = /[a-z]/.test(chatId);

  oauth2.authorizationCode.getToken({
    code: code,
    grant_type: 'authorization_code',
    redirect_uri: utils.BASE_URL + utils.AUTH_CALLBACK_ENDPOINT
  }, function (error, result) {
    if (error) {
      console.log(utils.MESSAGE.ACCESS_TOKEN_ERROR, error);
      if (isSkype) {
        reply.text(utils.MESSAGE.AUTHORIZATION_FAILED);
        skypeBot.send(reply);
      } else {
        telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_FAILED);
      }
      return;
    }
    var token = oauth2.accessToken.create(result);

    console.log("Token: ", token);
    console.log("Auth ChatId: ", chatId);

    _models2.default.Chat.create(_extends({ chatId: chatId }, token.token)).then(function (res) {
      if (isSkype) {
        reply.text(utils.MESSAGE.AUTHORIZATION_SUCCESSFUL);
        skypeBot.send(reply);
      } else {
        telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_SUCCESSFUL);
      }
    }).catch(function (err) {
      _models2.default.Chat.update(token.token, { where: { chatId: chatId } }).then(function (result) {
        if (isSkype) {
          reply.text(utils.MESSAGE.AUTHORIZATION_SUCCESSFUL);
          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_SUCCESSFUL);
        }
      }).catch(function (err) {
        if (isSkype) {
          reply.text(utils.MESSAGE.AUTHORIZATION_FAILED);
          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.AUTHORIZATION_FAILED);
        }
      });
    });

    if (isSkype) {
      res.redirect(utils.SKYPE_BOT_URL);
    } else {
      res.redirect(utils.TELEGRAM_BOT_URL);
    }
  });
});