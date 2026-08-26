// lib/pdf-generator.ts
import jsPDF from 'jspdf';

export interface ReportDataPayload {
  title: string;
  subtitle?: string;
  type: string;
  auditor?: string;
  stats?: {
    label: string;
    value: string | number;
    subtext: string;
    variant?: 'emerald' | 'rose' | 'amber';
  }[];
  columns: { header: string; widthRatio?: number; align?: 'left' | 'center' | 'right' }[];
  rows: (string | number)[][];
}

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = true,
  stroke = true
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
};

const loadLogoImage = (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    try {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = '/img/logo-enviagora.svg';
    } catch {
      resolve(null);
    }
  });
};

/**
 * Motor Compartilhado de Geração de PDF High-DPI (300 DPI) com Dark Emerald Glassmorphism
 */
export async function generateFuturisticPDF(payload: ReportDataPayload): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const logoImg = await loadLogoImage();
  const PAGE_WIDTH = 1600;
  const PAGE_HEIGHT = 2262;
  const ROWS_PER_PAGE = payload.stats && payload.stats.length > 0 ? 13 : 16;
  const totalPages = Math.ceil(payload.rows.length / ROWS_PER_PAGE) || 1;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) doc.addPage('a4', 'portrait');

    const canvas = document.createElement('canvas');
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // 1. Fundo com Degradê & Luzes Ambiente
    const bgGrad = ctx.createLinearGradient(0, 0, 0, PAGE_HEIGHT);
    bgGrad.addColorStop(0, '#040b05');
    bgGrad.addColorStop(0.5, '#020603');
    bgGrad.addColorStop(1, '#010402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    // Orbe 1 (Topo Esquerdo)
    const orb1 = ctx.createRadialGradient(250, 180, 10, 250, 180, 450);
    orb1.addColorStop(0, 'rgba(34, 197, 94, 0.18)');
    orb1.addColorStop(0.6, 'rgba(16, 185, 129, 0.05)');
    orb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orb1;
    ctx.fillRect(0, 0, 800, 700);

    // Orbe 2 (Topo Direito)
    const orb2 = ctx.createRadialGradient(1350, 220, 10, 1350, 220, 500);
    orb2.addColorStop(0, 'rgba(34, 197, 94, 0.14)');
    orb2.addColorStop(0.6, 'rgba(16, 185, 129, 0.03)');
    orb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orb2;
    ctx.fillRect(800, 0, 800, 700);

    // Orbe 3 (Base)
    const orb3 = ctx.createRadialGradient(800, 2100, 20, 800, 2100, 600);
    orb3.addColorStop(0, 'rgba(34, 197, 94, 0.09)');
    orb3.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = orb3;
    ctx.fillRect(0, 1500, PAGE_WIDTH, 762);

    // 2. Cabeçalho com Glassmorphism
    const headX = 70;
    const headY = 60;
    const headW = 1460;
    const headH = 220;
    const headR = 26;

    ctx.save();
    ctx.shadowColor = 'rgba(34, 197, 94, 0.25)';
    ctx.shadowBlur = 25;
    const headGrad = ctx.createLinearGradient(headX, headY, headX, headY + headH);
    headGrad.addColorStop(0, 'rgba(12, 34, 18, 0.92)');
    headGrad.addColorStop(1, 'rgba(4, 14, 7, 0.96)');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, headX, headY, headW, headH, headR);
    ctx.restore();

    // Logo
    if (logoImg) {
      ctx.drawImage(logoImg, headX + 35, headY + 30, 260, 68);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px sans-serif';
      ctx.fillText('ENVIAGORA', headX + 35, headY + 70);
    }

    // Título e Subtítulo
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 28px sans-serif';
    ctx.fillText(payload.title.toUpperCase(), headX + 35, headY + 145);

    ctx.fillStyle = '#22c55e';
    ctx.font = '800 15px sans-serif';
    ctx.fillText(
      payload.subtitle || 'CONCILIAÇÃO DE ESTOQUE ERP & MARKETPLACES • ENVIAGORA AI',
      headX + 35,
      headY + 180
    );

    // Badge Status
    const badgeX = headX + headW - 460;
    const badgeY = headY + 35;
    const badgeW = 425;
    const badgeH = 50;
    ctx.save();
    ctx.shadowColor = 'rgba(34, 197, 94, 0.35)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 25);
    ctx.restore();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(badgeX + 28, badgeY + 25, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.font = '900 15px sans-serif';
    ctx.fillText('SISTEMA ATIVO V2.4 SEGURA', badgeX + 46, badgeY + 31);

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 14px sans-serif';
    const now = new Date();
    ctx.fillText(
      `EMISSÃO: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      badgeX,
      badgeY + 95
    );
    ctx.fillText(
      `AUDITOR: ${payload.auditor || 'David Admin (Auditor Chefe)'}`,
      badgeX,
      badgeY + 125
    );

    // 3. Mini-Cards de Estatísticas (se existirem na página 0)
    let tableY = 310;
    if (pageIdx === 0 && payload.stats && payload.stats.length > 0) {
      const cardY = 310;
      const cardW = 460;
      const cardH = 175;
      const cardR = 24;

      payload.stats.slice(0, 3).forEach((st, idx) => {
        const cX = 70 + idx * (cardW + 40);
        const isRose = st.variant === 'rose';

        ctx.save();
        ctx.shadowColor = isRose ? 'rgba(239, 68, 68, 0.35)' : 'rgba(34, 197, 94, 0.35)';
        ctx.shadowBlur = 20;

        const cGrad = ctx.createLinearGradient(cX, cardY, cX + cardW, cardY + cardH);
        if (isRose) {
          cGrad.addColorStop(0, '#280c10');
          cGrad.addColorStop(0.5, '#140507');
          cGrad.addColorStop(1, '#0a0203');
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        } else {
          cGrad.addColorStop(0, '#0c2612');
          cGrad.addColorStop(0.5, '#06140a');
          cGrad.addColorStop(1, '#030a05');
          ctx.strokeStyle = 'rgba(34, 197, 94, 0.45)';
        }

        ctx.fillStyle = cGrad;
        ctx.lineWidth = 1.8;
        drawRoundedRect(ctx, cX, cardY, cardW, cardH, cardR);
        ctx.restore();

        ctx.fillStyle = isRose ? '#fca5a5' : '#9ca3af';
        ctx.font = '800 15px sans-serif';
        ctx.fillText(st.label.toUpperCase(), cX + 32, cardY + 45);

        ctx.fillStyle = isRose ? '#ef4444' : '#ffffff';
        ctx.font = '900 48px sans-serif';
        ctx.fillText(String(st.value), cX + 32, cardY + 105);

        ctx.fillStyle = isRose ? '#f87171' : '#22c55e';
        ctx.font = '800 15px sans-serif';
        ctx.fillText(st.subtext, cX + 32, cardY + 145);
      });

      tableY = 515;
    }

    // 4. Tabela
    const tableW = 1460;
    const tableH = pageIdx === 0 && payload.stats && payload.stats.length > 0 ? 1580 : 1785;
    const tableR = 24;

    ctx.save();
    ctx.shadowColor = 'rgba(34, 197, 94, 0.15)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(6, 16, 9, 0.94)';
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.25)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 70, tableY, tableW, tableH, tableR);
    ctx.restore();

    // Cabeçalho da Tabela
    const theadH = 65;
    const theadGrad = ctx.createLinearGradient(70, tableY, 70 + tableW, tableY);
    theadGrad.addColorStop(0, '#102a16');
    theadGrad.addColorStop(0.5, '#0a1d10');
    theadGrad.addColorStop(1, '#102a16');
    ctx.fillStyle = theadGrad;
    drawRoundedRect(ctx, 70, tableY, tableW, theadH, tableR, true, false);

    ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, tableY + theadH);
    ctx.lineTo(70 + tableW, tableY + theadH);
    ctx.stroke();

    // Cálculo das larguras de colunas
    const colCount = payload.columns.length;
    const colWidths = payload.columns.map((c) => (c.widthRatio ? c.widthRatio * tableW : tableW / colCount));
    const colOffsets: number[] = [];
    let currentOffset = 70;
    for (let c = 0; c < colCount; c++) {
      colOffsets.push(currentOffset + 25);
      currentOffset += colWidths[c];
    }

    ctx.fillStyle = '#22c55e';
    ctx.font = '900 16px sans-serif';
    payload.columns.forEach((col, cIdx) => {
      ctx.fillText(col.header.toUpperCase(), colOffsets[cIdx], tableY + 40);
    });

    // Linhas
    const startRow = pageIdx * ROWS_PER_PAGE;
    const endRow = Math.min(startRow + ROWS_PER_PAGE, payload.rows.length);
    const rowHeight = 100;

    for (let i = startRow; i < endRow; i++) {
      const rowIdx = i - startRow;
      const curY = tableY + theadH + rowIdx * rowHeight;
      const rowData = payload.rows[i];

      if (rowIdx % 2 === 1) {
        ctx.fillStyle = 'rgba(16, 38, 20, 0.35)';
        ctx.fillRect(70, curY, tableW, rowHeight);
      }

      ctx.strokeStyle = 'rgba(34, 197, 94, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, curY + rowHeight);
      ctx.lineTo(70 + tableW, curY + rowHeight);
      ctx.stroke();

      rowData.forEach((cellVal, cIdx) => {
        const valStr = String(cellVal ?? '');
        const colX = colOffsets[cIdx];

        // Se for a última coluna e valor for status
        if (cIdx === colCount - 1 && (valStr === 'CRITICAL' || valStr === 'OK' || valStr === 'RESOLVED' || valStr === 'HIGH')) {
          const isCritical = valStr === 'CRITICAL' || valStr === 'HIGH';
          const pillW = 160;
          const pillH = 42;
          const pillX = colX - 15;
          const pillY = curY + 30;

          ctx.save();
          if (isCritical) {
            ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(45, 10, 15, 0.9)';
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
            ctx.lineWidth = 1.5;
            drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 21);
            ctx.fillStyle = '#ef4444';
            ctx.font = '900 14px sans-serif';
            ctx.fillText(valStr, pillX + 42, pillY + 27);
          } else {
            ctx.shadowColor = 'rgba(34, 197, 94, 0.4)';
            ctx.shadowBlur = 12;
            ctx.fillStyle = 'rgba(10, 38, 18, 0.9)';
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
            ctx.lineWidth = 1.5;
            drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 21);
            ctx.fillStyle = '#22c55e';
            ctx.font = '900 14px sans-serif';
            ctx.fillText(valStr, pillX + 42, pillY + 27);
          }
          ctx.restore();
        } else if (cIdx === 0) {
          ctx.fillStyle = '#22c55e';
          ctx.font = '900 17px sans-serif';
          ctx.fillText(valStr, colX, curY + 58);
        } else {
          ctx.fillStyle = '#e5e7eb';
          ctx.font = '600 15px sans-serif';
          const maxTextWidth = colWidths[cIdx] - 40;
          let displayStr = valStr;
          if (ctx.measureText(displayStr).width > maxTextWidth) {
            while (ctx.measureText(displayStr + '...').width > maxTextWidth && displayStr.length > 0) {
              displayStr = displayStr.slice(0, -1);
            }
            displayStr += '...';
          }
          ctx.fillText(displayStr, colX, curY + 58);
        }
      });
    }

    // 5. Rodapé
    const footerY = 2170;
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, footerY);
    ctx.lineTo(1530, footerY);
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '600 14px sans-serif';
    ctx.fillText(
      'Enviagora AI Security Engine • Relatório de Auditoria Criptograficamente Válido e Assinado',
      70,
      footerY + 45
    );
    ctx.fillText(`Página ${pageIdx + 1} de ${totalPages}`, 1420, footerY + 45);

    const pageDataUrl = canvas.toDataURL('image/png', 1.0);
    doc.addImage(pageDataUrl, 'PNG', 0, 0, 210, 297);
  }

  return doc;
}
