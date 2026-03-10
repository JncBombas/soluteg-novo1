// 1. A ALTERAÇÃO ESTÁ AQUI: Usando 'pkg' para evitar erro de importação no ESM
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

// 2. CONFIGURAÇÃO DO CLIENTE (Mantenha como está, mas removi o 'git pull' que daria erro)
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage' // Adicionei isso para estabilidade na VPS
        ]
    }
});

let isReady = false;

// 3. EVENTOS DE CONEXÃO
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

// 4. A FUNÇÃO QUE O RESTO DO SISTEMA CHAMA
export const sendWhatsappAlert = async (message: string) => {
    if (!isReady) {
        console.error('❌ Tentativa de envio falhou: O cliente WhatsApp não está pronto.');
        return;
    }

    try {
        // DICA: Se não chegar no final 1010, tente tirar o "9" (551381301010)
        const meuNumero = "5513981301010@c.us"; 
        await client.sendMessage(meuNumero, message);
        console.log('🚀 Mensagem enviada com sucesso para a JNC!');
    } catch (err) {
        console.error('Erro ao enviar Zap:', err);
    }
};