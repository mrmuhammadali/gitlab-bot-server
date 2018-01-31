export const GITLAB_URL = 'https://gitlab.com/api/v4'
export const BASE_URL = 'https://gitlab-bot-server.herokuapp.com'
export const AUTH_CALLBACK_ENDPOINT = '/auth-callback'
export const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN
export const TELEGRAM_BOT_URL = 'https://t.me/MrGitLabBot/'
export const SKYPE_BOT_URL = `https://join.skype.com/bot/${process.env.MICROSOFT_APP_ID}`

export const GITLAB_CREDENTIALS = {
  client: {
    id: process.env.GITLAB_CONSUMER_KEY,
    secret: process.env.GITLAB_CONSUMER_SECRET
  },
  auth: {
    tokenHost: GITLAB_URL,
    authorizePath: '/oauth/authorize',
    tokenPath: '/oauth/token'
  }
}

export const SKYPE_CREDENTIALS = {
  appId: process.env.MICROSOFT_APP_ID,
  appPassword: process.env.MICROSOFT_APP_PASSWORD
}

export const SKYPE_ADDRESS = {
  conversation: { id: '' },
  bot: { id: process.env.MICROSOFT_APP_ID },
  serviceUrl: 'https://smba.trafficmanager.net/apis/'
}

export const DB_CONFIG = {
  name: 'gitlabdb',
  user: 'azure',
  password: '6#vWHD_$',
  options: {
    host: '127.0.0.1',
    port: '3306',
    dialect: 'mysql'
  }
}

export const REFRESH_TOKEN_URI = `https://${GITLAB_CREDENTIALS.client.id}:${GITLAB_CREDENTIALS.client.secret}@gitlab.com/api/v4/oauth/token?grant_type=refresh_token&refresh_token=`

export const COMMANDS = {
  START: 'start',
  CONNECT: 'connect',
  NEW_INTEGRATION: 'newintegration',
  LIST_INTEGRATION: 'listintegrations',
  DELETE_INTEGRATION: 'delintegration',
  HELP: 'help',
  CANCEL: 'cancel'
}

export const MESSAGE = {
  COMMAND_NOT_FOUND: 'Command not found!',
  CONNECT: `Open this link to authorize the bot:\n`,
  CHOOSE_SAPCE_INTEGRATE: `Please choose a Project you'd like to receive notifications from:\n`,
  CHOOSE_SAPCE_DELETE: `Please choose a Project you'd like to delete from this chat:\n`,
  ACCESS_TOKEN_ERROR: 'Access Token Error: ',
  AUTHORIZATION_SUCCESSFUL: `Your GitLab account was connected successfully!\nYou can now use the /newintegration command.`,
  AUTHORIZATION_FAILED: `Authorization failed!\n\nUse /connect to authorize bot via OAuth.`,
  NOTHING_INTEGRATED: 'No GitLab integrations have been set up with this conversation.',
  NOT_AUTHORIZED: `Bot don't have access to your GitLab Projects.\n\nUse /connect to authorize bot via OAuth.`,
  INVALID_TOKEN: `Access token is invalid or expired.`,
  SPACE_ALREADY_EXIST: "Project already integrated in this chat.",
  SPACE_INTEGRATED: " project integrated successfully.",
  SPACE_DELETED: " project deleted from this chat.",
  LIST_INTEGRATION:'Following projects are integrated:\n',
  DATABASE_ERROR: "Process failed! Try again later.",
  INTRODUCE_BOT_TELEGRAM: `I'm a GitLab bot. I'll send notifications of activities in a project.\n\nAvailable commands:
  /connect - Authorize bot via OAuth
  /newintegration - Add integration with a GitLab repository
  /listintegrations - List all current integrations
  /delintegration - Delete integration
  /help - List available commands
  /cancel - Cancel the current command`,
  INTRODUCE_BOT_SKYPE: `I'm a GitLab bot. I'll send notifications of activities in a project.\n\nAvailable commands:\n
  connect @GitLab Bot - Authorize bot via OAuth\n
  newintegration @GitLab Bot - Add integration with a GitLab repository\n
  listintegrations @GitLab Bot - List all current integrations\n
  delintegration @GitLab Bot - Delete integration\n
  help @GitLab Bot - List available commands`
}
