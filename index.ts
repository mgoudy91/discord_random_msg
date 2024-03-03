require('dotenv').config();
import {
  Client,
  Collection,
  Guild,
  GuildChannel,
  Message,
  MessageEmbed,
  TextChannel,
} from 'discord.js';
import * as fs from 'fs';

const client = new Client();
const port = process.env.PORT || 3000; // Fallback for local development

// Heroku requires a web server respond to GET requests to keep the app running
import express, { Request, Response } from 'express';
const app = express();

app.get('/', (req: Request, res: Response) => {
  res.send('Discord Bot is running!');
});

app.listen(port, () => {
  console.log(`Web server is listening on port ${port}`);
});

client.on('ready', () => {
  console.log('Ready for action!');
  //very important
});

// Create an event listener for messages
client.on('message', (message: Message) => {
  // Filter messages to get an entry point
  if (message.author.bot) {
    return;
  }

  if (!message.guild) {
    return;
  }

  if (
    message.content.includes('!random_message') ||
    message.content.includes('!rm')
  ) {
    let command = message.content.includes('!random_message')
      ? '!random_message'
      : '!rm';

    // Get args
    let commandArray = message.content
      .substring(message.content.indexOf(command))
      .split(' ');

    // Break for help
    if (commandArray.some((command) => command.includes('help'))) {
      sendHelp(message.channel as TextChannel);
      return;
    }

    // Break for indexing
    if (commandArray.some((command) => command.includes('index'))) {
      downloadHistory(message.guild);
      return;
    }

    // Parse args
    let channelName;
    commandArray.forEach((command) => {
      if (command.indexOf('c:') !== -1) {
        channelName = command.split('c:')[1];
      }
    });

    let channels: TextChannel[] = getChannels(
      message.guild,
      channelName
    ).array();

    if (!channels || !channels.length) {
      message.channel.send('`Invalid channel filter` try `!rm help`');
      return;
    }

    let randomChannel: TextChannel =
      channels[Math.floor(Math.random() * channels.length)];
    console.log(`fetching rand msg from ${randomChannel.name}`);
    getRandomMessage(randomChannel, message.channel as TextChannel);
  }
});

const downloadChannelHistory = async (channel: GuildChannel) => {
  console.log('Indexing channel: ' + channel.name);
  let messageArray = await fetchAll(channel);
  // Write to file
  let file = fs.createWriteStream('./message_index/' + channel.name + '.txt');
  file.on('error', function (err) {
    console.log(err);
  });
  messageArray.forEach(function (message) {
    // Discord.js has some really weird overwrites for toString functionality,
    // that loses deep properties on the object, so we have to set them
    // explicitly
    let messageObj = JSON.parse(JSON.stringify(message));
    messageObj.author = message.author;
    messageObj.embeds = JSON.stringify(message.embeds);
    messageObj.attachments = JSON.stringify(message.attachments);
    messageObj.createdAt = message.createdAt;
    messageObj.url = message.url;
    file.write(JSON.stringify(messageObj) + '\n');
  });
  file.end();
  console.log('done indexing: ' + channel.name);

  return messageArray;
};

const downloadHistory = async (guild: Guild) => {
  console.log('Start indexing');
  let channels = guild.channels.cache.filter(
    (channel) => channel.type === 'text'
  );
  channels.forEach(async (channel) => {
    downloadChannelHistory(channel);
  });
};

const getChannels = (
  guild: Guild,
  channelName: string = ''
): Collection<string, TextChannel> => {
  const channels = guild.channels.cache.filter(
    (channel) => channel.type === 'text' && channel.name.includes(channelName)
  );
  // filter out any non TextChannels
  return channels as Collection<string, TextChannel>;
};

const getRandomMessage = async (
  sourceChannel: TextChannel,
  channelToPost: TextChannel
) => {
  (channelToPost as TextChannel).startTyping();

  let fileName = `./message_index/${sourceChannel.name}.txt`;
  let randomMessage;

  // First choice: fetch from file
  if (fs.existsSync(fileName)) {
    console.log(`We have a file for ${sourceChannel.name}`);
    let messages = fs.readFileSync(fileName).toString().trim().split('\n');
    let randomMessageIndex = Math.floor(Math.random() * messages.length);

    // need to parse
    randomMessage = JSON.parse(messages[randomMessageIndex]);
  } else {
    // Fallback, fetch and index now
    console.log('No index file found for ${sourceChannel.name}');
    let messages = await downloadChannelHistory(sourceChannel);

    console.log(`Picking message at random...`);
    let randomMessageIndex = Math.floor(Math.random() * messages.length);
    randomMessage = messages[randomMessageIndex];
  }

  console.log(`sending: ${randomMessage.content} to ${channelToPost.name}`);
  //Not required, but helps if there are multiple requests/message failure
  channelToPost.stopTyping(true);
  channelToPost.send(generateEmbed(randomMessage, sourceChannel));
};

const fetchAll = async (channel: GuildChannel) => {
  let size = 100;
  let messageArray: Message[] = [];
  let lastID;

  console.log(`starting ${channel.name} fetch, this could take a while!`);
  while (size === 100) {
    await (channel as TextChannel).messages
      .fetch({ limit: size, before: lastID })
      .then((messages) => {
        console.log(`Fetching ${messages.size} messages from ${channel.name}`);
        messages.each((message) => {
          messageArray.push(message);
        });
        size = messages.size;
      })
      .catch(console.error);

    lastID = messageArray[messageArray.length - 1].id;
  }

  console.log(
    `Fetch complete! ${messageArray.length} messages found in ${channel.name}`
  );

  return messageArray;
};

const sendHelp = (channel: TextChannel) => {
  const exampleEmbed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle('HistoryBot')
    .setAuthor(
      'History Bot',
      'https://media.discordapp.net/attachments/358274019482664961/607715919090810987/obamer_sphere.gif',
      'https://github.com/mgoudy91/discord_random_msg'
    )
    .setDescription("Send a random message from your server's history")
    .addFields(
      { name: 'Basic Usage', value: '`!rm` or `!random_message`' },
      { name: 'Specify channel', value: '`!rm c:channel_name`', inline: true },
      { name: 'Get help', value: '`!rm help`', inline: true }
    )
    .setTimestamp()
    .setFooter('Created with extreme malice');

  channel.send(exampleEmbed);
};

function generateEmbed(message: Message, channel: TextChannel) {
  let author = message.author;
  const embed = new MessageEmbed()
    .setColor('RANDOM')
    .setTitle(`#${channel.name}`)
    .setURL(message.url)
    .setAuthor(
      author.username,
      message.author.displayAvatarURL({ format: 'png', dynamic: true })
    )
    .setDescription(message.cleanContent)
    .setTimestamp(message.createdAt)
    .setFooter(
      'Sent on',
      'https://media.tenor.com/YNwyN6nZ1jcAAAAi/barack-obama-sphere.gif'
    );

  //Assume attachments have a higher priority
  let img;
  if (message.embeds && message.embeds.length > 0) {
    try {
      img = message.embeds.find(
        (embed: MessageEmbed) => embed.type === 'image'
      );
    } catch (e) {
      console.log(e);
    }
  }
  if (message.attachments && message.attachments.size > 0) {
    img = message.attachments.find(
      (attach) => attach.url.match(/\.(jpg|jpeg|gif|png|tiff|bmp)$/) != null
    );
  }
  if (img && img.url) {
    embed.setImage(img.url);
  }
  return embed;
}

client.login(process.env.TOKEN);
