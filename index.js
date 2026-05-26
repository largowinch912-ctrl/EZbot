const { Client, GatewayIntentBits, ActionRowBuilder,
        ButtonBuilder, ButtonStyle, Events } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const ROLE_ID     = process.env.ROLE_ID;
const CHANNEL_ID  = process.env.CHANNEL_ID;
const BUTTON_ID   = 'ping_role_button';
const COMMAND     = '!pingbutton';

client.once(Events.ClientReady, c => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content !== COMMAND) return;

  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Tu n\'as pas la permission.');
  }

  const button = new ButtonBuilder()
    .setCustomId(BUTTON_ID)
    .setLabel('⚔️ Ping le rôle')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(button);

  await message.channel.send({
    content: 'Clique pour notifier les membres du rôle :',
    components: [row],
  });
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== BUTTON_ID) return;

  const channel = await interaction.guild.channels.fetch(CHANNEL_ID);

  await channel.send(`<@&${ROLE_ID}> 📢 Go def les EZ !`);

  await interaction.reply({
    content: '✅ Rôle notifié !',
    ephemeral: true,
  });
});

client.login(process.env.BOT_TOKEN);