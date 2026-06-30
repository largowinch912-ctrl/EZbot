const { Client, GatewayIntentBits, ActionRowBuilder,
        ButtonBuilder, ButtonStyle, Events, Partials,
        StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
        ModalBuilder, TextInputBuilder, TextInputStyle,
        ChannelType, PermissionFlagsBits,
        REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();
const mongoose = require('mongoose');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const ROLE_ID    = process.env.ROLE_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const BUTTON_ID  = 'ping_role_button';
const MENU_ID    = 'classe_select';
const COMMAND    = '!pingbutton';

// ─── Config tickets donjon ────────────────────────────────────────
const TICKET_CATEGORY_ID = '1521427740341964840';
const PASSEUR_ROLE_NAME  = 'Passeur Donjon';
const DONJON_COMMAND     = '!donjonbutton';

// ─── Config event PvP kills perco ─────────────────────────────────
const KILL_CHANNEL_ID = '1470066386150752457';
const VALIDATION_EMOJI = '✅';
const BONUS_EMOJI = '🔥';

const CLASSES = [
  'Iop', 'Crâ', 'Eniripsa', 'Féca', 'Ecaflip', 'Sadida',
  'Sacrieur', 'Xélor', 'Osamodas', 'Pandawa', 'Roublard',
  'Zobal', 'Steamer'
];

// ─── MongoDB Schemas ────────────────────────────────────────────────
const killSchema = new mongoose.Schema({
  userId: String,
  username: String,
  kills: { type: Number, default: 0 },
});
const Kill = mongoose.model('Kill', killSchema);

const configSchema = new mongoose.Schema({
  _id: { type: String, default: 'classement_message' },
  channelId: String,
  messageId: String,
});
const Config = mongoose.model('Config', configSchema);

async function addKill(userId, username, points = 1) {
  let entry = await Kill.findOne({ userId });
  if (!entry) entry = await Kill.create({ userId, username, kills: 0 });
  entry.kills += points;
  entry.username = username;
  await entry.save();
  return entry.kills;
}

async function removeKill(userId, points = 1) {
  const entry = await Kill.findOne({ userId });
  if (!entry || entry.kills <= 0) return 0;
  entry.kills = Math.max(0, entry.kills - points);
  await entry.save();
  return entry.kills;
}

async function getClassement() {
  return Kill.find({ kills: { $gt: 0 } }).sort({ kills: -1 }).limit(15);
}

async function resetClassement() {
  await Kill.deleteMany({});
}

function buildClassementText(top) {
  let msg = '🏆 **Classement de la semaine — Chasse aux percepteurs**\n\n';
  if (top.length === 0) {
    msg += 'Aucune kill validée pour le moment.';
  } else {
    const medals = ['🥇', '🥈', '🥉'];
    top.forEach((e, i) => {
      msg += `${medals[i] || `${i + 1}.`} **${e.username}** — ${e.kills} kills\n`;
    });
  }
  msg += '\n🔄 Reset automatique chaque mardi à 13h.';
  return msg;
}

// ─── Met à jour le message live du classement ─────────────────────
async function updateLiveClassement() {
  const config = await Config.findById('classement_message');
  if (!config) return;

  try {
    const channel = await client.channels.fetch(config.channelId);
    const message = await channel.messages.fetch(config.messageId);
    const top = await getClassement();
    await message.edit(buildClassementText(top));
  } catch (err) {
    console.error('Impossible de mettre à jour le classement live:', err.message);
  }
}

// ─── Reset hebdo automatique : mardi 13h ──────────────────────────
function msUntilNextTuesday13h() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(13, 0, 0, 0);
  const day = now.getDay();
  let diff = (2 - day + 7) % 7;
  if (diff === 0 && now >= target) diff = 7;
  target.setDate(now.getDate() + diff);
  return target.getTime() - now.getTime();
}

function scheduleWeeklyReset() {
  const delay = msUntilNextTuesday13h();
  setTimeout(async () => {
    try {
      const channel = await client.channels.fetch(KILL_CHANNEL_ID);
      const top = await getClassement();
      let msg = '🏆 **Fin de l\'event hebdomadaire — Classement final !**\n\n';
      if (top.length === 0) {
        msg += 'Aucune kill enregistrée cette semaine.';
      } else {
        const medals = ['🥇', '🥈', '🥉'];
        top.forEach((e, i) => {
          msg += `${medals[i] || `${i + 1}.`} **${e.username}** — ${e.kills} kills\n`;
        });
      }
      await channel.send(msg);
      await resetClassement();
      await updateLiveClassement();
      await channel.send('🔄 Le classement a été réinitialisé. Nouvel event en cours !');
    } catch (err) {
      console.error('Erreur reset hebdo:', err);
    }
    scheduleWeeklyReset();
  }, delay);
}

// ─── Slash commands ───────────────────────────────────────────────
async function registerSlashCommand() {
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('classement').setDescription('Affiche le classement live des kills de percepteurs'),
    new SlashCommandBuilder().setName('reset-classement').setDescription('Réinitialise manuellement le classement (admin)'),
  ].map(c => c.toJSON());
  const guilds = client.guilds.cache.map(g => g.id);
  for (const guildId of guilds) {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
  }
}

client.once(Events.ClientReady, async c => {
  console.log(`✅ Connecté en tant que ${c.user.tag}`);
  registerSlashCommand().catch(console.error);
  scheduleWeeklyReset();
});

// ─── Commande !pingbutton / !donjonbutton ─────────────────────────
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

// ─── Réaction ✅ sur un screenshot dans le salon kills ────────────
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channelId !== KILL_CHANNEL_ID) return;
  if (![VALIDATION_EMOJI, BONUS_EMOJI].includes(reaction.emoji.name)) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    console.error('Erreur fetch reaction:', err);
    return;
  }

  if (reaction.message.author.bot) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  const isAdmin = member?.permissions.has('Administrator');
  if (!isAdmin) return;

const points = reaction.emoji.name === BONUS_EMOJI ? 2 : 1;

// Récupère l'auteur + tous les joueurs mentionnés dans le message
const players = new Map();
players.set(reaction.message.author.id, reaction.message.author.username);
reaction.message.mentions.users.forEach(u => {
  if (!u.bot) players.set(u.id, u.username);
});

let recap = '';
for (const [playerId, playerName] of players) {
  const total = await addKill(playerId, playerName, points);
  recap += `${playerName} : +${points} (total ${total})\n`;
}

await user.send(`✅ Points attribués :\n${recap}`).catch(() => {});
await updateLiveClassement();

});

// ─── Retrait de la réaction = annule la kill ──────────────────────
client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;
  if (reaction.message.channelId !== KILL_CHANNEL_ID) return;
  if (![VALIDATION_EMOJI, BONUS_EMOJI].includes(reaction.emoji.name)) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (reaction.message.partial) await reaction.message.fetch();
  } catch (err) {
    console.error('Erreur fetch reaction:', err);
    return;
  }

  if (reaction.message.author.bot) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  const isAdmin = member?.permissions.has('Administrator');
  if (!isAdmin) return;

const points = reaction.emoji.name === BONUS_EMOJI ? 2 : 1;

const players = new Map();
players.set(reaction.message.author.id, reaction.message.author.username);
reaction.message.mentions.users.forEach(u => {
  if (!u.bot) players.set(u.id, u.username);
});

for (const [playerId] of players) {
  await removeKill(playerId, points);
}

await updateLiveClassement();

});

client.on(Events.InteractionCreate, async interaction => {

  // ── /reset-classement ──
  if (interaction.isChatInputCommand() && interaction.commandName === 'reset-classement') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Tu n\'as pas la permission.', ephemeral: true });
    }
    await resetClassement();
    await updateLiveClassement();
    await interaction.reply({ content: '🔄 Le classement a été réinitialisé manuellement !' });
    return;
  }

  // ── /classement (crée ou rattache le message live) ──
  if (interaction.isChatInputCommand() && interaction.commandName === 'classement') {
    const top = await getClassement();
    const text = buildClassementText(top);

    const sentMessage = await interaction.reply({ content: text, fetchReply: true });

    await Config.findByIdAndUpdate(
      'classement_message',
      { channelId: interaction.channelId, messageId: sentMessage.id },
      { upsert: true }
    );
    return;
  }

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
    setTimeout(() => { alertMsg.delete().catch(() => {}); }, 30 * 60 * 1000);
    await interaction.reply({ content: '✅ Ping rapide envoyé !', ephemeral: true });
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
    setTimeout(() => { alertMsg.delete().catch(() => {}); }, 30 * 60 * 1000);
    await interaction.reply({ content: '✅ Alerte envoyée !', ephemeral: true });
    return;
  }

  // ── Bouton demande donjon → ouvre modal ──
  if (interaction.isButton() && interaction.customId === 'donjon_ticket') {
    const modal = new ModalBuilder()
      .setCustomId('modal_donjon_ticket')
      .setTitle('🗝️ Demande de passage donjon');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nom_donjon').setLabel('Quel donjon ?').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nb_perso').setLabel('Nombre de personnages').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
    await interaction.showModal(modal);
    return;
  }

  // ── Bouton fermer ticket ──
  if (interaction.isButton() && interaction.customId === 'fermer_ticket') {
    await interaction.reply({ content: '🔒 Fermeture du ticket dans 5 secondes...' });
    setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
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
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: passeurRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ],
    });

    const closeButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fermer_ticket').setLabel('🔒 Fermer le ticket').setStyle(ButtonStyle.Danger)
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

// ─── Connexion MongoDB puis Discord ──────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    client.login(process.env.BOT_TOKEN);
  })
  .catch(err => console.error('❌ Erreur MongoDB:', err));