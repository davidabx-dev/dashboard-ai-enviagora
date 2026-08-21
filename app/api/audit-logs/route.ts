// app/api/audit-logs/route.ts
import { NextResponse } from 'next/server';
// CORREÇÃO: Voltando 3 níveis para encontrar a pasta "lib" na raiz do projeto
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    // Consulta os registros contidos na tabela do BD (banco de dados)
    let logs = await prisma.auditLog.findMany();

    // Se a tabela física do BD (banco de dados) estiver zerada, cria os dados de teste
    if (logs.length === 0) {
      await prisma.auditLog.createMany({
        data: [
          { sku: "ENV-102", erp: 50, mkt: 42, failure: "Quebra de Estoque Físico", status: "CRITICAL" },
          { sku: "ENV-309", erp: 15, mkt: 0, failure: "SKU Ausente na API", status: "CRITICAL" },
          { sku: "ENV-505", erp: 12, mkt: 12, failure: "Nenhuma", status: "OK" },
        ]
      });
      logs = await prisma.auditLog.findMany();
    }

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Erro interno no de leitura de logs.", 
        details: error.message 
      },
      { status: 500 }
    );
  }
}