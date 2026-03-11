import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// Configuração do Cliente Puppeteer para VPS
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-extensions'
        ]
    }
});

let isReady = false;
const meuNumero = "551381301010@c.us"; // Formato ID para o litoral (13)

// Evento: Gerar QR Code no Terminal
client.on('qr', (qr) => {
    console.log('--- LEIA O QR CODE PARA CONECTAR O ZAP DA JNC ---');
    qrcode.generate(qr, { small: true });
});

// Evento: Conexão Estabelecida
client.on('ready', async () => {
    isReady = true;
    console.log('✅ WHATSAPP DA JNC ELÉTRICA e BOMBAS ON!');
    
    // Teste de envio com log detalhado
    setTimeout(async () => {
        try {
            console.log('--- Tentando enviar mensagem inicial para:', meuNumero);
            const chat = await client.getChatById(meuNumero);
            await chat.sendMessage("🚀 *SISTEMA JNC ONLINE*\nNotificações de OS ativadas.");
            console.log('🚀 Mensagem de inicialização ENVIADA!');
        } catch (err) {
            console.error('❌ Erro no envio inicial:', err.message);
        }
    }, 5000);
});

// Evento: Comandos de Teste (Responde se você escrever 'status' ou '!teste')
client.on('message', async (msg) => {
    const texto = msg.body.toLowerCase();
    
    if (texto === 'status') {
        msg.reply('✅ O robô da JNC Soluteg está online e processando mensagens!');
        console.log('🤖 Resposta de status enviada.');
    }
    
    if (texto === '!teste') {
        msg.reply('Recebi seu teste! A integração está funcionando perfeitamente no servidor.');
        console.log('🤖 Resposta de teste enviada.');
    }
});

client.on('auth_failure', () => {
    isReady = false;
    console.error('❌ Falha na autenticação do Zap!');
});

client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ Zap desconectado!');
});

// Inicia o serviço
client.initialize();

/**
 * Função exportada para enviar alertas de OS do sistema
 */
export const sendWhatsappAlert = async (message: string) => {
    console.log(`--- GATILHO: Iniciando busca de ID para envio ---`);
    
    if (!isReady) {
        console.error('❌ ERRO: O cliente ainda não está pronto.');
        return;
    }

    try {
        // Tentamos validar o número com o 9 primeiro (padrão novo)
        const numeroCom9 = "5513981301010@c.us";
        const numeroSem9 = "551381301010@c.us";

        // Testamos qual ID o WhatsApp reconhece como válido
        const idValidado = await client.getNumberId(numeroCom9) || await client.getNumberId(numeroSem9);

        if (idValidado) {
            console.log(`✅ ID Encontrado pelo WhatsApp: ${idValidado._serialized}`);
            await client.sendMessage(idValidado._serialized, message);
            console.log('🚀 SUCESSO: Alerta enviado para a JNC!');
        } else {
            console.error('❌ ERRO: O WhatsApp não encontrou esse número (LID não gerado).');
        }
    } catch (err) {
        console.error('❌ ERRO CRÍTICO no envio:', err.message);
    }
};
