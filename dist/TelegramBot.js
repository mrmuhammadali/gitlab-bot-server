"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TelegramBot = undefined;

var _constants = require("./constants");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var telegram = require('node-telegram-bot-api');


var bot = null;

var TelegramBot = exports.TelegramBot = function TelegramBot() {
  _classCallCheck(this, TelegramBot);

  if (!bot) {
    bot = new telegram(_constants.TELEGRAM_TOKEN, { polling: true });
  }
  return bot;
};