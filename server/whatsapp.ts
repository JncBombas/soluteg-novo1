import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    console.log('--- LEIA O QR CODE PARA CONECTAR O ZAP DA JNC ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ WHATSAPP DA JNC ELÉTRICA e BOMBAS ON!');
    
    // MENSAGEM AUTOMÁTICA AO LIGAR:
    // O sistema avisa o seu número que acabou de subir
    const meuNumero = "551381301010@c.us"; 
    client.sendMessage(meuNumero, "🚀 *SISTEMA JNC ONLINE* \nO portal acabou de ser reiniciado e estou pronto para enviar notificações!");
});

// NOVO: COMANDO DE RESPOSTA (TESTE DE STATUS)
client.on('message', async (msg) => {
    // Se VOCÊ mandar "status" para o número do sistema, ele responde
    if (msg.body.toLowerCase() === 'status') {
        msg.reply('✅ O robô da JNC Soluteg está online e processando mensagens!');
    }
    
    // Teste de Eco (responde qualquer coisa que você mandar começando com !teste)
    if (msg.body.startsWith('!teste')) {
        msg.reply('Recebi seu teste! O WhatsApp está funcionando perfeitamente no servidor.');
    }
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
        const meuNumero = "551381301010@c.us"; 
        await client.sendMessage(meuNumero, message);
        console.log('🚀 Mensagem enviada com sucesso para a JNC!');
    } catch (err) {
        console.error('Erro ao enviar Zap:', err);
    }
};