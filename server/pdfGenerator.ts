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
 
// ============================================================
// 🔧 HELPERS DE FORMATAÇÃO
// ============================================================
 
/**
 * Verifica se um valor do banco representa "marcado/verdadeiro".
 *
 * ⚠️ CORREÇÃO: antes só checava 'sim' minúsculo.
 * Agora aceita qualquer variação: true, 1, "Sim", "sim", "SIM",
 * "true", "True", "1", "yes" — independente de maiúsculas.
 */
function isMarcado(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number')  return value === 1;
  const s = String(value).toLowerCase().trim();
  return s === 'sim' || s === 'true' || s === '1' || s === 'yes' || s === 'ok';
}
 
/**
 * Transforma uma chave interna em rótulo legível.
 * Ex: "corrente_1"        → "Corrente 1"
 *     "quantidade_bombas" → "Qtd. bombas"
 *     "tensao"            → "Tensão"
 */
function formatLabel(raw: string): string {
  const aliases: Record<string, string> = {
    tensão:            'Tensão',
    tensao:            'Tensão',
    fases:             'Fases',
    quantidade_bombas: 'Qtd. bombas',
    corrente_1:        'Corrente 1',
    corrente_2:        'Corrente 2',
    corrente_3:        'Corrente 3',
    corrente_4:        'Corrente 4',
    potencia:          'Potência',
    marca:             'Marca',
    modelo:            'Modelo',
    rpm:               'RPM',
    pressao:           'Pressão',
    vazao:             'Vazão',
  };
  const key = raw.toLowerCase().trim();
  if (aliases[key]) return aliases[key];
  return key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}
 
/**
 * Detecta a unidade correta e retorna [valor_limpo, unidade].
 *
 * ⚠️ CORREÇÃO: remove unidade já embutida no valor para evitar
 * duplicação (ex: "220V" + unidade "V" → aparecia "220V V").
 * Agora: "220V" → ["220", "V"]   /   "220" → ["220", "V"]
 */
function splitValueUnit(key: string, value: any): [string, string] {
  const k = key.toLowerCase();
 
  // Remove unidade colada no final do valor (ex: "220V", "7,5CV", "50Hz")
  const cleanValue = String(value)
    .replace(/\s*(V|A|CV|kW|Hz|RPM|rpm|bar|m³\/h)$/i, '')
    .replace('.', ',') // ponto → vírgula (padrão BR)
    .trim();
 
  if (k.startsWith('corrente')) return [cleanValue, 'A'];
  if (k === 'tensao')           return [cleanValue, 'V'];
  if (k === 'tensão')           return [cleanValue, 'V'];
  if (k === 'potencia')         return [cleanValue, 'CV'];
  if (k === 'nivel')            return [cleanValue, 'l'];
  if (k === 'frequencia')       return [cleanValue, 'Hz'];
  if (k === 'horimetro')        return [cleanValue, 'h'];
  if (k === 'horímetro')        return [cleanValue, 'h'];
  if (k === 'pressao')          return [cleanValue, 'bar'];
  if (k === 'vazao')            return [cleanValue, 'm³/h'];
  if (k === 'rpm')              return [cleanValue, 'rpm'];
  if (k === 'fases')            return [formatFieldValue(value), ''];
  
  return [formatFieldValue(value), ''];
}
 
// ============================================================
// 📄 FUNÇÃO PRINCIPAL
// ============================================================
export async function generateWorkOrderPDF(workOrderId: number): Promise<Buffer> {
 
    const workOrder = await getWorkOrderById(workOrderId);
    if (!workOrder) throw new Error('Ordem de serviço não encontrada');
 
    const materials       = await getMaterialsByWorkOrderId(workOrderId);
    const comments        = await getCommentsByWorkOrderId(workOrderId, false);
    const inspectionTasks = await getInspectionTasksByWorkOrder(workOrderId);
    const attachments     = await getAttachmentsByWorkOrderId(workOrderId);
 
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
      doc.on('end',  () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
 
      const pageWidth    = doc.page.width;
      const leftMargin   = 40;
      const rightMargin  = pageWidth - 40;
      const goldColor    = '#D4A84B';
      const contentWidth = pageWidth - 80;
 
      // ── CABEÇALHO ────────────────────────────────────────────
      let headerY = 30;
 
      const possibleLogoPaths = [
        path.join(__dirname, 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'server', 'logo-jnc-transparente.png'),
        path.join(process.cwd(), 'logo-jnc-transparente.png'),
        '/home/ubuntu/soluteg-novo/server/logo-jnc-transparente.png'
      ];
      let logoPath = '';
      for (const p of possibleLogoPaths) { if (fs.existsSync(p)) { logoPath = p; break; } }
      if (logoPath) {
        doc.image(logoPath, (pageWidth - 80) / 2, headerY, { width: 80, height: 80 });
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
      doc.strokeColor(goldColor).lineWidth(2).moveTo(leftMargin, headerY).lineTo(rightMargin, headerY).stroke();
      headerY += 15;
 
      // ── INFORMAÇÕES DA OS E DO CLIENTE ────────────────────────
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
      if (workOrder.scheduledDate) { infoY += 14; doc.text(`Data Agendada: ${formatDate(workOrder.scheduledDate)}`, col1X, infoY, { width: colWidth }); }
 
      let clientY = headerY;
      doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Informações do Cliente', col2X, clientY);
      clientY += 18;
      doc.fontSize(9).fillColor('#333333').font('Helvetica');
      doc.text(`Nome: ${workOrder.clientName || 'Não informado'}`, col2X, clientY, { width: colWidth }); clientY += 14;
      doc.text(`Telefone: ${workOrder.clientPhone || 'Não informado'}`, col2X, clientY, { width: colWidth });
      if (workOrder.clientEmail)   { clientY += 14; doc.text(`E-mail: ${workOrder.clientEmail}`, col2X, clientY, { width: colWidth }); }
      if (workOrder.clientAddress) { clientY += 14; doc.text(`Endereço: ${workOrder.clientAddress}`, col2X, clientY, { width: colWidth }); }
 
      let currentY = Math.max(infoY, clientY) + 25;
 
      // ── DESCRIÇÃO ─────────────────────────────────────────────
      if (workOrder.description) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Descrição', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica')
           .text(workOrder.description, leftMargin, currentY, { width: contentWidth, align: 'justify' });
        currentY = doc.y + 20;
      }
 
      // ── MATERIAIS ─────────────────────────────────────────────
      if (materials && materials.length > 0) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Materiais', leftMargin, currentY);
        currentY += 15;
        const tL = leftMargin, tW = contentWidth;
        const cM = tL, cQ = tL + tW * 0.45, cU = tL + tW * 0.60, cS = tL + tW * 0.80;
        doc.rect(tL, currentY, tW, 18).fill(goldColor);
        doc.fontSize(8).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('Material',    cM + 5, currentY + 5, { width: tW * 0.40 })
           .text('Qtd',         cQ + 5, currentY + 5, { width: tW * 0.12 })
           .text('Valor Unit.', cU + 5, currentY + 5, { width: tW * 0.18 })
           .text('Subtotal',    cS + 5, currentY + 5, { width: tW * 0.18 });
        currentY += 20;
        materials.forEach((m: any, i: number) => {
          const sub  = m.totalCost || 0;
          const nome = m.materialName || m.name || m.description || 'Material sem nome';
          if (i % 2 === 0) doc.rect(tL, currentY, tW, 16).fill('#F8F8F8');
          doc.fontSize(8).fillColor('#333333')
             .text(nome,                                            cM + 5, currentY + 4, { width: tW * 0.40, ellipsis: true })
             .text(`${m.quantity || 0} ${m.unit || 'un'}`,         cQ + 5, currentY + 4, { width: tW * 0.12 })
             .text(`R$ ${(m.unitCost || 0).toFixed(2)}`,           cU + 5, currentY + 4, { width: tW * 0.18 })
             .text(`R$ ${sub.toFixed(2)}`,                         cS + 5, currentY + 4, { width: tW * 0.18 });
          currentY += 18;
        });
        doc.rect(tL, currentY, tW, 20).fill('#3D4654');
        doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
           .text('TOTAL',                            cM + 5, currentY + 5, { width: tW * 0.70 })
           .text(`R$ ${totalMaterials.toFixed(2)}`, cS + 5, currentY + 5, { width: tW * 0.18 });
        currentY += 30;
      }
 
      // ── VALORES ───────────────────────────────────────────────
      if (workOrder.estimatedValue || workOrder.finalValue) {
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Valores', leftMargin, currentY);
        currentY += 15;
        doc.fontSize(9).fillColor('#333333').font('Helvetica');
        if (workOrder.estimatedValue) { doc.text(`Valor Estimado: R$ ${workOrder.estimatedValue.toFixed(2)}`, leftMargin, currentY); currentY += 14; }
        if (workOrder.finalValue)     { doc.text(`Valor Final: R$ ${workOrder.finalValue.toFixed(2)}`, leftMargin, currentY); currentY += 14; }
      }
 
      // ── INSPEÇÕES E CHECKLISTS ────────────────────────────────
      if (tasksWithChecklists && tasksWithChecklists.length > 0) {
        if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Inspeções', leftMargin, currentY);
        currentY += 20;
 
        for (const task of tasksWithChecklists) {
          doc.fontSize(10).fillColor('#333333').font('Helvetica-Bold').text(task.title, leftMargin, currentY);
          currentY += 15;
          const stTxt = task.status === 'concluida' ? 'Concluída' : task.status === 'em_andamento' ? 'Em Andamento' : 'Pendente';
          doc.fontSize(8).fillColor('#666666').font('Helvetica').text(`Status: ${stTxt}`, leftMargin, currentY);
          currentY += 14;
 
          if (task.checklists && task.checklists.length > 0) {
            for (const checklist of task.checklists) {
              if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
 
              const cardX = leftMargin, cardW = contentWidth;
 
              // Borda superior dourada
              doc.strokeColor(goldColor).lineWidth(3).moveTo(cardX, currentY).lineTo(cardX + cardW, currentY).stroke();
              currentY += 8;
 
              // Header do card
              doc.rect(cardX, currentY, cardW, 22).fill('#F5F5F5');
              doc.fontSize(10).fillColor(goldColor).font('Helvetica-Bold')
                 .text(checklist.customTitle, cardX + 10, currentY + 5, { width: cardW - 20 });
              currentY += 28;
 
              // Marca e Potência
              if (checklist.brand || checklist.power) {
                doc.fontSize(8).fillColor('#888888').font('Helvetica');
                doc.text(`Marca: ${checklist.brand || 'N/A'}`,    cardX + 10,            currentY, { width: cardW / 2 - 10 });
                doc.text(`Potência: ${checklist.power || 'N/A'}`, cardX + cardW / 2,     currentY, { width: cardW / 2 - 10 });
                currentY += 16;
              }
              currentY += 4;
 
              if (checklist.responses) {
                try {
                  const responses = typeof checklist.responses === 'string'
                    ? JSON.parse(checklist.responses) : checklist.responses;
 
                  // ================================================
                  // ✅ INSPEÇÃO VISUAL — 2 COLUNAS COM BADGES
                  //
                  // Dados chegam como chaves planas:
                  //   "visual_items_Tubos_OK": "Sim"  (ou true, "1", etc.)
                  //   "visual_items_Sala_N/A": "Sim"
                  //
                  // ⚠️ CORREÇÃO nos badges: usa isMarcado() em vez de
                  // comparar === 'sim', para aceitar qualquer variação
                  // de case e tipo que o banco possa mandar.
                  // ================================================
                  // Substitua a definição antiga por esta:
                 const visualKeys = Object.keys(responses).filter(k => {
                 const key = k.toLowerCase();
                 const value = String(responses[k]).trim().toUpperCase();
  
                  // Captura se começar com o prefixo OU se o valor for um status de inspeção
                  return key.startsWith('visual_items_') || 
                     value === 'OK' || 
                     value === 'NOK' || 
                     value === 'N/A' ||
                     value === 'NORMAL'; // Adicionado 'Normal' que aparece no Gerador 
                  });
 
                 if (visualKeys.length > 0) {
                 // 1. Define o estilo e escreve o texto
                  doc.fontSize(8).fillColor('#888888').font('Helvetica-Bold')
                  .text('INSPEÇÃO VISUAL', cardX + 10, currentY);

                  // 2. Aumente o incremento aqui. 
                  // Se a fonte é 8, currentY += 4 é muito pouco. Use pelo menos 10 ou 12.
                  currentY += 10; 

                  // 3. Desenha a linha
                  doc.strokeColor('#E0E0E0').lineWidth(0.5)
                  .moveTo(cardX + 10, currentY)
                  .lineTo(cardX + cardW - 10, currentY)
                  .stroke();

                  // 4. Espaço após a linha para o próximo conteúdo
                  currentY += 8;
                  }
 
                    // Agrupa por nome do item
                    const itemMap: Record<string, { ok: boolean; nok: boolean; na: boolean }> = {};
                    for (const key of visualKeys) {
                      const semPrefixo   = key.replace(/^visual_items_/i, '');
                      const ultimoUnder  = semPrefixo.lastIndexOf('_');
                      if (ultimoUnder === -1) continue;
                      const itemName = semPrefixo.substring(0, ultimoUnder);
                      const estado   = semPrefixo.substring(ultimoUnder + 1).toUpperCase().replace(/\s/g, '');
                      const marcado  = isMarcado(responses[key]); // ← usa isMarcado
 
                      if (!itemMap[itemName]) itemMap[itemName] = { ok: false, nok: false, na: false };
                      if      (estado === 'OK')                               itemMap[itemName].ok  = marcado;
                      else if (estado === 'NOK')                              itemMap[itemName].nok = marcado;
                      else if (estado.includes('N') && estado.includes('A')) itemMap[itemName].na  = marcado;
                    }
 
                    // Filtra N/A e mantém ordem conhecida
                    const ordemConhecida = ['Tubos', 'Acionamento', 'Boias', 'Painel', 'Sala', 'Ruído'];
                    const itensVisiveis  = [
                      ...ordemConhecida.filter(i => itemMap[i] && !itemMap[i].na),
                      ...Object.keys(itemMap).filter(i => !ordemConhecida.includes(i) && !itemMap[i].na)
                    ];
 
                    // Renderiza em 2 colunas
                    const colVisW   = (cardW - 20) / 2;
                    const col1VisX  = cardX + 10;
                    const col2VisX  = cardX + 10 + colVisW + 5;
                    const rowH      = 16;
                    const badgeW    = 36;
                    const badgeH    = 11;
                    const meioVis   = Math.ceil(itensVisiveis.length / 2);
 
                    const renderVisualCol = (items: string[], startX: number, startY: number) => {
                      let y = startY;
                      items.forEach((itemName) => {
                        const est   = itemMap[itemName];
                        const bgCol = y % (rowH * 2) < rowH ? '#FAFAFA' : '#FFFFFF';
                        doc.rect(startX, y, colVisW, rowH).fill(bgCol);
 
                        // Nome do item
                        doc.fontSize(8).fillColor('#333333').font('Helvetica-Bold')
                           .text(itemName, startX + 4, y + 4, { width: colVisW - badgeW * 2 - 20 });
 
                        const bY   = y + (rowH - badgeH) / 2;
                        const okX  = startX + colVisW - badgeW * 2 - 6;
                        const nokX = okX + badgeW + 4;
 
                        // Badge OK — verde se marcado, cinza vazio se não
                        if (est.ok) {
                          doc.roundedRect(okX, bY, badgeW, badgeH, 4).fill('#2E7D32');
                          doc.fontSize(6).fillColor('#FFFFFF').font('Helvetica-Bold')
                             .text('✓ OK', okX, bY + 2, { width: badgeW, align: 'center' });
                        } else {
                          doc.roundedRect(okX, bY, badgeW, badgeH, 4).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
                          doc.fontSize(6).fillColor('#CCCCCC').font('Helvetica')
                             .text('OK', okX, bY + 2, { width: badgeW, align: 'center' });
                        }
 
                        // Badge NOK — vermelho se marcado, cinza vazio se não
                        if (est.nok) {
                          doc.roundedRect(nokX, bY, badgeW, badgeH, 4).fill('#C62828');
                          doc.fontSize(6).fillColor('#FFFFFF').font('Helvetica-Bold')
                             .text('✗ NOK', nokX, bY + 2, { width: badgeW, align: 'center' });
                        } else {
                          doc.roundedRect(nokX, bY, badgeW, badgeH, 4).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
                          doc.fontSize(6).fillColor('#CCCCCC').font('Helvetica')
                             .text('NOK', nokX, bY + 2, { width: badgeW, align: 'center' });
                        }
 
                        y += rowH;
                      });
                      return y;
                    };
                  }
 
                    const col1EndY = renderVisualCol(itensVisiveis.slice(0, meioVis), col1VisX, currentY);
                    const col2EndY = renderVisualCol(itensVisiveis.slice(meioVis),    col2VisX, currentY);
                    
                    currentY = Math.max(col1EndY, col2EndY) + 10;
                    
                    } catch (e) {
                        console.error('Erro ao processar checklist.responses:', e);
                      }
                 } 
                  try {
                      const responses = typeof checklist.responses === 'string'
                 ? JSON.parse(checklist.responses) : checklist.responses;
                // ================================================
                 // 🔧 DADOS TÉCNICOS — grade 2 colunas
                  //
                  // Cada célula: rótulo pequeno (cinza) + valor em
                  // destaque + unidade automática ao lado.
                  //
                  // ⚠️ CORREÇÃO: splitValueUnit agora remove a unidade
                  // já embutida no valor antes de adicionar a sua
                  // (evita "220V V").
                  // ================================================
                  // Substitua a definição antiga por esta:
                  const technicalFields = Object.entries(responses).filter(([key, value]) => {
                  const k = key.toLowerCase();
                  const v = String(value).trim().toUpperCase();
  
               // Critérios para IGNORAR (não devem aparecer nos Dados Técnicos)
                const isVisual = k.startsWith('visual_items_') || v === 'OK' || v === 'NOK' || v === 'N/A' || v === 'NORMAL';
                const isObs = k.includes('observ') || k.includes('note') || k.includes('comment');
  
               return !isVisual && !isObs;
                  });
 
                  if (technicalFields.length > 0) {
                    doc.strokeColor('#E0E0E0').lineWidth(0.5)
                       .moveTo(cardX + 10, currentY).lineTo(cardX + cardW - 10, currentY).stroke();
                    currentY += 6;
                    doc.fontSize(8).fillColor('#888888').font('Helvetica-Bold')
                       .text('DADOS TÉCNICOS', cardX + 10, currentY);
                    currentY += 10;
 
                    const cellW    = (cardW - 20) / 2;
                    const cellH    = 28;
                    const col1TecX = cardX + 10;
                    const col2TecX = cardX + 10 + cellW + 4;
 
                    // Filtra campos com valor
                    const validFields = technicalFields.filter(([, v]) =>
                      v !== null && v !== undefined && v !== ''
                    );
 
                    validFields.forEach(([label, value], i) => {
                      const isLeft   = i % 2 === 0;
                      const cellX    = isLeft ? col1TecX : col2TecX;
                      const linhaIdx = Math.floor(i / 2);
 
                      // Avança Y apenas quando começa nova linha (coluna esquerda)
                      if (isLeft && i > 0) currentY += cellH;
 
                      if (currentY > doc.page.height - 100) { doc.addPage(); currentY = 40; }
 
                      // Fundo alternado por linha
                      if (linhaIdx % 2 === 0) {
                        doc.rect(cellX, currentY, cellW, cellH).fill('#F7F7F7');
                      }
 
                      // Rótulo
                      doc.fontSize(7).fillColor('#999999').font('Helvetica')
                         .text(formatLabel(label), cellX + 6, currentY + 4, { width: cellW - 8 });
 
                      // Valor + unidade
                      const [val, unit] = splitValueUnit(label, value);
                      doc.fontSize(10).fillColor('#222222').font('Helvetica-Bold')
                         .text(val, cellX + 6, currentY + 14, { continued: unit !== '' });
                      if (unit !== '') {
                        doc.fontSize(7).fillColor('#999999').font('Helvetica')
                           .text(` ${unit}`, { continued: false });
                      }
                    });
 
                    // Avança após a última linha
                    currentY += cellH + 8;
                  }
                
                  // ================================================
                  // 📝 OBSERVAÇÕES TÉCNICAS — blockquote dourado
                  // ================================================
                  const obsContent = responses.observations || responses.observacoes;
                  if (obsContent && obsContent.trim() !== '') {
                    if (currentY > doc.page.height - 120) { doc.addPage(); currentY = 40; }
 
                    const cleanObs   = obsContent.trim();
                    const obsW       = cardW - 30;
                    const textH      = doc.heightOfString(cleanObs, { width: obsW - 16, align: 'justify' });
                    const blockH     = textH + 20;
 
                    // Borda dourada à esquerda (estilo blockquote)
                    doc.strokeColor(goldColor).lineWidth(3)
                       .moveTo(cardX + 10, currentY).lineTo(cardX + 10, currentY + blockH).stroke();
 
                    doc.rect(cardX + 13, currentY, obsW, blockH).fill('#FDFAF4');
 
                    doc.fontSize(7).fillColor('#B8922A').font('Helvetica-Bold')
                       .text('OBSERVAÇÕES TÉCNICAS', cardX + 18, currentY + 5);
 
                    doc.fontSize(8).fillColor('#444444').font('Helvetica')
                       .text(cleanObs, cardX + 18, currentY + 16, {
                         width: obsW - 16, align: 'justify', lineGap: 2
                       });
 
                    currentY += blockH + 12;
                  }
 
                  // Linha separadora do card
                  doc.strokeColor(goldColor).lineWidth(1)
                    .moveTo(cardX, currentY).lineTo(cardX + cardW, currentY).stroke();
                    currentY += 14;
 
                     } catch (e) {
                        console.error('[PDF] Erro ao processar respostas do checklist:', e);
                        }
              }
 
      // ── COMENTÁRIOS ───────────────────────────────────────────
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
 
      // ── FOTOS ─────────────────────────────────────────────────
      const images = attachments?.filter(a => a.fileType?.includes('image')) || [];
      if (images.length > 0) {
        if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
        doc.fontSize(11).fillColor(goldColor).font('Helvetica-Bold').text('Relatório Fotográfico', leftMargin, currentY);
        currentY += 25;
        const numCols = 3, gap = 10;
        const imgW    = (contentWidth - gap * (numCols - 1)) / numCols;
        const imgH    = 100;
        for (let i = 0; i < images.length; i++) {
          const col  = i % numCols;
          const xPos = leftMargin + col * (imgW + gap);
          if (i > 0 && col === 0) currentY += imgH + gap + 15;
          if (currentY > doc.page.height - 150) { doc.addPage(); currentY = 40; }
          try {
            const resp = await axios.get(images[i].fileUrl, { responseType: 'arraybuffer' });
            doc.image(resp.data, xPos, currentY, { width: imgW, height: imgH, fit: [imgW, imgH], align: 'center', valign: 'center' });
          } catch { doc.rect(xPos, currentY, imgW, imgH).strokeColor('#CCCCCC').stroke(); }
        }
        currentY += imgH + 35;
      }
 
      // ── ASSINATURAS ───────────────────────────────────────────
      const posRodape    = doc.page.height - 160;
      if (currentY > posRodape - 20) { doc.addPage(); currentY = 40; }
 
      const clientSig    = (workOrder as any).clientSignature;
      const hasClientSig = clientSig && clientSig.length > 50;
      const sigWidth     = hasClientSig ? (contentWidth / 2) - 30 : 250;
      const sigCol1X     = hasClientSig ? leftMargin : (doc.page.width - sigWidth) / 2;
      const sigCol2X     = doc.page.width / 2 + 15;
      const imageY       = posRodape;
      const sigLineY     = imageY + 45;
 
      const collabSig = (workOrder as any).collaboratorSignature;
      if (collabSig) {
        try {
          const b64 = collabSig.includes(',') ? collabSig.split(',')[1] : collabSig;
          doc.image(Buffer.from(b64, 'base64'), sigCol1X + sigWidth / 4, imageY, { width: sigWidth / 2, height: 40 });
        } catch (e) { console.error('Erro na assinatura técnica', e); }
      }
      doc.strokeColor('#333333').lineWidth(0.5).moveTo(sigCol1X, sigLineY).lineTo(sigCol1X + sigWidth, sigLineY).stroke();
      const nomeColab = (workOrder as any).collaboratorName || (workOrder as any).technicianName || 'Técnico Responsável';
      doc.fontSize(8).fillColor('#666666').font('Helvetica')
         .text('Assinatura do Colaborador', sigCol1X, sigLineY + 5,  { width: sigWidth, align: 'center' })
         .text(`Nome: ${nomeColab}`,         sigCol1X, sigLineY + 15, { width: sigWidth, align: 'center' });
 
      if (hasClientSig) {
        try {
          const b64 = clientSig.includes(',') ? clientSig.split(',')[1] : clientSig;
          doc.image(Buffer.from(b64, 'base64'), sigCol2X + sigWidth / 4, imageY, { width: sigWidth / 2, height: 40 });
          doc.strokeColor('#333333').lineWidth(0.5).moveTo(sigCol2X, sigLineY).lineTo(sigCol2X + sigWidth, sigLineY).stroke();
          const nomeCliente = (workOrder as any).clientName || 'Cliente';
          doc.fontSize(8).fillColor('#666666').font('Helvetica')
             .text('Assinatura do Cliente', sigCol2X, sigLineY + 5,  { width: sigWidth, align: 'center' })
             .text(`Nome: ${nomeCliente}`,  sigCol2X, sigLineY + 15, { width: sigWidth, align: 'center' });
        } catch (e) { console.error('Erro na assinatura do cliente', e); }
      }
 
        // ── RODAPÉ ────────────────────────────────────────────────
       const footerText = 'Este documento foi gerado eletronicamente pelo sistema Soluteg';
       doc.fontSize(7).fillColor('#999999').font('Helvetica')
         .text(footerText, (doc.page.width - doc.widthOfString(footerText)) / 2, doc.page.height - 30, { lineBreak: false });
 
        doc.end();
 
      catch (error) {
      console.error('Erro geral na geração do PDF:', error);
      }
    }
  }
}
     
    });
    }
  
  

 
// ============================================================
// 🔧 FUNÇÕES AUXILIARES
// ============================================================
 
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    aberta: 'Aberta', aguardando_aprovacao: 'Aguardando Aprovação',
    aprovada: 'Aprovada', rejeitada: 'Rejeitada', em_andamento: 'Em Andamento',
    concluida: 'Concluída', aguardando_pagamento: 'Aguardando Pagamento', cancelada: 'Cancelada'
  };
  return map[status] || status;
}
function translatePriority(p: string): string {
  return ({ normal: 'Normal', alta: 'Alta', critica: 'Crítica' } as any)[p] || p;
}
function translateType(t: string): string {
  return ({ rotina: 'Rotina', emergencial: 'Emergencial', orcamento: 'Orçamento' } as any)[t] || t;
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
      ok: 'Ok', nok: 'NOk', n_a: 'N/A',
      monofasico: 'Monofásico', bifasico: 'Bifásico', trifasico: 'Trifásico'
    };
    return t[value.toLowerCase()] || value;
  }
  return String(value);
}