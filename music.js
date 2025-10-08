const ytdl = require('ytdl-core');
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const queue = new Map();

function nowPlayingEmbed(song) {
  return new MessageEmbed()
    .setColor('#1DB954')
    .setTitle('Now Playing 🎧')
    .setDescription(`**${song.title}**`)
    .setThumbnail(song.thumbnail || '')
    .addField('Duration', song.duration || 'Unknown', true)
    .addField('Requested by', song.requestedBy || 'Unknown', true)
    .setFooter({ text: 'META MUSIC | Your Ultimate Music Bot' })
    .setTimestamp();
}

function controlButtons() {
  return new MessageActionRow().addComponents(
    new MessageButton().setCustomId('play_pause').setLabel('Play/Pause').setStyle('PRIMARY'),
    new MessageButton().setCustomId('skip').setLabel('Skip').setStyle('SECONDARY'),
    new MessageButton().setCustomId('stop').setLabel('Stop').setStyle('DANGER'),
    new MessageButton().setCustomId('volume_up').setLabel('Vol +').setStyle('SUCCESS'),
    new MessageButton().setCustomId('volume_down').setLabel('Vol -').setStyle('SUCCESS'),
  );
}

async function execute(message, args) {
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send('I need permissions to join and speak in your voice channel!');
  }

  const songInfo = await ytdl.getInfo(args[0]);
  const song = {
    title: songInfo.videoDetails.title,
    url: songInfo.videoDetails.video_url,
    thumbnail: songInfo.videoDetails.thumbnails[0].url,
    duration: new Date(parseInt(songInfo.videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
    requestedBy: message.author.username,
  };

  let serverQueue = queue.get(message.guild.id);

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
      dispatcher: null,
      currentSongMessage: null,
    };

    queue.set(message.guild.id, queueContruct);
    queueContruct.songs.push(song);

    try {
      const connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send('Error joining the voice channel!');
    }
  } else {
    serverQueue.songs.push(song);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }
}

function play(guild, serverQueue) {
  const song = serverQueue.songs[0];

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection
    .play(ytdl(song.url, { filter: 'audioonly' }))
    .on('finish', () => {
      serverQueue.songs.shift();
      play(guild, serverQueue);
    })
    .on('error', error => console.error(error));

  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

  serverQueue.dispatcher = dispatcher;
  serverQueue.playing = true;

  if (serverQueue.currentSongMessage) {
    try {
      serverQueue.currentSongMessage.edit({
        embeds: [nowPlayingEmbed(song)],
        components: [controlButtons()],
      });
    } catch {}
  } else {
    serverQueue.textChannel.send({
      embeds: [nowPlayingEmbed(song)],
      components: [controlButtons()],
    }).then(msg => (serverQueue.currentSongMessage = msg));
  }
}

function skip(message) {
  const serverQueue = queue.get(message.guild.id);
  if (!message.member.voice.channel) return message.channel.send('You must be in a voice channel to skip!');
  if (!serverQueue) return message.channel.send('There is no song to skip!');
  serverQueue.dispatcher.end();
  message.channel.send('⏭ Skipped the song!');
}

function stop(message) {
  const serverQueue = queue.get(message.guild.id);
  if (!message.member.voice.channel) return message.channel.send('You must be in a voice channel to stop!');
  if (!serverQueue) return message.channel.send('There is no song to stop!');
  serverQueue.songs = [];
  serverQueue.dispatcher.end();
  message.channel.send('⏹ Stopped the music and cleared the queue.');
}

function pauseResume(interaction) {
  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue) return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });

  if (serverQueue.playing) {
    serverQueue.dispatcher.pause(true);
    serverQueue.playing = false;
    interaction.reply('⏸ Music paused.');
  } else {
    serverQueue.dispatcher.resume();
    serverQueue.playing = true;
    interaction.reply('▶ Music resumed.');
  }
}

function volumeUp(interaction) {
  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue) return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });

  if (serverQueue.volume < 10) {
    serverQueue.volume++;
    serverQueue.dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    interaction.reply(`🔊 Volume increased to ${serverQueue.volume}`);
  } else {
    interaction.reply('Volume is already at max!');
  }
}

function volumeDown(interaction) {
  const serverQueue = queue.get(interaction.guild.id);
  if (!serverQueue) return interaction.reply({ content: 'No music is currently playing!', ephemeral: true });

  if (serverQueue.volume > 0) {
    serverQueue.volume--;
    serverQueue.dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    interaction.reply(`🔉 Volume decreased to ${serverQueue.volume}`);
  } else {
    interaction.reply('Volume is already at minimum!');
  }
}

module.exports = {
  execute,
  skip,
  stop,
  pauseResume,
  volumeUp,
  volumeDown,
};
