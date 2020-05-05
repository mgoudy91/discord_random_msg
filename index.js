"use strict";
require('dotenv').config();

const Discord = require("discord.js");

const client = new Discord.Client();

client.on("ready", () => {
  console.log("I am ready!");
});

// Create an event listener for messages
client.on("message", (message) => {
  if (message.content === "!random_message" || message.content === "!rm") {
    let channels = getChannels(message.guild).array();
    let randomChannel = channels[Math.floor(Math.random() * channels.length)];

    console.log(`fetching rand msg from ${randomChannel.name}`);

    getRandomMessage(randomChannel, message.channel);
  }
});

const getChannels = (guild) => {
    return guild.channels.cache.filter((channel) => channel.type === "text");
};

const getRandomMessage = async (sourceChannel, channelToPost) => {
  let messages = await fetchAll(sourceChannel);
  console.log(`Picking message at random...`);
  let randomMessageIndex = Math.floor(Math.random() * messages.length);
  let randomMessage = messages[randomMessageIndex];
  console.log(`sending: ${randomMessage.content} to ${channelToPost.name}`);

  channelToPost.send(
    `Remember when ${randomMessage.author.username} sent this in ${sourceChannel} on ${randomMessage.createdAt}`
  );
  channelToPost.send(randomMessage || '_no text_');
  channelToPost.send(randomMessage.url);
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

client.login(process.env.TOKEN);
