require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;

  if (message.content.startsWith('?ban')) {
    if (!message.member.permissions.has('BanMembers')) return message.reply('Tu ne peux pas bannir.');
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un utilisateur.');
    await user.ban();
    message.channel.send(`${user.user.tag} a été banni.`);
  }

  if (message.content.startsWith('?kick')) {
    if (!message.member.permissions.has('KickMembers')) return message.reply('Tu ne peux pas kick.');
    const user = message.mentions.members.first();
    if (!user) return message.reply('Mentionne un utilisateur.');
    await user.kick();
    message.channel.send(`${user.user.tag} a été kick.`);
  }

  if (message.content.startsWith('?clear')) {
    if (!message.member.permissions.has('ManageMessages')) return message.reply('Tu ne peux pas clear.');
    const args = message.content.split(' ');
    const count = parseInt(args[1]);
    if (!count || count < 1 || count > 100) return message.reply('Choisis entre 1 et 100.');
    const messages = await message.channel.bulkDelete(count, true);
    message.channel.send(`J’ai supprimé ${messages.size} messages.`).then(msg => setTimeout(() => msg.delete(), 3000));
  }
});

client.login(process.env.TOKEN);
