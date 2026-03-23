/**
 * 📖 LITURGIA.BR - DISCORD BOT PREMIUM
 * Desenvolvido por verton.lab
 * Funcionalidades: Liturgia Diária, Busca por Data, Missal Interativo e Sistema PIX.
 */

const { 
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    REST, Routes, SlashCommandBuilder, ActivityType, StringSelectMenuBuilder 
} = require('discord.js');
const cron = require('node-cron');
require('dotenv').config();

// ============================================================================
// 1. CONFIGURAÇÕES GERAIS E BRANDING
// ============================================================================
const CONFIG = {
    SITE_URL: 'https://liturgia-br.blogspot.com/p/liturgia.html',
    LOGO_URL: 'https://instagram.ffec3-1.fna.fbcdn.net/v/t51.82787-19/650127290_17880257589493149_8847861152074275433_n.jpg?stp=dst-jpg_s150x150_tt6&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLmRqYW5nby4xMDgwLmMyIn0&_nc_ht=instagram.ffec3-1.fna.fbcdn.net&_nc_cat=109&_nc_oc=Q6cZ2gEc03KmL6NFRMf9kuy1R4ZZKrbG_CbciWDsYi3wPsTUDH0Rg1eOPvfmmE1di9BYGFQ&_nc_ohc=Voxi9uRlUfkQ7kNvwFQ7kKR&_nc_gid=67YVquBW6FDeqh5opSFWOw&edm=AP4sbd4BAAAA&ccb=7-5&oh=00_AfwOfWZeujUAIHEx3YPhyRqrGaSYVhQWgV0iijc3cnqWPg&oe=69C762E3&_nc_sid=7a9f4b',
    API_URL: 'https://liturgia.up.railway.app/',
    HORARIO_BOM_DIA: '0 7 * * *', // 07:00 da manhã (Horário de Brasília)
    TIMEZONE: 'America/Sao_Paulo',
    PIX_KEY: 'hss.contato.br@gmail.com'
};

// ============================================================================
// 2. BANCO DE DADOS LOCAL: O MISSAL ROMANO (Ordinário da Missa)
// ============================================================================
const MISSAL_DATABASE = {
    'iniciais': {
        titulo: '🚪 Ritos Iniciais',
        descricao: 'A finalidade destes ritos é fazer com que os fiéis, reunindo-se em comunhão, formem uma comunidade e se disponham para ouvir a Palavra de Deus e celebrar a Eucaristia.',
        textos: [
            { nome: 'Sinal da Cruz', valor: '> **C:** Em nome do Pai e do Filho e do Espírito Santo.\n> **T:** Amém.\n> **C:** A graça de nosso Senhor Jesus Cristo, o amor do Pai e a comunhão do Espírito Santo estejam convosco.\n> **T:** Bendito seja Deus que nos reuniu no amor de Cristo.' },
            { nome: 'Ato Penitencial (Confiteor)', valor: '> **T:** Confesso a Deus todo-poderoso e a vós, irmãos e irmãs, que pequei muitas vezes por pensamentos e palavras, atos e omissões, por minha culpa, minha tão grande culpa. E peço à Virgem Maria, aos anjos e santos e a vós, irmãos e irmãs, que rogueis por mim a Deus, nosso Senhor.' },
            { nome: 'Senhor, tende piedade (Kyrie)', valor: '> **C:** Senhor, tende piedade de nós.\n> **T:** Senhor, tende piedade de nós.\n> **C:** Cristo, tende piedade de nós.\n> **T:** Cristo, tende piedade de nós.\n> **C:** Senhor, tende piedade de nós.\n> **T:** Senhor, tende piedade de nós.' },
            { nome: 'Hino de Louvor (Glória)', valor: '> **T:** Glória a Deus nas alturas, e paz na terra aos homens por Ele amados. Senhor Deus, rei dos céus, Deus Pai todo-poderoso: nós vos louvamos, nós vos bendizemos, nós vos adoramos, nós vos glorificamos, nós vos damos graças por vossa imensa glória...' }
        ]
    },
    'palavra': {
        titulo: '📖 Liturgia da Palavra',
        descricao: 'A parte principal da Liturgia da Palavra é constituída pelas leituras da Sagrada Escritura e pelos cantos que ocorrem entre elas.',
        textos: [
            { nome: 'Profissão de Fé (Símbolo Niceno-Constantinopolitano)', valor: '> **T:** Creio em um só Deus, Pai todo-poderoso, criador do céu e da terra, de todas as coisas visíveis e invisíveis. Creio em um só Senhor, Jesus Cristo, Filho Unigênito de Deus, nascido do Pai antes de todos os séculos: Deus de Deus, Luz da Luz, Deus verdadeiro de Deus verdadeiro, gerado, não criado, consubstancial ao Pai...\n> \n> *E por nós, homens, e para nossa salvação, desceu dos céus: e se encarnou pelo Espírito Santo, no seio da Virgem Maria, e se fez homem.* \n> \n> Também por nós foi crucificado sob Pôncio Pilatos; padeceu e foi sepultado. Ressuscitou ao terceiro dia, conforme as Escrituras, e subiu aos céus, onde está sentado à direita do Pai... Creio no Espírito Santo, Senhor que dá a vida, e procede do Pai e do Filho... Creio na Igreja, una, santa, católica e apostólica...' },
            { nome: 'Oração dos Fiéis', valor: '> A assembleia responde às intenções propostas pelo diácono ou leitor, normalmente com: \n> **T:** Senhor, escutai a nossa prece (ou resposta similar).' }
        ]
    },
    'eucaristica': {
        titulo: '🍷 Liturgia Eucarística',
        descricao: 'A Igreja organiza a celebração da Eucaristia em partes que correspondem às palavras e gestos de Cristo: Preparação dos Dons, Oração Eucarística e Rito da Comunhão.',
        textos: [
            { nome: 'Apresentação das Oferendas', valor: '> **C:** Bendito sejais, Senhor, Deus do universo, pelo pão que recebemos de vossa bondade, fruto da terra e do trabalho humano, que agora vos apresentamos, e para nós se vai tornar pão da vida.\n> **T:** Bendito seja Deus para sempre!\n> *(O mesmo se repete com o cálice de vinho).*' },
            { nome: 'Lavabo e Orai Irmãos', valor: '> **C:** Lavai-me, Senhor, de minhas faltas e purificai-me de meu pecado. [...] Orai, irmãos e irmãs, para que este meu e vosso sacrifício seja aceito por Deus Pai todo-poderoso.\n> **T:** Receba o Senhor por tuas mãos este sacrifício, para a glória do seu nome, para nosso bem e de toda a sua santa Igreja.' },
            { nome: 'Prefácio e Santo (Sanctus)', valor: '> **C:** O Senhor esteja convosco.\n> **T:** Ele está no meio de nós.\n> **C:** Corações ao alto.\n> **T:** O nosso coração está em Deus.\n> **C:** Demos graças ao Senhor, nosso Deus.\n> **T:** É nosso dever e nossa salvação.\n> [...] \n> **T:** Santo, Santo, Santo, Senhor, Deus do universo! O céu e a terra proclamam a vossa glória. Hosana nas alturas! Bendito o que vem em nome do Senhor! Hosana nas alturas!' }
        ]
    },
    'comunhao': {
        titulo: '🍞 Rito da Comunhão',
        descricao: 'Sendo a celebração eucarística um banquete pascal, convém que, segundo a ordem do Senhor, o seu Corpo e Sangue sejam recebidos pelos fiéis devidamente dispostos como alimento espiritual.',
        textos: [
            { nome: 'Pai Nosso', valor: '> **T:** Pai nosso, que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino, seja feita a vossa vontade, assim na terra como no céu; o pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal.\n> **C:** Livrai-nos de todos os males, ó Pai...\n> **T:** Vosso é o reino, o poder e a glória para sempre!' },
            { nome: 'Rito da Paz e Cordeiro de Deus', valor: '> **C:** A paz do Senhor esteja sempre convosco.\n> **T:** O amor de Cristo nos uniu.\n> \n> **T:** Cordeiro de Deus, que tirais o pecado do mundo, tende piedade de nós. Cordeiro de Deus, que tirais o pecado do mundo, tende piedade de nós. Cordeiro de Deus, que tirais o pecado do mundo, dai-nos a paz.' },
            { nome: 'Convite à Comunhão', valor: '> **C:** Provai e vede como o Senhor é bom; feliz de quem nele encontra seu refúgio. Eis o Cordeiro de Deus, que tira o pecado do mundo.\n> **T:** Senhor, eu não sou digno/a de que entreis em minha morada, mas dizei uma palavra e serei salvo/a.' }
        ]
    },
    'finais': {
        titulo: '🕊️ Ritos Finais',
        descricao: 'Compreendem avisos breves, a bênção do sacerdote e a despedida do povo, para que cada um volte às suas boas obras, louvando e bendizendo a Deus.',
        textos: [
            { nome: 'Bênção Final', valor: '> **C:** O Senhor esteja convosco.\n> **T:** Ele está no meio de nós.\n> **C:** Abençoe-vos Deus todo-poderoso, Pai e Filho e Espírito Santo.\n> **T:** Amém.' },
            { nome: 'Despedida', valor: '> **C:** Ide em paz, e o Senhor vos acompanhe.\n> **T:** Graças a Deus.' }
        ]
    }
};

// ============================================================================
// 3. SISTEMA DE CACHE INTELIGENTE (Por Data)
// ============================================================================
// Usamos um 'Map' para guardar a liturgia de várias datas diferentes simultaneamente.
const CacheSistema = {
    memoria: new Map(),
    verificar: function(dataKey) {
        return this.memoria.get(dataKey) || null;
    },
    salvar: function(dataKey, payload) {
        this.memoria.set(dataKey, payload);
        console.log(`[CACHE] 💾 Liturgia salva para a data: ${dataKey}`);
        
        // Limpa o cache se ficar muito grande (evita consumo excessivo de RAM do Railway)
        if (this.memoria.size > 20) {
            const primeiraChave = this.memoria.keys().next().value;
            this.memoria.delete(primeiraChave);
        }
    }
};

// ============================================================================
// 4. FERRAMENTAS DE DESIGN EDITORIAL (verton.lab)
// ============================================================================
const Design = {
    obterTema: (liturgiaTexto) => {
        if (!liturgiaTexto) return { cor: '#2f3136', emoji: '📖' };
        const texto = liturgiaTexto.toLowerCase();
        
        if (texto.includes('verde')) return { cor: '#22c55e', emoji: '🌿' };
        if (texto.includes('roxo')) return { cor: '#9333ea', emoji: '💜' };
        if (texto.includes('vermelho')) return { cor: '#dc2626', emoji: '🩸' };
        if (texto.includes('branco') || texto.includes('solenidade') || texto.includes('festa')) return { cor: '#ffffff', emoji: '✨' };
        if (texto.includes('rosa')) return { cor: '#f472b6', emoji: '🌸' };
        return { cor: '#2f3136', emoji: '📖' };
    },

    formatarIntegral: (texto, limite) => {
        if (!texto || texto.trim() === "") return "> *Texto não disponibilizado para este dia.*";
        let textoSeguro = texto.length > limite ? texto.substring(0, limite) + "...\n\n**[O texto continua no site oficial devido aos limites do Discord]**" : texto;
        return "> " + textoSeguro.replace(/\n/g, '\n> ');
    },

    // Formata datas recebidas do usuário (Ex: 25/12/2026 -> 25-12-2026 para a API)
    sanitizarDataAPI: (dataEntrada) => {
        if (!dataEntrada) return '';
        // Transforma barra em hífen caso a API prefira
        return `?data=${dataEntrada.replace(/\//g, '-')}`; 
    }
};

// ============================================================================
// 5. MOTOR DE BUSCA DA LITURGIA (Puxa da API ou do Cache)
// ============================================================================
async function obterPayloadLiturgia(dataAlvo = null) {
    // Define a chave de busca (Hoje ou Data Específica)
    const dataHoje = new Date().toLocaleDateString('pt-BR', { timeZone: CONFIG.TIMEZONE });
    const dataKey = dataAlvo ? dataAlvo : dataHoje;

    // 1. Tenta pegar do Cache
    const emMemoria = CacheSistema.verificar(dataKey);
    if (emMemoria) return emMemoria;

    // 2. Monta a URL (Se tiver data alvo, anexa na URL)
    const urlBusca = dataAlvo ? `${CONFIG.API_URL}${Design.sanitizarDataAPI(dataAlvo)}` : CONFIG.API_URL;

    try {
        console.log(`[SISTEMA] 📡 Buscando Liturgia de: ${dataKey}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s limite
        
        const resposta = await fetch(urlBusca, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!resposta.ok) throw new Error(`Erro na API: Status ${resposta.status}`);
        const dados = await resposta.json();
        
        const tema = Design.obterTema(dados.liturgia);
        const embeds = [];

        // PÁGINA 1: Capa e Ritos
        const embedCapa = new EmbedBuilder()
            .setColor(tema.cor)
            .setAuthor({ name: 'liturgia.br', iconURL: CONFIG.LOGO_URL, url: CONFIG.SITE_URL })
            .setTitle(`${tema.emoji} Liturgia Diária • ${dados.data || dataKey}`)
            .setDescription(`**${dados.liturgia || 'Tempo Comum'}**\n*Reserve um momento de silêncio para a Palavra.*`);
            
        if (dados.antifonaEntrada) embedCapa.addFields({ name: 'Antífona de Entrada', value: `*${dados.antifonaEntrada}*` });
        if (dados.oracaoColeta) embedCapa.addFields({ name: 'Oração Coleta', value: dados.oracaoColeta });
        embeds.push(embedCapa);

        // PÁGINA 2: Primeira Leitura
        if (dados.primeiraLeitura) {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`📕 Primeira Leitura (${dados.primeiraLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.primeiraLeitura.texto, 1500)));
        }

        // PÁGINA 3: Salmo
        if (dados.salmo) {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`🎵 Salmo Responsorial (${dados.salmo.referencia})`)
                .setDescription(`**R. ${dados.salmo.refrao}**\n\n${Design.formatarIntegral(dados.salmo.texto, 1000)}`));
        }

        // PÁGINA 4: Segunda Leitura (Se houver)
        if (dados.segundaLeitura && dados.segundaLeitura.texto && dados.segundaLeitura.texto.trim() !== "") {
            embeds.push(new EmbedBuilder().setColor(tema.cor).setTitle(`📗 Segunda Leitura (${dados.segundaLeitura.referencia})`)
                .setDescription(Design.formatarIntegral(dados.segundaLeitura.texto, 1200)));
        }

        // PÁGINA 5: Evangelho
        const embedEvangelho = new EmbedBuilder().setColor(tema.cor).setTitle(`✝️ Evangelho (${dados.evangelho?.referencia || '-'})`)
            .setDescription(Design.formatarIntegral(dados.evangelho?.texto, 1800));

        if (dados.oracaoOferendas) embedEvangelho.addFields({ name: 'Sobre as Oferendas', value: dados.oracaoOferendas });
        if (dados.antifonaComunhao) embedEvangelho.addFields({ name: 'Antífona da Comunhão', value: `*${dados.antifonaComunhao}*` });
        if (dados.oracaoDepoisComunhao) embedEvangelho.addFields({ name: 'Depois da Comunhão', value: dados.oracaoDepoisComunhao });

        embedEvangelho.setFooter({ text: `Design: verton.lab | liturgia.br`, iconURL: CONFIG.LOGO_URL });
        embeds.push(embedEvangelho);

        // BOTÕES INFERIORES
        const botoes = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Ler no Site').setURL(CONFIG.SITE_URL).setStyle(ButtonStyle.Link).setEmoji('🌐'),
            new ButtonBuilder().setCustomId('btn_doacao_pix').setLabel('Apoiar o Projeto').setStyle(ButtonStyle.Success).setEmoji('💚')
        );

        const payloadFinal = { embeds: embeds, components: [botoes] };
        CacheSistema.salvar(dataKey, payloadFinal); // Salva no cache com a data específica
        return payloadFinal;

    } catch (erro) {
        console.error(`[ERRO API] Falha ao buscar dados para ${dataKey}:`, erro.message);
        return { 
            embeds: [new EmbedBuilder().setColor('#dc2626').setTitle('⚠️ Indisponível')
                .setDescription(`Não foi possível carregar a liturgia para a data **${dataKey}**.\nA API pode estar offline ou a data fornecida não possui registros. Tente novamente mais tarde.`)], 
            ephemeral: true 
        };
    }
}

// ============================================================================
// 6. INICIALIZAÇÃO DO BOT DISCORD
// ============================================================================
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
    console.log(`\n================================`);
    console.log(`✅ ${client.user.tag} ONLINE E OPERANTE`);
    console.log(`================================\n`);

    client.user.setActivity('/liturgia | /missal', { type: ActivityType.Listening });

    // Registra os Slash Commands complexos
    const comandosParaRegistrar = [
        new SlashCommandBuilder()
            .setName('liturgia')
            .setDescription('Consulta a liturgia diária completa.')
            .addStringOption(option => 
                option.setName('data')
                .setDescription('Opcional. Formato DD/MM/AAAA (Ex: 25/12/2026)')
                .setRequired(false)),
        
        new SlashCommandBuilder()
            .setName('missal')
            .setDescription('Consulta as orações e o ordinário da Santa Missa.'),
            
        new SlashCommandBuilder()
            .setName('apoiar')
            .setDescription('Ajude a manter o projeto liturgia.br no ar!')
    ].map(c => c.toJSON());

    try { 
        await new REST({ version: '10' }).setToken(process.env.TOKEN).put(Routes.applicationCommands(client.user.id), { body: comandosParaRegistrar }); 
        console.log('[SISTEMA] 🚀 Slash Commands sincronizados.');
    } catch (error) { 
        console.error('Falha ao registrar comandos:', error); 
    }

    // BROADCAST MATINAL
    cron.schedule(CONFIG.HORARIO_BOM_DIA, async () => {
        const payload = await obterPayloadLiturgia();
        if (payload.ephemeral) return; 

        client.guilds.cache.forEach(async guild => {
            try {
                const canal = guild.channels.cache.find(c => (c.name.includes('liturgia') || c.name.includes('geral')) && c.isTextBased());
                if (canal) await canal.send({ content: "## ☀️ Bom dia, comunidade!\n*A liturgia de hoje já está disponível para meditação.*", ...payload });
            } catch (err) {}
        });
    }, { timezone: CONFIG.TIMEZONE });
});

// ============================================================================
// 7. ESCUTADOR DE INTERAÇÕES (Comandos, Menus e Botões)
// ============================================================================
client.on('interactionCreate', async interaction => {
    
    // --- LÓGICA DE COMANDOS DE BARRA (SLASH COMMANDS) ---
    if (interaction.isChatInputCommand()) {
        
        // COMANDO: /liturgia
        if (interaction.commandName === 'liturgia') {
            await interaction.deferReply(); 
            const dataInserida = interaction.options.getString('data');
            
            // Validação simples de data
            if (dataInserida && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataInserida)) {
                return interaction.editReply({ content: "❌ **Formato inválido!** Por favor, use o formato DD/MM/AAAA. Exemplo: `25/12/2026`" });
            }

            const payloadFinal = await obterPayloadLiturgia(dataInserida);
            await interaction.editReply(payloadFinal);
        }

        // COMANDO: /missal
        if (interaction.commandName === 'missal') {
            const embedMissal = new EmbedBuilder()
                .setColor('#dc2626')
                .setAuthor({ name: 'Missal Romano • liturgia.br', iconURL: CONFIG.LOGO_URL })
                .setTitle('Ordinário da Missa')
                .setDescription('Selecione abaixo a parte da Santa Missa que você deseja consultar para ver as orações e respostas litúrgicas.')
                .setFooter({ text: 'Fonte: Missal Romano (3ª Edição Típica) | verton.lab' });

            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('menu_missal_nav')
                    .setPlaceholder('Selecione uma parte da Missa...')
                    .addOptions([
                        { label: 'Ritos Iniciais', description: 'Sinal da Cruz, Ato Penitencial, Glória', value: 'iniciais', emoji: '🚪' },
                        { label: 'Liturgia da Palavra', description: 'Credo e Oração dos Fiéis', value: 'palavra', emoji: '📖' },
                        { label: 'Liturgia Eucarística', description: 'Orai Irmãos, Prefácio e Santo', value: 'eucaristica', emoji: '🍷' },
                        { label: 'Rito da Comunhão', description: 'Pai Nosso, Cordeiro de Deus', value: 'comunhao', emoji: '🍞' },
                        { label: 'Ritos Finais', description: 'Bênção e Despedida', value: 'finais', emoji: '🕊️' }
                    ])
            );

            await interaction.reply({ embeds: [embedMissal], components: [menu] });
        }

        // COMANDO: /apoiar
        if (interaction.commandName === 'apoiar') {
            enviarMensagemPix(interaction);
        }
    }

    // --- LÓGICA DE MENUS SUSPENSOS (Select Menus) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_missal_nav') {
        const selecao = interaction.values[0];
        const dadosMissal = MISSAL_DATABASE[selecao];

        const embedAtualizado = new EmbedBuilder()
            .setColor('#dc2626')
            .setAuthor({ name: 'Missal Romano • liturgia.br', iconURL: CONFIG.LOGO_URL })
            .setTitle(dadosMissal.titulo)
            .setDescription(`*${dadosMissal.descricao}*\n\n---`);

        // Adiciona os textos da missa no Embed
        dadosMissal.textos.forEach(parte => {
            embedAtualizado.addFields({ name: parte.nome, value: parte.valor });
        });

        // Atualiza a mensagem existente sem criar uma nova
        await interaction.update({ embeds: [embedAtualizado] });
    }

    // --- LÓGICA DE BOTÕES (Buttons) ---
    if (interaction.isButton() && interaction.customId === 'btn_doacao_pix') {
        enviarMensagemPix(interaction);
    }
});

// Função auxiliar para evitar repetição de código no PIX
async function enviarMensagemPix(interaction) {
    const embedPix = new EmbedBuilder()
        .setColor('#22c55e') // Verde PIX
        .setTitle('💚 Apoie o projeto liturgia.br')
        .setDescription(`Manter o bot, o site e a automação nos servidores exige tempo e custos de infraestrutura.\n\nQualquer contribuição ajuda o **verton.lab** a manter o projeto vivo e gratuito para as paróquias e comunidades de todo o Brasil!\n\n**Chave PIX (E-mail):**\n\`\`\`${CONFIG.PIX_KEY}\`\`\``)
        .setFooter({ text: 'Obrigado por apoiar a evangelização digital!', iconURL: CONFIG.LOGO_URL });

    // Se a interação for de um botão, usa reply. Se for um reply, a mensagem é efêmera.
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embedPix], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embedPix], ephemeral: true });
    }
}

// Inicializa o Bot
if (!process.env.TOKEN) {
    console.error("❌ ERRO FATAL: TOKEN não encontrado.");
    process.exit(1);
}
client.login(process.env.TOKEN);
