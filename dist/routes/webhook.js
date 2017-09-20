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

var _eventTypes = require('../eventTypes');

var eventTypes = _interopRequireWildcard(_eventTypes);

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var builder = require('botbuilder');
var router = require('express').Router();


var telegramBot = new _TelegramBot.TelegramBot();
var connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
var skypeBot = new builder.UniversalBot(connector);

exports.default = router.post('/webhook', function (req, res) {
  console.log("++++Request Body++++", req.body);
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
        str = (0, _lodash.upperCase)(objectKind) + ': \n' + name + ' @' + username + ' ' + (0, _lodash.lowerCase)(objectKind) + 'ed ' + (totalCommitsCount ? totalCommitsCount + ' commits' : '') + ' in ' + projectFullPath + '.';
        str += event === eventTypes.Push_Hook ? '\n      Commits: \n' : '';
        commits.map(function (commit, index) {
          var id = commit.id,
              message = commit.message,
              name = commit.author.name;

          str += ' ' + (index + 1) + '. ' + message;
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
            iid = _req$body2$object_att.iid,
            title = _req$body2$object_att.title,
            _project_id = _req$body2$object_att.project_id,
            description = _req$body2$object_att.description,
            state = _req$body2$object_att.state,
            action = _req$body2$object_att.action,
            weight = _req$body2$object_att.weight,
            due_date = _req$body2$object_att.due_date,
            url = _req$body2$object_att.url,
            _req$body2$assignees = _req$body2.assignees,
            assignees = _req$body2$assignees === undefined ? [] : _req$body2$assignees;


        projectId = _project_id;
        str = 'ISSUE #' + iid + ': \n      ' + _name + ' @' + _username + ' ' + state + ' issue in ' + _projectFullPath + '. \n      Title: ' + title + ' \n      Due Date: ' + due_date + ' \n      Weight: ' + weight + ' \n      URL: ' + url + ' ';
        str += assignees.length > 0 ? '\n      Assigned To: \n' : '';
        assignees.map(function (_ref, index) {
          var name = _ref.name,
              username = _ref.username;
          return str += '  ' + (index + 1) + '. ' + name + ' @' + username;
        });
        break;
      }
  }

  projectId && _models2.default.Integration.findAll({ where: { projectId: projectId } }).then(function (integrations) {
    if (integrations !== null) {
      integrations.forEach(function (integration) {
        var _integration$get = integration.get({ plain: true }),
            chatId = _integration$get.chatId;

        console.log(chatId + ": ", projectId);

        if (/[a-z]/.test(chatId)) {
          var address = _extends({}, utils.SKYPE_ADDRESS, { conversation: { id: chatId } });
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