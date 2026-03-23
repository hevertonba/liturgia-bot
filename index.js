/**
 * 📖 LITURGIA.BR - DISCORD BOT (Versão Blindada Anti-Crash)
 * Desenvolvido por verton.lab
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

const CONFIG = {
    SITE_URL: 'https://liturgia-br.blogspot.com/p/liturgia.html',
    LOGO_URL: 'https://instagram.ffec3-1.fna.fbcdn.net/v/t51.82787-19/650127290_17880257589493149_8847861152074275433_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.ffec3-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2gEc03KmL6NFRMf9kuy1R4ZZKrbG_CbciWDsYi3wPsTUDH0Rg1eOPvfmmE1di9BYGFQ&_nc_ohc=Voxi9uRlUfkQ7kNvwFQ7kKR&_nc_gid=67YVquBW6FDeqh5opSFWOw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfwOfWZeujUAIHEx3YPhyRqrGaSYVhQWgV0iijc3cnqWPg&oe=69C762E3&_nc_sid=7a9f4b',
    API_URL: 'https://liturgia.up.railway.app/',
    HORARIO_BOM_DIA: '0 7 * * *', 
    TIMEZONE: 'America/Sao_Paulo',
    PIX_KEY: 'hss.contato.br@gmail.com'
};

const CacheSistema = {
    data: null,
    payload: null,
    obterDataDeHoje: () => new Date().toLocaleDateString('pt-BR', { timeZone: CONFIG.TIMEZONE }),
    verificar: function() {
        if (this.data === this.obterDataDeHoje() && this.payload !== null) return this.payload;
        return null;
    },
    salvar: function(novoPayload) {
        this.data = this.obterDataDeHoje();
        this.payload = novoPayload;
        console.log(`[CACHE] 💾 Nova liturgia salva em memória.`);
    }
};

const Design = {
    obterTema: (liturgiaTexto) => {
        if (!liturgiaTexto) return { cor: '#2f3136', emoji: '📖' };
        const texto = liturgiaTexto.toLowerCase();
        if (texto.includes('verde')) return { cor: '#22c55e', emoji: '🌿' };
        if (texto.includes('roxo')) return { cor: '#9333ea', emoji: '💜' };
        if (texto.includes('vermelho')) return { cor: '#dc2626', emoji: '🩸' };
        if (texto.includes('branco') || texto.includes('solenidade')) return { cor: '#ffffff', emoji: '✨' };
        if (texto.includes('rosa')) return { cor: '#f472b6', emoji: '🌸' };
        return { cor: '#2f3136', emoji: '📖' };
    },
    
    // Agora aceita um limite personalizado para evitar o crash dos 6000 caracteres
    formatarIntegral: (texto, limite) => {
        if (!texto || texto.trim() === "") return "> *Texto indisponível na API de hoje.*";
        let textoSeguro = texto.length > limite ? texto.substring(0, limite) + "...\n\n**[O texto continua no site oficial devido aos limites do Discord]**" : texto;
        return "> " + textoSeguro.replace(/\n/g, '\n> ');
    }
};

async function obterPayloadLiturgia() {
    const emMemoria = CacheSistema.verificar();
    if (emMemoria) return emMemoria;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); 
        const resposta = await fetch(CONFIG.API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resposta.ok) throw new Error(`Erro API: ${resposta.status}`);
        const dados = await resposta.json();
        const tema = Design.obterTema(dados.liturgia);
        const embeds = [];

        // PÁGINA 1
        const embedCapa = new EmbedBuilder()
            .setColor(tema.cor)
            .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL, url: CONFIG.SITE_URL })
            .setTitle(`${tema.emoji} Liturgia Diária • ${dados.data || 'Hoje'}`)
            .setDescription(`**${dados.liturgia || 'Tempo Comum'}**\n*Reserve um momento de silêncio para a Palavra.*`);
            
        if (dados.antifonaEntrada) embedCapa.addFields({ name: 'Antífona de Entrada', value: `*${dados.antifonaEntrada}*` });
        if (dados.oracaoColeta) embedCapa.addFields({ name: 'Oração Coleta', value: dados.oracaoColeta });
        embeds.push(embedCapa);

        // PÁGINA 2 (Limite de 1500 letras)
        if (dados.primeiraLeitura) {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`📕 Primeira Leitura (${dados.primeiraLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.primeiraLeitura.texto, 1500)));
        }

        // PÁGINA 3 (Limite de 1000 letras)
        if (dados.salmo) {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`🎵 Salmo Responsorial (${dados.salmo.referencia})`)
                .setDescription(`**R. ${dados.salmo.refrao}**\n\n${Design.formatarIntegral(dados.salmo.texto, 1000)}`));
        }

        // PÁGINA 4 (Limite de 1200 letras)
        if (dados.segundaLeitura && dados.segundaLeitura.texto && dados.segundaLeitura.texto.trim() !== "") {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`📗 Segunda Leitura (${dados.segundaLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.segundaLeitura.texto, 1200)));
        }

        // PÁGINA 5 (Evangelho tem mais espaço: 1800 letras)
        const embedEvangelho = new EmbedBuilder().setColor(tema.cor).setTitle(`✝️ Evangelho (${dados.evangelho?.referencia || '-'})`)
            .setDescription(Design.formatarIntegral(dados.evangelho?.texto, 1800));

        if (dados.oracaoOferendas) embedEvangelho.addFields({ name: 'Sobre as Oferendas', value: dados.oracaoOferendas });
        if (dados.antifonaComunhao) embedEvangelho.addFields({ name: 'Antífona da Comunhão', value: `*${dados.antifonaComunhao}*` });
        if (dados.oracaoDepoisComunhao) embedEvangelho.addFields({ name: 'Depois da Comunhão', value: dados.oracaoDepoisComunhao });

        embedEvangelho.setFooter({ text: `Design: verton.lab | Apoie o projeto com PIX: ${CONFIG.PIX_KEY}`, iconURL: CONFIG.LOGO_URL });
        embeds.push(embedEvangelho);

        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Ler Completo no Site').setURL(CONFIG.SITE_URL).setStyle(ButtonStyle.Link).setEmoji('🌐')
        );

        const payloadFinal = { embeds: embeds, components: [botoes] };
        CacheSistema.salvar(payloadFinal);
        return payloadFinal;

    } catch (erro) {
        console.error("Falha no payload:", erro.message);
        // Sem o 'ephemeral: true' aqui para não causar conflito no Discord
        return { 
            embeds: [new EmbedBuilder().setColor('#dc2626').setTitle('⚠️ Sinal Instável')
                .setDescription('**O lecionário digital está indisponível no momento.**\nA API demorou a responder ou o texto é longo demais. Tente novamente em instantes.')] 
        };
    }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} ONLINE E OPERANTE`);
    client.user.setActivity('/liturgia', { type: ActivityType.Listening });

    const comandosParaRegistrar = [new SlashCommandBuilder().setName('liturgia').setDescription('Acesse a liturgia diária completa e integral (liturgia.br)')].map(c => c.toJSON());
    try { await new REST({ version: '10' }).setToken(process.env.TOKEN).put(Routes.applicationCommands(client.user.id), { body: comandosParaRegistrar }); } 
    catch (error) { console.error('Falha ao registrar comandos:', error); }

    cron.schedule(CONFIG.HORARIO_BOM_DIA, async () => {
        const payload = await obterPayloadLiturgia();
        client.guilds.cache.forEach(async guild => {
            try {
                const canal = guild.channels.cache.find(c => (c.name.includes('liturgia') || c.name.includes('geral')) && c.isTextBased());
                if (canal) await canal.send({ content: "## ☀️ Bom dia, comunidade!", ...payload });
            } catch (err) {}
        });
    }, { timezone: CONFIG.TIMEZONE });
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'liturgia') {
        try {
            await interaction.deferReply(); 
            const payloadFinal = await obterPayloadLiturgia();
            await interaction.editReply(payloadFinal);
        } catch (erroGrave) {
            console.error("ERRO GRAVE NA INTERAÇÃO:", erroGrave);
            // Cinto de segurança: se TUDO der errado, ele avisa e para de "pensar"
            await interaction.editReply({ content: "❌ **Erro interno do Discord.** As leituras de hoje excederam os limites de segurança da plataforma. Visite o site oficial para ler." }).catch(console.error);
        }
    }
});

client.login(process.env.TOKEN);
