'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var GITLAB_URL = exports.GITLAB_URL = 'https://gitlab.com/api/v4';
var BASE_URL = exports.BASE_URL = 'https://gitlab-bot-server.herokuapp.com';
var TELEGRAM_TOKEN = exports.TELEGRAM_TOKEN = '390407644:AAF5qrrLrku8zMel5lHUKF1czBv5kyQrhJY';
// export const TELEGRAM_TOKEN = '407191495:AAFvFL2_KtFmo7QlcPzV7bJR-14YYBxTbXo'
var TELEGRAM_BOT_URL = exports.TELEGRAM_BOT_URL = 'https://t.me/MrGitLabBot/';
var SKYPE_BOT_URL = exports.SKYPE_BOT_URL = 'https://join.skype.com/bot/8864cf5d-3c38-457f-976f-cfb07dd93c7f';
var CONVERSATION_ID = exports.CONVERSATION_ID = '19:978ea7f80ded467695613d0813126361@thread.skype';

var GITLAB_CREDENTIALS = exports.GITLAB_CREDENTIALS = {
  client: {
    id: "c7002dc3c0bd1cdb9c78296b84798a75dfb99b3392e4aec0f02979f4e572a49a",
    secret: "48a43b745748f27485bcd29b9e61765e2a1266eea4e0d1b11a96a9c02ba3d0df"
  },
  auth: {
    tokenHost: GITLAB_URL,
    authorizePath: '/oauth/authorize',
    tokenPath: '/oauth/token'
  }
};

var SKYPE_ADDRESS = exports.SKYPE_ADDRESS = {
  conversation: {
    id: ''
  },
  bot: {
    id: '8864cf5d-3c38-457f-976f-cfb07dd93c7f'
  },
  serviceUrl: 'https://smba.trafficmanager.net/apis/'
};

var SKYPE_CREDENTIALS = exports.SKYPE_CREDENTIALS = {
  appId: "8864cf5d-3c38-457f-976f-cfb07dd93c7f",
  appPassword: "MRQff6a6AS1iSgfvpJra948"
};

var DB_CONFIG = exports.DB_CONFIG = {
  name: 'dfkcg96lgv1ob0',
  user: 'tqrldekflsrwxc',
  password: '621a00e80cc61917d3b261dd9f9aa39c819793a0634038b2099053fe4ebb57d3',
  options: {
    host: 'ec2-46-137-97-169.eu-west-1.compute.amazonaws.com',
    port: '5432',
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: true
    }
  }
};
var DB_CONFIG_LOCAL = exports.DB_CONFIG_LOCAL = {
  name: 'gitlabdb',
  user: 'azure',
  password: '6#vWHD_$',
  options: {
    host: '127.0.0.1',
    // port: '55335',
    port: '3306',
    dialect: 'mysql'
  }
};

var REFRESH_TOKEN_URI = exports.REFRESH_TOKEN_URI = 'https://' + GITLAB_CREDENTIALS.client.id + ':' + GITLAB_CREDENTIALS.client.secret + '@gitlab.com/api/v4/oauth/token?grant_type=refresh_token&refresh_token=';

var COMMANDS = exports.COMMANDS = {
  START: 'start',
  CONNECT: 'connect',
  NEW_INTEGRATION: 'newintegration',
  LIST_INTEGRATION: 'listintegrations',
  DELETE_INTEGRATION: 'delintegration',
  HELP: 'help',
  CANCEL: 'cancel'
};

var MESSAGE = exports.MESSAGE = {
  COMMAND_NOT_FOUND: 'Command not found!',
  CONNECT: 'Open this link to authorize the bot:\n',
  CHOOSE_SAPCE_INTEGRATE: 'Please choose a Project you\'d like to receive notifications from:\n',
  CHOOSE_SAPCE_DELETE: 'Please choose a Project you\'d like to delete from this chat:\n',
  ACCESS_TOKEN_ERROR: 'Access Token Error: ',
  AUTHORIZATION_SUCCESSFUL: 'Your GitLab account was connected successfully!\nYou can now use the /newintegration command.',
  AUTHORIZATION_FAILED: 'Authorization failed!\n\nUse /connect to authorize bot via OAuth.',
  NOTHING_INTEGRATED: 'No GitLab integrations have been set up with this conversation.',
  NOT_AUTHORIZED: 'Bot don\'t have access to your GitLab Projects.\n\nUse /connect to authorize bot via OAuth.',
  INVALID_TOKEN: 'Access token is invalid or expired.',
  SPACE_ALREADY_EXIST: "Project already integrated in this chat.",
  SPACE_INTEGRATED: " space integrated successfully.",
  SPACE_DELETED: " space deleted from this chat.",
  LIST_INTEGRATION: 'Following spaces are integrated:\n',
  DATABASE_ERROR: "Process failed! Try again later.",
  INTRODUCE_BOT: 'I\'m a GitLab bot. I\'ll send notifications of activities in a project.\n\nAvailable commands:\n  /connect - Authorize bot via OAuth\n  /newintegration - Add integration with a GitHub repository\n  /listintegrations - List all current integrations\n  /delintegration - Delete integration\n  /help - List available commands\n  /cancel - Cancel the current command'
};