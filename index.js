// === REQUIRES AU DÉBUT ===
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const express = require('express');
require('dotenv').config();

// === SETUP EXPRESS (POUR FAIRE TOURNER SUR RENDER PAR EXEMPLE) ===
const app = express();
app.get('/', (req, res) => {
  res.send('Bot opérationnel.');
});
app.listen(3000, () => {
  console.log('Express en ligne !');
});

// === VARIABLES ===
const PREFIX = '+'; // Ton préfixe
let money = {}; // Système d'argent simple
let snipe = null; // Pour la commande snipe
const lastErrors = {}; // Garder une trace des erreurs récentes

// === SETUP CLIENT DISCORD ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// === ÉVÉNEMENTS CLIENT ===
client.on('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

// Pour sauver le dernier message supprimé (pour ?snipe)
client.on('messageDelete', message => {
  snipe = {
    content: message.content,
    author: message.author
  };
});

// === COMMANDES ===
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith(PREFIX) || message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();

  const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || message.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

  // Fonction pour gérer les erreurs de manière unique
  const sendErrorOnce = (errorMessage) => {
    if (!lastErrors[message.author.id] || Date.now() - lastErrors[message.author.id] > 5000) {
      message.reply(errorMessage);
      lastErrors[message.author.id] = Date.now();
    }
  };

  // LOCK / UNLOCK
  if (cmd === 'lock') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
    message.reply('Salon verrouillé. Les membres ne peuvent plus parler.');
  } else if (cmd === 'unlock') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: true });
    message.reply('Salon déverrouillé. Les membres peuvent reparler.');
  }

  // BAN / DBAN / KICK
  else if (cmd === 'ban') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const user = message.mentions.members.first();
    if (!user) return sendErrorOnce('Mentionne un utilisateur.');
    user.ban().then(() => message.reply(`${user.user.tag} a été banni.`));
  } else if (cmd === 'dban') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const userID = args[0];
    if (!userID) return sendErrorOnce('Donne un ID.');
    message.guild.members.unban(userID).then(() => message.reply(`ID ${userID} débanni.`));
  } else if (cmd === 'kick') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const user = message.mentions.members.first();
    if (!user) return sendErrorOnce('Mentionne un utilisateur.');
    user.kick().then(() => message.reply(`${user.user.tag} a été kick.`));
  }

  // MUTE / DMUTE
  else if (cmd === 'mute') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const member = message.mentions.members.first();
    if (!member) return sendErrorOnce('Mentionne un utilisateur.');
    const role = message.guild.roles.cache.find(r => r.name === 'muted') ||
      await message.guild.roles.create({ name: 'muted', permissions: [] });
    message.guild.channels.cache.forEach(c => c.permissionOverwrites.edit(role, { SendMessages: false }));
    member.roles.add(role);
    message.reply(`${member.user.tag} est muté pour 1h.`);
    setTimeout(() => member.roles.remove(role), 3600000); // 1h en ms
  } else if (cmd === 'dmute') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const member = message.mentions.members.first();
    if (!member) return sendErrorOnce('Mentionne un utilisateur.');
    const role = message.guild.roles.cache.find(r => r.name === 'muted');
    if (role) member.roles.remove(role);
    message.reply(`${member.user.tag} n'est plus muet.`);
  }

  // SNIPE
  else if (cmd === 'snipe') {
    if (!snipe) return sendErrorOnce('Aucun message supprimé.');
    message.channel.send(`Dernier message supprimé :\n**${snipe.author.tag}**: ${snipe.content}`);
  }

  // ANNONCE
  else if (cmd === 'annonce') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const text = args.join(' ');
    if (!text) return sendErrorOnce('Tu dois écrire un message.');
    message.channel.send(text);
  }

  // ROLE AJOUTER / ENLEVER
  else if (cmd === 'role' && args[0] === 'ajouter') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const user = message.mentions.members.first();
    const roleName = args.slice(2).join(' ');
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (user && role) {
      user.roles.add(role);
      message.reply(`Rôle ${roleName} ajouté à ${user.user.tag}.`);
    }
  } else if (cmd === 'role' && args[0] === 'enlever') {
    if (!isAdmin) return sendErrorOnce("Tu n'as pas la permission d'utiliser cette commande.");
    const user = message.mentions.members.first();
    const roleName = args.slice(2).join(' ');
    const role = message.guild.roles.cache.find(r => r.name === roleName);
    if (user && role) {
      user.roles.remove(role);
      message.reply(`Rôle ${roleName} retiré à ${user.user.tag}.`);
    }
  }

  // ARGENT
  else if (cmd === 'argent' && args.length === 0) {
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

// === CONNECTION DU CLIENT ===
client.login(process.env.TOKEN);
