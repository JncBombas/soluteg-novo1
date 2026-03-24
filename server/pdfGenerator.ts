// ============================================================
// 📁 ARQUIVO: pdfGenerator.ts
// 🎯 FUNÇÃO: Gera o PDF completo de uma Ordem de Serviço.
//    Busca todos os dados (OS, materiais, checklists, fotos,
//    comentários, assinaturas) e monta um documento A4 formatado
//    com a identidade visual da JNC Elétrica (dourado + escuro).
// ============================================================
 
import PDFDocument from 'pdfkit';
import { getWorkOrderById } from './workOrdersDb';
import { getMaterialsByWorkOrderId, getCommentsByWorkOrderId, getAttachmentsByWorkOrderId } from './workOrdersAuxDb';
import { getInspectionTasksByWorkOrder, getChecklistsByInspectionTask } from './checklistsDb';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
 
// Necessário para obter o caminho do arquivo atual em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
// ============================================================
// 📄 FUNÇÃO PRINCIPAL: generateWorkOrderPDF
// Recebe o ID da OS, busca todos os dados no banco e retorna
// um Buffer (bloco de bytes) com o PDF pronto para download.
// ============================================================
export async function generateWorkOrderPDF(workOrderId: number): Promise<Buffer> {
 
  // --- Busca os dados principais da OS ---
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) {
    throw new Error('Ordem de serviço não encontrada');
  }
 
  // --- Busca os materiais usados na OS ---
  const materials = await getMaterialsByWorkOrderId(workOrderId);
 
  // --- Busca comentários visíveis ao cliente (isInternal = false) ---
  const comments = await getCommentsByWorkOrderId(workOrderId, false);
 
  // --- Busca as tarefas de inspeção vinculadas à OS ---
  const inspectionTasks = await getInspectionTasksByWorkOrder(workOrderId);
 
  // --- Busca os anexos (fotos/PDFs) salvos no Cloudinary ---
  const attachments = await getAttachmentsByWorkOrderId(workOrderId);
 
  // --- Para cada tarefa de inspeção, busca os checklists preenchidos ---
  const tasksWithChecklists = await Promise.all(
    inspectionTasks.map(async (task) => ({
      ...task,
      checklists: await getChecklistsByInspectionTask(task.id)
    }))
  );
 
  // --- Calcula o custo total somando todos os materiais ---
  const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0);
 
  // ============================================================
  // 🔧 CONSTRUÇÃO DO PDF
  // Usamos uma Promise porque o PDFKit trabalha com streams
  // (eventos 'data' e 'end'), não com async/await direto.
  // ============================================================
  return new Promise(async (resolve, reject) => {
    try {
      // Cria o documento A4 com margens de 40px em todos os lados
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        autoFirstPage: true,
        bufferPages: true // Permite manipular páginas já criadas
      });
 
      // Acumula os fragmentos do PDF em memória
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks))); // Junta tudo e resolve a Promise
      doc.on('error', reject);
 
      // --- Constantes de layout reutilizadas ao longo do arquivo ---
      const pageWidth    = doc.page.width;
      const leftMargin   = 40;
      const rightMargin  = pageWidth - 40;
      const goldColor    = '#D4A84B'; // Dourado da identidade JNC
      const contentWidth = pageWidth - 80; // Largura útil (descontando as duas margens)
 
      // ============================================================
      // 🏷️ CABEÇALHO: Logo + Título + Número da OS
      // ============================================================
      let headerY = 30;
 
      // Tenta encontrar o logo em vários locais possíveis do servidor
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
 
      // Se encontrou o logo, centraliza e insere no topo
      if (logoPath && fs.existsSync(logoPath)) {
        const logoWidth  = 80;
        const logoHeight = 80;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.image(logoPath, logoX, headerY, { width: logoWidth, height: logoHeight });
        headerY += logoHeight + 10;
      }
 
      // Título "ORDEM DE SERVIÇO" centralizado
      doc.fontSize(18).fillColor('#333333').font('Helvetica-Bold')
         .text('ORDEM DE SERVIÇO', leftMargin, headerY, { width: contentWidth, align: 'center' });
      headerY += 25;
 
      // Número da OS em dourado
      doc.fontSize(14).fillColor(goldColor).font('Helvetica-Bold')
         .text(workOrder.osNumber || `OS-${workOrderId}`, leftMargin, headerY, { width: contentWidth, align: 'center' });
      headerY += 20;
 
      // Data de criação alinhada à direita
      doc.fontSize(9).fillColor('#666666').font('Helvetica')
         .text(`Data: ${formatDate(workOrder.createdAt)}`, leftMargin, headerY, { width: contentWidth, align: 'right' });
      headerY += 15;
 
      // Linha divisória dourada abaixo do cabeçalho
      doc.strokeColor(goldColor).lineWidth(2)
         .moveTo(leftMargin, headerY).lineTo(rightMargin, headerY).stroke();
      headerY += 15;
 
      // ============================================================
      // 📋 INFORMAÇÕES DA OS E DO CLIENTE (duas colunas lado a lado)
      // ============================================================
      const col1X    = leftMargin;
      const col2X    = pageWidth / 2 + 10;
      const colWidth = (contentWidth / 2) - 10;
      let infoY = headerY;
 
      // --- Coluna Esquerda: dados da OS ---
      doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Informações da Ordem', col1X, infoY);
      infoY += 18;
      doc.fontSize(9).fillColor('#333333').font('Helvetica');
 
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
 
      // --- Coluna Direita: dados do cliente ---
      let clientY = headerY;
      doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Informações do Cliente', col2X, clientY);
      clientY += 18;
      doc.fontSize(9).fillColor('#333333').font('Helvetica');
 
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
 
      // currentY avança para abaixo da maior das duas colunas
      let currentY = Math.max(infoY, clientY) + 25;
 
      // ============================================================
      // 📝 DESCRIÇÃO DA OS
      // ============================================================
      if (workOrder.description) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Descrição', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica')
           .text(workOrder.description, leftMargin, currentY, { width: contentWidth, align: 'justify' });
        currentY = doc.y + 20;
      }
 
      // ============================================================
      // 🧱 TABELA DE MATERIAIS
      // ============================================================
      if (materials && materials.length > 0) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Materiais', leftMargin, currentY);
        currentY += 15;
 
        // Definição das colunas da tabela (% da largura total)
        const tableLeft   = leftMargin;
        const tableWidth  = contentWidth;
        const colMaterial = tableLeft;
        const colQtd      = tableLeft + tableWidth * 0.45;
        const colUnit     = tableLeft + tableWidth * 0.60;
        const colSubtotal = tableLeft + tableWidth * 0.80;
 
        // Cabeçalho dourado da tabela
        doc.rect(tableLeft, currentY, tableWidth, 18).fill(goldColor);
        doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Material',    colMaterial  + 5, currentY + 5, { width: tableWidth * 0.40 })
           .text('Qtd',         colQtd       + 5, currentY + 5, { width: tableWidth * 0.12 })
           .text('Valor Unit.', colUnit      + 5, currentY + 5, { width: tableWidth * 0.18 })
           .text('Subtotal',    colSubtotal  + 5, currentY + 5, { width: tableWidth * 0.18 });
        currentY += 20;
 
        // Linhas com fundo alternado (zebra)
        doc.font('Helvetica');
        materials.forEach((material: any, index: number) => {
          const subtotal      = material.totalCost || 0;
          const materialName  = material.materialName || material.name || material.description || 'Material sem nome';
 
          if (index % 2 === 0) {
            doc.rect(tableLeft, currentY, tableWidth, 16).fill('#F8F8F8');
          }
 
          doc.fontSize(8).fillColor('#333333')
             .text(materialName,                                           colMaterial  + 5, currentY + 4, { width: tableWidth * 0.40, ellipsis: true })
             .text(`${material.quantity || 0} ${material.unit || 'un'}`,  colQtd       + 5, currentY + 4, { width: tableWidth * 0.12 })
             .text(`R$ ${(material.unitCost || 0).toFixed(2)}`,           colUnit      + 5, currentY + 4, { width: tableWidth * 0.18 })
             .text(`R$ ${subtotal.toFixed(2)}`,                           colSubtotal  + 5, currentY + 4, { width: tableWidth * 0.18 });
 
          currentY += 18;
        });
 
        // Linha de total em escuro
        doc.rect(tableLeft, currentY, tableWidth, 20).fill('#3D4654');
        doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('TOTAL',                              colMaterial  + 5, currentY + 5, { width: tableWidth * 0.70 })
           .text(`R$ ${totalMaterials.toFixed(2)}`,   colSubtotal  + 5, currentY + 5, { width: tableWidth * 0.18 });
        currentY += 30;
      }
 
      // ============================================================
      // 💰 VALORES ESTIMADOS / FINAIS
      // ============================================================
      if (workOrder.estimatedValue || workOrder.finalValue) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Valores', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica');
 
        if (workOrder.estimatedValue) {
          doc.text(`Valor Estimado: R$ ${workOrder.estimatedValue.toFixed(2)}`, leftMargin, currentY);
          currentY += 14;
        }
        if (workOrder.finalValue) {
          doc.text(`Valor Final: R$ ${workOrder.finalValue.toFixed(2)}`, leftMargin, currentY);
          currentY += 14;
        }
      }
 
      // ============================================================
      // 🔍 INSPEÇÕES E CHECKLISTS
      // Cada tarefa pode ter vários checklists. Cada checklist
      // exibe: dados técnicos em 2 colunas, inspeção visual
      // com CHECKBOXES visuais e observações técnicas.
      // ============================================================
      if (tasksWithChecklists && tasksWithChecklists.length > 0) {
 
        if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Inspeções', leftMargin, currentY);
        currentY += 20;
 
        for (const task of tasksWithChecklists) {
 
          // --- Título e status da tarefa ---
          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(task.title, leftMargin, currentY);
          currentY += 15;
 
          const statusText = task.status === 'concluida' ? 'Concluída'
            : task.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';
 
          doc.fontSize(8).fillColor('#666666').font('Helvetica').text(`Status: ${statusText}`, leftMargin, currentY);
          currentY += 12;
 
          if (task.checklists && task.checklists.length > 0) {
            for (const checklist of task.checklists) {
 
              if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
              // --- Borda superior dourada do card ---
              const cardX     = leftMargin;
              const cardWidth = contentWidth;
              doc.strokeColor(goldColor).lineWidth(3)
                 .moveTo(cardX, currentY).lineTo(cardX + cardWidth, currentY).stroke();
              currentY += 8;
 
              // --- Header cinza do card com nome do checklist ---
              doc.rect(cardX, currentY, cardWidth, 20).fill('#F5F5F5');
              doc.fontSize(10).fillColor(goldColor).font('Helvetica-Bold')
                 .text(`${checklist.customTitle}`, cardX + 8, currentY + 4, { width: cardWidth - 16 });
              currentY += 25;
 
              // --- Linha com Marca e Potência (se existirem) ---
              if (checklist.brand || checklist.power) {
                doc.fontSize(8).fillColor('#666666').font('Helvetica');
                doc.text(`Marca: ${checklist.brand || 'N/A'}`,     cardX + 8,            currentY, { width: cardWidth / 2 - 8 });
                doc.text(`Potência: ${checklist.power || 'N/A'}`,  cardX + cardWidth / 2, currentY, { width: cardWidth / 2 - 8 });
                currentY += 14;
              }
 
              currentY += 5;
 
              // --- Processamento das respostas do checklist ---
              if (checklist.responses) {
                try {
                  // Respostas podem vir como string JSON ou já como objeto
                  const responses = typeof checklist.responses === 'string'
                    ? JSON.parse(checklist.responses)
                    : checklist.responses;
 
                  // ==============================================
                  // ✅ INSPEÇÃO VISUAL — CHECKBOXES
                  //
                  // Antes: tabela com colunas OK / NÃO OK / N/A
                  // Agora: lista de itens com caixinhas visuais
                  //        desenhadas à mão no PDF, uma por linha.
                  //
                  // Estrutura de cada item em responses.visual_items:
                  //   { "Tubos": { OK: true, NOK: false, "N/A": false }, ... }
                  //
                  // Layout de cada linha:
                  //   [■ OK]  [■ NOK]  [■ N/A]   Nome do Item
                  // ==============================================
                  if (responses.visual_items) {
 
                    // Título da seção
                    doc.rect(cardX + 5, currentY, cardWidth - 10, 16).fill('#E8E8E8');
                    doc.fontSize(9).fillColor('#333333').font('Helvetica-Bold')
                       .text('Inspeção Visual', cardX + 10, currentY + 3);
                    currentY += 22;
 
                    // Parseia se vier como string
                    const visualData = typeof responses.visual_items === 'string'
                      ? JSON.parse(responses.visual_items)
                      : responses.visual_items;
 
                    // Lista de itens que podem aparecer na inspeção visual
                    const items = ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'];
 
                    // Dimensões dos checkboxes e espaçamentos
                    const checkSize   = 9;  // Lado do quadrado do checkbox
                    const checkGap    = 4;  // Espaço entre checkbox e label
                    const colSpacing  = 55; // Largura de cada bloco "checkbox + label"
                    const rowHeight   = 16; // Altura de cada linha de item
                    const startX      = cardX + 10; // X inicial da linha
 
                    // Renderiza cada item como uma linha de checkboxes
                    items.forEach((item) => {
                      if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
                      const itemData = visualData[item] || {};
 
                      // Fundo suave alternado por item
                      doc.rect(cardX + 5, currentY, cardWidth - 10, rowHeight).fill('#FAFAFA');
 
                      // --- Nome do item à esquerda ---
                      doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold')
                         .text(item, startX, currentY + 3, { width: 70 });
 
                      // --- Posição base dos 3 checkboxes (OK, NOK, N/A) ---
                      const checkboxStartX = startX + 80;
 
                      // Dados de cada opção: label, chave no objeto, cor quando marcado
                      const opcoes = [
                        { label: 'OK',   key: 'OK',   color: '#2E7D32' }, // Verde para OK
                        { label: 'NOK',  key: 'NOK',  color: '#C62828' }, // Vermelho para NOK
                        { label: 'N/A',  key: 'N/A',  color: '#757575' }, // Cinza para N/A
                      ];
 
                      opcoes.forEach((opcao, idx) => {
                        const boxX     = checkboxStartX + (idx * colSpacing);
                        const boxY     = currentY + (rowHeight - checkSize) / 2; // Centraliza verticalmente
                        const marcado  = !!itemData[opcao.key];
 
                        // Desenha o quadrado externo do checkbox
                        doc.rect(boxX, boxY, checkSize, checkSize)
                           .strokeColor(marcado ? opcao.color : '#AAAAAA')
                           .lineWidth(0.8)
                           .stroke();
 
                        // Se marcado: preenche o interior com a cor da opção
                        if (marcado) {
                          doc.rect(boxX + 1.5, boxY + 1.5, checkSize - 3, checkSize - 3)
                             .fill(opcao.color);
 
                          // Desenha o "✓" branco dentro do quadrado preenchido
                          doc.fontSize(6).fillColor('#FFFFFF').font('Helvetica-Bold')
                             .text('✓', boxX + 1, boxY, { width: checkSize, align: 'center' });
                        }
 
                        // Label da opção ao lado do checkbox (OK / NOK / N/A)
                        doc.fontSize(7)
                           .fillColor(marcado ? opcao.color : '#999999')
                           .font(marcado ? 'Helvetica-Bold' : 'Helvetica')
                           .text(opcao.label, boxX + checkSize + checkGap, currentY + 3, { width: 30 });
                      });
 
                      currentY += rowHeight;
                    });
 
                    currentY += 10; // Espaço após a lista de checkboxes
                  }
 
                  // ==============================================
                  // 🔧 DADOS TÉCNICOS (duas colunas)
                  // Exibe todos os campos do checklist exceto
                  // os campos de inspeção visual e observações.
                  // ==============================================
                  const technicalFields = Object.entries(responses).filter(([key]) =>
                    key !== 'visual_items'  &&
                    key !== 'observations'  &&
                    key !== 'observacoes'   &&
                    key !== 'notes'         &&
                    key !== 'comments'
                  );
 
                  if (technicalFields.length > 0) {
                    doc.fontSize(9).fillColor(goldColor).font('Helvetica-Bold')
                       .text('Dados Técnicos', cardX + 10, currentY);
                    currentY += 15;
 
                    // Divide os campos ao meio: metade vai para cada coluna
                    const midPoint         = Math.ceil(technicalFields.length / 2);
                    const leftColumnFields = technicalFields.slice(0, midPoint);
                    const rightColumnFields = technicalFields.slice(midPoint);
 
                    const startY = currentY;
                    let col1Y = startY;
                    let col2Y = startY;
 
                    // Coluna esquerda
                    leftColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        doc.fontSize(8).fillColor('#333333').font('Helvetica')
                           .text(`${formattedLabel}: ${formatFieldValue(value)}`, cardX + 10, col1Y, { width: cardWidth / 2 - 15 });
                        col1Y += 12;
                      }
                    });
 
                    // Coluna direita
                    rightColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        const formattedLabel = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        doc.fontSize(8).fillColor('#333333').font('Helvetica')
                           .text(`${formattedLabel}: ${formatFieldValue(value)}`, cardX + cardWidth / 2 + 5, col2Y, { width: cardWidth / 2 - 15 });
                        col2Y += 12;
                      }
                    });
 
                    // currentY avança para abaixo das duas colunas
                    currentY = Math.max(col1Y, col2Y) + 10;
                  }
 
                  // ==============================================
                  // 📝 OBSERVAÇÕES TÉCNICAS DO CHECKLIST
                  // Aceita tanto a chave "observations" quanto
                  // "observacoes" (variação em português).
                  // ==============================================
                  const obsContent = responses.observations || responses.observacoes;
 
                  if (obsContent && obsContent.trim() !== '') {
                    if (currentY > doc.page.height - 120) { doc.addPage(); currentY = 40; }
 
                    const cleanObs  = obsContent.trim();
                    const textWidth = cardWidth - 25;
 
                    // Calcula altura necessária para o texto (para dimensionar o fundo)
                    const textHeight = doc.heightOfString(cleanObs, { width: textWidth, align: 'justify' });
 
                    doc.fontSize(9).fillColor(goldColor).font('Helvetica-Bold')
                       .text('Observações Técnicas:', cardX + 10, currentY);
                    currentY += 12;
 
                    // Fundo levemente cinza para destacar o bloco de observações
                    doc.rect(cardX + 8, currentY, cardWidth - 16, textHeight + 8).fill('#F9F9F9');
 
                    doc.fontSize(8).fillColor('#333333').font('Helvetica')
                       .text(cleanObs, cardX + 12, currentY + 4, {
                         width: textWidth,
                         align: 'justify',
                         lineGap: 2
                       });
 
                    currentY += textHeight + 20;
                  }
 
                  // Linha separadora ao final do card
                  doc.strokeColor(goldColor).lineWidth(1)
                     .moveTo(cardX, currentY).lineTo(cardX + cardWidth, currentY).stroke();
                  currentY += 15;
 
                } catch (e) {
                  console.error('[PDF] Erro ao parsear respostas do checklist:', e);
                }
              }
 
              currentY += 8;
            }
          }
 
          currentY += 15;
        }
      }
 
      // ============================================================
      // 💬 OBSERVAÇÕES / COMENTÁRIOS PARA O CLIENTE
      // ============================================================
      if (comments && comments.length > 0) {
        if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Observações', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica');
 
        comments.forEach((comment: any) => {
          doc.font('Helvetica-Bold').text(`${formatDate(comment.createdAt)}:`, leftMargin, currentY);
          currentY += 12;
          doc.font('Helvetica').text(comment.comment, leftMargin, currentY, { width: contentWidth, align: 'justify' });
          currentY = doc.y + 10;
        });
 
        currentY += 10;
      }
 
      // ============================================================
      // 📸 RELATÓRIO FOTOGRÁFICO (grade de 3 colunas)
      // Filtra apenas os anexos que são imagens e os exibe
      // em grade de 3 por linha, baixando do Cloudinary via axios.
      // ============================================================
      const images = attachments?.filter(a => a.fileType?.includes('image')) || [];
 
      if (images.length > 0) {
        if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Relatório Fotográfico', leftMargin, currentY);
        currentY += 25;
 
        const numeroColunas = 3;
        const gap       = 10;
        const imgWidth  = (contentWidth - (gap * (numeroColunas - 1))) / numeroColunas;
        const imgHeight = 100;
 
        for (let i = 0; i < images.length; i++) {
          const col  = i % numeroColunas; // Coluna atual (0, 1 ou 2)
          const xPos = leftMargin + (col * (imgWidth + gap));
 
          // Avança o Y só quando volta para a primeira coluna (nova linha)
          if (i > 0 && col === 0) {
            currentY += imgHeight + gap + 15;
          }
 
          if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
          try {
            // Baixa a imagem do Cloudinary como buffer de bytes
            const response = await axios.get(images[i].fileUrl, { responseType: 'arraybuffer' });
 
            // 'fit' mantém a proporção original sem distorcer
            doc.image(response.data, xPos, currentY, {
              width: imgWidth, height: imgHeight,
              fit: [imgWidth, imgHeight],
              align: 'center', valign: 'center'
            });
          } catch (e) {
            // Se a imagem falhar, desenha um retângulo placeholder
            console.error("Erro na imagem JNC", e);
            doc.rect(xPos, currentY, imgWidth, imgHeight).strokeColor('#CCCCCC').stroke();
          }
        }
 
        // Avança o Y para após a última linha de fotos
        currentY += imgHeight + 35;
      }
 
      // ============================================================
      // ✍️ BLOCO DE ASSINATURAS (fixado no rodapé da página)
      //
      // Lógica:
      //  - A assinatura sempre fica a 160px do fim da folha
      //  - Se o conteúdo acima já chegou lá, cria nova página
      //  - Se só o técnico assinou, a assinatura é centralizada
      //  - Se os dois assinaram, ficam lado a lado (esq. e dir.)
      // ============================================================
      const posicaoFixaRodape = doc.page.height - 160;
 
      if (currentY > posicaoFixaRodape - 20) {
        doc.addPage();
        currentY = 40;
      }
 
      const sigStartY = posicaoFixaRodape; // Posição Y fixa das assinaturas
 
      const clientSig    = (workOrder as any).clientSignature;
      const hasClientSig = clientSig && clientSig.length > 50;
 
      // Se não houver assinatura do cliente, centraliza a do técnico
      const sigWidth = hasClientSig ? (contentWidth / 2) - 30 : 250;
      const sigCol1X = hasClientSig ? leftMargin : (doc.page.width - sigWidth) / 2;
      const sigCol2X = doc.page.width / 2 + 15;
 
      const imageY  = sigStartY;
      const sigLineY = imageY + 45; // Linha da assinatura fica 45px abaixo da imagem
 
      // --- Assinatura do Técnico (JNC) ---
      const collaboratorSig = (workOrder as any).collaboratorSignature;
      if (collaboratorSig) {
        try {
          const base64Data = collaboratorSig.includes(',') ? collaboratorSig.split(',')[1] : collaboratorSig;
          doc.image(Buffer.from(base64Data, 'base64'), sigCol1X + (sigWidth / 4), imageY, { width: sigWidth / 2, height: 40 });
        } catch (e) { console.error('Erro na assinatura técnica', e); }
      }
 
      // Linha e rótulo da assinatura do técnico
      doc.strokeColor('#333333').lineWidth(0.5)
         .moveTo(sigCol1X, sigLineY).lineTo(sigCol1X + sigWidth, sigLineY).stroke();
 
      const nomeColaborador = (workOrder as any).collaboratorName || (workOrder as any).technicianName || 'Técnico Responsável';
      doc.fontSize(8).fillColor('#666666').font('Helvetica')
         .text('Assinatura do Colaborador', sigCol1X, sigLineY + 5, { width: sigWidth, align: 'center' })
         .text(`Nome: ${nomeColaborador}`,  sigCol1X, sigLineY + 15, { width: sigWidth, align: 'center' });
 
      // --- Assinatura do Cliente (somente se existir) ---
      if (hasClientSig) {
        try {
          const base64Data = clientSig.includes(',') ? clientSig.split(',')[1] : clientSig;
          doc.image(Buffer.from(base64Data, 'base64'), sigCol2X + (sigWidth / 4), imageY, { width: sigWidth / 2, height: 40 });
          doc.strokeColor('#333333').lineWidth(0.5)
             .moveTo(sigCol2X, sigLineY).lineTo(sigCol2X + sigWidth, sigLineY).stroke();
 
          const nomeCliente = (workOrder as any).clientName || 'Cliente';
          doc.fontSize(8).fillColor('#666666').font('Helvetica')
             .text('Assinatura do Cliente', sigCol2X, sigLineY + 5,  { width: sigWidth, align: 'center' })
             .text(`Nome: ${nomeCliente}`,  sigCol2X, sigLineY + 15, { width: sigWidth, align: 'center' });
        } catch (e) { console.error('Erro na assinatura do cliente', e); }
      }
 
      currentY = sigLineY + 40;
 
      // ============================================================
      // 📋 RODAPÉ: Texto eletrônico centralizado no fim da página
      // ============================================================
      const footerTextY = doc.page.height - 30;
      const footerText  = 'Este documento foi gerado eletronicamente pelo sistema Soluteg';
      const footerWidth = doc.widthOfString(footerText);
      const footerX     = (doc.page.width - footerWidth) / 2;
 
      doc.fontSize(7).fillColor('#999999').font('Helvetica')
         .text(footerText, footerX, footerTextY, { lineBreak: false });
 
      // Finaliza o documento — dispara o evento 'end' que resolve a Promise
      doc.end();
 
    } catch (error) {
      // Captura qualquer erro inesperado durante a geração e evita travar o servidor
      console.error("Erro geral na geração do PDF:", error);
    }
  });
}
 
 
// ============================================================
// 🔧 FUNÇÕES AUXILIARES
// Traduzem códigos internos para português legível e formatam
// datas e valores para exibição no PDF.
// ============================================================
 
/** Traduz o status técnico da OS para português */
function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'aberta':               'Aberta',
    'aguardando_aprovacao': 'Aguardando Aprovação',
    'aprovada':             'Aprovada',
    'rejeitada':            'Rejeitada',
    'em_andamento':         'Em Andamento',
    'concluida':            'Concluída',
    'aguardando_pagamento': 'Aguardando Pagamento',
    'cancelada':            'Cancelada'
  };
  return statusMap[status] || status;
}
 
/** Traduz a prioridade da OS para português */
function translatePriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'normal':  'Normal',
    'alta':    'Alta',
    'critica': 'Crítica'
  };
  return priorityMap[priority] || priority;
}
 
/** Traduz o tipo da OS para português */
function translateType(type: string): string {
  const typeMap: Record<string, string> = {
    'rotina':      'Rotina',
    'emergencial': 'Emergencial',
    'orcamento':   'Orçamento'
  };
  return typeMap[type] || type;
}
 
/** Formata uma data para o padrão brasileiro (dd/mm/aaaa) */
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}
 
/**
 * Formata qualquer valor de campo do checklist para string legível.
 * Trata booleanos, números e traduz valores comuns (ok, nok, etc.)
 */
function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number')  return value.toString();
  if (typeof value === 'string') {
    const translations: Record<string, string> = {
      'ok':         'Ok',
      'nok':        'NOk',
      'n_a':        'N/A',
      'monofasico': 'Monofásico',
      'bifasico':   'Bifásico',
      'trifasico':  'Trifásico'
    };
    return translations[value.toLowerCase()] || value;
  }
  return String(value);
}