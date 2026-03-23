/**
 * 📖 LITURGIA.BR - DISCORD BOT (Versão Integral & Multi-Páginas)
 * Desenvolvido por verton.lab
 * Arquitetura Premium com Sistema de Cache e Auto-Broadcast
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

// --- 1. CONFIGURAÇÕES E BRANDING ---
const CONFIG = {
    SITE_URL: 'https://liturgia-br.blogspot.com/p/liturgia.html',
    LOGO_URL: 'https://instagram.ffec3-1.fna.fbcdn.net/v/t51.82787-19/650127290_17880257589493149_8847861152074275433_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.ffec3-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2gEc03KmL6NFRMf9kuy1R4ZZKrbG_CbciWDsYi3wPsTUDH0Rg1eOPvfmmE1di9BYGFQ&_nc_ohc=Voxi9uRlUfkQ7kNvwFQ7kKR&_nc_gid=67YVquBW6FDeqh5opSFWOw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfwOfWZeujUAIHEx3YPhyRqrGaSYVhQWgV0iijc3cnqWPg&oe=69C762E3&_nc_sid=7a9f4b',
    API_URL: 'https://liturgia.up.railway.app/',
    HORARIO_BOM_DIA: '0 7 * * *', // 07:00 da manhã
    TIMEZONE: 'America/Sao_Paulo',
    PIX_KEY: 'hss.contato.br@gmail.com'
};

// --- 2. SISTEMA DE CACHE DE ALTO DESEMPENHO ---
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
        console.log(`[CACHE] 💾 Nova liturgia salva em memória para o dia ${this.data}`);
    }
};

// --- 3. FERRAMENTAS DE DESIGN ---
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

    // Formata o texto integral com Blockquotes (>) garantindo o limite de segurança do Discord
    formatarIntegral: (texto) => {
        if (!texto || texto.trim() === "") return "> *Texto não disponibilizado pela API hoje.*";
        let textoSeguro = texto.length > 4000 ? texto.substring(0, 4000) + "...\n*[Texto excedeu limite do Discord. Leia no site]*" : texto;
        return "> " + textoSeguro.replace(/\n/g, '\n> ');
    }
};

// --- 4. MOTOR PRINCIPAL (BUSCA E MONTAGEM MULTI-EMBED) ---
async function obterPayloadLiturgia() {
    const emMemoria = CacheSistema.verificar();
    if (emMemoria) return emMemoria;

    try {
        console.log("[SISTEMA] 📡 Solicitando dados ao servidor litúrgico...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s de tolerância
        
        const resposta = await fetch(CONFIG.API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resposta.ok) throw new Error(`Erro na API: ${resposta.status}`);
        const dados = await resposta.json();
        const tema = Design.obterTema(dados.liturgia);
        const embeds = [];

        // PÁGINA 1: Capa e Ritos Iniciais (Antífonas e Coleta, se a API enviar)
        const embedCapa = new EmbedBuilder()
            .setColor(tema.cor)
            .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL, url: CONFIG.SITE_URL })
            .setTitle(`${tema.emoji} Liturgia Diária • ${dados.data || 'Hoje'}`)
            .setDescription(`**${dados.liturgia || 'Tempo Comum'}**\n*Reserve um momento de silêncio para a Palavra.*`);
            
        // Injeta dados extras (Antífonas) caso a API passe a fornecê-los
        if (dados.antifonaEntrada || dados.oracaoColeta) {
            if (dados.antifonaEntrada) embedCapa.addFields({ name: 'Antífona de Entrada', value: `*${dados.antifonaEntrada}*` });
            if (dados.oracaoColeta) embedCapa.addFields({ name: 'Oração Coleta', value: dados.oracaoColeta });
        }
        embeds.push(embedCapa);

        // PÁGINA 2: Primeira Leitura
        if (dados.primeiraLeitura) {
            embeds.push(new EmbedBuilder()
                .setColor(tema.cor)
                .setTitle(`📕 Primeira Leitura (${dados.primeiraLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.primeiraLeitura.texto)));
        }

        // PÁGINA 3: Salmo Responsorial
        if (dados.salmo) {
            embeds.push(new EmbedBuilder()
                .setColor(tema.cor)
                .setTitle(`🎵 Salmo Responsorial (${dados.salmo.referencia})`)
                .setDescription(`**R. ${dados.salmo.refrao}**\n\n${Design.formatarIntegral(dados.salmo.texto)}`));
        }

        // PÁGINA 4: Segunda Leitura (Se houver)
        if (dados.segundaLeitura && dados.segundaLeitura.texto && dados.segundaLeitura.texto.trim() !== "") {
            embeds.push(new EmbedBuilder()
                .setColor(tema.cor)
                .setTitle(`📗 Segunda Leitura (${dados.segundaLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.segundaLeitura.texto)));
        }

        // PÁGINA 5: Evangelho e Ritos Finais
        const embedEvangelho = new EmbedBuilder()
            .setColor(tema.cor)
            .setTitle(`✝️ Evangelho (${dados.evangelho?.referencia || '-'})`)
            .setDescription(Design.formatarIntegral(dados.evangelho?.texto));

        // Injeta orações finais se a API fornecer
        if (dados.oracaoOferendas || dados.antifonaComunhao || dados.oracaoDepoisComunhao) {
            if (dados.oracaoOferendas) embedEvangelho.addFields({ name: 'Sobre as Oferendas', value: dados.oracaoOferendas });
            if (dados.antifonaComunhao) embedEvangelho.addFields({ name: 'Antífona da Comunhão', value: `*${dados.antifonaComunhao}*` });
            if (dados.oracaoDepoisComunhao) embedEvangelho.addFields({ name: 'Depois da Comunhão', value: dados.oracaoDepoisComunhao });
        }

        // Rodapé da última página com a chave PIX
        embedEvangelho.setFooter({ 
            text: `Design: verton.lab | Apoie o projeto com PIX: ${CONFIG.PIX_KEY}`, 
            iconURL: CONFIG.LOGO_URL 
        });
        embeds.push(embedEvangelho);

        // BOTÕES INTERATIVOS
        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Ler no Site Oficial')
                .setURL(CONFIG.SITE_URL)
                .setStyle(ButtonStyle.Link)
                .setEmoji('🌐')
        );

        const payloadFinal = { embeds: embeds, components: [botoes] };
        CacheSistema.salvar(payloadFinal);

        return payloadFinal;

    } catch (erro) {
        console.error("[ERRO CRÍTICO] Falha na obtenção da Liturgia:", erro.message);
        return { 
            embeds: [new EmbedBuilder()
                .setColor('#dc2626')
                .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL })
                .setTitle('⚠️ Sinal Instável')
                .setDescription('**O lecionário digital está indisponível no momento.**\nA API de liturgia demorou a responder. Tente novamente em alguns instantes.')
                .setFooter({ text: 'Monitoramento automático de falhas - verton.lab' })], 
            ephemeral: true 
        };
    }
}

// --- 5. INICIALIZAÇÃO DO CLIENTE DISCORD ---
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
    console.log(`\n================================`);
    console.log(`✅ ${client.user.tag} ONLINE E OPERANTE`);
    console.log(`================================\n`);

    client.user.setActivity('/liturgia', { type: ActivityType.Listening });

    const comandosParaRegistrar = [
        new SlashCommandBuilder()
            .setName('liturgia')
            .setDescription('Acesse a liturgia diária completa e integral (liturgia.br)')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: comandosParaRegistrar });
        console.log('[SISTEMA] 🚀 Slash Commands sincronizados.');
    } catch (error) {
        console.error('[ERRO] Falha ao registrar comandos:', error);
    }

    // --- 6. AUTO-BROADCAST (Rádio Matinal) ---
    cron.schedule(CONFIG.HORARIO_BOM_DIA, async () => {
        console.log("[CRON] 🌅 Iniciando transmissão matinal...");
        const payload = await obterPayloadLiturgia();
        if (payload.ephemeral) return; 

        client.guilds.cache.forEach(async guild => {
            try {
                const canal = guild.channels.cache.find(c => (c.name.includes('liturgia') || c.name.includes('geral')) && c.isTextBased());
                if (canal) {
                    await canal.send({ content: "## ☀️ Bom dia, comunidade!\n*A liturgia integral de hoje já está disponível para meditação.*", ...payload });
                }
            } catch (err) {}
        });
    }, { timezone: CONFIG.TIMEZONE });
});

// --- 7. ESCUTADOR DE INTERAÇÕES ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'liturgia') {
        await interaction.deferReply(); 
        const payloadFinal = await obterPayloadLiturgia();
        await interaction.editReply(payloadFinal);
    }
});

if (!process.env.TOKEN) {
    console.error("❌ ERRO FATAL: TOKEN não encontrado.");
    process.exit(1);
}
client.login(process.env.TOKEN);
