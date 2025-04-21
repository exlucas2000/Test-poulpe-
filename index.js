require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

let snipe = null;
let economy = {};

const ECONOMY_FILE = 'economy.json';

// Charger économie si existe
if (fs.existsSync(ECONOMY_FILE)) {
  economy = JSON.parse(fs.readFileSync(ECONOMY_FILE, 'utf-8'));
}

function saveEconomy() {
  fs.writeFileSync(ECONOMY_FILE, JSON.stringify(economy, null, 2));
}

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageDelete', (msg) => {
  if (!msg.author?.bot) {
    snipe = msg;
  }
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const cmd = args.shift()?.toLowerCase();

  const member = message.member;

  // Lock / Unlock
  if (cmd === 'lock') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: false
    });
    message.channel.send('Salon verrouillé.');
  }

  if (cmd === 'unlock') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
      SendMessages: true
    });
    message.channel.send('Salon déverrouillé.');
  }

  // Ban / Déban
  if (cmd === 'ban') {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un membre.');
    await user.ban();
    message.channel.send(`${user.user.tag} banni.`);
  }

  if (cmd === 'dban') {
    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
    const userId = args[0];
    if (!userId) return message.reply('Donne l’ID.');
    await message.guild.bans.remove(userId);
    message.channel.send(`Débanni ${userId}`);
  }

  // Kick
  if (cmd === 'kick') {
    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un membre.');
    await user.kick();
    message.channel.send(`${user.user.tag} kické.`);
  }

  // Snipe
  if (cmd === 'snipe') {
    if (!snipe) return message.channel.send('Rien à snip.');
    message.channel.send(`Dernier message supprimé : ${snipe.content} - par ${snipe.author.tag}`);
  }

  // Annonce
  if (cmd === 'annonce') {
    const text = args.join(' ');
    if (!text) return message.reply('Écris ton annonce.');
    message.delete();
    message.channel.send(text);
  }

  // Mute / Demute
  if (cmd === 'mute') {
    if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un membre.');
    await user.timeout(60 * 60 * 1000); // 1h
    message.channel.send(`${user.user.tag} mute 1h`);
  }

  if (cmd === 'dmute') {
    if (!member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return;
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un membre.');
    await user.timeout(null); // Démute
    message.channel.send(`${user.user.tag} démuté.`);
  }

  // Role ajouter / enlever
  if (cmd === 'role') {
    const action = args[0];
    const user = message.mentions.members.first();
    const roleName = args.slice(2).join(' ');
    const role = message.guild.roles.cache.find(r => r.name === roleName);

    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return;
    if (!user || !role) return message.reply('Utilisation: ?role ajouter/enlever @user NomDuRole');

    if (action === 'ajouter') {
      await user.roles.add(role);
      message.channel.send(`Rôle ajouté à ${user.user.tag}`);
    } else if (action === 'enlever') {
      await user.roles.remove(role);
      message.channel.send(`Rôle retiré à ${user.user.tag}`);
    } else {
      message.reply('Utilise ajouter ou enlever.');
    }
  }

  // Économie : afficher / ajouter / enlever
  const target = message.mentions.users.first() || message.author;
  const userId = target.id;
  economy[userId] = economy[userId] || 0;

  if (cmd === 'argent') {
    message.channel.send(`${target.username} a ${economy[userId]}€`);
  }

  if (cmd === 'argent' && args[0] === 'ajouter') {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const amount = parseInt(args[2]);
    if (!args[1] || isNaN(amount)) return message.reply('Utilise: ?argent ajouter @user montant');
    const user = message.mentions.users.first();
    economy[user.id] = (economy[user.id] || 0) + amount;
    saveEconomy();
    message.channel.send(`${amount}€ ajouté à ${user.username}`);
  }

  if (cmd === 'argent' && args[0] === 'enlever') {
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const amount = parseInt(args[2]);
    if (!args[1] || isNaN(amount)) return message.reply('Utilise: ?argent enlever @user montant');
    const user = message.mentions.users.first();
    economy[user.id] = Math.max(0, (economy[user.id] || 0) - amount);
    saveEconomy();
    message.channel.send(`${amount}€ retiré à ${user.username}`);
  }
});

client.login(process.env.TOKEN);
