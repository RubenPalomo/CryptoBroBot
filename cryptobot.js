import axios from "axios";
import TelegramBot from "node-telegram-bot-api";

const token = "YOUR-TOKEN";
const bot = new TelegramBot(token, { polling: true });
const url = "https://api.coingecko.com/api/v3";
var alarmMin = "";
var alarmMax = "";
var priceMin = 0;
var priceMax = 0;
var currency = "eur";
var id = "";

/*

      * * * FUNCTIONS * * *

*/

// Function to test the API status
const apiStatus = (msg) =>
  axios
    .get(`${url}/ping`)
    .then((response) => {
      if (response.status != 200)
        throw new Error("Failed to connected to the API");
      else bot.sendMessage(msg.chat.id, response.data.gecko_says);
    })
    .catch((error) => console.log(error));

// Function to get BTC info
const getInfoBTC = (msg) =>
  axios
    .get(`${url}/coins/bitcoin`)
    .then((response) =>
      bot.sendPhoto(msg.chat.id, response.data.image.large, {
        caption: `${response.data.description.en.substring(0, 1020)}...`,
      })
    )
    .catch((error) => console.log(error));

// Function to get the current BTC price
const getCurrentPrice = (msg) =>
  axios
    .get(`${url}/coins/bitcoin`)
    .then((response) => {
      bot.sendMessage(
        msg.chat.id,
        `Current price:\n\t·${response.data.market_data.current_price.usd}$\n\t` +
          `·${response.data.market_data.current_price.eur}€`
      );
    })
    .catch((error) => console.log(error));

// Function to get the BTC price at a specific date
const getPriceInDate = (msg, date) =>
  axios
    .get(`${url}/coins/bitcoin/history?date=${date}`)
    .then((response) => {
      bot.sendMessage(
        msg.chat.id,
        `Current price in ${date}:\n\t·${response.data.market_data.current_price.usd}$` +
          `\n\t·${response.data.market_data.current_price.eur}€`
      );
    })
    .catch((error) => console.log(error));

// Function to check if the BTC price is equal or lower than a specific amount
const isInPrice = (msg) =>
  axios
    .get(`${url}/coins/bitcoin`)
    .then((response) => {
      let price;
      currency === "eur"
        ? (price = response.data.market_data.current_price.eur)
        : (price = response.data.market_data.current_price.usd);
      if (price <= priceMin && priceMin !== 0) {
        bot.sendMessage(
          msg.chat.id,
          `Time to *buy*! The price is *${price}* ${currency}!`,
          { parse_mode: "Markdown" }
        );
        priceMin = 0;
        clearAlarm(alarmMin);
      }
      if (price >= priceMax && priceMax !== 0) {
        bot.sendMessage(
          msg.chat.id,
          `Time to *sell*! The price is *${price}* ${currency}!`,
          { parse_mode: "Markdown" }
        );
        priceMax = 0;
        clearAlarm(alarmMax);
      }
    })
    .catch((error) => console.log(error));

// Function to set an interval to check the BTC price
const setAlarm = (msg) => setInterval(isInPrice, 10000, msg);

// Function to clear the existing alarm
const clearAlarm = (alarm) => {
  if (alarm === "") return;
  try {
    clearInterval(alarm);
    alarm === alarmMin ? (alarmMin = "") : (alarmMax = "");
  } catch (error) {
    console.log(error);
  }
};

// Function to get all the current alarms
const getAlarms = (msg) => {
  let message = "";
  if (priceMin > 0)
    message += `The alarm for the *minimum price* is set in *${priceMin}*.\n`;
  if (priceMax > 0)
    message += `The alarm for the *maximum price* is set in *${priceMax}*.\n`;
  message !== ""
    ? bot.sendMessage(msg.chat.id, message, { parse_mode: "Markdown" })
    : bot.sendMessage(msg.chat.id, "No alarms set yet.");
};

// Function to change the current currency
const setCurrency = (newCurrency) => (currency = newCurrency);

/*

      * * * COMMANDS * * *

*/

// Command to start
bot.onText(/^\/start/, (msg) => {
  if (id === "") {
    id = msg.chat.id;
    bot.sendMessage(
      msg.chat.id,
      `Welcome ${msg.from.first_name} to your *CryptoBroBot*!❤️`,
      { parse_mode: "Markdown" }
    );
  } else if (id === msg.chat.id)
    bot.sendMessage(msg.chat.id, `Hi again ${msg.from.first_name}!❤️`);
  else
    bot.sendMessage(
      msg.chat.id,
      "Sorry, the bot is already being used by someone else.💔"
    );
});

// Command to change the current ID
bot.onText(/^\/setMyID/, (msg) => (id = msg.chat.id));

// Command to get info about BTC
bot.onText(/^\/info/, (msg) => getInfoBTC(msg));

// Command to get the current BTC price
bot.onText(/^\/currentPrice/, (msg) => getCurrentPrice(msg));

// Command to get the BTC price in a specific date
bot.onText(/^\/priceInDate(.+)/, (msg, match) =>
  getPriceInDate(msg, match[1].trim())
);

// Command to set an alarm to get an advice when the BTC is at a specific price
bot.onText(/^\/setAlarm(.+)/, (msg, match) => {
  if (msg.chat.id !== id) return;
  const data = match[1].split(" ");
  const type = data[1];
  const amount = data[2];
  if (
    amount <= 0 ||
    amount === undefined ||
    isNaN(amount) ||
    (type !== "min" && type !== "max")
  ) {
    bot.sendMessage(msg.chat.id, "Bad format!");
    return;
  }
  let alarm;

  type === "min" ? (alarm = alarmMin) : (alarm = alarmMax);
  if (alarm !== "") {
    bot.sendMessage(
      msg.chat.id,
      "There can only be one active alarm of the same type. The previous one has been deleted."
    );
    clearAlarm(alarm);
  }
  type === "min"
    ? (alarmMin = setAlarm(msg)) && (priceMin = amount)
    : (alarmMax = setAlarm(msg)) && (priceMax = amount);
  bot.sendMessage(
    msg.chat.id,
    `The alarm was set on *${amount}* ${currency}.`,
    {
      parse_mode: "Markdown",
    }
  );
});

// Command to clear the alarm
bot.onText(/^\/clearAlarm/, (msg) => {
  if (msg.chat.id !== id) return;
  const alarmToDelete = msg.text.split(" ")[1];
  if (alarmToDelete === "min") clearAlarm(alarmMin);
  else if (alarmToDelete === "max") clearAlarm(alarmMax);
  else if (alarmToDelete === undefined) {
    clearAlarm(alarmMin);
    clearAlarm(alarmMax);
  } else {
    bot.sendMessage(
      msg.chat.id,
      "Sorry, I didn't understand you.\nIf you want to delete alarm with minimum price" +
        "type _/clearAlarm min_. If you want to delete alarm with maximum price type " +
        "_/clearAlarm max_. If you want to delete both type _/clearAlarm both_.",
      { parse_mode: "Markdown" }
    );
    return;
  }
  bot.sendMessage(msg.chat.id, "The alarm was deleted.");
});

// Command to get all the current alarms
bot.onText(/^\/getAlarms/, (msg) => getAlarms(msg));

// Command to get the predefined currency
bot.onText(/^\/getCurrency/, (msg) =>
  bot.sendMessage(
    msg.chat.id,
    `The current currency is set in *${currency}*.`,
    { parse_mode: "Markdown" }
  )
);

// Command to change the predefined currency
bot.onText(/^\/setCurrency(.+)/, (msg, match) => {
  if (msg.chat.id !== id) return;
  const newCurrency = match[1].trim();
  if (newCurrency === "usd") setCurrency("usd");
  else if (newCurrency === "eur") setCurrency("eur");
  else {
    bot.sendMessage(msg.chat.id, "The specified currency is not valid.");
    return;
  }
  bot.sendMessage(
    msg.chat.id,
    `The currency was changed to *${newCurrency}*.`,
    { parse_mode: "Markdown" }
  );
});

// Command for help
bot.onText(/^\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "*Bot Commands*\n1.Use _/info_ to get information about BTC.\n" +
      "2. Use _/currentPrice_ to get the current price of BTC.\n" +
      "3. Use _/priceInDate + date_ (with dd-mm-yyyy format) to get the BTC price" +
      " on the specified date.\n" +
      "4. Use _/setAlarm + min/max + amount_ to set an alarm on the specified price. " +
      "If you used 'min' the alarm is set to the minimum price; if you used 'max' the " +
      "alarm is set yo the maximum price.\n" +
      "5. Use _/clearAlarm + min/max_ (optional) to delete the min/max alarm or both " +
      "if you typed anything.\n" +
      "6. Use _/getAlarms_ to receive a list with all the current alarms.\n" +
      "7. Use _/getCurrency_ to obtain the currency that is currently set.\n" +
      "8. Use _/setCurrency + eur/usd_ to set the current currency to it.\n\n" +
      "If you have any issues or questions type to *@RubenPal*✏️",
    { parse_mode: "Markdown" }
  );
});

// Command for tests
bot.onText(/^\/test/, (msg) => {
  apiStatus(msg);
});

/*
    Created by: Rubén Palomo Fontán
    LinkedIn: https://www.linkedin.com/in/ruben-palomo-fontan/
    Contact: ruben.palomof@gmail.com
 */
