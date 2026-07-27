// frontend/app/api/webhooks/pluggy/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const event = await req.json();

    console.log('Received webhook event:', event.event);
    console.log('Event ID:', event.eventId);
    console.log('Item ID associado:', event.itemId);

    switch (event.event) {
      case 'item/created':
        // Aqui você pode chamar seu backend para sincronizar as contas/transações do itemId
        console.log(`Item criado com sucesso: ${event.itemId}`);
        break;

      case 'item/updated':
        console.log(`Item atualizado: ${event.itemId}`);
        break;

      case 'item/error':
        console.error(`Erro no item ${event.itemId}:`, event.error);
        break;

      default:
        console.log(`Evento não tratado: ${event.event}`);
    }

    // IMPORTANTE: A Pluggy exige uma resposta 2xx em até 5 segundos
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao processar webhook:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}