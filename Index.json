const { Client, Intents } = require('discord.js');
const { token, prefix } = require('./config.json');
const music = require('./music');

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILD_MESSAGES],
});

client.once('ready', () => {
  console.log('META MUSIC Bot is online!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'play') {
    if (!args[0]) return message.channel.send('Please provide a YouTube URL.');
    music.execute(message, args);
  } else if (command === 'skip') {
    music.skip(message);
  } else if (command === 'stop') {
    music.stop(message);
  } else {
    message.channel.send('Unsupported command. Use play, skip, or stop.');
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  switch (interaction.customId) {
    case 'play_pause':
      music.pauseResume(interaction);
      break;
    case 'skip':
      music.skip(interaction);
      break;
    case 'stop':
      music.stop(interaction);
      break;
    case 'volume_up':
      music.volumeUp(interaction);
      break;
    case 'volume_down':
      music.volumeDown(interaction);
      break;
  }
});

client.login(token);
