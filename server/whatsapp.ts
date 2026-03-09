import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Variável para controlar se o Zap está pronto
let isReady = false;

client.on('qr', (qr) => {
    console.log('--- LEIA O QR CODE PARA CONECTAR O ZAP DA JNC ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WHATSAPP DA JNC ELÉTRICA e BOMBAS ON!');
});

client.on('auth_failure', () => console.error('❌ Falha na autenticação do Zap!'));
client.on('disconnected', () => {
    isReady = false;
    console.log('⚠️ Zap desconectado!');
});

client.initialize();

export const sendWhatsappAlert = async (message: string) => {
    if (!isReady) {
        console.error('❌ Tentativa de envio falhou: O cliente WhatsApp não está pronto.');
        return;
    }

    try {
        const meuNumero = "5513981301010@c.us"; 
        await client.sendMessage(meuNumero, message);
        console.log('🚀 Mensagem enviada com sucesso para a JNC!');
    } catch (err) {
        console.error('Erro ao enviar Zap:', err);
    }
};