const { Client, GatewayIntentBits, ActionRowBuilder,
        ButtonBuilder, ButtonStyle, Events,
        StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const ROLE_ID    = process.env.ROLE_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const BUTTON_ID  = 'ping_role_button';
const MENU_ID    = 'classe_select';
const COMMAND    = '!pingbutton';

const CLASSES = [
  'Iop', 'Crâ', 'Eniripsa', 'Féca', 'Ecaflip', 'Sadida',
  'Sacrieur', 'Xélor', 'Osamodas', 'Pandawa', 'Roublard',
  'Zobal', 'Steamer'
];

client.once(Events.ClientReady, c => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (message.content !== COMMAND) return;

  if (!message.member.permissions.has('Administrator')) {
    return message.reply('❌ Tu n\'as pas la permission.');
  }

  const buttonCompo = new ButtonBuilder()
    .setCustomId(BUTTON_ID)
    .setLabel('⚔️ Perco attaqué + compo')
    .setStyle(ButtonStyle.Danger);

  const buttonRapide = new ButtonBuilder()
    .setCustomId('ping_rapide')
    .setLabel('🔔 Ping rapide')
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder().addComponents(buttonCompo, buttonRapide);

  await message.channel.send({
    content: '🔴 Un percepteur est en danger ?',
    components: [row],
  });
});

client.on(Events.InteractionCreate, async interaction => {

  // Bouton compo
  if (interaction.isButton() && interaction.customId === BUTTON_ID) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(MENU_ID)
      .setPlaceholder('Sélectionne les classes ennemies...')
      .setMinValues(1)
      .setMaxValues(8)
      .addOptions(
        CLASSES.map(classe =>
          new StringSelectMenuOptionBuilder()
            .setLabel(classe)
            .setValue(classe.toLowerCase())
        )
      );

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      content: '⚔️ Sélectionne la composition ennemie :',
      components: [row],
      ephemeral: true,
    });
  }

  // Bouton ping rapide
  if (interaction.isButton() && interaction.customId === 'ping_rapide') {
    const channel = await interaction.guild.channels.fetch(CHANNEL_ID);

    const alertMsg = await channel.send(
      `<@&${ROLE_ID}>\n` +
      `⚔️ **PERCO ATTAQUÉ !**\n` +
      `🛡️ Go def les EZ !`
    );

    setTimeout(() => {
      alertMsg.delete().catch(() => {});
    }, 30 * 60 * 1000);

    await interaction.reply({
      content: '✅ Ping rapide envoyé !',
      ephemeral: true,
    });
  }

  // Menu sélection classes
  if (interaction.isStringSelectMenu() && interaction.customId === MENU_ID) {
    const compo = interaction.values
      .map(v => v.charAt(0).toUpperCase() + v.slice(1))
      .join(' | ');

    const channel = await interaction.guild.channels.fetch(CHANNEL_ID);

    const alertMsg = await channel.send(
      `<@&${ROLE_ID}>\n` +
      `⚔️ **PERCO ATTAQUÉ !**\n` +
      `👥 **Composition ennemie :** ${compo}\n` +
      `🛡️ Go def les EZ !`
    );

    setTimeout(() => {
      alertMsg.delete().catch(() => {});
    }, 30 * 60 * 1000);

    await interaction.reply({
      content: '✅ Alerte envoyée !',
      ephemeral: true,
    });
  }
});

client.login(process.env.BOT_TOKEN);