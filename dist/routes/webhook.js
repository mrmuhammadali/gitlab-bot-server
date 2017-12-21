'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _capitalize = require('lodash/capitalize');

var _capitalize2 = _interopRequireDefault(_capitalize);

var _drop = require('lodash/drop');

var _drop2 = _interopRequireDefault(_drop);

var _forEachRight = require('lodash/forEachRight');

var _forEachRight2 = _interopRequireDefault(_forEachRight);

var _lowerCase = require('lodash/lowerCase');

var _lowerCase2 = _interopRequireDefault(_lowerCase);

var _size = require('lodash/size');

var _size2 = _interopRequireDefault(_size);

var _startCase = require('lodash/startCase');

var _startCase2 = _interopRequireDefault(_startCase);

var _unescape = require('lodash/unescape');

var _unescape2 = _interopRequireDefault(_unescape);

var _upperCase = require('lodash/upperCase');

var _upperCase2 = _interopRequireDefault(_upperCase);

var _constants = require('../constants');

var utils = _interopRequireWildcard(_constants);

var _models = require('../models');

var _models2 = _interopRequireDefault(_models);

var _TelegramBot = require('../TelegramBot');

var _eventTypes = require('../eventTypes');

var eventTypes = _interopRequireWildcard(_eventTypes);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// libs
var builder = require('botbuilder');
var router = require('express').Router();

// src


var telegramBot = new _TelegramBot.TelegramBot();
var connector = new builder.ChatConnector(utils.SKYPE_CREDENTIALS);
var skypeBot = new builder.UniversalBot(connector);

var reduceCommits = function reduceCommits(commits, commitCount) {
  if (commitCount > 20) {
    return (0, _drop2.default)(commits, 10);
  } else if (commitCount - 10 > 0) {
    return (0, _drop2.default)(commits, commitCount - 10);
  }

  return commits;
};

exports.default = router.post('', function (req, res) {
  console.log("++++Request Body++++", req.body);
  var event = req.headers["x-gitlab-event"];
  var str = '';
  var projectId = 0;

  switch (event) {
    case eventTypes.PUSH_HOOK:
    case eventTypes.TAG_PUSH_HOOK:
      {
        var _req$body = req.body,
            objectKind = _req$body.object_kind,
            name = _req$body.user_name,
            username = _req$body.user_username,
            project_id = _req$body.project_id,
            _req$body$ref = _req$body.ref,
            ref = _req$body$ref === undefined ? '' : _req$body$ref,
            _req$body$project = _req$body.project,
            projectFullPath = _req$body$project.path_with_namespace,
            webUrl = _req$body$project.web_url,
            commits = _req$body.commits,
            totalCommitsCount = _req$body.total_commits_count;


        var branch = ref && ref.substr(ref.lastIndexOf('/') + 1);
        projectId = project_id;
        str = '**' + (0, _upperCase2.default)(objectKind) + ':**\n      \n------\n\n*' + (0, _startCase2.default)(name) + ' [@' + username + '](https://gitlab.com/' + username + ')* **' + (0, _lowerCase2.default)(objectKind) + 'ed** ' + (totalCommitsCount ? totalCommitsCount + ' commit(s)' : '') + ' in' + (branch ? ' branch \'[' + branch + '](' + webUrl + '/tree/' + branch + ')\' of' : '') + ' [' + projectFullPath + '](' + webUrl + ').\n      \n------\n';
        str += event === eventTypes.Push_Hook ? (totalCommitsCount > 10 ? 'Last 10 ' : '') + 'Commits:\n\n' : '';
        var reducedCommits = reduceCommits(commits, totalCommitsCount);
        (0, _forEachRight2.default)(reducedCommits, function (commit, index) {
          var id = commit.id,
              message = commit.message,
              name = commit.author.name,
              url = commit.url;

          str += '  ' + Math.abs(index - commits.length) + '. *' + (0, _startCase2.default)(name) + '* **committed**: [' + message + '](' + url + ')\n';
        });
        break;
      }

    case eventTypes.ISSUE_HOOK:
      {
        var _req$body2 = req.body,
            _req$body2$user = _req$body2.user,
            _name = _req$body2$user.name,
            _username = _req$body2$user.username,
            _req$body2$project = _req$body2.project,
            _projectFullPath = _req$body2$project.path_with_namespace,
            _webUrl = _req$body2$project.web_url,
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
        str = '**[ISSUE #' + iid + '](' + url + '):**\n      \n---\n\n*' + (0, _startCase2.default)(_name) + ' [@' + _username + '](https://gitlab.com/' + _username + ')* **' + state + ' issue** in [' + _projectFullPath + '](' + _webUrl + ').\n      \n---\n\n      Title: ' + (0, _capitalize2.default)(title) + '\n      Due Date: ' + due_date + ' \n\n';
        str += assignees.length > 0 ? 'Assigned To: \n\n' : '';
        assignees.forEach(function (_ref, index) {
          var name = _ref.name,
              username = _ref.username;
          return str += '  ' + (index + 1) + '. *' + (0, _startCase2.default)(name) + ' [@' + username + '](https://gitlab.com/' + username + ')*';
        });
        break;
      }

    case eventTypes.NOTE_HOOK:
      {
        var _req$body3 = req.body,
            _req$body3$user = _req$body3.user,
            _name2 = _req$body3$user.name,
            _username2 = _req$body3$user.username,
            _project_id2 = _req$body3.project_id,
            _req$body3$project = _req$body3.project,
            _projectFullPath2 = _req$body3$project.path_with_namespace,
            _webUrl2 = _req$body3$project.web_url,
            _req$body3$object_att = _req$body3.object_attributes,
            note = _req$body3$object_att.note,
            notableType = _req$body3$object_att.noteable_type,
            _url = _req$body3$object_att.url,
            _req$body3$issue = _req$body3.issue,
            issue = _req$body3$issue === undefined ? {} : _req$body3$issue;

        var _issue$iid = issue.iid,
            _iid = _issue$iid === undefined ? -1 : _issue$iid,
            _issue$title = issue.title,
            _title = _issue$title === undefined ? '' : _issue$title,
            _issue$description = issue.description,
            _description = _issue$description === undefined ? '' : _issue$description,
            _issue$state = issue.state,
            _state = _issue$state === undefined ? '' : _issue$state;

        projectId = _project_id2;

        if ((0, _size2.default)(issue) > 0) {
          str = '**[ISSUE #' + _iid + '](' + _url + '):**\n        \n---\n\n*' + (0, _startCase2.default)(_name2) + ' [@' + _username2 + '](https://gitlab.com/' + _username2 + ')* **commented** on issue #' + _iid + ' in [' + _projectFullPath2 + '](' + _webUrl2 + ').\n        \n---\n\n        Issue State: ' + _state + ' \n\n        Title: ' + (0, _capitalize2.default)(_title) + ' \n\n        Note: ' + (0, _capitalize2.default)(note);
        }
        break;
      }
    case eventTypes.MERGE_REQUEST_HOOK:
      {
        var _req$body4 = req.body,
            _objectKind = _req$body4.object_kind,
            _req$body4$user = _req$body4.user,
            _name3 = _req$body4$user.name,
            _username3 = _req$body4$user.username,
            _req$body4$project = _req$body4.project,
            _projectFullPath3 = _req$body4$project.path_with_namespace,
            _webUrl3 = _req$body4$project.web_url,
            _req$body4$object_att = _req$body4.object_attributes,
            _project_id3 = _req$body4$object_att.target_project_id,
            target_branch = _req$body4$object_att.target_branch,
            source_branch = _req$body4$object_att.source_branch,
            _req$body4$object_att2 = _req$body4$object_att.source,
            sourceProjectFullPath = _req$body4$object_att2.path_with_namespace,
            sourceWebUrl = _req$body4$object_att2.web_url,
            _req$body4$object_att3 = _req$body4$object_att.target,
            targetProjectFullPath = _req$body4$object_att3.path_with_namespace,
            targetWebUrl = _req$body4$object_att3.web_url,
            _req$body4$object_att4 = _req$body4$object_att.last_commit,
            commitMessage = _req$body4$object_att4.message,
            commitAuthorName = _req$body4$object_att4.author.name,
            commitUrl = _req$body4$object_att4.url,
            mergeRequestUrl = _req$body4$object_att.url;


        var branchMessage = sourceProjectFullPath === targetProjectFullPath ? source_branch + ' in ' + target_branch + ' of ' + targetProjectFullPath : source_branch + ' of ' + sourceProjectFullPath + ' in ' + target_branch + ' of ' + targetProjectFullPath;

        projectId = _project_id3;

        str = '**[' + (0, _upperCase2.default)(_objectKind) + '](' + mergeRequestUrl + '):**\n        \n---\n\n*' + (0, _startCase2.default)(_name3) + ' [@' + _username3 + '](https://gitlab.com/' + _username3 + ')* **requested to merge** ' + branchMessage + '.\n        \n---\n\n        Last Commit: *' + (0, _startCase2.default)(commitAuthorName) + '* **committed**: [' + commitMessage + '](' + commitUrl + ')';

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
          var reply = new builder.Message().address(address).text((0, _unescape2.default)(str));

          skypeBot.send(reply);
        } else {
          telegramBot.sendMessage(chatId, (0, _unescape2.default)(str));
        }
      });
    }
  });

  res.json({ project_id: projectId, success: projectId !== 0 });
});