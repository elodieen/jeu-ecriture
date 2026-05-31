import { Platform, Alert } from 'react-native';

declare global {
  interface Window { jspdf?: any }
}

export const TEMPS_LABELS: Record<number, string> = {
  1: 'La perturbation',
  2: "L'escalade",
  3: 'Le pivot final',
  4: 'Le dénouement',
};

export const DEFAULT_INTRO_TEMPS1 =
  "Il était une fois une histoire écrite à plusieurs mains. Conte de fée ou chaos — à vous de décider.";

export type Segment =
  | { type: 'paragraph'; text: string }
  | { type: 'transition'; text: string }
  | { type: 'dialogue'; text: string };

export function parseText(raw: string): Segment[] {
  const out: Segment[] = [];
  const parts = raw.split(/(\[[^\]]*\])/g);
  for (const part of parts) {
    if (!part.trim()) continue;
    if (part.startsWith('[') && part.endsWith(']')) {
      out.push({ type: 'transition', text: part.slice(1, -1).trim() });
      continue;
    }
    const lines = part.split('\n');
    let buf: string[] = [];
    const flush = () => {
      if (buf.length) {
        out.push({ type: 'paragraph', text: buf.join(' ').trim() });
        buf = [];
      }
    };
    for (const line of lines) {
      const t = line.trim();
      if (!t) { flush(); continue; }
      if (/^[—–]\s/.test(t) || /^[-]\s/.test(t)) {
        flush();
        out.push({ type: 'dialogue', text: t });
      } else {
        buf.push(t);
      }
    }
    flush();
  }
  return out.filter(s => s.text.trim());
}

export async function generateAndDownloadPDF(params: {
  titre: string;
  dateStr: string;
  characters: string[];
  historiqueAssemblages: Record<number, string>;
  historiqueContraintes: Record<number, string>;
  introText?: string;
}): Promise<void> {
  const { titre, dateStr, characters, historiqueAssemblages, historiqueContraintes, introText } = params;

  if (Platform.OS !== 'web') {
    Alert.alert('Téléchargement', 'Disponible sur la version web.');
    return;
  }

  try {
    if (!window.jspdf) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('jsPDF unavailable'));
        document.head.appendChild(s);
      });
    }

    const { jsPDF } = window.jspdf;
    const W = 148, H = 210, M = 14;
    const cw = W - M * 2;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    // ── Cover ──
    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, W, H, 'F');

    doc.setFillColor(255, 255, 255);
    doc.rect(M, 14, cw, 0.4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 70, 70);
    doc.text('LA DERNIÈRE SAISON', M, 24);

    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    const titreLines = doc.splitTextToSize(titre, cw);
    doc.text(titreLines, M, 54);

    const ruleY = H - 46;
    doc.setFillColor(35, 35, 35);
    doc.rect(M, ruleY, cw, 0.3, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(85, 85, 85);
    doc.text(dateStr, M, ruleY + 9);

    if (characters.length) {
      const charLines = doc.splitTextToSize(characters.join('  ·  '), cw);
      doc.setTextColor(100, 100, 100);
      doc.text(charLines, M, ruleY + 17);
    }

    // ── Temps pages ──
    const entries = (Object.entries(historiqueAssemblages) as [string, string][])
      .sort(([a], [b]) => +a - +b);

    for (const [t, text] of entries) {
      doc.addPage();

      const tempsNum = +t;
      const contrainte = tempsNum === 1
        ? (introText ?? DEFAULT_INTRO_TEMPS1)
        : (historiqueContraintes[tempsNum] ?? '');
      const segments = parseText(text);

      // Calculate contrainte height before drawing so stripe height is correct
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(13);
      const contraLines = doc.splitTextToSize(contrainte, cw - 6);
      const headerBottom = 30 + contraLines.length * 5.5 + 6;
      const stripeH = headerBottom - 14;

      // Left stripe
      doc.setFillColor(0, 0, 0);
      doc.rect(M, 14, 2.5, stripeH, 'F');

      // TEMPS N label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`TEMPS ${t}`, M + 6, 21);

      // Contrainte (italic, medium)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(13);
      doc.setTextColor(20, 20, 20);
      doc.text(contraLines, M + 6, 30);

      // Header rule
      doc.setFillColor(200, 200, 200);
      doc.rect(M, headerBottom, cw, 0.3, 'F');

      let y = headerBottom + 9;
      const pageBottom = H - M;
      const lineH = 5;

      const ensureSpace = (needed: number) => {
        if (y + needed > pageBottom) {
          doc.addPage();
          y = M + 4;
        }
      };

      for (const seg of segments) {
        if (seg.type === 'transition') {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(9);
          doc.setTextColor(130, 130, 130);
          const lines = doc.splitTextToSize(`[${seg.text}]`, cw - 6);
          const h = lines.length * lineH + 4;
          ensureSpace(h);
          doc.setFillColor(195, 195, 195);
          doc.rect(M, y - 3.5, 1, h - 2, 'F');
          doc.text(lines, M + 4, y);
          y += h;
        } else if (seg.type === 'dialogue') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(25, 25, 25);
          const lines = doc.splitTextToSize(seg.text, cw - 8);
          const h = lines.length * lineH + 4;
          ensureSpace(h);
          doc.setFillColor(160, 160, 160);
          doc.rect(M, y - 3.5, 1, h - 2, 'F');
          doc.text(lines, M + 6, y);
          y += h;
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(17, 17, 17);
          const lines = doc.splitTextToSize(seg.text, cw);
          const h = lines.length * lineH + 5;
          ensureSpace(h);
          doc.text(lines, M, y);
          y += h;
        }
      }
    }

    // ── End page ──
    doc.addPage();
    doc.setFillColor(17, 17, 17);
    doc.rect(0, 0, W, H, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(255, 255, 255);
    doc.text('THE END', W / 2, H / 2 - 12, { align: 'center' });

    doc.setFillColor(45, 45, 45);
    doc.rect(W / 2 - 14, H / 2 - 3, 28, 0.3, 'F');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(85, 85, 85);
    doc.text(`« ${titre} »`, W / 2, H / 2 + 8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(65, 65, 65);
    doc.text(dateStr, W / 2, H - 38, { align: 'center' });
    characters.forEach((c, i) => {
      doc.text(c, W / 2, H - 30 + i * 7, { align: 'center' });
    });

    doc.save(`${titre}.pdf`);
  } catch {
    Alert.alert('Erreur', 'Impossible de générer le PDF.');
  }
}
