const telegram = require('node-telegram-bot-api');
import { TELEGRAM_TOKEN } from "./constants"

let bot = null

export class TelegramBot {
  constructor() {
    if (!bot) {
      bot = new telegram(TELEGRAM_TOKEN, {polling: true});
    }
    return bot
  }
}
