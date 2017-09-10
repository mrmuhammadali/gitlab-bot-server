'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BotOperations = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _models = require('./models');

var _models2 = _interopRequireDefault(_models);

var _TelegramBot = require('./TelegramBot');

var _lodash = require('lodash');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var request = require('request-promise');
var oauth2 = require('simple-oauth2').create(utils.GITLAB_CREDENTIALS);
var telegramBot = new _TelegramBot.TelegramBot();

var BotOperations = exports.BotOperations = function BotOperations() {
  var _this = this;

  _classCallCheck(this, BotOperations);

  this.handleCommands = function (command, isSkype, session) {
    command = (0, _lodash.without)((0, _lodash.words)(command), 'GitLab', 'Bot')[0].toLowerCase();
    var COMMANDS = utils.COMMANDS;
    var chatId = isSkype ? (0, _lodash.get)(session, 'message.address.conversation.id', '') + '' : (0, _lodash.get)(session, 'chat.id', '') + '';

    switch (command) {
      case COMMANDS.START:
      case COMMANDS.HELP:
        {
          if (isSkype) {
            session.send(utils.MESSAGE.INTRODUCE_BOT);
          } else {
            telegramBot.sendMessage(chatId, utils.MESSAGE.INTRODUCE_BOT);
          }
          break;
        }
      case COMMANDS.CONNECT:
        {
          var AUTHORIZATION_URI = oauth2.authorizationCode.authorizeURL({
            client_id: utils.GITLAB_CREDENTIALS.client.id,
            redirect_uri: utils.BASE_URL + utils.AUTH_CALLBACK_ENDPOINT,
            response_type: 'code',
            state: chatId
          });

          if (isSkype) {
            session.send(utils.MESSAGE.CONNECT + AUTHORIZATION_URI);
          } else {
            telegramBot.sendMessage(chatId, utils.MESSAGE.CONNECT + AUTHORIZATION_URI);
          }
          break;
        }
      case COMMANDS.NEW_INTEGRATION:
        {
          _this.handleNewIntegration(isSkype, chatId, session);
          break;
        }
      case COMMANDS.LIST_INTEGRATION:
        {
          _this.handleListIntegrations(isSkype, chatId, session);
          break;
        }
      case COMMANDS.DELETE_INTEGRATION:
        {
          _this.handleDeleteIntegration(isSkype, chatId, session);
          break;
        }
      default:
        {
          if (isSkype) {
            session.send(utils.MESSAGE.COMMAND_NOT_FOUND);
          } else {
            telegramBot.sendMessage(chatId, utils.MESSAGE.COMMAND_NOT_FOUND);
          }
        }
    }
  };

  this.insertIntegration = function (isSkype, chatId, session, projectId, projectFullName) {
    var opts = !isSkype && { chat_id: chatId, message_id: session.message_id };

    _models2.default.Integration.findOne({ where: { chatId: chatId, projectId: projectId } }).then(function (res) {
      if (res === null) {
        _models2.default.Integration.create({ projectId: projectId, projectFullName: projectFullName, chatId: chatId }).then(function (res) {
          if (isSkype) {
            session.send('"' + projectFullName + '"' + utils.MESSAGE.SPACE_INTEGRATED);
          } else {
            telegramBot.editMessageText('"' + projectFullName + '"' + utils.MESSAGE.SPACE_INTEGRATED, opts);
          }
        }).catch(function (err) {
          if (isSkype) {
            session.send(utils.MESSAGE.DATABASE_ERROR);
          } else {
            telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
          }
        });
      } else {
        if (isSkype) {
          session.send(utils.MESSAGE.SPACE_ALREADY_EXIST);
        } else {
          telegramBot.editMessageText(utils.MESSAGE.SPACE_ALREADY_EXIST, opts);
        }
      }
    });
  };

  this.deleteIntegration = function (isSkype, chatId, session, projectId, projectFullName) {
    var opts = !isSkype && { chat_id: chatId, message_id: session.message_id };

    _models2.default.Integration.destroy({ where: { projectId: projectId } }).then(function (res) {
      if (res >= 1) {
        if (isSkype) {
          session.send('"' + projectFullName + '"' + utils.MESSAGE.SPACE_DELETED);
        } else {
          telegramBot.editMessageText('"' + projectFullName + '"' + utils.MESSAGE.SPACE_DELETED, opts);
        }
      } else {
        if (isSkype) {
          session.send(utils.MESSAGE.DATABASE_ERROR);
        } else {
          telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
        }
      }
    }).catch(function (err) {
      if (isSkype) {
        session.send(utils.MESSAGE.DATABASE_ERROR);
      } else {
        telegramBot.editMessageText(utils.MESSAGE.DATABASE_ERROR, opts);
      }
    });
  };

  this.handleCallbackQuery = function (callbackQuery) {
    var session = callbackQuery.message;
    var chat_id = session.chat.id + '';
    var data = JSON.parse(callbackQuery.data);
    var projectId = data[0];
    var projectFullName = data[1];

    var text = session.reply_to_message.text;

    var command = (0, _lodash.without)((0, _lodash.words)(text), 'GitLab', 'Bot')[0];

    console.log("Command: ", command);

    switch (command) {
      case utils.COMMANDS.NEW_INTEGRATION:
        {
          _this.insertIntegration(false, chat_id, session, projectId, projectFullName);
          break;
        }
      case utils.COMMANDS.DELETE_INTEGRATION:
        {
          _this.deleteIntegration(false, chat_id, session, projectId, projectFullName);
          break;
        }
    }
  };

  this.fetchProjects = function (isSkype, chatId, session, access_token) {
    var opts = {
      method: 'GET',
      uri: utils.GITLAB_URL + '/groups',
      auth: { bearer: access_token }
    };
    request(opts, function (error, response, groups) {
      groups = JSON.parse(groups);
      if (groups.error) {
        if (isSkype) {
          session.send(utils.MESSAGE.INVALID_TOKEN);
        } else {
          telegramBot.sendMessage(chatId, utils.MESSAGE.INVALID_TOKEN);
        }
      } else {
        var requests = groups.map(function (group) {
          return request.get(utils.GITLAB_URL + '/groups/' + group.id + '/projects', { auth: { bearer: access_token } });
        });

        Promise.all(requests).then(function (responses) {
          var telegramProjects = [];
          var skypeProjects = {};
          responses.map(function (response) {
            var projects = JSON.parse(response);
            projects.map(function (project) {
              console.log("+++project fetched: ", project.name);
              var projectId = project.id,
                  projectName = project.name,
                  projectFullName = project.name_with_namespace,
                  _project$namespace = project.namespace,
                  groupId = _project$namespace.id,
                  groupName = _project$namespace.name;

              var callback_data = JSON.stringify([projectId, projectFullName]);
              telegramProjects.push([{ text: projectFullName, callback_data: callback_data }]);
              skypeProjects[projectFullName] = { projectId: projectId, projectFullName: projectFullName };
            });
          });
          if (isSkype) {
            session.beginDialog('askSpaceIntegrate', { projects: skypeProjects });
          } else {
            var _opts = {
              reply_to_message_id: session.message_id,
              reply_markup: {
                inline_keyboard: telegramProjects
              }
            };
            telegramBot.sendMessage(chatId, utils.MESSAGE.CHOOSE_SAPCE_INTEGRATE, _opts);
          }
        }).catch(function (errors) {
          if (isSkype) {
            session.send(utils.MESSAGE.INVALID_TOKEN);
          } else {
            telegramBot.sendMessage(chatId, utils.MESSAGE.INVALID_TOKEN);
          }
        });
      }
    });
  };

  this.refreshToken = function (isSkype, chatId, session, refresh_token) {
    var opts = {
      method: 'POST',
      uri: utils.REFRESH_TOKEN_URI + refresh_token
    };
    request(opts, function (error, response, token) {
      console.log("Token Error: ", error);
      if (token !== null) {
        token = JSON.parse(token);
        token = oauth2.accessToken.create(token);

        var _token$token = _extends({}, token.token),
            access_token = _token$token.access_token,
            expires_at = _token$token.expires_at;

        console.log("New Token: ", _extends({}, token.token));
        _models2.default.Chat.update({ access_token: access_token, expires_at: expires_at }, { where: { chatId: chatId } });
        _this.fetchProjects(isSkype, chatId, session, access_token);
      }
    });
  };

  this.handleNewIntegration = function (isSkype, chatId, session) {
    _models2.default.Chat.findOne({ where: { chatId: chatId } }).then(function (chat) {
      var _get = (0, _lodash.get)(chat, 'dataValues', ''),
          access_token = _get.access_token,
          refresh_token = _get.refresh_token;

      _this.fetchProjects(isSkype, chatId, session, access_token);
    });
  };

  this.handleListIntegrations = function (isSkype, chatId, session) {
    _models2.default.Integration.findAll({ where: { chatId: chatId } }).then(function (integrations) {
      if (integrations !== null) {
        var integrationStr = '';
        integrations.map(function (_ref) {
          var integration = _ref.dataValues;

          console.log(integration.projectFullName);
          integrationStr += i + 1 + '. ' + integration.projectFullName + '\n';
        });
        var message = integrationStr ? utils.MESSAGE.LIST_INTEGRATION + integrationStr : utils.MESSAGE.NOTHING_INTEGRATED;

        if (isSkype) {
          session.send(message);
        } else {
          var reply_to_message_id = (0, _lodash.get)(session, 'message_id', 0);
          telegramBot.sendMessage(chatId, message, { reply_to_message_id: reply_to_message_id });
        }
      }
    });
  };

  this.handleDeleteIntegration = function (isSkype, chatId, session) {
    _models2.default.Integration.findAll({ where: { chatId: chatId } }).then(function (integrations) {
      if (integrations !== null) {
        var telegramProjects = [];
        var skypeProjects = {};
        integrations.map(function (_ref2) {
          var integration = _ref2.dataValues;
          var projectId = integration.projectId,
              projectFullName = integration.projectFullName;

          var callback_data = JSON.stringify([projectId, projectFullName]);

          telegramProjects.push([{ text: projectFullName, callback_data: callback_data }]);
          skypeProjects[projectFullName] = { projectId: projectId, projectFullName: projectFullName };
        });

        if (isSkype) {
          session.beginDialog('askSpaceDelete', { projects: skypeProjects });
        } else {
          var reply_to_message_id = (0, _lodash.get)(session, 'message_id', 0);
          var opts = {
            reply_to_message_id: reply_to_message_id,
            reply_markup: {
              inline_keyboard: telegramProjects
            }
          };
          telegramBot.sendMessage(chatId, utils.MESSAGE.CHOOSE_SAPCE_DELETE, opts);
        }
      }
    });
  };
}

// TODO refresh token
;