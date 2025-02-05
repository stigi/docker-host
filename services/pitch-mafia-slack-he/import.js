/* eslint-disable no-console */
const fs = require('fs-extra');
const path = require('path');
const dotenv = require('dotenv');

const md = require('markdown-it')({
  html: true,
  linkify: true,
  typographer: true,
});

const CONFIG = require('./services/ConfigParser');
const SQLiteWrapper = require('./services/SQLiteWrapper');

dotenv.config();

// Add config module
const config = new CONFIG();

const teamUrl = `https://${process.env.SLACK_DOMAIN}.slack.com/team/`;
const channelUrl = `https://${process.env.SLACK_DOMAIN}.slack.com/messages/`;

// Add SQLite Wrapper
const db = new SQLiteWrapper({ db: config.get('db'), stopwords: config.get('stopwords') });

const importFolder = path.resolve('import');

const readJsonFile = async (file) => {
  const filePath = path.resolve(importFolder, file);

  try {
    const data = await fs.readJson(filePath);
    return data;
  } catch (error) {
    console.error(`Error reading file ${filePath}`);
    throw error;
  }
};

const importMessage = async (message, { channel, channels, users }) => {
  if (message.user === 'USLACKBOT') { // Typical, for a bot.
    return;
  }

  if (message.subtype) {
    // message_deleted, message_changed, etc ...
    return;
  }

  const poster = users[message.user];
  const posterName = poster.real_name || message.user;

  const channelName = channel.name ?? channels[message.channel] ?? message.channel;

  let messageHTML = message.text.replace(/<@[^>]*>/g, (userRef) => {
    const userID = userRef.replace('<@', '').replace('>', '');
    const user = users[userID];
    return `<a target='_blank' href='${teamUrl}${user.name}'>@${user.name}</a>`;
  });

  // Change <#C178PKDCY|channelname> to something relevant
  messageHTML = messageHTML.replace(/<#[^>]*>/g, (channelRef) => {
    // strip the "<#....|" part and ">"
    const channelRefID = channelRef.replace('<#', '').replace(/\|.*>/g, '');
    const channelRefName = channelRef.replace(/<#.*\|/g, '').replace('>', '');
    // eslint-disable-next-line no-nested-ternary
    const refName = channelRefName.length
      ? channelRefName
      : channels[channelRefID]
        ? channels[channelRefID].name
        : 'private-channel';
    return `<a target='_blank' href='${channelUrl}${refName}'>#${refName}</a>`;
  });

  // Change <links> to something relevant
  messageHTML = messageHTML.replace(/<http[^>]*>/g, (x) => {
    const link = x.replace('<', '').replace('>', '');
    return `<a target='_blank' href='${link}'>${link}</a>`;
  });

  // And then markdown
  messageHTML = md.render(messageHTML);

  const date = new Date(parseInt(message.ts.split('.')[0], 10) * 1000);
  // console.log(posterName, date, channelName, messageHTML);
  db.insertMessage(posterName, date, messageHTML, message.text, channelName);
};

const importChatFile = async (chatFilePath, { channel, channels, users }) => {
  const messages = await readJsonFile(chatFilePath);

  await Promise.all(messages.map((m) => importMessage(m, { channel, channels, users })));
};

const importChannel = async (channelID, { channels, users }) => {
  const channel = channels[channelID];
  const channelName = channel.name;
  console.info(`Importing channel #${channelName}`);

  const channelFolder = path.resolve(importFolder, channelName);
  const chatFiles = fs.readdirSync(channelFolder);

  chatFiles.forEach(async (chatFile) => {
    const chatFilePath = path.resolve(importFolder, channelName, chatFile);
    await importChatFile(chatFilePath, { channel, channels, users });
  });
};

// Main
(async () => {
  console.log('🚰 Importing...');

  let users;
  let channels;
  try {
    users = await readJsonFile('users.json');
    channels = await readJsonFile('channels.json');
  } catch (error) {
    console.error(`Make sure to have the files users.jsons and channels.jsons in the folder ${importFolder}`);
    process.exit(1);
  }

  const toLookupObject = (coll) => Object.fromEntries(coll.map((i) => [i.id, i]));

  const usersByID = toLookupObject(users);
  const channelsByID = toLookupObject(channels);

  Object.keys(channelsByID).forEach(async (channelID) => {
    await importChannel(channelID, { channels: channelsByID, users: usersByID });
  });
})();
