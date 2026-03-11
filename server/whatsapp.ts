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
    
    // Pequeno delay para estabilizar a conexão antes da primeira mensagem
    setTimeout(async () => {
        try {
            await client.sendMessage(meuNumero, "🚀 *SISTEMA JNC ONLINE*\nO portal foi reiniciado com sucesso e as notificações estão ativas.");
            console.log('🚀 Mensagem de inicialização enviada com sucesso!');
        } catch (err) {
            console.error('❌ Erro ao enviar mensagem de boas-vindas:', err);
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
    console.log(`--- Tentativa de disparo: ${message.substring(0, 30)}... ---`);
    
    if (!isReady) {
        console.error('❌ ERRO: O cliente WhatsApp não está pronto (isReady = false).');
        return;
    }

    try {
        const response = await client.sendMessage(meuNumero, message);
        if (response.id) {
            console.log('✅ SUCESSO: Mensagem entregue ao servidor do Zap!');
        }
    } catch (err) {
        console.error('❌ ERRO crítico no envio do Zap:', err);
    }
};