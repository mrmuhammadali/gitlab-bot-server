'use strict';

var _unescape = require('lodash/unescape');

var _unescape2 = _interopRequireDefault(_unescape);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _routes = require('./routes');

var routes = _interopRequireWildcard(_routes);

var _models = require('./models');

var _models2 = _interopRequireDefault(_models);

var _utils = require('./utils');

var _TelegramBot = require('./TelegramBot');

var _botOperations = require('./botOperations');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var bodyParser = require('body-parser');
var express = require('express');
var builder = require('botbuilder');


var telegramBot = new _TelegramBot.TelegramBot();
var botOperations = new _botOperations.BotOperations();
var app = express().use(bodyParser.json()).use(_utils.AUTH_CALLBACK_ENDPOINT, routes.authCallback);

app.get('/', function (req, res) {
  return res.redirect(_utils.TELEGRAM_BOT_URL);
});

app.get('/get-all', function (req, res) {
  _models2.default.Chat.findAll({ include: [_models2.default.Integration] }).then(function (chats) {
    if (chats !== null) {
      var data = [];
      for (var i = 0; i < chats.length; i++) {
        data.push(chats[i].dataValues);
      }
      res.json(data);
    }
  });
});

// Create chat bot
var connector = new builder.ChatConnector(_utils.SKYPE_CREDENTIALS);

app.post('/skype-messaging', connector.listen());

var skypeBot = new builder.UniversalBot(connector, function (session) {
  var _session$message = session.message,
      address = _session$message.address,
      text = _session$message.text;

  console.log("Session: ", address);
  botOperations.handleCommands(text, true, session);
});

skypeBot.dialog('askSpaceIntegrate', [function (session, args) {
  session.dialogData.spaces = args.spaces;
  builder.Prompts.choice(session, _utils.MESSAGE.CHOOSE_SAPCE_INTEGRATE, args.spaces);
}, function (session, results) {
  var _results$response = results.response,
      index = _results$response.index,
      entity = _results$response.entity;
  var _session$dialogData$s = session.dialogData.spaces[entity],
      spaceWikiName = _session$dialogData$s.spaceWikiName,
      spaceName = _session$dialogData$s.spaceName;
  var chatId = session.message.address.conversation.id;


  botOperations.insertIntegration(true, chatId, session, spaceWikiName, spaceName);
}]);

skypeBot.dialog('askSpaceDelete', [function (session, args) {
  session.dialogData.spaces = args.spaces;
  builder.Prompts.choice(session, _utils.MESSAGE.CHOOSE_SAPCE_DELETE, args.spaces);
}, function (session, results) {
  var _results$response2 = results.response,
      index = _results$response2.index,
      entity = _results$response2.entity;
  var _session$dialogData$s2 = session.dialogData.spaces[entity],
      integrationId = _session$dialogData$s2.integrationId,
      spaceName = _session$dialogData$s2.spaceName;
  var chatId = session.message.address.conversation.id;


  botOperations.deleteIntegration(true, chatId, session, integrationId, spaceName);
}]);

app.post('/webhook', function (req, res) {
  var _req$body = req.body,
      spaceWikiName = _req$body.spaceWikiName,
      author = _req$body.author,
      object = _req$body.object,
      space = _req$body.space,
      action = _req$body.action,
      title = _req$body.title,
      body = _req$body.body,
      link = _req$body.link,
      repositoryUrl = _req$body.repositoryUrl,
      repositorySuffix = _req$body.repositorySuffix,
      branch = _req$body.branch,
      commitId = _req$body.commitId;

  var str = (0, _unescape2.default)(object + ':\n' + author + ' ' + action + ' \'' + title + '\' in \'' + space + '\'');
  if (body.lastIndexOf('------------------------------+----------------------------------------------') > 0) {
    str += '\n\n' + body.substr(body.lastIndexOf('------------------------------+----------------------------------------------') + 77);
  }
  console.log("Webhook Response Body: ", body);
  _models2.default.Integration.findAll({ where: { spaceWikiName: spaceWikiName } }).then(function (integrations) {
    if (integrations !== null) {
      for (var i = 0; i < integrations.length; i++) {
        var _integrations$i$dataV = integrations[i].dataValues,
            _spaceWikiName = _integrations$i$dataV.spaceWikiName,
            chatId = _integrations$i$dataV.chatId;

        console.log(chatId + ": ", _spaceWikiName);
        if (/[a-z]/.test(chatId)) {
          var address = _utils.SKYPE_ADDRESS;
          address.conversation.id = chatId;
          var reply = new builder.Message().address(address).text(str);
          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, str);
        }
      }
    }
  });
  res.json({ name: spaceWikiName });
});

telegramBot.onText(/\/(.+)/, function (msg, match) {
  botOperations.handleCommands(match[1], false, msg);
});

telegramBot.on('callback_query', function (callbackQuery) {
  botOperations.handleCallbackQuery(callbackQuery);
});

app.listen(process.env.PORT || 3030, function () {
  console.log('GitLab Bot Server started at port: ' + (process.env.PORT || 3030));
});