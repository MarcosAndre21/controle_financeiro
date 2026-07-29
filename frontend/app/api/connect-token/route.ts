import { PluggyClient } from 'pluggy-sdk';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const pluggy = new PluggyClient({
      clientId: process.env.PLUGGY_CLIENT_ID!,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET!,
    });

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Ignora se não houver corpo JSON
    }

    const clientUserId = body.clientUserId ? String(body.clientUserId) : "usuario-padrao";

    // Correção: Passe apenas o clientUserId, nunca um itemId aqui!
  // ✅ Passando apenas a string (conforme a mensagem de erro pede)
const connectToken = await pluggy.createConnectToken(clientUserId);

    return NextResponse.json({ accessToken: connectToken.accessToken });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Erro na API da Pluggy:", err);
    return NextResponse.json({ error: err.message || "Erro desconhecido" }, { status: 500 });
  }
}