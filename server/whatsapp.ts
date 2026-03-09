import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('--- LEIA O QR CODE PARA CONECTAR O ZAP DA JMC ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ WHATSAPP DA JMC ELÉTRICA ON!'));

client.initialize();

export const sendWhatsappAlert = async (message: string) => {
    try {
        // Substitua pelo seu número (DDI + DDD + Número + @c.us)
        const meuNumero = "5513981301010@c.us"; 
        await client.sendMessage(meuNumero, message);
    } catch (err) {
        console.error('Erro ao enviar Zap:', err);
    }
};