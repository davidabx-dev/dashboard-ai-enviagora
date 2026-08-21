// app/api/sheets/route.ts
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { prisma } from '../../../lib/prisma';

export async function POST() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID } = process.env;

  // Trava de segurança: validação limpa das credenciais de infraestrutura
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'Variáveis de ambiente do Google não configuradas.' },
      { status: 500 }
    );
  }

  try {
    // Alinhamento preventivo: buscando os registros ativos salvos na tabela física do banco
    const logs = await prisma.auditLog.findMany({
      orderBy: { id: 'desc' }, // Ordenação limpa pelo ID incremental de auditoria
      take: 1000, // Proteção contra dumps massivos de memória
    });

    // CORREÇÃO CRÍTICA: Remove aspas duplas das extremidades e converte os \n textuais em quebras reais
    const cleanPrivateKey = GOOGLE_PRIVATE_KEY
      .replace(/^"|"$/g, '')
      .replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: cleanPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Limpa o intervalo antigo para evitar linhas duplicadas no arquivo
    await sheets.spreadsheets.values.clear({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Auditoria!A2:Z',
    });

    // Mapeia os dados do banco respeitando o modelo real do projeto
    const rows = logs.map(log => [
      log.sku, 
      `${log.erp} un`, 
      `${log.mkt} un`, 
      log.failure, 
      log.status
    ]);

    // Insere o novo lote de dados atualizado
    await sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: 'Auditoria!A2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error: any) {
    // CORREÇÃO VISUAL: Injeta a mensagem real diretamente na chave error para o Toast capturar na tela
    console.error("Erro capturado na rota de planilhas:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Falha na integração com o Google Sheets.' 
      },
      { status: 500 }
    );
  }
}