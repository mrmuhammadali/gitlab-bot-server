'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _unescape = require('lodash/unescape');

var _unescape2 = _interopRequireDefault(_unescape);

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
      var data = chats.map(function (_ref) {
        var dataValues = _ref.dataValues;
        return dataValues;
      });
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

telegramBot.onText(/\/(.+)/, function (msg, match) {
  botOperations.handleCommands(match[1], false, msg);
});

telegramBot.on('callback_query', function (callbackQuery) {
  botOperations.handleCallbackQuery(callbackQuery);
});

app.post('/webhook', function (req, res) {
  console.log("++Webhook Request: ", req);
  var _req$body = req.body,
      objectKind = _req$body.object_kind,
      userId = _req$body.user_id,
      name = _req$body.user_name,
      username = _req$body.user_username,
      projectId = _req$body.project_id,
      projectFullPath = _req$body.project.path_with_namespace,
      repositoryName = _req$body.repository.name,
      commits = _req$body.commits,
      totalCommitsCount = _req$body.total_commits_count;


  var str = (0, _unescape2.default)(object + ':\n' + author + ' ' + action + ' \'' + title + '\' in \'' + space + '\'');

  _models2.default.Integration.findAll({ where: { projectId: projectId } }).then(function (integrations) {
    if (integrations !== null) {
      integrations.map(function (_ref2) {
        var integration = _ref2.dataValues;
        var projectFullName = integration.projectFullName,
            chatId = integration.chatId;

        console.log(chatId + ": ", projectFullName);
        if (/[a-z]/.test(chatId)) {
          var address = _extends({}, _utils.SKYPE_ADDRESS, { conversation: { id: chatId } });
          var reply = new builder.Message().address(address).text(str);
          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, str);
        }
      });
    }
  });

  res.json({ project_id: projectId, success: true });
});

app.listen(process.env.PORT || 3030, function () {
  console.log('GitLab Bot Server started at port: ' + (process.env.PORT || 3030));
});