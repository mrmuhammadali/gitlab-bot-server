'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _lodash = require('lodash');

var _routes = require('./routes');

var routes = _interopRequireWildcard(_routes);

var _eventTypes = require('./eventTypes');

var eventTypes = _interopRequireWildcard(_eventTypes);

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
  var event = req.headers["x-gitlab-event"];
  var str = '';
  var projectId = 0;

  switch (event) {
    case eventTypes.Push_Hook:
    case eventTypes.Tag_Push_Hook:
      {
        var _req$body = req.body,
            objectKind = _req$body.object_kind,
            name = _req$body.user_name,
            username = _req$body.user_username,
            project_id = _req$body.project_id,
            projectFullPath = _req$body.project.path_with_namespace,
            commits = _req$body.commits,
            totalCommitsCount = _req$body.total_commits_count;


        projectId = project_id;
        str = (0, _lodash.upperCase)(objectKind) + ': \n' + name + ' @' + username + ' ' + (0, _lodash.lowerCase)(objectKind) + 'ed ' + totalCommitsCount + ' in ' + projectFullPath + '.';
        str += event === eventTypes.Push_Hook ? '\nCommits: \n' : '';
        commits.map(function (commit, index) {
          var id = commit.id,
              message = commit.message,
              name = commit.author.name;

          str += '  ' + (index + 1) + '. ' + name + ' committed ' + message + '\n';
        });
        break;
      }

    case eventTypes.Issue_Hook:
      {
        var _req$body2 = req.body,
            _req$body2$user = _req$body2.user,
            _name = _req$body2$user.name,
            _username = _req$body2$user.username,
            _projectFullPath = _req$body2.project.path_with_namespace,
            _req$body2$object_att = _req$body2.object_attributes,
            title = _req$body2$object_att.title,
            _project_id = _req$body2$object_att.project_id,
            description = _req$body2$object_att.description,
            state = _req$body2$object_att.state,
            action = _req$body2$object_att.action,
            weight = _req$body2$object_att.weight,
            due_date = _req$body2$object_att.due_date,
            url = _req$body2$object_att.url,
            assignees = _req$body2.assignees,
            _req$body2$assignee = _req$body2.assignee,
            assigneeName = _req$body2$assignee.name,
            assigneeUsername = _req$body2$assignee.username;


        projectId = _project_id;
        str = 'ISSUE: \n      Created By: ' + _name + ' @' + _username + ' in ' + _projectFullPath + ' \n      Title: ' + title + ' \n      Due Date: ' + due_date + ' \n      Weight: ' + weight + ' \n      State: ' + state + ' \n      URL: ' + url + ' \n      Assigned By: ' + assigneeName + ' @' + assigneeUsername + ' \n      Assigned To: \n';
        assignees.map(function (_ref2, index) {
          var name = _ref2.name,
              username = _ref2.username;
          return str += '  ' + (index + 1) + '. ' + name + ' @' + username;
        });
        break;
      }
  }

  projectId && _models2.default.Integration.findAll({ where: { projectId: projectId } }).then(function (integrations) {
    if (integrations !== null) {
      integrations.map(function (_ref3) {
        var chatId = _ref3.dataValues.chatId;

        console.log(chatId + ": ", projectId);

        if (/[a-z]/.test(chatId)) {
          var address = _extends({}, _utils.SKYPE_ADDRESS, { conversation: { id: chatId } });
          var reply = new builder.Message().address(address).text((0, _lodash.unescape)(str));

          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, (0, _lodash.unescape)(str));
        }
      });
    }
  });

  res.json({ project_id: projectId, success: projectId !== 0 });
});

app.listen(process.env.PORT || 3030, function () {
  console.log('GitLab Bot Server started at port: ' + (process.env.PORT || 3030));
});