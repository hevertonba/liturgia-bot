const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// --- 1. CONFIGURAÇÃO DE UI/UX E BRANDING ---
const SITE_URL = 'https://instagram.com/liturgia.br'; // Troque para o seu site oficial quando lançar
const LOGO_URL = 'https://instagram.ffec3-1.fna.fbcdn.net/v/t51.82787-19/650127290_17880257589493149_8847861152074275433_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.ffec3-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2gEc03KmL6NFRMf9kuy1R4ZZKrbG_CbciWDsYi3wPsTUDH0Rg1eOPvfmmE1di9BYGFQ&_nc_ohc=Voxi9uRlUfkQ7kNvwFQ7kKR&_nc_gid=67YVquBW6FDeqh5opSFWOw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfwOfWZeujUAIHEx3YPhyRqrGaSYVhQWgV0iijc3cnqWPg&oe=69C762E3&_nc_sid=7a9f4b'; // Suba sua logo no Imgur e cole aqui

const obterTemaLiturgico = (liturgiaTexto) => {
    const texto = liturgiaTexto.toLowerCase();
    if (texto.includes('verde')) return { cor: '#22c55e', emoji: '🌿' };
    if (texto.includes('roxo')) return { cor: '#9333ea', emoji: '💜' };
    if (texto.includes('vermelho')) return { cor: '#dc2626', emoji: '🩸' };
    if (texto.includes('branco') || texto.includes('solenidade')) return { cor: '#ffffff', emoji: '✨' };
    if (texto.includes('rosa')) return { cor: '#f472b6', emoji: '🌸' };
    return { cor: '#2f3136', emoji: '📖' }; // Padrão
};

// --- 2. COMANDOS SLASH (Módulo de Comandos) ---
const commands = [
    new SlashCommandBuilder()
        .setName('liturgia')
        .setDescription('Acesse a liturgia diária com formatação premium.')
].map(command => command.toJSON());

// --- 3. MOTOR DE BUSCA E MONTAGEM DO EMBED ---
async function construirInterfaceLiturgia() {
    try {
        const resposta = await fetch('https://liturgia.up.railway.app/');
        if (!resposta.ok) throw new Error('Falha na resposta do servidor litúrgico.');
        const dados = await resposta.json();

        const tema = obterTemaLiturgico(dados.liturgia);
        const limitar = (txt, max = 950) => txt && txt.length > max ? txt.substring(0, max) + "...\n\n*[Continue lendo no site]*" : txt;

        // Construção do Embed Principal
        const embed = new EmbedBuilder()
            .setColor(tema.cor)
            .setAuthor({ name: 'liturgia.br', iconURL: LOGO_URL, url: SITE_URL })
            .setTitle(`${tema.emoji} Liturgia Diária • ${dados.data}`)
            .setDescription(`**${dados.liturgia}**\n*Reserve um momento de silêncio para a Palavra.*`)
            // Você pode adicionar uma imagem de banner aqui se quiser:
            // .setImage('URL_DE_UM_BANNER_BOM_DIA.png') 
            .addFields(
                { 
                    name: `\n📕 Primeira Leitura`, 
                    value: `**${dados.primeiraLeitura.referencia}**\n> ${limitar(dados.primeiraLeitura.texto).replace(/\n/g, '\n> ')}` 
                },
                { 
                    name: `\n🎵 Salmo Responsorial`, 
                    value: `**${dados.salmo.referencia}**\n**R. ${dados.salmo.refrao}**\n> ${limitar(dados.salmo.texto, 400).replace(/\n/g, '\n> ')}` 
                }
            );

        // Renderiza a Segunda Leitura dinamicamente
        if (dados.segundaLeitura && dados.segundaLeitura.texto) {
            embed.addFields({ 
                name: `\n📗 Segunda Leitura`, 
                value: `**${dados.segundaLeitura.referencia}**\n> ${limitar(dados.segundaLeitura.texto).replace(/\n/g, '\n> ')}` 
            });
        }

        // Evangelho em destaque
        embed.addFields({ 
            name: `\n✝️ Evangelho`, 
            value: `**${dados.evangelho.referencia}**\n> ${limitar(dados.evangelho.texto).replace(/\n/g, '\n> ')}` 
        })
        .setFooter({ text: 'Design e Automação por verton.lab', iconURL: LOGO_URL })
        .setTimestamp();

        // Construção dos Botões (Action Row)
        const botoes = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ler Completo no Site')
                    .setURL(SITE_URL)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐'),
                new ButtonBuilder()
                    .setLabel('Apoiar o Projeto')
                    .setURL('https://sua-chave-pix-ou-apoia-se.com') // Coloque seu link de apoio
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('☕')
            );

        return { embeds: [embed], components: [botoes] };

    } catch (erro) {
        console.error("Erro no motor:", erro);
        // Retorna um Embed de erro elegante ao invés de texto puro
        const erroEmbed = new EmbedBuilder()
            .setColor('#dc2626')
            .setTitle('⚠️ Indisponibilidade Temporária')
            .setDescription('Não foi possível conectar ao lecionário no momento. Tente novamente em alguns minutos.');
        return { embeds: [erroEmbed] };
    }
}

// --- 4. INICIALIZAÇÃO E CRON ---
client.once('ready', async () => {
    console.log(`✅ Sistema Operacional: ${client.user.tag} online.`);

    // Registra os Slash Commands
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('🚀 Interface de Slash Commands atualizada.');
    } catch (error) {
        console.error('Falha ao registrar comandos:', error);
    }

    // Rotina Matinal Automática (07:00 da manhã)
    cron.schedule('0 7 * * *', async () => {
        const payload = await construirInterfaceLiturgia();
        
        client.guilds.cache.forEach(guild => {
            const canal = guild.channels.cache.find(c => c.name === 'liturgia' || c.name === 'geral');
            if (canal && canal.isTextBased()) {
                canal.send({ content: "## ☀️ Bom dia, comunidade!\n*A liturgia de hoje já está disponível para leitura.*", ...payload });
            }
        });
    }, { timezone: "America/Sao_Paulo" });
});

// --- 5. INTERAÇÃO COM USUÁRIO ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'liturgia') {
        // Mostra o status "Pensando..." no Discord
        await interaction.deferReply(); 

        // Puxa a UI construída e envia
        const payload = await construirInterfaceLiturgia();
        await interaction.editReply(payload);
    }
});

client.login(process.env.TOKEN);
