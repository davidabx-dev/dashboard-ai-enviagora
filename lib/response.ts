// lib/response.ts
import { NextResponse } from 'next/server';

interface ResponseOptions {
  headers?: HeadersInit;
  status?: number;
}

/**
 * Retorna uma resposta padronizada de sucesso em JSON com proteção contra cache de dados sensíveis
 */
export function apiSuccess<T>(data: T, options: ResponseOptions = {}) {
  const status = options.status || 200;
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        ...options.headers,
      },
    }
  );
}

/**
 * Retorna uma resposta padronizada e segura de erro em JSON sem vazar stack traces ou segredos
 */
export function apiError(
  message: string,
  statusCode: number = 400,
  options: ResponseOptions = {}
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
        ...options.headers,
      },
    }
  );
}
