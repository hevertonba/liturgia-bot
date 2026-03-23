/**
 * 📖 LITURGIA.BR - DISCORD BOT
 * Desenvolvido por verton.lab
 * Arquitetura Premium com Sistema de Cache e Auto-Broadcast
 */

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder, ActivityType } = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

// --- 1. CONFIGURAÇÕES E BRANDING ---
const CONFIG = {
    SITE_URL: 'https://instagram.com/liturgia.br',
    // Mantive a sua logo do Instagram exatamente como você configurou:
    LOGO_URL: 'https://instagram.ffec3-1.fna.fbcdn.net/v/t51.82787-19/650127290_17880257589493149_8847861152074275433_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.ffec3-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2gEc03KmL6NFRMf9kuy1R4ZZKrbG_CbciWDsYi3wPsTUDH0Rg1eOPvfmmE1di9BYGFQ&_nc_ohc=Voxi9uRlUfkQ7kNvwFQ7kKR&_nc_gid=67YVquBW6FDeqh5opSFWOw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfwOfWZeujUAIHEx3YPhyRqrGaSYVhQWgV0iijc3cnqWPg&oe=69C762E3&_nc_sid=7a9f4b',
    API_URL: 'https://liturgia.up.railway.app/',
    HORARIO_BOM_DIA: '0 7 * * *', // 07:00 da manhã
    TIMEZONE: 'America/Sao_Paulo'
};

// --- 2. SISTEMA DE CACHE DE ALTO DESEMPENHO ---
// Isso impede que o bot fique lento. Ele consulta a API 1 vez por dia e guarda na memória.
const CacheSistema = {
    data: null,
    payload: null,
    
    obterDataDeHoje: () => new Date().toLocaleDateString('pt-BR', { timeZone: CONFIG.TIMEZONE }),
    
    verificar: function() {
        const hoje = this.obterDataDeHoje();
        if (this.data === hoje && this.payload !== null) {
            return this.payload;
        }
        return null;
    },
    
    salvar: function(novoPayload) {
        this.data = this.obterDataDeHoje();
        this.payload = novoPayload;
        console.log(`[CACHE] 💾 Nova liturgia salva em memória para o dia ${this.data}`);
    }
};

// --- 3. FERRAMENTAS DE DESIGN E FORMATAÇÃO ---
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

    // Formatador Inteligente: Limita o texto e aplica Blockquotes do Discord (>) de forma segura
    formatarLeitura: (texto, limite = 900) => {
        if (!texto || texto.trim() === "") return "> *Texto não disponibilizado pela liturgia de hoje.*";
        
        let textoProcessado = texto.length > limite 
            ? texto.substring(0, limite) + "...\n\n*[Continue a leitura no perfil oficial]*" 
            : texto;
            
        // Garante que cada quebra de linha mantenha a formatação visual elegante
        return "> " + textoProcessado.replace(/\n/g, '\n> ');
    }
};

// --- 4. MOTOR PRINCIPAL (BUSCA E MONTAGEM) ---
async function obterPayloadLiturgia() {
    // 4.1. Tenta buscar da memória RAM primeiro (Resposta instantânea em milissegundos)
    const emMemoria = CacheSistema.verificar();
    if (emMemoria) {
        console.log("[SISTEMA] ⚡ Servindo leitura via Cache Super Rápido.");
        return emMemoria;
    }

    // 4.2. Se não tem no cache, busca na API com tratamento de erros moderno
    try {
        console.log("[SISTEMA] 📡 Solicitando dados ao servidor litúrgico...");
        
        // Timeout de 10 segundos para a API não travar o bot
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const resposta = await fetch(CONFIG.API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resposta.ok) throw new Error(`Servidor retornou erro: ${resposta.status}`);
        const dados = await resposta.json();

        const tema = Design.obterTema(dados.liturgia);

        // 4.3. Construção do Embed Principal (A Joia da Coroa)
        const embed = new EmbedBuilder()
            .setColor(tema.cor)
            .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL, url: CONFIG.SITE_URL })
            .setTitle(`${tema.emoji} Liturgia Diária • ${dados.data || 'Hoje'}`)
            .setDescription(`**${dados.liturgia || 'Tempo Comum'}**\n*Reserve um momento de silêncio para a Palavra.*`)
            .addFields(
                { 
                    name: `\n📕 Primeira Leitura (${dados.primeiraLeitura?.referencia || '-'})`, 
                    value: Design.formatarLeitura(dados.primeiraLeitura?.texto) 
                },
                { 
                    name: `\n🎵 Salmo Responsorial (${dados.salmo?.referencia || '-'})`, 
                    value: `**R. ${dados.salmo?.refrao || '...'}**\n${Design.formatarLeitura(dados.salmo?.texto, 400)}` 
                }
            );

        // Verifica de forma segura se existe a Segunda Leitura hoje
        if (dados.segundaLeitura && dados.segundaLeitura.texto && dados.segundaLeitura.texto.trim() !== "") {
            embed.addFields({ 
                name: `\n📗 Segunda Leitura (${dados.segundaLeitura.referencia})`, 
                value: Design.formatarLeitura(dados.segundaLeitura.texto) 
            });
        }

        embed.addFields({ 
            name: `\n✝️ Evangelho (${dados.evangelho?.referencia || '-'})`, 
            value: Design.formatarLeitura(dados.evangelho?.texto) 
        })
        .setFooter({ text: 'Design e Automação por verton.lab', iconURL: CONFIG.LOGO_URL })
        .setTimestamp();

        // 4.4. Botões de Chamada para Ação (CTA)
        const botoes = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Ler Completo / Instagram')
                    .setURL(CONFIG.SITE_URL)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐'),
                new ButtonBuilder()
                    .setLabel('Apoiar o Projeto')
                    .setURL('https://sua-chave-pix-aqui.com') 
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('☕')
            );

        const payloadFinal = { embeds: [embed], components: [botoes] };
        
        // 4.5. Salva no cache para os próximos comandos serem instantâneos
        CacheSistema.salvar(payloadFinal);

        return payloadFinal;

    } catch (erro) {
        console.error("[ERRO CRÍTICO] Falha na obtenção da Liturgia:", erro.message);
        
        const erroEmbed = new EmbedBuilder()
            .setColor('#dc2626')
            .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL })
            .setTitle('⚠️ Sinal Instável')
            .setDescription('**O lecionário digital está indisponível no momento.**\nNossos servidores estão sobrecarregados ou a API de liturgia está em manutenção. Por favor, tente novamente em alguns instantes.')
            .setFooter({ text: 'Monitoramento automático de falhas - verton.lab' });
            
        return { embeds: [erroEmbed], ephemeral: true };
    }
}

// --- 5. INICIALIZAÇÃO DO CLIENTE DISCORD ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', async () => {
    console.log(`\n================================`);
    console.log(`✅ ${client.user.tag} ONLINE E OPERANTE`);
    console.log(`================================\n`);

    // Define o status customizado do bot (O que ele está jogando/assistindo)
    client.user.setActivity('/liturgia', { type: ActivityType.Listening });

    // Registra os Slash Commands globalmente
    const comandosParaRegistrar = [
        new SlashCommandBuilder()
            .setName('liturgia')
            .setDescription('Acesse a liturgia diária completa com formatação premium liturgia.br')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: comandosParaRegistrar });
        console.log('[SISTEMA] 🚀 Slash Commands sincronizados com o Discord.');
    } catch (error) {
        console.error('[ERRO] Falha ao registrar comandos:', error);
    }

    // --- 6. AUTO-BROADCAST (Rádio Matinal) ---
    cron.schedule(CONFIG.HORARIO_BOM_DIA, async () => {
        console.log("[CRON] 🌅 Iniciando transmissão matinal de liturgia...");
        
        const payload = await obterPayloadLiturgia();
        if (payload.ephemeral) return; // Se a API estiver fora, não manda mensagem de erro pra todos os canais

        let enviosComSucesso = 0;

        // Varre todos os servidores em que o bot está instalado
        client.guilds.cache.forEach(async guild => {
            try {
                // Procura um canal que tenha 'liturgia' ou 'geral' no nome
                const canal = guild.channels.cache.find(c => 
                    (c.name.includes('liturgia') || c.name.includes('geral')) && c.isTextBased()
                );

                if (canal) {
                    await canal.send({ 
                        content: "## ☀️ Bom dia, comunidade!\n*A liturgia de hoje já está disponível para meditação.*", 
                        ...payload 
                    });
                    enviosComSucesso++;
                }
            } catch (err) {
                console.log(`[CRON AVISO] Sem permissão para enviar no servidor: ${guild.name}`);
            }
        });

        console.log(`[CRON] 📡 Transmissão concluída. Enviado para ${enviosComSucesso} canais.`);
    }, { timezone: CONFIG.TIMEZONE });
});

// --- 7. ESCUTADOR DE INTERAÇÕES (Comandos do Usuário) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'liturgia') {
        // O bot avisa o Discord que está pensando (Evita erro de timeout)
        await interaction.deferReply(); 

        // Processa os dados (rápido pelo cache, ou aguarda a API)
        const payloadFinal = await obterPayloadLiturgia();
        
        // Envia a resposta final
        await interaction.editReply(payloadFinal);
    }
});

// --- 8. ATIVAÇÃO DO MOTOR ---
if (!process.env.TOKEN) {
    console.error("❌ ERRO FATAL: TOKEN não encontrado. Verifique suas variáveis no Railway.");
    process.exit(1);
}
client.login(process.env.TOKEN);
