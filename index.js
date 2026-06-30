const { Client, GatewayIntentBits, ActionRowBuilder,
        ButtonBuilder, ButtonStyle, Events,
        StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
        ModalBuilder, TextInputBuilder, TextInputStyle,
        ChannelType, PermissionFlagsBits } = require('discord.js');
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

// ─── Config tickets donjon ────────────────────────────────────────
const TICKET_CATEGORY_ID = '1521427740341964840';
const PASSEUR_ROLE_NAME  = 'Passeur donjon';
const DONJON_COMMAND     = '!donjonbutton';

const CLASSES = [
  'Iop', 'Crâ', 'Eniripsa', 'Féca', 'Ecaflip', 'Sadida',
  'Sacrieur', 'Xélor', 'Osamodas', 'Pandawa', 'Roublard',
  'Zobal', 'Steamer'
];

client.once(Events.ClientReady, c => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
});

// ─── Commande !pingbutton → boutons perco ────────────────────────
client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  if (message.content === COMMAND) {
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
    return;
  }

  // ─── Commande !donjonbutton → bouton ticket donjon ──────────────
  if (message.content === DONJON_COMMAND) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('❌ Tu n\'as pas la permission.');
    }

    const buttonDonjon = new ButtonBuilder()
      .setCustomId('donjon_ticket')
      .setLabel('🗝️ Demander un passage donjon')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(buttonDonjon);

    await message.channel.send({
      content: '🗝️ **Besoin d\'un passage donjon ?**\nClique sur le bouton ci-dessous pour faire ta demande :',
      components: [row],
    });
    return;
  }
});

client.on(Events.InteractionCreate, async interaction => {

  // ── Bouton compo (perco) ──
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
    return;
  }

  // ── Bouton ping rapide (perco) ──
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
    return;
  }

  // ── Menu sélection classes (perco) ──
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
    return;
  }

  // ── Bouton demande donjon → ouvre modal ──
  if (interaction.isButton() && interaction.customId === 'donjon_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('modal_donjon_ticket')
      .setTitle('🗝️ Demande de passage donjon');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nom_donjon')
          .setLabel('Quel donjon ?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('nb_perso')
          .setLabel('Nombre de personnages')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );

    await interaction.showModal(modal);
    return;
  }

  // ── Bouton fermer ticket ──
  if (interaction.isButton() && interaction.customId === 'fermer_ticket') {
    await interaction.reply({ content: '🔒 Fermeture du ticket dans 5 secondes...' });
    setTimeout(() => {
      interaction.channel.delete().catch(() => {});
    }, 5000);
    return;
  }

  // ── Modal submit ticket donjon → crée le salon ──
  if (interaction.isModalSubmit() && interaction.customId === 'modal_donjon_ticket') {
    const donjon = interaction.fields.getTextInputValue('nom_donjon');
    const nbPerso = interaction.fields.getTextInputValue('nb_perso');

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const passeurRole = guild.roles.cache.find(r => r.name === PASSEUR_ROLE_NAME);

    if (!passeurRole) {
      return interaction.editReply({ content: `❌ Rôle "${PASSEUR_ROLE_NAME}" introuvable sur le serveur.` });
    }

    const channelName = `donjon-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
        {
          id: passeurRole.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
        },
      ],
    });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('fermer_ticket')
        .setLabel('🔒 Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content:
        `🗝️ **Nouvelle demande de passage donjon**\n\n` +
        `👤 **Demandeur :** ${interaction.user}\n` +
        `🏰 **Donjon :** ${donjon}\n` +
        `👥 **Nombre de personnages :** ${nbPerso}\n\n` +
        `<@&${passeurRole.id}> un passeur est demandé !`,
      components: [closeButton],
    });

    await interaction.editReply({ content: `✅ Ton ticket a été créé ici : ${ticketChannel}` });
    return;
  }
});

client.login(process.env.BOT_TOKEN);