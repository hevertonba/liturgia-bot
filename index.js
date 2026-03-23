const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron'); // Importante: npm install node-cron
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// --- FUNÇÃO PARA BUSCAR E FORMATAR A LITURGIA ---
async function buscarLiturgia() {
    try {
        const resposta = await fetch('https://liturgia.up.railway.app/');
        const dados = await resposta.json();

        let corEmbed = '#2f3136';
        const liturgiaString = dados.liturgia.toLowerCase();
        
        if (liturgiaString.includes('verde')) corEmbed = '#22c55e';
        else if (liturgiaString.includes('roxo')) corEmbed = '#9333ea';
        else if (liturgiaString.includes('vermelho')) corEmbed = '#dc2626';
        else if (liturgiaString.includes('branco')) corEmbed = '#ffffff';

        const resumir = (t, l = 900) => t && t.length > l ? t.substring(0, l) + '...' : t;

        const embed = new EmbedBuilder()
            .setColor(corEmbed)
            .setTitle('📖 Liturgia Diária - liturgia.br')
            .setDescription(`**${dados.data}**\n*${dados.liturgia}*`)
            .addFields(
                { name: `📕 1ª Leitura (${dados.primeiraLeitura.referencia})`, value: resumir(dados.primeiraLeitura.texto) },
                { name: `🎵 Salmo (${dados.salmo.referencia})`, value: `**R. ${dados.salmo.refrao}**\n${resumir(dados.salmo.texto, 500)}` }
            );

        if (dados.segundaLeitura && dados.segundaLeitura.texto) {
            embed.addFields({ name: `📗 2ª Leitura (${dados.segundaLeitura.referencia})`, value: resumir(dados.segundaLeitura.texto) });
        }

        embed.addFields({ name: `✝️ Evangelho (${dados.evangelho.referencia})`, value: resumir(dados.evangelho.texto) })
             .setFooter({ text: 'liturgia.br | verton.lab' })
             .setTimestamp();

        return embed;
    } catch (e) {
        console.error("Erro na API:", e);
        return null;
    }
}

client.once('ready', () => {
    console.log(`✅ Liturgia Bot Online como ${client.user.tag}`);

    // AGENDAMENTO: Todo dia às 07:00 da manhã (Horário de Brasília)
    cron.schedule('0 7 * * *', async () => {
        console.log("Executando envio automático da manhã...");
        const embed = await buscarLiturgia();
        if (!embed) return;

        // O bot vai tentar enviar em todos os canais chamados 'liturgia' ou 'geral'
        client.guilds.cache.forEach(async (guild) => {
            const canal = guild.channels.cache.find(c => c.name === 'liturgia' || c.name === 'geral');
            if (canal && canal.isTextBased()) {
                await canal.send({ content: "☀️ **Bom dia! Aqui está a Liturgia de hoje:**", embeds: [embed] });
            }
        });
    }, {
        timezone: "America/Sao_Paulo"
    });
});

// COMANDO MANUAL: !liturgia
client.on('messageCreate', async (message) => {
    if (message.author.bot || message.content.toLowerCase() !== '!liturgia') return;

    const msgEspera = await message.reply("⏳ Buscando as leituras de hoje...");
    const embed = await buscarLiturgia();
    
    if (embed) {
        await msgEspera.edit({ content: "Aqui está:", embeds: [embed] });
    } else {
        await msgEspera.edit("❌ Erro ao buscar a liturgia. Tente novamente mais tarde.");
    }
});

client.login(process.env.TOKEN);
