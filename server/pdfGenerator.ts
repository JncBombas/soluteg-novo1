import PDFDocument from 'pdfkit';
import { getWorkOrderById } from './workOrdersDb';
import { getMaterialsByWorkOrderId, getCommentsByWorkOrderId } from './workOrdersAuxDb';
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
  
  // Buscar comentários (apenas os não internos para o cliente)
  const comments = await getCommentsByWorkOrderId(workOrderId, false);
  
  // Calcular total de materiais
  const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0);

  return new Promise((resolve, reject) => {
    try {
      // Criar documento PDF - tamanho A4
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        autoFirstPage: true,
        bufferPages: true
      });

      // Array para armazenar os chunks do PDF
      const chunks: Buffer[] = [];

      // Capturar os dados do PDF
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const leftMargin = 40;
      const rightMargin = pageWidth - 40;
      const contentWidth = rightMargin - leftMargin;

      // === CABEÇALHO COM LOGO ===
      let headerY = 30;
      
      // Logo no topo centralizado - ajustado para não sobrepor o título
      // Tentar múltiplos caminhos para encontrar o logo
      const possibleLogoPaths = [
        path.join(__dirname, 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'server', 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'logo-jnc-transparente.png'),
        '/home/ubuntu/soluteg-novo/server/logo-jnc-transparente.png'
      ];
      
      let logoPath = '';
      for (const p of possibleLogoPaths) {
        if (fs.existsSync(p)) {
          logoPath = p;
          console.log('[PDF] Logo encontrado em:', p);
          break;
        }
      }
      
      if (logoPath && fs.existsSync(logoPath)) {
        const logoWidth = 80; // Logo menor para caber melhor
        const logoHeight = 80; // Proporcional (logo é quadrado 1440x1440)
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, headerY, { width: logoWidth, height: logoHeight });
        headerY += logoHeight + 10; // Espaço após o logo
      }

      // Título "ORDEM DE SERVIÇO" centralizado abaixo do logo
      doc.fontSize(18)
         .fillColor('#333333')
         .font('Helvetica-Bold')
         .text('ORDEM DE SERVIÇO', leftMargin, headerY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      headerY += 25;

      // Número da OS centralizado - Cor dourada do logo JNC
      doc.fontSize(14)
         .fillColor('#D4A84B')
         .font('Helvetica-Bold')
         .text(workOrder.osNumber || `OS-${workOrderId}`, leftMargin, headerY, { 
           width: contentWidth, 
           align: 'center' 
         });
      
      headerY += 20;

      // Data no canto direito
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text(`Data: ${formatDate(workOrder.createdAt)}`, leftMargin, headerY, { 
           width: contentWidth, 
           align: 'right' 
         });
      
      headerY += 15;

      // Linha divisória do cabeçalho - Cor dourada do logo JNC
      doc.strokeColor('#D4A84B')
         .lineWidth(2)
         .moveTo(leftMargin, headerY)
         .lineTo(rightMargin, headerY)
         .stroke();
      
      headerY += 15;

      // === INFORMAÇÕES DA OS E CLIENTE (lado a lado) ===
      const col1X = leftMargin;
      const col2X = pageWidth / 2 + 10;
      const colWidth = (contentWidth / 2) - 10;
      
      let infoY = headerY;

      // Coluna esquerda - Informações da OS
      doc.fontSize(11)
         .fillColor('#D4A84B')
         .font('Helvetica-Bold')
         .text('Informações da Ordem', col1X, infoY);
      
      infoY += 18;
      doc.fontSize(9)
         .fillColor('#333333')
         .font('Helvetica');
      
      doc.text(`Título: ${workOrder.title || 'Sem título'}`, col1X, infoY, { width: colWidth });
      infoY += 14;
      doc.text(`Status: ${translateStatus(workOrder.status)}`, col1X, infoY, { width: colWidth });
      infoY += 14;
      doc.text(`Prioridade: ${translatePriority(workOrder.priority)}`, col1X, infoY, { width: colWidth });
      infoY += 14;
      doc.text(`Tipo: ${translateType(workOrder.type)}`, col1X, infoY, { width: colWidth });
      
      if (workOrder.scheduledDate) {
        infoY += 14;
        doc.text(`Data Agendada: ${formatDate(workOrder.scheduledDate)}`, col1X, infoY, { width: colWidth });
      }

      // Coluna direita - Informações do Cliente
      let clientY = headerY;
      doc.fontSize(11)
         .fillColor('#D4A84B')
         .font('Helvetica-Bold')
         .text('Informações do Cliente', col2X, clientY);
      
      clientY += 18;
      doc.fontSize(9)
         .fillColor('#333333')
         .font('Helvetica');
      
      doc.text(`Nome: ${workOrder.clientName || 'Não informado'}`, col2X, clientY, { width: colWidth });
      clientY += 14;
      doc.text(`Telefone: ${workOrder.clientPhone || 'Não informado'}`, col2X, clientY, { width: colWidth });
      
      if (workOrder.clientEmail) {
        clientY += 14;
        doc.text(`E-mail: ${workOrder.clientEmail}`, col2X, clientY, { width: colWidth });
      }
      
      if (workOrder.clientAddress) {
        clientY += 14;
        doc.text(`Endereço: ${workOrder.clientAddress}`, col2X, clientY, { width: colWidth });
      }

      // Próxima seção após as duas colunas
      let currentY = Math.max(infoY, clientY) + 25;

      // === DESCRIÇÃO ===
      if (workOrder.description) {
        doc.fontSize(11)
           .fillColor('#D4A84B')
           .font('Helvetica-Bold')
           .text('Descrição', leftMargin, currentY);
        
        currentY += 15;
        doc.fontSize(9)
           .fillColor('#333333')
           .font('Helvetica')
           .text(workOrder.description, leftMargin, currentY, { 
             width: contentWidth, 
             align: 'justify' 
           });
        
        currentY = doc.y + 20;
      }

      // === MATERIAIS ===
      if (materials && materials.length > 0) {
        doc.fontSize(11)
           .fillColor('#D4A84B')
           .font('Helvetica-Bold')
           .text('Materiais', leftMargin, currentY);
        
        currentY += 15;

        // Cabeçalho da tabela
        const tableLeft = leftMargin;
        const tableWidth = contentWidth;
        const colMaterial = tableLeft;
        const colQtd = tableLeft + tableWidth * 0.45;
        const colUnit = tableLeft + tableWidth * 0.60;
        const colSubtotal = tableLeft + tableWidth * 0.80;

        // Fundo do cabeçalho
        doc.rect(tableLeft, currentY, tableWidth, 18)
           .fill('#D4A84B');

        doc.fontSize(8)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text('Material', colMaterial + 5, currentY + 5, { width: tableWidth * 0.40 })
           .text('Qtd', colQtd + 5, currentY + 5, { width: tableWidth * 0.12 })
           .text('Valor Unit.', colUnit + 5, currentY + 5, { width: tableWidth * 0.18 })
           .text('Subtotal', colSubtotal + 5, currentY + 5, { width: tableWidth * 0.18 });

        currentY += 20;

        // Linhas da tabela
        doc.font('Helvetica');
        
        materials.forEach((material: any, index: number) => {
          const subtotal = material.totalCost || 0;
          const materialName = material.materialName || material.name || material.description || 'Material sem nome';

          // Alternar cor de fundo
          if (index % 2 === 0) {
            doc.rect(tableLeft, currentY, tableWidth, 16).fill('#F8F8F8');
          }

          doc.fontSize(8)
             .fillColor('#333333')
             .text(materialName, colMaterial + 5, currentY + 4, { width: tableWidth * 0.40, ellipsis: true })
             .text(`${material.quantity || 0} ${material.unit || 'un'}`, colQtd + 5, currentY + 4, { width: tableWidth * 0.12 })
             .text(`R$ ${(material.unitCost || 0).toFixed(2)}`, colUnit + 5, currentY + 4, { width: tableWidth * 0.18 })
             .text(`R$ ${subtotal.toFixed(2)}`, colSubtotal + 5, currentY + 4, { width: tableWidth * 0.18 });

          currentY += 18;
        });

        // Linha de total
        doc.rect(tableLeft, currentY, tableWidth, 20)
           .fill('#3D4654');
        
        doc.fontSize(10)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text('TOTAL', colMaterial + 5, currentY + 5, { width: tableWidth * 0.70 })
           .text(`R$ ${totalMaterials.toFixed(2)}`, colSubtotal + 5, currentY + 5, { width: tableWidth * 0.18 });

        currentY += 30;
      }

      // === VALORES ESTIMADOS/FINAIS ===
      if (workOrder.estimatedValue || workOrder.finalValue) {
        doc.fontSize(11)
           .fillColor('#D4A84B')
           .font('Helvetica-Bold')
           .text('Valores', leftMargin, currentY);
        
        currentY += 15;
        doc.fontSize(9)
           .fillColor('#333333')
           .font('Helvetica');

        if (workOrder.estimatedValue) {
          doc.text(`Valor Estimado: R$ ${workOrder.estimatedValue.toFixed(2)}`, leftMargin, currentY);
          currentY += 14;
        }
        if (workOrder.finalValue) {
          doc.text(`Valor Final: R$ ${workOrder.finalValue.toFixed(2)}`, leftMargin, currentY);
          currentY += 14;
        }
      }

      // === OBSERVAÇÕES (Comentários para o cliente) ===
      if (comments && comments.length > 0) {
        // Verificar se precisa de nova página
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = 40;
        }

        doc.fontSize(11)
           .fillColor('#D4A84B')
           .font('Helvetica-Bold')
           .text('Observações', leftMargin, currentY);
        
        currentY += 15;
        doc.fontSize(9)
           .fillColor('#333333')
           .font('Helvetica');

        comments.forEach((comment: any) => {
          const commentDate = formatDate(comment.createdAt);
          doc.font('Helvetica-Bold')
             .text(`${commentDate}:`, leftMargin, currentY);
          currentY += 12;
          doc.font('Helvetica')
             .text(comment.comment, leftMargin, currentY, { 
               width: contentWidth, 
               align: 'justify' 
             });
          currentY = doc.y + 10;
        });
        
        currentY += 10;
      }

      // === RODAPÉ COM ASSINATURAS ===
      // Verificar se precisa de nova página para as assinaturas
      if (currentY > doc.page.height - 180) {
        doc.addPage();
        currentY = 40;
      }

      const footerY = Math.max(currentY + 30, doc.page.height - 150);
      
      // Título da seção de assinaturas
      doc.fontSize(11)
         .fillColor('#D4A84B')
         .font('Helvetica-Bold')
         .text('Assinaturas', leftMargin, footerY - 30);

      // Duas colunas para assinaturas
      const sigCol1X = leftMargin + 30;
      const sigCol2X = pageWidth / 2 + 30;
      const sigWidth = (contentWidth / 2) - 60;
      
      // Assinatura do Colaborador (esquerda)
      doc.strokeColor('#333333')
         .lineWidth(0.5)
         .moveTo(sigCol1X, footerY + 30)
         .lineTo(sigCol1X + sigWidth, footerY + 30)
         .stroke();
      
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Assinatura do Colaborador', sigCol1X, footerY + 35, { 
           width: sigWidth, 
           align: 'center' 
         });
      
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Nome: _______________________', sigCol1X, footerY + 50, { width: sigWidth });
      doc.text('Doc: _______________________', sigCol1X, footerY + 65, { width: sigWidth });

      // Assinatura do Cliente (direita)
      doc.strokeColor('#333333')
         .lineWidth(0.5)
         .moveTo(sigCol2X, footerY + 30)
         .lineTo(sigCol2X + sigWidth, footerY + 30)
         .stroke();
      
      doc.fontSize(9)
         .fillColor('#666666')
         .font('Helvetica')
         .text('Assinatura do Cliente', sigCol2X, footerY + 35, { 
           width: sigWidth, 
           align: 'center' 
         });
      
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Nome: _______________________', sigCol2X, footerY + 50, { width: sigWidth });
      doc.text('Doc: _______________________', sigCol2X, footerY + 65, { width: sigWidth });
      
      // Rodapé final
      doc.fontSize(7)
         .fillColor('#999999')
         .text('Este documento foi gerado eletronicamente pelo sistema Soluteg', leftMargin, footerY + 90, { 
           width: contentWidth, 
           align: 'center' 
         });

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
