// ============================================================
// 📁 ARQUIVO: pdfGenerator.ts
// 🎯 FUNÇÃO: Gera o PDF completo de uma Ordem de Serviço.
// ============================================================
 
import PDFDocument from 'pdfkit';
import { getWorkOrderById } from './workOrdersDb';
import { getMaterialsByWorkOrderId, getCommentsByWorkOrderId, getAttachmentsByWorkOrderId } from './workOrdersAuxDb';
import { getInspectionTasksByWorkOrder, getChecklistsByInspectionTask } from './checklistsDb';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
 
export async function generateWorkOrderPDF(workOrderId: number): Promise<Buffer> {
 
  const workOrder = await getWorkOrderById(workOrderId);
  if (!workOrder) throw new Error('Ordem de serviço não encontrada');
 
  const materials        = await getMaterialsByWorkOrderId(workOrderId);
  const comments         = await getCommentsByWorkOrderId(workOrderId, false);
  const inspectionTasks  = await getInspectionTasksByWorkOrder(workOrderId);
  const attachments      = await getAttachmentsByWorkOrderId(workOrderId);
 
  const tasksWithChecklists = await Promise.all(
    inspectionTasks.map(async (task) => ({
      ...task,
      checklists: await getChecklistsByInspectionTask(task.id)
    }))
  );
 
  const totalMaterials = materials.reduce((sum: number, m: any) => sum + (m.totalCost || 0), 0);
 
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 },
        autoFirstPage: true,
        bufferPages: true
      });
 
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
 
      const pageWidth    = doc.page.width;
      const leftMargin   = 40;
      const rightMargin  = pageWidth - 40;
      const goldColor    = '#D4A84B';
      const contentWidth = pageWidth - 80;
 
      // ============================================================
      // 🏷️ CABEÇALHO
      // ============================================================
      let headerY = 30;
 
      const possibleLogoPaths = [
        path.join(__dirname, 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'server', 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'logo-jnc-transparente.png'),
        '/home/ubuntu/soluteg-novo/server/logo-jnc-transparente.png'
      ];
 
      let logoPath = '';
      for (const p of possibleLogoPaths) {
        if (fs.existsSync(p)) { logoPath = p; break; }
      }
 
      if (logoPath) {
        const logoX = (pageWidth - 80) / 2;
        doc.image(logoPath, logoX, headerY, { width: 80, height: 80 });
        headerY += 90;
      }
 
      doc.fontSize(18).fillColor('#333333').font('Helvetica-Bold')
         .text('ORDEM DE SERVIÇO', leftMargin, headerY, { width: contentWidth, align: 'center' });
      headerY += 25;
 
      doc.fontSize(14).fillColor(goldColor).font('Helvetica-Bold')
         .text(workOrder.osNumber || `OS-${workOrderId}`, leftMargin, headerY, { width: contentWidth, align: 'center' });
      headerY += 20;
 
      doc.fontSize(9).fillColor('#666666').font('Helvetica')
         .text(`Data: ${formatDate(workOrder.createdAt)}`, leftMargin, headerY, { width: contentWidth, align: 'right' });
      headerY += 15;
 
      doc.strokeColor(goldColor).lineWidth(2)
         .moveTo(leftMargin, headerY).lineTo(rightMargin, headerY).stroke();
      headerY += 15;
 
      // ============================================================
      // 📋 INFORMAÇÕES DA OS E DO CLIENTE
      // ============================================================
      const col1X    = leftMargin;
      const col2X    = pageWidth / 2 + 10;
      const colWidth = (contentWidth / 2) - 10;
      let infoY = headerY;
 
      doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Informações da Ordem', col1X, infoY);
      infoY += 18;
      doc.fontSize(9).fillColor('#333333').font('Helvetica');
      doc.text(`Título: ${workOrder.title || 'Sem título'}`, col1X, infoY, { width: colWidth }); infoY += 14;
      doc.text(`Status: ${translateStatus(workOrder.status)}`, col1X, infoY, { width: colWidth }); infoY += 14;
      doc.text(`Prioridade: ${translatePriority(workOrder.priority)}`, col1X, infoY, { width: colWidth }); infoY += 14;
      doc.text(`Tipo: ${translateType(workOrder.type)}`, col1X, infoY, { width: colWidth });
      if (workOrder.scheduledDate) {
        infoY += 14;
        doc.text(`Data Agendada: ${formatDate(workOrder.scheduledDate)}`, col1X, infoY, { width: colWidth });
      }
 
      let clientY = headerY;
      doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Informações do Cliente', col2X, clientY);
      clientY += 18;
      doc.fontSize(9).fillColor('#333333').font('Helvetica');
      doc.text(`Nome: ${workOrder.clientName || 'Não informado'}`, col2X, clientY, { width: colWidth }); clientY += 14;
      doc.text(`Telefone: ${workOrder.clientPhone || 'Não informado'}`, col2X, clientY, { width: colWidth });
      if (workOrder.clientEmail)   { clientY += 14; doc.text(`E-mail: ${workOrder.clientEmail}`, col2X, clientY, { width: colWidth }); }
      if (workOrder.clientAddress) { clientY += 14; doc.text(`Endereço: ${workOrder.clientAddress}`, col2X, clientY, { width: colWidth }); }
 
      let currentY = Math.max(infoY, clientY) + 25;
 
      // ============================================================
      // 📝 DESCRIÇÃO
      // ============================================================
      if (workOrder.description) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Descrição', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica')
           .text(workOrder.description, leftMargin, currentY, { width: contentWidth, align: 'justify' });
        currentY = doc.y + 20;
      }
 
      // ============================================================
      // 🧱 MATERIAIS
      // ============================================================
      if (materials && materials.length > 0) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Materiais', leftMargin, currentY);
        currentY += 15;
 
        const tableLeft   = leftMargin;
        const tableWidth  = contentWidth;
        const colMaterial = tableLeft;
        const colQtd      = tableLeft + tableWidth * 0.45;
        const colUnit     = tableLeft + tableWidth * 0.60;
        const colSubtotal = tableLeft + tableWidth * 0.80;
 
        doc.rect(tableLeft, currentY, tableWidth, 18).fill(goldColor);
        doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Material',    colMaterial + 5, currentY + 5, { width: tableWidth * 0.40 })
           .text('Qtd',         colQtd      + 5, currentY + 5, { width: tableWidth * 0.12 })
           .text('Valor Unit.', colUnit     + 5, currentY + 5, { width: tableWidth * 0.18 })
           .text('Subtotal',    colSubtotal + 5, currentY + 5, { width: tableWidth * 0.18 });
        currentY += 20;
 
        materials.forEach((material: any, index: number) => {
          const subtotal     = material.totalCost || 0;
          const materialName = material.materialName || material.name || material.description || 'Material sem nome';
          if (index % 2 === 0) doc.rect(tableLeft, currentY, tableWidth, 16).fill('#F8F8F8');
          doc.fontSize(8).fillColor('#333333')
             .text(materialName,                                          colMaterial + 5, currentY + 4, { width: tableWidth * 0.40, ellipsis: true })
             .text(`${material.quantity || 0} ${material.unit || 'un'}`, colQtd      + 5, currentY + 4, { width: tableWidth * 0.12 })
             .text(`R$ ${(material.unitCost || 0).toFixed(2)}`,          colUnit     + 5, currentY + 4, { width: tableWidth * 0.18 })
             .text(`R$ ${subtotal.toFixed(2)}`,                          colSubtotal + 5, currentY + 4, { width: tableWidth * 0.18 });
          currentY += 18;
        });
 
        doc.rect(tableLeft, currentY, tableWidth, 20).fill('#3D4654');
        doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('TOTAL',                            colMaterial + 5, currentY + 5, { width: tableWidth * 0.70 })
           .text(`R$ ${totalMaterials.toFixed(2)}`, colSubtotal + 5, currentY + 5, { width: tableWidth * 0.18 });
        currentY += 30;
      }
 
      // ============================================================
      // 💰 VALORES
      // ============================================================
      if (workOrder.estimatedValue || workOrder.finalValue) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Valores', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica');
        if (workOrder.estimatedValue) { doc.text(`Valor Estimado: R$ ${workOrder.estimatedValue.toFixed(2)}`, leftMargin, currentY); currentY += 14; }
        if (workOrder.finalValue)     { doc.text(`Valor Final: R$ ${workOrder.finalValue.toFixed(2)}`, leftMargin, currentY); currentY += 14; }
      }
 
      // ============================================================
      // 🔍 INSPEÇÕES E CHECKLISTS
      // ============================================================
      if (tasksWithChecklists && tasksWithChecklists.length > 0) {
 
        if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Inspeções', leftMargin, currentY);
        currentY += 20;
 
        for (const task of tasksWithChecklists) {
          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(task.title, leftMargin, currentY);
          currentY += 15;
 
          const statusText = task.status === 'concluida' ? 'Concluída'
            : task.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';
          doc.fontSize(8).fillColor('#666666').font('Helvetica').text(`Status: ${statusText}`, leftMargin, currentY);
          currentY += 12;
 
          if (task.checklists && task.checklists.length > 0) {
            for (const checklist of task.checklists) {
 
              if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
              const cardX     = leftMargin;
              const cardWidth = contentWidth;
 
              // Borda superior dourada do card
              doc.strokeColor(goldColor).lineWidth(3)
                 .moveTo(cardX, currentY).lineTo(cardX + cardWidth, currentY).stroke();
              currentY += 8;
 
              // Header cinza do card
              doc.rect(cardX, currentY, cardWidth, 20).fill('#F5F5F5');
              doc.fontSize(10).fillColor(goldColor).font('Helvetica-Bold')
                 .text(`${checklist.customTitle}`, cardX + 8, currentY + 4, { width: cardWidth - 16 });
              currentY += 25;
 
              // Marca e potência
              if (checklist.brand || checklist.power) {
                doc.fontSize(8).fillColor('#666666').font('Helvetica');
                doc.text(`Marca: ${checklist.brand || 'N/A'}`,    cardX + 8,             currentY, { width: cardWidth / 2 - 8 });
                doc.text(`Potência: ${checklist.power || 'N/A'}`, cardX + cardWidth / 2, currentY, { width: cardWidth / 2 - 8 });
                currentY += 14;
              }
 
              currentY += 5;
 
              if (checklist.responses) {
                try {
                  const responses = typeof checklist.responses === 'string'
                    ? JSON.parse(checklist.responses)
                    : checklist.responses;
 
                  // ================================================
                  // ✅ INSPEÇÃO VISUAL — BADGES OK / NOK
                  //
                  // ⚠️ IMPORTANTE: os dados NÃO chegam como objeto
                  // aninhado. Chegam como CHAVES PLANAS no objeto
                  // responses, com o prefixo "visual_items_":
                  //
                  //   "visual_items_Tubos_OK": "Sim"
                  //   "visual_items_Sala_OK": "Não"
                  //   "visual_items_Sala_N/A": "Sim"
                  //   "visual_items_Acionamento_NOK": "Sim"
                  //
                  // Lógica:
                  //   1. Pega todas as chaves com prefixo visual_items_
                  //   2. Extrai o nome do item e o estado (OK/NOK/N/A)
                  //   3. Agrupa em um objeto { ok, nok, na } por item
                  //   4. Renderiza badges — itens N/A são OMITIDOS
                  // ================================================
                  const visualKeys = Object.keys(responses).filter(k =>
                    k.toLowerCase().startsWith('visual_items_')
                  );
 
                  if (visualKeys.length > 0) {
 
                    // Título da seção com fundo cinza
                    doc.rect(cardX + 5, currentY, cardWidth - 10, 16).fill('#E8E8E8');
                    doc.fontSize(9).fillColor('#333333').font('Helvetica-Bold')
                       .text('Inspeção Visual', cardX + 10, currentY + 3);
                    currentY += 22;
 
                    // ── PASSO 1: Agrupa por nome do item ────────────
                    // Remove prefixo → separa no último "_" → classifica
                    const itemMap: Record<string, { ok: boolean; nok: boolean; na: boolean }> = {};
 
                    for (const key of visualKeys) {
                      // Remove "visual_items_" do início
                      const semPrefixo = key.replace(/^visual_items_/i, '');
 
                      // Separa no ÚLTIMO underscore para pegar o estado
                      // Ex: "Tubos_OK" → itemName="Tubos", state="OK"
                      // Ex: "Sala_N/A" → itemName="Sala",  state="N/A"
                      const ultimoUnderline = semPrefixo.lastIndexOf('_');
                      if (ultimoUnderline === -1) continue;
 
                      const itemName = semPrefixo.substring(0, ultimoUnderline);
                      const estado   = semPrefixo.substring(ultimoUnderline + 1).toUpperCase().replace(/\s/g, '');
                      const valor    = String(responses[key]).toLowerCase();
                      const marcado  = valor === 'sim' || valor === 'true' || valor === '1';
 
                      if (!itemMap[itemName]) itemMap[itemName] = { ok: false, nok: false, na: false };
 
                      if      (estado === 'OK')                              itemMap[itemName].ok  = marcado;
                      else if (estado === 'NOK')                             itemMap[itemName].nok = marcado;
                      else if (estado.includes('N') && estado.includes('A')) itemMap[itemName].na  = marcado;
                    }
 
                    // ── PASSO 2: Renderiza na ordem correta ─────────
                    const ordemConhecida = ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'];
                    const todosItens = [
                      ...ordemConhecida.filter(i => itemMap[i]),
                      ...Object.keys(itemMap).filter(i => !ordemConhecida.includes(i))
                    ];
 
                    const rowHeight = 18;
                    const badgeW    = 40;
                    const badgeH    = 12;
 
                    for (const itemName of todosItens) {
                      const est = itemMap[itemName];
 
                      // N/A → não aparece no PDF
                      if (est.na) continue;
 
                      if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
                      // Fundo suave
                      doc.rect(cardX + 5, currentY, cardWidth - 10, rowHeight).fill('#FAFAFA');
 
                      // Nome do item à esquerda
                      doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold')
                         .text(itemName, cardX + 10, currentY + 5, { width: 90 });
 
                      const okX    = cardX + 108;
                      const nokX   = okX + badgeW + 8;
                      const badgeY = currentY + 3;
 
                      // ── Badge OK ──
                      if (est.ok) {
                        // Verde preenchido com ✓
                        doc.roundedRect(okX, badgeY, badgeW, badgeH, 5).fill('#2E7D32');
                        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
                           .text('✓  OK', okX, badgeY + 2, { width: badgeW, align: 'center' });
                      } else {
                        // Cinza vazio
                        doc.roundedRect(okX, badgeY, badgeW, badgeH, 5)
                           .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
                        doc.fontSize(7).fillColor('#CCCCCC').font('Helvetica')
                           .text('OK', okX, badgeY + 2, { width: badgeW, align: 'center' });
                      }
 
                      // ── Badge NOK ──
                      if (est.nok) {
                        // Vermelho preenchido com ✗
                        doc.roundedRect(nokX, badgeY, badgeW, badgeH, 5).fill('#C62828');
                        doc.fontSize(7).fillColor('#FFFFFF').font('Helvetica-Bold')
                           .text('✗  NOK', nokX, badgeY + 2, { width: badgeW, align: 'center' });
                      } else {
                        // Cinza vazio
                        doc.roundedRect(nokX, badgeY, badgeW, badgeH, 5)
                           .strokeColor('#CCCCCC').lineWidth(0.5).stroke();
                        doc.fontSize(7).fillColor('#CCCCCC').font('Helvetica')
                           .text('NOK', nokX, badgeY + 2, { width: badgeW, align: 'center' });
                      }
 
                      currentY += rowHeight;
                    }
 
                    currentY += 10;
                  }
 
                  // ================================================
                  // 🔧 DADOS TÉCNICOS (duas colunas)
                  // Remove TUDO que começa com "visual_items_"
                  // e as chaves de observações.
                  // ================================================
                  const technicalFields = Object.entries(responses).filter(([key]) => {
                    const k = key.toLowerCase();
                    return !k.startsWith('visual_items_') &&
                           k !== 'observations'           &&
                           k !== 'observacoes'            &&
                           k !== 'notes'                  &&
                           k !== 'comments';
                  });
 
                  if (technicalFields.length > 0) {
                    doc.fontSize(9).fillColor(goldColor).font('Helvetica-Bold')
                       .text('Dados Técnicos', cardX + 10, currentY);
                    currentY += 15;
 
                    const midPoint          = Math.ceil(technicalFields.length / 2);
                    const leftColumnFields  = technicalFields.slice(0, midPoint);
                    const rightColumnFields = technicalFields.slice(midPoint);
 
                    let col1Y = currentY;
                    let col2Y = currentY;
 
                    leftColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        const fl = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        doc.fontSize(8).fillColor('#333333').font('Helvetica')
                           .text(`${fl}: ${formatFieldValue(value)}`, cardX + 10, col1Y, { width: cardWidth / 2 - 15 });
                        col1Y += 12;
                      }
                    });
 
                    rightColumnFields.forEach(([label, value]) => {
                      if (value !== null && value !== undefined && value !== '') {
                        const fl = label.charAt(0).toUpperCase() + label.slice(1).replace(/([A-Z])/g, ' $1');
                        doc.fontSize(8).fillColor('#333333').font('Helvetica')
                           .text(`${fl}: ${formatFieldValue(value)}`, cardX + cardWidth / 2 + 5, col2Y, { width: cardWidth / 2 - 15 });
                        col2Y += 12;
                      }
                    });
 
                    currentY = Math.max(col1Y, col2Y) + 10;
                  }
 
                  // ================================================
                  // 📝 OBSERVAÇÕES TÉCNICAS
                  // ================================================
                  const obsContent = responses.observations || responses.observacoes;
 
                  if (obsContent && obsContent.trim() !== '') {
                    if (currentY > doc.page.height - 120) { doc.addPage(); currentY = 40; }
 
                    const cleanObs   = obsContent.trim();
                    const textWidth  = cardWidth - 25;
                    const textHeight = doc.heightOfString(cleanObs, { width: textWidth, align: 'justify' });
 
                    doc.fontSize(9).fillColor(goldColor).font('Helvetica-Bold')
                       .text('Observações Técnicas:', cardX + 10, currentY);
                    currentY += 12;
 
                    doc.rect(cardX + 8, currentY, cardWidth - 16, textHeight + 8).fill('#F9F9F9');
                    doc.fontSize(8).fillColor('#333333').font('Helvetica')
                       .text(cleanObs, cardX + 12, currentY + 4, { width: textWidth, align: 'justify', lineGap: 2 });
 
                    currentY += textHeight + 20;
                  }
 
                  // Linha separadora do card
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
      // 💬 COMENTÁRIOS
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
      // 📸 RELATÓRIO FOTOGRÁFICO
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
          const col  = i % numeroColunas;
          const xPos = leftMargin + (col * (imgWidth + gap));
          if (i > 0 && col === 0) currentY += imgHeight + gap + 15;
          if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
          try {
            const response = await axios.get(images[i].fileUrl, { responseType: 'arraybuffer' });
            doc.image(response.data, xPos, currentY, {
              width: imgWidth, height: imgHeight,
              fit: [imgWidth, imgHeight], align: 'center', valign: 'center'
            });
          } catch (e) {
            doc.rect(xPos, currentY, imgWidth, imgHeight).strokeColor('#CCCCCC').stroke();
          }
        }
 
        currentY += imgHeight + 35;
      }
 
      // ============================================================
      // ✍️ ASSINATURAS
      // ============================================================
      const posicaoFixaRodape = doc.page.height - 160;
      if (currentY > posicaoFixaRodape - 20) { doc.addPage(); currentY = 40; }
 
      const sigStartY    = posicaoFixaRodape;
      const clientSig    = (workOrder as any).clientSignature;
      const hasClientSig = clientSig && clientSig.length > 50;
      const sigWidth     = hasClientSig ? (contentWidth / 2) - 30 : 250;
      const sigCol1X     = hasClientSig ? leftMargin : (doc.page.width - sigWidth) / 2;
      const sigCol2X     = doc.page.width / 2 + 15;
      const imageY       = sigStartY;
      const sigLineY     = imageY + 45;
 
      const collaboratorSig = (workOrder as any).collaboratorSignature;
      if (collaboratorSig) {
        try {
          const base64Data = collaboratorSig.includes(',') ? collaboratorSig.split(',')[1] : collaboratorSig;
          doc.image(Buffer.from(base64Data, 'base64'), sigCol1X + (sigWidth / 4), imageY, { width: sigWidth / 2, height: 40 });
        } catch (e) { console.error('Erro na assinatura técnica', e); }
      }
 
      doc.strokeColor('#333333').lineWidth(0.5)
         .moveTo(sigCol1X, sigLineY).lineTo(sigCol1X + sigWidth, sigLineY).stroke();
 
      const nomeColaborador = (workOrder as any).collaboratorName || (workOrder as any).technicianName || 'Técnico Responsável';
      doc.fontSize(8).fillColor('#666666').font('Helvetica')
         .text('Assinatura do Colaborador', sigCol1X, sigLineY + 5,  { width: sigWidth, align: 'center' })
         .text(`Nome: ${nomeColaborador}`,  sigCol1X, sigLineY + 15, { width: sigWidth, align: 'center' });
 
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
 
      // ============================================================
      // 📋 RODAPÉ
      // ============================================================
      const footerText  = 'Este documento foi gerado eletronicamente pelo sistema Soluteg';
      const footerWidth = doc.widthOfString(footerText);
      doc.fontSize(7).fillColor('#999999').font('Helvetica')
         .text(footerText, (doc.page.width - footerWidth) / 2, doc.page.height - 30, { lineBreak: false });
 
      doc.end();
 
    } catch (error) {
      console.error("Erro geral na geração do PDF:", error);
    }
  });
}
 
 
// ============================================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================================
 
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    'aberta': 'Aberta', 'aguardando_aprovacao': 'Aguardando Aprovação',
    'aprovada': 'Aprovada', 'rejeitada': 'Rejeitada', 'em_andamento': 'Em Andamento',
    'concluida': 'Concluída', 'aguardando_pagamento': 'Aguardando Pagamento', 'cancelada': 'Cancelada'
  };
  return map[status] || status;
}
 
function translatePriority(priority: string): string {
  return ({ 'normal': 'Normal', 'alta': 'Alta', 'critica': 'Crítica' } as any)[priority] || priority;
}
 
function translateType(type: string): string {
  return ({ 'rotina': 'Rotina', 'emergencial': 'Emergencial', 'orcamento': 'Orçamento' } as any)[type] || type;
}
 
function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR');
}
 
function formatFieldValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'number')  return value.toString();
  if (typeof value === 'string') {
    const t: Record<string, string> = {
      'ok': 'Ok', 'nok': 'NOk', 'n_a': 'N/A',
      'monofasico': 'Monofásico', 'bifasico': 'Bifásico', 'trifasico': 'Trifásico'
    };
    return t[value.toLowerCase()] || value;
  }
  return String(value);
}