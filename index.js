const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const express = require('express');
const app = express();
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel]
});

const PREFIX = '+';
let snipe = null;
let money = {};

if (fs.existsSync('./money.json')) {
  money = JSON.parse(fs.readFileSync('./money.json'));
}

client.on('messageDelete', (msg) => {
  snipe = msg;
});

client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  // LOCK / UNLOCK
  if (cmd === 'lock') {
    message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
    message.reply('Salon verrouillé.');
  } else if (cmd === 'unlock') {
    message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
    message.reply('Salon déverrouillé.');
  }

  // BAN / DBAN / KICK
  else if (cmd === 'ban') {
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un utilisateur.');
    user.ban().then(() => message.reply(`${user.user.tag} a été banni.`));
  } else if (cmd === 'dban') {
    const userID = args[0];
    if (!userID) return message.reply('Donne un ID.');
    message.guild.members.unban(userID).then(() => message.reply(`ID ${userID} débanni.`));
  } else if (cmd === 'kick') {
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un utilisateur.');
    user.kick().then(() => message.reply(`${user.user.tag} a été kick.`));
  }

  // MUTE / DMUTE
  else if (cmd === 'mute') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mentionne un utilisateur.');
    const role = message.guild.roles.cache.find(r => r.name === 'muted') ||
      await message.guild.roles.create({ name: 'muted', permissions: [] });
    message.guild.channels.cache.forEach(c => c.permissionOverwrites.edit(role, { SendMessages: false }));
    member.roles.add(role);
    message.reply(`${member.user.tag} est muté pour 1h.`);
    setTimeout(() => member.roles.remove(role), 3600000);
  } else if (cmd === 'dmute') {
    const member = message.mentions.members.first();
    if (!member) return message.reply('Mentionne un utilisateur.');
    const role = message.guild.roles.cache.find(r => r.name === 'muted');
    if (role) member.roles.remove(role);
    message.reply(`${member.user.tag} n'est plus muet.`);
  }

  // SNIPE
  else if (cmd === 'snipe') {
    if (!snipe) return message.reply('Aucun message supprimé.');
    message.channel.send(`Dernier message supprimé :\n**${snipe.author.tag}**: ${snipe.content}`);
  }

  // ANNONCE
  else if (cmd === 'annonce') {
    const text = args.join(' ');
    if (!text) return message.reply('Tu dois écrire un message.');
    message.channel.send(text);
  }

  // ROLE AJOUTER / ENLEVER
  else if (cmd === 'role' && args[0] === 'ajouter') {
    const user = message.mentions.members.first();
    const roleName = args.slice(2).join(' ');
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (user && role) {
      user.roles.add(role);
      message.reply(`Rôle ${roleName} ajouté à ${user.user.tag}.`);
    }
  } else if (cmd === 'role' && args[0] === 'enlever') {
    const user = message.mentions.members.first();
    const roleName = args.slice(2).join(' ');
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (user && role) {
      user.roles.remove(role);
      message.reply(`Rôle ${roleName} retiré à ${user.user.tag}.`);
    }
  }

  // ARGENT
  else if (cmd === 'argent') {
    const target = message.mentions.users.first() || message.author;
    if (!money[target.id]) money[target.id] = 0;
    message.reply(`${target.username} a ${money[target.id]}€.`);
  } else if (cmd === 'argent' && args[0] === 'ajouter') {
    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (user && !isNaN(amount)) {
      money[user.id] = (money[user.id] || 0) + amount;
      fs.writeFileSync('./money.json', JSON.stringify(money));
      message.reply(`${amount}€ ajoutés à ${user.username}.`);
    }
  } else if (cmd === 'argent' && args[0] === 'enlever') {
    const user = message.mentions.users.first();
    const amount = parseInt(args[2]);
    if (user && !isNaN(amount)) {
      money[user.id] = (money[user.id] || 0) - amount;
      fs.writeFileSync('./money.json', JSON.stringify(money));
      message.reply(`${amount}€ retirés à ${user.username}.`);
    }
  }
});

client.login(process.env.TOKEN);

// === KEEP ALIVE SERVER (pour Render Web Service) ===
app.get('/', (req, res) => {
  res.send('Bot is running!');
});
app.listen(process.env.PORT || 3000, () => {
  console.log('Keep-alive Express server running.');
});
