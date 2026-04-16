import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { getLaudoById, getConfiguracoesTecnico } from "./laudosDb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

function tipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    instalacao_eletrica: "Instalação Elétrica",
    inspecao_predial: "Inspeção Predial",
    nr10_nr12: "NR-10 / NR-12",
    grupo_gerador: "Grupo Gerador",
    adequacoes: "Adequações",
  };
  return map[tipo] ?? tipo;
}

function parecerLabel(p: string): string {
  const map: Record<string, string> = {
    conforme: "CONFORME",
    nao_conforme: "NÃO CONFORME",
    parcialmente_conforme: "PARCIALMENTE CONFORME",
  };
  return map[p] ?? p.toUpperCase();
}

function parecerColor(p: string): string {
  if (p === "conforme") return "#16a34a";
  if (p === "nao_conforme") return "#dc2626";
  return "#d97706";
}

function statusConstatacaoLabel(s: string): string {
  if (s === "conforme") return "Conforme";
  if (s === "nao_conforme") return "Nao Conforme";
  return "Atencao";
}

function statusConstatacaoColor(s: string): string {
  if (s === "conforme") return "#16a34a";
  if (s === "nao_conforme") return "#dc2626";
  return "#d97706";
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 8000 });
    return Buffer.from(resp.data);
  } catch {
    return null;
  }
}

function findLogoPath(): string {
  const candidates = [
    path.join(__dirname, "logo-jnc-transparente.png"),
    path.join(process.cwd(), "server", "logo-jnc-transparente.png"),
    path.join(process.cwd(), "logo-jnc-transparente.png"),
    "/home/ubuntu/soluteg-novo/server/logo-jnc-transparente.png",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "";
}

// ── Gerador principal ────────────────────────────────────────────────────────

export async function generateLaudoPDF(laudoId: number): Promise<Buffer> {
  const laudo = await getLaudoById(laudoId);
  if (!laudo) throw new Error("Laudo não encontrado");

  const tecnico = await getConfiguracoesTecnico();
  const logoPath = findLogoPath();

  const laudoRef = laudo; // non-null reference for closures

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 40, bottom: 50, left: 40, right: 40 },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const L = 40;
      const R = pageW - 40;
      const CW = pageW - 80;
      const GOLD = "#D4A84B";
      const DARK = "#1e293b";
      const MUTED = "#64748b";

      // Funções como arrows para evitar TS1252
      const drawPageHeader = (num: string) => {
        doc.save();
        doc.rect(0, 0, pageW, 32).fill("#1e293b");
        if (logoPath) {
          doc.image(logoPath, L, 4, { width: 24, height: 24 });
        }
        doc.fontSize(7).fillColor("#94a3b8").font("Helvetica")
          .text("JNC Elétrica — Laudo Técnico", L + 30, 12)
          .text(`N ${num}`, R - 80, 12, { width: 80, align: "right" });
        doc.restore();
      };

      const checkPageBreak = (neededHeight: number) => {
        const usableBottom = pageH - 60;
        if (doc.y + neededHeight > usableBottom) {
          doc.addPage();
          drawPageHeader(laudoRef.numero);
          doc.y = 50;
        }
      };

      const sectionTitle = (title: string) => {
        checkPageBreak(40);
        doc.moveDown(0.5);
        const ty = doc.y;
        doc.rect(L, ty, CW, 22).fill(DARK);
        doc.fontSize(9).font("Helvetica-Bold").fillColor("#ffffff")
          .text(title.toUpperCase(), L + 8, ty + 6, { width: CW - 16 });
        doc.y = ty + 28;
      };

      const bodyText = (label: string, value: string) => {
        checkPageBreak(24);
        doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK).text(`${label}: `, L, doc.y, { continued: true });
        doc.font("Helvetica").fillColor(MUTED).text(value || "—");
      };

      const paragraph = (text: string) => {
        checkPageBreak(30);
        doc.fontSize(8.5).font("Helvetica").fillColor(DARK)
          .text(text || "—", L, doc.y, { width: CW, lineGap: 2 });
        doc.moveDown(0.4);
      };

      // ══════════════════════════════════════════════════════════════════════
      // PÁGINA 1 — CAPA
      // ══════════════════════════════════════════════════════════════════════
      let y = 0;

      doc.rect(0, 0, pageW, 120).fill(DARK);

      if (logoPath) {
        doc.image(logoPath, (pageW - 64) / 2, 20, { width: 64, height: 64 });
        y = 94;
      } else {
        y = 30;
      }

      doc.fontSize(22).font("Helvetica-Bold").fillColor("#ffffff")
        .text("LAUDO TECNICO", L, y, { width: CW, align: "center" });
      y += 26;
      doc.fontSize(13).font("Helvetica").fillColor(GOLD)
        .text(tipoLabel(laudoRef.tipo), L, y, { width: CW, align: "center" });
      y = 140;

      // Número do laudo
      doc.rect(L + CW / 4, y, CW / 2, 32).fill(GOLD);
      doc.fontSize(14).font("Helvetica-Bold").fillColor("#ffffff")
        .text(laudoRef.numero, L + CW / 4, y + 9, { width: CW / 2, align: "center" });
      y += 50;

      const col1 = L;
      const col2 = L + CW / 2 + 10;
      const colW = CW / 2 - 10;

      const infoBox = (label: string, value: string, x: number, yPos: number, w: number): number => {
        doc.rect(x, yPos, w, 38).stroke("#e2e8f0");
        doc.fontSize(7).font("Helvetica").fillColor(MUTED)
          .text(label.toUpperCase(), x + 6, yPos + 6, { width: w - 12 });
        doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
          .text(value || "—", x + 6, yPos + 17, { width: w - 12 });
        return yPos + 38;
      };

      infoBox("Data de Emissao", formatDate(new Date()), col1, y, colW);
      infoBox("Data de Inspecao", formatDate(laudoRef.dataInspecao), col2, y, colW);
      y += 44;

      infoBox("Validade", `${laudoRef.validadeMeses} meses`, col1, y, colW);
      infoBox("Status", laudoRef.status.charAt(0).toUpperCase() + laudoRef.status.slice(1), col2, y, colW);
      y += 60;

      // Bloco cliente
      doc.rect(L, y, CW, 2).fill(GOLD);
      y += 10;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text("CLIENTE", L, y);
      y += 14;
      doc.fontSize(9).font("Helvetica").fillColor(DARK)
        .text(laudoRef.clienteNome ?? "Nao informado", L, y);
      if (laudoRef.clienteEndereco) {
        y += 12;
        doc.fontSize(8).fillColor(MUTED).text(String(laudoRef.clienteEndereco), L, y);
      }
      y += 30;

      // Bloco técnico
      doc.rect(L, y, CW, 2).fill(GOLD);
      y += 10;
      const tecnicosAtribuidos = (laudoRef as any).tecnicos as Array<{ nome?: string | null; tecnicoId: number }> | undefined;
      const temTecnicosAtribuidos = tecnicosAtribuidos && tecnicosAtribuidos.length > 0;
      doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
        .text(temTecnicosAtribuidos ? "TECNICOS RESPONSAVEIS" : "TECNICO RESPONSAVEL", L, y);
      y += 14;
      if (temTecnicosAtribuidos) {
        for (let ti = 0; ti < tecnicosAtribuidos!.length; ti++) {
          const t = tecnicosAtribuidos![ti];
          doc.fontSize(9).font("Helvetica").fillColor(DARK)
            .text(t.nome ?? `Tecnico #${t.tecnicoId}`, L, y);
          y += 12;
        }
      } else {
        doc.fontSize(9).font("Helvetica").fillColor(DARK)
          .text(tecnico?.nomeCompleto ?? "Nao informado", L, y);
        y += 12;
        const tecnicoInfo = [
          tecnico?.registroCrt ?? "",
          tecnico?.especialidade ?? "",
          tecnico?.empresa ?? "",
          tecnico?.cidade ?? "",
        ].filter(Boolean).join(" | ");
        if (tecnicoInfo) {
          doc.fontSize(8).fillColor(MUTED).text(tecnicoInfo, L, y);
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // PÁGINAS SEGUINTES — Conteúdo
      // ══════════════════════════════════════════════════════════════════════
      doc.addPage();
      drawPageHeader(laudoRef.numero);
      doc.y = 50;

      // 1. Objeto do Laudo
      sectionTitle("1. Objeto do Laudo");
      paragraph(laudoRef.objeto ?? "");

      // 2. Normas de Referência
      const normas = laudoRef.normasReferencia as Array<{ codigo: string; titulo: string }>;
      if (normas && normas.length > 0) {
        sectionTitle("2. Normas de Referencia");
        for (let ni = 0; ni < normas.length; ni++) {
          const n = normas[ni];
          checkPageBreak(16);
          doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK)
            .text(`- ${n.codigo}`, L + 8, doc.y, { continued: true });
          doc.font("Helvetica").fillColor(MUTED).text(` - ${n.titulo}`);
          doc.moveDown(0.2);
        }
      }

      // 3. Metodologia e Condições
      sectionTitle("3. Metodologia e Condicoes do Local");
      bodyText("Metodologia", laudoRef.metodologia ?? "");
      doc.moveDown(0.3);
      bodyText("Equipamentos Utilizados", laudoRef.equipamentosUtilizados ?? "");
      doc.moveDown(0.3);
      bodyText("Condicoes do Local", laudoRef.condicoesLocal ?? "");
      doc.moveDown(0.4);

      // 4. Constatações Técnicas
      const constatacoes = laudoRef.constatacoes as Array<{
        item: string; descricao: string; status: string; referenciaNormativa?: string;
      }>;
      if (constatacoes && constatacoes.length > 0) {
        sectionTitle("4. Constatacoes Tecnicas");

        const wItem = CW * 0.18;
        const wDesc = CW * 0.44;
        const wStat = CW * 0.20;
        const wRef  = CW * 0.18;

        checkPageBreak(20);
        const hY = doc.y;
        doc.rect(L, hY, CW, 16).fill("#e2e8f0");
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK)
          .text("Item", L + 4, hY + 4, { width: wItem })
          .text("Descricao", L + wItem + 4, hY + 4, { width: wDesc })
          .text("Status", L + wItem + wDesc + 4, hY + 4, { width: wStat })
          .text("Referencia", L + wItem + wDesc + wStat + 4, hY + 4, { width: wRef });
        doc.y = hY + 18;

        for (let ci = 0; ci < constatacoes.length; ci++) {
          const c = constatacoes[ci];
          const rowH = 22;
          checkPageBreak(rowH + 4);
          const rowY = doc.y;
          if (ci % 2 === 1) doc.rect(L, rowY, CW, rowH).fill("#f8fafc");
          doc.rect(L, rowY, CW, rowH).stroke("#e2e8f0");
          doc.fontSize(7.5).font("Helvetica").fillColor(DARK)
            .text(c.item || `Item ${ci + 1}`, L + 4, rowY + 7, { width: wItem - 8 });
          doc.text(c.descricao || "—", L + wItem + 4, rowY + 7, { width: wDesc - 8 });
          doc.fillColor(statusConstatacaoColor(c.status))
            .text(statusConstatacaoLabel(c.status), L + wItem + wDesc + 4, rowY + 7, { width: wStat - 8 });
          doc.fillColor(MUTED)
            .text(c.referenciaNormativa || "—", L + wItem + wDesc + wStat + 4, rowY + 7, { width: wRef - 8 });
          doc.y = rowY + rowH + 2;
        }
        doc.moveDown(0.4);
      }

      // 5. Medições
      const medicoes = laudoRef.medicoes as Array<{
        descricao: string; unidade?: string; valorMedido?: string; valorReferencia?: string; resultado?: string;
      }>;
      if (medicoes && medicoes.length > 0) {
        sectionTitle("5. Medicoes e Ensaios");

        checkPageBreak(18);
        const mhY = doc.y;
        doc.rect(L, mhY, CW, 16).fill("#e2e8f0");
        doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK)
          .text("Descricao", L + 4, mhY + 4, { width: CW * 0.35 })
          .text("Unid.", L + CW * 0.35 + 4, mhY + 4, { width: CW * 0.10 })
          .text("Medido", L + CW * 0.45 + 4, mhY + 4, { width: CW * 0.15 })
          .text("Referencia", L + CW * 0.60 + 4, mhY + 4, { width: CW * 0.20 })
          .text("Resultado", L + CW * 0.80 + 4, mhY + 4, { width: CW * 0.20 });
        doc.y = mhY + 18;

        for (let mi = 0; mi < medicoes.length; mi++) {
          const m = medicoes[mi];
          const rowH = 20;
          checkPageBreak(rowH + 4);
          const rowY = doc.y;
          if (mi % 2 === 1) doc.rect(L, rowY, CW, rowH).fill("#f8fafc");
          doc.rect(L, rowY, CW, rowH).stroke("#e2e8f0");
          doc.fontSize(7.5).font("Helvetica").fillColor(DARK)
            .text(m.descricao || "—", L + 4, rowY + 6, { width: CW * 0.35 - 8 })
            .text(m.unidade || "—", L + CW * 0.35 + 4, rowY + 6, { width: CW * 0.10 - 8 })
            .text(m.valorMedido || "—", L + CW * 0.45 + 4, rowY + 6, { width: CW * 0.15 - 8 })
            .text(m.valorReferencia || "—", L + CW * 0.60 + 4, rowY + 6, { width: CW * 0.20 - 8 });
          const resColor = m.resultado === "aprovado" ? "#16a34a" : m.resultado === "reprovado" ? "#dc2626" : MUTED;
          doc.fillColor(resColor)
            .text(
              m.resultado === "aprovado" ? "Aprovado" : m.resultado === "reprovado" ? "Reprovado" : "—",
              L + CW * 0.80 + 4, rowY + 6, { width: CW * 0.20 - 8 }
            );
          doc.y = rowY + rowH + 2;
        }
        doc.moveDown(0.4);
      }

      // 6. Registros Fotográficos
      const fotos = laudoRef.fotos as Array<{
        url: string; legenda?: string; comentario?: string; classificacao?: string;
      }>;
      if (fotos && fotos.length > 0) {
        sectionTitle("6. Registros Fotograficos");

        const photoW = (CW - 12) / 2;
        const photoH = 130;

        for (let fi = 0; fi < fotos.length; fi += 2) {
          checkPageBreak(photoH + 50);
          const rowY = doc.y;

          for (let fj = 0; fj < 2; fj++) {
            const foto = fotos[fi + fj];
            if (!foto) continue;
            const xPos = L + fj * (photoW + 12);

            const imgBuf = await fetchImageBuffer(foto.url);
            if (imgBuf) {
              try {
                doc.image(imgBuf, xPos, rowY, { width: photoW, height: photoH, cover: [photoW, photoH] });
              } catch {
                doc.rect(xPos, rowY, photoW, photoH).stroke("#e2e8f0");
                doc.fontSize(7).fillColor(MUTED)
                  .text("Imagem indisponivel", xPos, rowY + photoH / 2 - 5, { width: photoW, align: "center" });
              }
            } else {
              doc.rect(xPos, rowY, photoW, photoH).stroke("#e2e8f0");
              doc.fontSize(7).fillColor(MUTED)
                .text("Imagem indisponivel", xPos, rowY + photoH / 2 - 5, { width: photoW, align: "center" });
            }

            if (foto.classificacao) {
              const badgeColor = statusConstatacaoColor(foto.classificacao);
              doc.rect(xPos + photoW - 70, rowY + 4, 66, 14).fill(badgeColor);
              doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#ffffff")
                .text(statusConstatacaoLabel(foto.classificacao), xPos + photoW - 68, rowY + 8, { width: 62, align: "center" });
            }

            const legendY = rowY + photoH + 4;
            if (foto.legenda) {
              doc.fontSize(7.5).font("Helvetica-Bold").fillColor(DARK)
                .text(foto.legenda, xPos, legendY, { width: photoW });
            }
            if (foto.comentario) {
              doc.fontSize(7).font("Helvetica").fillColor(MUTED)
                .text(foto.comentario, xPos, legendY + (foto.legenda ? 11 : 0), { width: photoW });
            }
          }

          doc.y = rowY + photoH + 45;
          doc.moveDown(0.3);
        }
      }

      // 7. Conclusão
      sectionTitle("7. Conclusao e Parecer Tecnico");
      if (laudoRef.conclusaoParecer) {
        checkPageBreak(50);
        const parecerY = doc.y;
        const color = parecerColor(laudoRef.conclusaoParecer);
        doc.rect(L, parecerY, CW, 44).fill(color);
        doc.fontSize(18).font("Helvetica-Bold").fillColor("#ffffff")
          .text(parecerLabel(laudoRef.conclusaoParecer), L, parecerY + 12, { width: CW, align: "center" });
        doc.y = parecerY + 52;
      }
      if (laudoRef.conclusaoTexto) {
        doc.moveDown(0.3);
        paragraph(laudoRef.conclusaoTexto);
      }

      // 8. Recomendações
      if (laudoRef.recomendacoes) {
        sectionTitle("8. Recomendacoes");
        paragraph(laudoRef.recomendacoes);
      }

      // 9. Assinatura
      sectionTitle("9. Responsabilidade Tecnica");
      checkPageBreak(90);
      const sigY = doc.y + 8;
      doc.moveTo(L + 40, sigY + 50).lineTo(L + 200, sigY + 50).stroke("#1e293b");
      doc.fontSize(8).font("Helvetica-Bold").fillColor(DARK)
        .text(tecnico?.nomeCompleto ?? "Tecnico Responsavel", L + 40, sigY + 54, { width: 200, align: "center" });
      if (tecnico?.registroCrt) {
        doc.fontSize(7.5).font("Helvetica").fillColor(MUTED)
          .text(tecnico.registroCrt, L + 40, sigY + 66, { width: 200, align: "center" });
      }
      if (tecnico?.especialidade) {
        doc.fontSize(7.5).fillColor(MUTED)
          .text(tecnico.especialidade, L + 40, sigY + 78, { width: 200, align: "center" });
      }
      const cidade = tecnico?.cidade ?? "";
      doc.fontSize(7.5).fillColor(MUTED)
        .text(
          `${cidade}${cidade ? " — " : ""}${formatDate(new Date())}`,
          R - 200, sigY + 54, { width: 160, align: "right" }
        );

      // Rodapé de todas as páginas
      const range = doc.bufferedPageRange();
      const total = range.count;
      for (let pi = 0; pi < total; pi++) {
        doc.switchToPage(range.start + pi);
        doc.save();
        doc.rect(0, pageH - 30, pageW, 30).fill("#f1f5f9");
        doc.fontSize(6.5).fillColor(MUTED).font("Helvetica")
          .text(
            "Este laudo foi elaborado por Tecnico em Eletrotecnica registrado no CRT-SP, dentro do escopo legal permitido.",
            L, pageH - 22, { width: CW - 60 }
          )
          .text(`Pagina ${pi + 1} de ${total}`, R - 60, pageH - 22, { width: 60, align: "right" });
        doc.restore();
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
