// app/api/analyze/route.ts
import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const records = payload.dataset || [];

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: `Você é o James, o motor inteligente de IA (Inteligência Artificial) analítico da Enviagora.
      Sua missão é receber logs brutos de auditoria e emitir um relatório executivo estruturado.
      
      REGRAS DE FORMATAÇÃO DO TEXTO:
      1. NUNCA envie o texto aglomerado ou compactado em um único bloco.
      2. Use espaçamento duplo entre cada título de seção.
      3. Separe cada parágrafo ou diagnóstico usando duas quebras de linha limpas (\\n\\n).
      4. Crie listas usando tópicos limpos e dê um espaço entre os itens para deixar a leitura fluida e elegante.`,
      prompt: `Analise as seguintes divergências de estoque de marketplaces e emita o diagnóstico formatado de forma limpa e muito bem espaçada: ${JSON.stringify(records)}`,
    });

    return NextResponse.json({ analysis: text });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Falha crítica no processamento do James Engine.', details: error.message },
      { status: 500 }
    );
  }
}