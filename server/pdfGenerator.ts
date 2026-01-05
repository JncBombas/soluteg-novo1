import PDFDocument from 'pdfkit';
import { getWorkOrderById } from './workOrdersDb';
import { getMaterialsByWorkOrderId } from './workOrdersAuxDb';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gera um PDF da Ordem de Serviço usando PDFKit
 */
export async function generateWorkOrderPDF(workOrderId: number): Promise<Buffer> {
  // Buscar dados da OS
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) {
    throw new Error('Ordem de serviço não encontrada');
  }

  // Buscar materiais
  const materials = await getMaterialsByWorkOrderId(workOrderId);
  
  // Calcular total de materiais
  const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0);

  return new Promise((resolve, reject) => {
    try {
      // Criar documento PDF
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      // Array para armazenar os chunks do PDF
      const chunks: Buffer[] = [];

      // Capturar os dados do PDF
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // === CABEÇALHO ===
      // Adicionar logo
      const logoPath = path.join(__dirname, 'logo-jnc.png');
      if (fs.existsSync(logoPath)) {
        // Logo centralizado no topo
        const logoWidth = 120;
        const logoHeight = 56; // Proporção mantida (1280x601 -> 120x56)
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoPath, logoX, 50, { width: logoWidth, height: logoHeight });
        doc.moveDown(4);
      }
      
      doc.fontSize(20)
         .fillColor('#FF6B00')
         .text('SOLUTEG GERADORES', { align: 'center' });
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text('JNC Comércio e Serviços Técnicos', { align: 'center' });
      
      doc.moveDown(0.5);
      doc.fontSize(16)
         .fillColor('#000000')
         .text('ORDEM DE SERVIÇO', { align: 'center' });
      
      doc.moveDown(0.3);
      doc.fontSize(12)
         .fillColor('#FF6B00')
         .text(workOrder.osNumber, { align: 'center' });

      // Linha divisória
      doc.moveDown(1);
      doc.strokeColor('#CCCCCC')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(1);

      // === INFORMAÇÕES DA OS ===
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Informações da Ordem', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(10);

      const infoY = doc.y;
      
      // Coluna esquerda
      doc.text(`Título: ${workOrder.title || 'Sem título'}`, 50, infoY);
      doc.text(`Status: ${translateStatus(workOrder.status)}`, 50, doc.y + 5);
      doc.text(`Prioridade: ${translatePriority(workOrder.priority)}`, 50, doc.y + 5);
      doc.text(`Tipo: ${translateType(workOrder.type)}`, 50, doc.y + 5);
      
      // Coluna direita
      const rightColumnX = 320;
      doc.text(`Data de Criação: ${formatDate(workOrder.createdAt)}`, rightColumnX, infoY);
      if (workOrder.scheduledDate) {
        doc.text(`Data Agendada: ${formatDate(workOrder.scheduledDate)}`, rightColumnX, doc.y + 5);
      }
      if (workOrder.estimatedHours) {
        doc.text(`Horas Estimadas: ${workOrder.estimatedHours}h`, rightColumnX, doc.y + 5);
      }
      if (workOrder.actualHours) {
        doc.text(`Horas Reais: ${workOrder.actualHours}h`, rightColumnX, doc.y + 5);
      }

      doc.moveDown(2);

      // === DESCRIÇÃO ===
      if (workOrder.description) {
        doc.fontSize(14)
           .fillColor('#000000')
           .text('Descrição', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(10)
           .text(workOrder.description, { align: 'justify' });
        
        doc.moveDown(1.5);
      }

      // === INFORMAÇÕES DO CLIENTE ===
      doc.fontSize(14)
         .fillColor('#000000')
         .text('Informações do Cliente', { underline: true });
      
      doc.moveDown(0.5);
      doc.fontSize(10);

      doc.text(`Nome: ${workOrder.clientName || 'Não informado'}`);
      if (workOrder.clientEmail) {
        doc.text(`E-mail: ${workOrder.clientEmail}`, 50, doc.y + 5);
      }
      doc.text(`Telefone: ${workOrder.clientPhone || 'Não informado'}`, 50, doc.y + 5);
      if (workOrder.clientAddress) {
        doc.text(`Endereço: ${workOrder.clientAddress}`, 50, doc.y + 5);
      }

      doc.moveDown(1.5);

      // === MATERIAIS ===
      if (materials && materials.length > 0) {
        doc.fontSize(14)
           .fillColor('#000000')
           .text('Materiais', { underline: true });
        
        doc.moveDown(0.5);

        // Cabeçalho da tabela
        const tableTop = doc.y;
        const col1X = 50;
        const col2X = 250;
        const col3X = 350;
        const col4X = 450;

        doc.fontSize(9)
           .fillColor('#FFFFFF')
           .rect(col1X, tableTop, 495, 20)
           .fill('#FF6B00');

        doc.fillColor('#FFFFFF')
           .text('Material', col1X + 5, tableTop + 5, { width: 190 })
           .text('Quantidade', col2X + 5, tableTop + 5, { width: 90 })
           .text('Valor Unit.', col3X + 5, tableTop + 5, { width: 90 })
           .text('Subtotal', col4X + 5, tableTop + 5, { width: 90 });

        let currentY = tableTop + 25;

        // Linhas da tabela
        doc.fontSize(9).fillColor('#000000');
        
        materials.forEach((material: any, index: number) => {
          const subtotal = material.totalCost || 0;

          // Alternar cor de fundo
          if (index % 2 === 0) {
            doc.rect(col1X, currentY - 2, 495, 18).fill('#F5F5F5');
          }

          doc.fillColor('#000000')
             .text(material.name, col1X + 5, currentY, { width: 190, ellipsis: true })
             .text(`${material.quantity} ${material.unit || ''}`, col2X + 5, currentY, { width: 90 })
             .text(`R$ ${(material.unitCost || 0).toFixed(2)}`, col3X + 5, currentY, { width: 90 })
             .text(`R$ ${subtotal.toFixed(2)}`, col4X + 5, currentY, { width: 90 });

          currentY += 20;
        });

        // Linha de total
        doc.rect(col1X, currentY, 495, 25).fill('#333333');
        doc.fontSize(11)
           .fillColor('#FFFFFF')
           .text('TOTAL', col1X + 5, currentY + 7, { width: 350 })
           .text(`R$ ${totalMaterials.toFixed(2)}`, col4X + 5, currentY + 7, { width: 90 });

        doc.moveDown(2);
      }

      // === VALORES ===
      if (workOrder.estimatedValue || workOrder.finalValue) {
        doc.moveDown(1);
        doc.fontSize(14)
           .fillColor('#000000')
           .text('Valores', { underline: true });
        
        doc.moveDown(0.5);
        doc.fontSize(10);

        if (workOrder.estimatedValue) {
          doc.text(`Valor Estimado: R$ ${workOrder.estimatedValue.toFixed(2)}`);
        }
        if (workOrder.finalValue) {
          doc.text(`Valor Final: R$ ${workOrder.finalValue.toFixed(2)}`, 50, doc.y + 5);
        }
      }

      // === RODAPÉ ===
      const bottomY = 750;
      doc.fontSize(8)
         .fillColor('#666666')
         .text('_______________________________________________', 50, bottomY, { align: 'center' });
      
      doc.text('Assinatura do Responsável', 50, bottomY + 15, { align: 'center' });
      
      doc.moveDown(1);
      doc.fontSize(7)
         .text('Este documento foi gerado eletronicamente pelo sistema Soluteg', { align: 'center' });
      
      doc.text(`Gerado em: ${formatDateTime(new Date())}`, { align: 'center' });

      // Finalizar o documento
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

// === FUNÇÕES AUXILIARES ===

function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'aberta': 'Aberta',
    'aguardando_aprovacao': 'Aguardando Aprovação',
    'aprovada': 'Aprovada',
    'rejeitada': 'Rejeitada',
    'em_andamento': 'Em Andamento',
    'concluida': 'Concluída',
    'aguardando_pagamento': 'Aguardando Pagamento',
    'cancelada': 'Cancelada'
  };
  return statusMap[status] || status;
}

function translatePriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'normal': 'Normal',
    'alta': 'Alta',
    'critica': 'Crítica'
  };
  return priorityMap[priority] || priority;
}

function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    'rotina': 'Rotina',
    'emergencial': 'Emergencial',
    'orcamento': 'Orçamento'
  };
  return typeMap[type] || type;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}

function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString('pt-BR');
}
