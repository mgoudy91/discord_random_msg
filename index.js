"use strict";
require("dotenv").config();
const moment = require("moment");

const Discord = require("discord.js");

const client = new Discord.Client();

client.on("ready", () => {
  console.log("Ready for action!");
});

// Create an event listener for messages
client.on("message", (message) => {
  // Filter messages to get an entry point
  if (message.author.bot){
    return;
  }
  if (
    message.content.includes("!random_message") ||
    message.content.includes("!rm")
  ) {
    let command = message.content.includes("!random_message")
      ? "!random_message"
      : "!rm";

    // Get args
    let commandArray = message.content
      .substring(message.content.indexOf(command))
      .split(" ");

    // Break for help
    if (commandArray.some((command) => command.includes("help"))) {
      sendHelp(message.channel);
      return;
    }

    // Parse args
    let channelName;
    commandArray.forEach((command) => {
      if (command.indexOf("c:") !== -1) {
        channelName = command.split("c:")[1];
      }
    });

    let channels = getChannels(message.guild, channelName).array();

    if (!channels || !channels.length) {
      message.channel.send("`Invalid channel filter` try `!rm help`");
      return;
    }

    let randomChannel = channels[Math.floor(Math.random() * channels.length)];
    console.log(`fetching rand msg from ${randomChannel.name}`);
    getRandomMessage(randomChannel, message.channel);
  }
});

const getChannels = (guild, channelName = "") => {
  return guild.channels.cache.filter(
    (channel) => channel.type === "text" && channel.name.includes(channelName)
  );
};

const getRandomMessage = async (sourceChannel, channelToPost) => {
  channelToPost.startTyping();
  let messages = await fetchAll(sourceChannel);
  console.log(`Picking message at random...`);
  let randomMessageIndex = Math.floor(Math.random() * messages.length);
  let randomMessage = messages[randomMessageIndex];
  console.log(`sending: ${randomMessage.content} to ${channelToPost.name}`);
  //Not required, but helps if there are multiple images
  channelToPost.stopTyping();
  channelToPost.send(generateEmbed(randomMessage));
};

const fetchAll = async (channel) => {
  let size = 100;
  let messageArray = [];
  let lastID;

  console.log("starting fetch, this could take a while!");
  while (size === 100) {
    await channel.messages
      .fetch({ limit: size, before: lastID })
      .then((messages) => {
        console.log(`${messages.size} messages fetched`);
        messages.each((message) => {
          messageArray.push(message);
        });
        size = messages.size;
      })
      .catch(console.error);

    lastID = messageArray[messageArray.length - 1].id;
  }

  console.log(`Fetch complete! ${messageArray.length} messages found`);

  return messageArray;
};

const sendHelp = (channel) => {
  const exampleEmbed = new Discord.MessageEmbed()
    .setColor("#0099ff")
    .setTitle("HistoryBot")
    .setAuthor(
      "History Bot",
      "https://media.discordapp.net/attachments/358274019482664961/607715919090810987/obamer_sphere.gif",
      "https://github.com/mgoudy91/discord_random_msg"
    )
    .setDescription("Send a random message from your server's history")
    .addFields(
      { name: "Basic Usage", value: "`!rm` or `!random_message`" },
      { name: "Specify channel", value: "`!rm c:channel_name`", inline: true },
      { name: "Get help", value: "`!rm help`", inline: true }
    )
    .setTimestamp()
    .setFooter("Created with extreme malice");

  channel.send(exampleEmbed);
};

function generateEmbed (message) {
  let author = message.author;
  //TODO: Check for attachments
  const embed = new Discord.MessageEmbed()
    .setColor('RANDOM')
    .setTitle(`#${message.channel.name}`)
    .setURL(message.url)
    .setAuthor(author.username, message.author.avatarURL({dynamic:true}))
    .setDescription(message.cleanContent)
    .setTimestamp(message.createdAt)
    .setFooter('Sent on');

    return embed;
}

client.login(process.env.TOKEN);
