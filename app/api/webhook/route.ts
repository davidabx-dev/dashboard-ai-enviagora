// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Insere de forma automatizada uma nova linha de divergência capturada no BD (banco de dados)
    const storedLog = await prisma.auditLog.create({
      data: {
        sku: body.sku || "ENV-UNKNOWN",
        erp: Number(body.erp) || 0,
        mkt: Number(body.mkt) || 0,
        failure: body.failure || "Divergência de Sincronização Externa",
        status: body.status || "CRITICAL",
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: "Log de auditoria integrado e persistido com sucesso.",
      data: storedLog 
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "Falha ao processar evento de webhook.", details: error.message }, 
      { status: 500 }
    );
  }
}