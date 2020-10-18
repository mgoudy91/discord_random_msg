"use strict";
require("dotenv").config();
const Discord = require("discord.js");
const fs = require("fs");
const client = new Discord.Client();

client.on("ready", () => {
  console.log("Ready for action!");
  //very important
});

// Create an event listener for messages
client.on("message", (message) => {
  // Filter messages to get an entry point
  if (message.author.bot) {
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

    // Break for indexing
    if (commandArray.some((command) => command.includes("index"))) {
      downloadHistory(message.guild);
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

const downloadHistory = async (guild) => {
  console.log("Start indexing");
  let channels = guild.channels.cache.filter(
    (channel) => channel.type === "text"
  );
  channels.forEach(async (channel) => {
    console.log("indexing: " + channel.name);
    let messageArray = await fetchAll(channel);

    // Write to file
    let file = fs.createWriteStream("./message_index/" + channel.name + ".txt");
    file.on("error", function (err) {
      console.log(err);
    });
    messageArray.forEach(function (message) {
      let messageObj = JSON.parse(JSON.stringify(message));
      messageObj.author = message.author;
      messageObj.embeds = message.embeds;
      messageObj.attachments = message.attachments;
      file.write(JSON.stringify(messageObj) + "\n");
    });
    file.end();

    console.log("done indexing: " + channel.name);
  });
};

const getChannels = (guild, channelName = "") => {
  return guild.channels.cache.filter(
    (channel) => channel.type === "text" && channel.name.includes(channelName)
  );
};

const getRandomMessage = async (sourceChannel, channelToPost) => {
  channelToPost.startTyping();

  let fileName = `./message_index/${sourceChannel.name}.txt`;

  // First choice: fetch from file
  if (fs.existsSync(fileName)) {
    console.log(`We have a file for ${sourceChannel.name}`);
    let messages = fs.readFileSync(fileName).toString().split("\n");
    console.log(`Picking message at random...`);
    let randomMessageIndex = Math.floor(Math.random() * messages.length) -1;
    console.log(`random is`+ randomMessageIndex);

    // need to parse
    let randomMessage = JSON.parse(messages[randomMessageIndex]);
    console.log(`sending: ${randomMessage.content} to ${channelToPost.name}`);

    //Not required, but helps if there are multiple requests/message failure
    channelToPost.stopTyping(true);
    channelToPost.send(generateEmbed(randomMessage, sourceChannel));
  } else {
    // Fallback, fetch now
    let messages = await fetchAll(sourceChannel);
    console.log(`Picking message at random...`);
    let randomMessageIndex = Math.floor(Math.random() * messages.length);
    let randomMessage = messages[randomMessageIndex];
    console.log(`sending: ${randomMessage.content} to ${channelToPost.name}`);

    //Not required, but helps if there are multiple requests/message failure
    channelToPost.stopTyping(true);
    channelToPost.send(generateEmbed(randomMessage, sourceChannel));
  }
};

const fetchAll = async (channel) => {
  let size = 100;
  let messageArray = [];
  let lastID;

  console.log(`starting ${channel.name} fetch, this could take a while!`);
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

function generateEmbed(message, channel) {
  console.log(message);
  let author = message.author;
  console.log('======================')
  console.log(author)
  const embed = new Discord.MessageEmbed()
    .setColor("RANDOM")
    .setTitle(`#${channel.name}`)
    .setURL(message.url)
    .setAuthor(author.username, message.author.avatarURL || message.author.avatarURL({ dynamic: true }))
    .setDescription(message.cleanContent)
    .setTimestamp(message.createdAt)
    .setFooter(
      "Sent on",
      "https://media.discordapp.net/attachments/358274019482664961/607715919090810987/obamer_sphere.gif"
    );

  //Assume attachments have a higher priority
  if (message.embeds.length > 0) {
    var img = message.embeds.find((embed) => embed.type === "image");
  }
  if (message.attachments.size > 0) {
    var img = message.attachments.find(
      (attach) => attach.url.match(/\.(jpg|jpeg|gif|png|tiff|bmp)$/) != null
    );
  }
  if (img) {
    embed.setImage(img.url);
  }
  return embed;
}

client.login(process.env.TOKEN);
