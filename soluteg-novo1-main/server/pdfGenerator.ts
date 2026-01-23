import PDFDocument from 'pdfkit';
import { getWorkOrderById } from './workOrdersDb';
import { getMaterialsByWorkOrderId, getCommentsByWorkOrderId } from './workOrdersAuxDb';
import { getInspectionTasksByWorkOrder, getChecklistsByInspectionTask } from './checklistsDb';
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
  
  // Buscar tarefas de inspeção com checklists
  const inspectionTasks = await getInspectionTasksByWorkOrder(workOrderId);
  
  // Buscar todos os checklists de todas as tarefas
  const tasksWithChecklists = await Promise.all(
    inspectionTasks.map(async (task) => ({
      ...task,
      checklists: await getChecklistsByInspectionTask(task.id)
    }))
  );
  
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

      // === INSPEÇÕES (Checklists preenchidos) ===
      if (tasksWithChecklists && tasksWithChecklists.length > 0) {

        // Verificar se precisa de nova página
        if (currentY > doc.page.height - 200) {
          doc.addPage();
          currentY = 40;
        }

        doc.fontSize(11)
           .fillColor('#D4A84B')
           .font('Helvetica-Bold')
           .text('Inspeções', leftMargin, currentY);
        
        currentY += 20;

        for (const task of tasksWithChecklists) {
          // Título da tarefa
          doc.fontSize(10)
             .fillColor('#333333')
             .font('Helvetica-Bold')
             .text(task.title, leftMargin, currentY);
          currentY += 15;

          // Status da tarefa
          const statusText = task.status === 'concluida' ? 'Concluída' : task.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';
          doc.fontSize(8)
             .fillColor('#666666')
             .font('Helvetica')
             .text(`Status: ${statusText}`, leftMargin, currentY);
          currentY += 12;

          // Listar checklists da tarefa
          if (task.checklists && task.checklists.length > 0) {
            for (const checklist of task.checklists) {
              // Verificar se precisa de nova página
              if (currentY > doc.page.height - 150) {
                doc.addPage();
                currentY = 40;
              }

              // === CARD DO CHECKLIST ===
              const cardX = leftMargin;
              const cardWidth = contentWidth;
              const cardBorderColor = '#D4A84B';
              
              // Borda superior do card
              doc.strokeColor(cardBorderColor)
                 .lineWidth(3)
                 .moveTo(cardX, currentY)
                 .lineTo(cardX + cardWidth, currentY)
                 .stroke();
              
              currentY += 8;
              
              // Fundo do header do card
              doc.rect(cardX, currentY, cardWidth, 20)
                 .fill('#F5F5F5');
              
              // Título do checklist
              doc.fontSize(10)
                 .fillColor('#D4A84B')
                 .font('Helvetica-Bold')
                 .text(`${checklist.customTitle}`, cardX + 8, currentY + 4, { width: cardWidth - 16 });
              
              currentY += 25;
              
              // Dados técnicos básicos
              if (checklist.brand || checklist.power) {
                doc.fontSize(8)
                   .fillColor('#666666')
                   .font('Helvetica');
                
                const brandText = `Marca: ${checklist.brand || 'N/A'}`;
                const powerText = `Potência: ${checklist.power || 'N/A'}`;
                
                doc.text(brandText, cardX + 8, currentY, { width: cardWidth / 2 - 8 });
                doc.text(powerText, cardX + cardWidth / 2, currentY, { width: cardWidth / 2 - 8 });
                currentY += 14;
              }
              
              currentY += 5;

              // Respostas do checklist
              if (checklist.responses) {
                try {
                  const responses = typeof checklist.responses === 'string' ? JSON.parse(checklist.responses) : checklist.responses;
                  
                  // === SEÇÃO: INSPEÇÃO VISUAL ===
                  if (responses.visual_items) {
                    // Título da seção
                    doc.rect(cardX + 5, currentY, cardWidth - 10, 16)
                       .fill('#E8E8E8');
                    
                    doc.fontSize(9)
                       .fillColor('#333333')
                       .font('Helvetica-Bold')
                       .text('Inspeção Visual', cardX + 10, currentY + 3);
                    
                    currentY += 20;
                    
                    const visualData = typeof responses.visual_items === 'string' ? JSON.parse(responses.visual_items) : responses.visual_items;
                    const items = ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'];
                    
                    // Tabela com melhor formatação
                    const tableX = cardX + 10;
                    const tableWidth = cardWidth - 20;
                    const colWidths = [tableWidth * 0.45, tableWidth * 0.18, tableWidth * 0.18, tableWidth * 0.18];
                    
                    // Cabeçalho da tabela
                    doc.rect(tableX, currentY, tableWidth, 14)
                       .fill('#D4A84B');
                    
                    doc.fontSize(7)
                       .fillColor('#FFFFFF')
                       .font('Helvetica-Bold');
                    
                    doc.text('Item', tableX + 3, currentY + 3, { width: colWidths[0] });
                    doc.text('OK', tableX + colWidths[0], currentY + 3, { width: colWidths[1], align: 'center' });
                    doc.text('NÃO OK', tableX + colWidths[0] + colWidths[1], currentY + 3, { width: colWidths[2], align: 'center' });
                    doc.text('N/A', tableX + colWidths[0] + colWidths[1] + colWidths[2], currentY + 3, { width: colWidths[3], align: 'center' });
                    
                    currentY += 16;
                    
                    // Linhas da tabela
                    doc.font('Helvetica');
                    items.forEach((item, idx) => {
                      const itemData = visualData[item] || {};
                      
                      // Fundo alternado
                      if (idx % 2 === 0) {
                        doc.rect(tableX, currentY, tableWidth, 12).fill('#FAFAFA');
                      }
                      
                      doc.fontSize(7)
                         .fillColor('#333333');
                      
                      doc.text(item, tableX + 3, currentY + 2, { width: colWidths[0] });
                      doc.text(itemData.OK ? '✓' : '', tableX + colWidths[0], currentY + 2, { width: colWidths[1], align: 'center' });
                      doc.text(itemData.NOK ? '✗' : '', tableX + colWidths[0] + colWidths[1], currentY + 2, { width: colWidths[2], align: 'center' });
                      doc.text(itemData['N/A'] ? '—' : '', tableX + colWidths[0] + colWidths[1] + colWidths[2], currentY + 2, { width: colWidths[3], align: 'center' });
                      
                      currentY += 12;
                    });
                    
                    currentY += 8;
                  }
                  
                  // === SEÇÃO: DADOS TÉCNICOS ===
                  const technicalFields = Object.entries(responses).filter(([key]) => 
                    key !== 'visual_items' && 
                    key !== 'observations' && 
                    key !== 'observacoes' &&
                    key !== 'notes' &&
                    key !== 'comments'
                  );
                  
                  // === DADOS TÉCNICOS EM COLUNAS VERTICAIS ===
                  if (technicalFields.length > 0) {
                    doc.fontSize(9)
                       .fillColor('#D4A84B')
                       .font('Helvetica-Bold')
                       .text('Dados Técnicos', cardX + 10, currentY);
                    
                    currentY += 15;
                    
                    // Calculamos o ponto de divisão para preencher a coluna esquerda primeiro
                    const midPoint = Math.ceil(technicalFields.length / 2);
                    const leftColumnFields = technicalFields.slice(0, midPoint);
                    const rightColumnFields = technicalFields.slice(midPoint);
                    
                    const startY = currentY;
                    let col1Y = startY;
                    let col2Y = startY;
                    
                    // Renderiza a Coluna da Esquerda (de cima para baixo)
                    leftColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        doc.fontSize(8).fillColor('#333333').font('Helvetica');
                        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        const formattedValue = formatFieldValue(value);
                        doc.text(`${formattedLabel}: ${formattedValue}`, cardX + 10, col1Y, { width: cardWidth / 2 - 15 });
                        col1Y += 12; // Espaçamento entre linhas
                      }
                    });
                    
                    // Renderiza a Coluna da Direita (de cima para baixo)
                    rightColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        doc.fontSize(8).fillColor('#333333').font('Helvetica');
                        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        const formattedValue = formatFieldValue(value);
                        doc.text(`${formattedLabel}: ${formattedValue}`, cardX + cardWidth / 2 + 5, col2Y, { width: cardWidth / 2 - 15 });
                        col2Y += 12;
                      }
                    });
                    
                    // O novo currentY será o maior valor entre as duas colunas para não sobrepor o próximo bloco
                    currentY = Math.max(col1Y, col2Y) + 10;
                  }
                  
                  // === SEÇÃO: OBSERVAÇÕES DO CHECKLIST ===
                  // Captura ambas as variações de chave (observations e observacoes)
                  const obsContent = responses.observations || responses.observacoes;
                  
                  if (obsContent && obsContent.trim() !== '') {
                    // Garante que o texto não bata no final da página
                    if (currentY > doc.page.height - 120) {
                      doc.addPage();
                      currentY = 40;
                    }
                    const cleanObs = obsContent.trim();
                    const textWidth = cardWidth - 25;
                    const textHeight = doc.heightOfString(cleanObs, { 
                      width: textWidth, 
                      align: 'justify' 
                    });
                    
                    // Título da Seção
                    doc.fontSize(9)
                       .fillColor('#D4A84B')
                       .font('Helvetica-Bold')
                       .text('Observações Técnicas:', cardX + 10, currentY);
                    
                    currentY += 12;
                    
                    // Retângulo de fundo para destacar o texto [Melhoria Visual]
                    doc.rect(cardX + 8, currentY, cardWidth - 16, textHeight + 8)
                       .fill('#F9F9F9'); 
                    
                    // Renderização do texto das observações
                    doc.fontSize(8)
                       .fillColor('#333333')
                       .font('Helvetica')
                       .text(cleanObs, cardX + 12, currentY + 4, { 
                         width: textWidth, 
                         align: 'justify',
                         lineGap: 2 
                       });

                    currentY += textHeight + 20;
                  }
                  
                  doc.strokeColor(cardBorderColor)
                     .lineWidth(1)
                     .moveTo(cardX, currentY)
                     .lineTo(cardX + cardWidth, currentY)
                     .stroke();
                  
                  currentY += 15;
                } catch (e) {
                  console.error('[PDF] Erro ao parsear respostas do checklist:', e);
                }
              }

              currentY += 8;
            }
          }
          // Assinaturas removidas do final de cada tarefa
          // Agora as assinaturas aparecem apenas no final da OS

          currentY += 15;
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

      // Altura total estimada: Título (20) + Espaço (30) + Linha/Texto (30) = ~80
// === BLOCO DE FINALIZAÇÃO E ASSINATURAS (VERSÃO À PROVA DE FALHAS) ===

const signatureBlockHeight = 100; // Espaço total necessário para o bloco
const footerHeight = 40; // Espaço reservado para o rodapé

// Verificamos se há espaço para o bloco de assinaturas + rodapé
// Se a posição atual (currentY) + bloco de assinaturas passar do limite da página menos o rodapé
if (currentY + signatureBlockHeight > doc.page.height - footerHeight - 20) {
    doc.addPage();
    currentY = 40;
} else {
    currentY += 20; // Respiro
}

// Desativamos temporariamente o auto-layout para evitar que o PDFKit 
// crie uma página em branco se o texto "Assinaturas" encostar na borda
doc.options.layout = 'absolute'; 

// Título da Seção
doc.fontSize(12)
   .fillColor('#D4A84B')
   .font('Helvetica-Bold')
   .text('Assinaturas', leftMargin, currentY);

const sigLineY = currentY + 45; 
const signatureWidth = 180;

// --- Assinatura do Colaborador ---
doc.strokeColor('#333333')
   .lineWidth(0.5)
   .moveTo(leftMargin, sigLineY)
   .lineTo(leftMargin + signatureWidth, sigLineY)
   .stroke();

doc.fontSize(8)
   .fillColor('#666666')
   .font('Helvetica')
   .text('Assinatura do Colaborador', leftMargin, sigLineY + 5, { 
       width: signatureWidth, 
       align: 'center' 
   });

// --- Assinatura do Cliente ---
const clientSigX = rightMargin - signatureWidth;

doc.strokeColor('#333333')
   .lineWidth(0.5)
   .moveTo(clientSigX, sigLineY)
   .lineTo(rightMargin, sigLineY)
   .stroke();

doc.fontSize(8)
   .fillColor('#666666')
   .font('Helvetica')
   .text('Assinatura do Cliente', clientSigX, sigLineY + 5, { 
       width: signatureWidth, 
       align: 'center' 
   });

// --- RODAPÉ FIXO (USANDO COORDENADA ABSOLUTA) ---
// Isso garante que o rodapé nunca empurre o cursor para uma nova página
const bottomPos = doc.page.height - 30;

doc.fontSize(7)
   .fillColor('#999999')
   .text('Este documento foi gerado eletronicamente pelo sistema Soluteg', 
         leftMargin, 
         bottomPos, 
         { align: 'center', width: contentWidth });

// Finaliza o documento IMEDIATAMENTE
// O PDFKit não terá chance de processar o final da página e criar uma nova
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

function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') {
    // Traduzir valores comuns
    const translations: Record<string, string> = {
      'ok': 'Ok',
      'nok': 'NOk',
      'n_a': 'N/A',
      'monofasico': 'Monofásico',
      'bifasico': 'Bifásico',
      'trifasico': 'Trifásico'
    };
    return translations[value.toLowerCase()] || value;
  }
  return String(value);
}
