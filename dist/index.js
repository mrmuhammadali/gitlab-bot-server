'use strict';

var _routes = require('./routes');

var routes = _interopRequireWildcard(_routes);

var _models = require('./models');

var _models2 = _interopRequireDefault(_models);

var _utils = require('./utils');

var _TelegramBot = require('./TelegramBot');

var _botOperations = require('./botOperations');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var bodyParser = require('body-parser');
var express = require('express');
var builder = require('botbuilder');

var telegramBot = new _TelegramBot.TelegramBot();
var botOperations = new _botOperations.BotOperations();
var connector = new builder.ChatConnector(_utils.SKYPE_CREDENTIALS);
var app = express().use(bodyParser.json()).use(_utils.AUTH_CALLBACK_ENDPOINT, routes.authCallback).use("/webhook", routes.webhook);

app.get('/', function (req, res) {
  return res.redirect(_utils.SKYPE_BOT_URL);
});

app.get('/get-all', function (req, res) {
  _models2.default.Chat.findAll({ include: [_models2.default.Integration] }).then(function (chats) {
    if (chats !== null) {
      var data = chats.map(function (chat) {
        return chat.get({ plain: true });
      });
      res.json(data);
    }
  });
});

app.post('/skype-messaging', connector.listen());

var skypeBot = new builder.UniversalBot(connector, function (session) {
  var _session$message = session.message,
      address = _session$message.address,
      text = _session$message.text;

  console.log("Session: ", address);
  botOperations.handleCommands(text, true, session);
});

skypeBot.dialog('askSpaceIntegrate', [function (session, args) {
  session.dialogData.projects = args.projects;
  builder.Prompts.choice(session, _utils.MESSAGE.CHOOSE_SAPCE_INTEGRATE, args.projects);
}, function (session, results) {
  var _results$response = results.response,
      index = _results$response.index,
      entity = _results$response.entity;
  var _session$dialogData$p = session.dialogData.projects[entity],
      projectId = _session$dialogData$p.projectId,
      projectFullName = _session$dialogData$p.projectFullName;
  var chatId = session.message.address.conversation.id;


  botOperations.insertIntegration(true, chatId, session, projectId, projectFullName);
}]);

skypeBot.dialog('askSpaceDelete', [function (session, args) {
  session.dialogData.projects = args.projects;
  builder.Prompts.choice(session, _utils.MESSAGE.CHOOSE_SAPCE_DELETE, args.projects);
}, function (session, results) {
  var _results$response2 = results.response,
      index = _results$response2.index,
      entity = _results$response2.entity;
  var _session$dialogData$p2 = session.dialogData.projects[entity],
      projectId = _session$dialogData$p2.projectId,
      projectFullName = _session$dialogData$p2.projectFullName;
  var chatId = session.message.address.conversation.id;


  botOperations.deleteIntegration(true, chatId, session, projectId, projectFullName);
}]);

// const address = { ...SKYPE_ADDRESS, conversation: { id: '29:1Q4GY9DQHXFyfbdlyJCp4S5Sw2KiUbS-1c68EGArOS287_ThoI4q6zH3cVhiWSLBC' } }
// const reply = new builder.Message()
//   .address(address)
//   .text(`**PUSH:**
//   ---`)
//
// skypeBot.send(reply)

telegramBot.onText(/\/(.+)/, function (msg, match) {
  botOperations.handleCommands(match[1], false, msg);
});

telegramBot.on('callback_query', function (callbackQuery) {
  botOperations.handleCallbackQuery(callbackQuery);
});

app.listen(process.env.PORT || 3030, function () {
  console.log('GitLab Bot Server started at port: ' + (process.env.PORT || 3030));
});