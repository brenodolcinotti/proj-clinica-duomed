// gateway-sms.js - gateway de SMS simulado (Aula 13)
//
// Node puro, sem dependencia nenhuma. Ele imita o que um servico como
// Twilio ou Zenvia faz - mas nao envia SMS de verdade: apenas registra
// no terminal e devolve a resposta no formato que esses servicos usam.
//
// Por que um simulado: gateway de verdade cobra por mensagem e exige
// cadastro com documento. Nao cabe em uma aula. O que interessa aqui e
// a ARQUITETURA - quem chama quem, e o que volta - e isso o simulado
// reproduz fielmente.
//
// Rode com:  node gateway-sms.js      (porta 3002)
//
// Endpoints:
//   POST /mensagens  { para, texto }  -> 202 { id, status: 'enfileirada' }
//   GET  /mensagens                   -> 200 [ ... historico ... ]
//   GET  /mensagens/:id               -> 200 { id, status, ... }
//
// Repare no 202 (Accepted) e no status 'enfileirada': gateway nenhum
// entrega na hora. A mensagem entra em fila, e a confirmacao vem depois -
// exatamente como os recibos do push, na Aula 9.

const http = require('http');
const crypto = require('crypto');

const PORTA = 3002;

// "Banco" de mensagens em memoria.
const MENSAGENS = [];

// Custo ficticio, so para a discussao do Momento 1 ter numeros.
const CUSTO_POR_MENSAGEM = 0.12;

function json(res, status, corpo) {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(texto);
}

function lerCorpo(req) {
  return new Promise((resolve) => {
    let dados = '';
    req.on('data', (p) => { dados += p; });
    req.on('end', () => {
      try { resolve(JSON.parse(dados || '{}')); } catch (e) { resolve(null); }
    });
  });
}

// Um SMS tem 160 caracteres. Passou disso, o gateway divide em varias
// mensagens - e cobra por cada uma. Texto de 161 caracteres custa o dobro.
function segmentos(texto) {
  return Math.max(1, Math.ceil(texto.length / 160));
}

function validarNumero(numero) {
  // E.164 simplificado: + seguido de 10 a 15 digitos.
  return /^\+\d{10,15}$/.test(String(numero || '').replace(/\s|-|\(|\)/g, ''));
}

const servidor = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') return json(res, 204, {});

  // ------------------------------------------------------------- ENVIAR
  if (req.method === 'POST' && req.url === '/mensagens') {
    const corpo = await lerCorpo(req);

    if (!corpo || !corpo.para || !corpo.texto) {
      return json(res, 400, { erro: 'Informe "para" e "texto".' });
    }

    // Numero mal formatado e a causa nº 1 de SMS que "sumiu". Gateway
    // serio recusa na hora, em vez de aceitar e perder a mensagem.
    if (!validarNumero(corpo.para)) {
      return json(res, 400, {
        erro: 'Número inválido. Use o formato internacional: +5516999998888.',
      });
    }

    const partes = segmentos(corpo.texto);
    const mensagem = {
      id: crypto.randomBytes(8).toString('hex'),
      para: corpo.para,
      texto: corpo.texto,
      caracteres: corpo.texto.length,
      segmentos: partes,
      custo: Number((partes * CUSTO_POR_MENSAGEM).toFixed(2)),
      status: 'enfileirada',
      criadaEm: new Date().toISOString(),
    };
    MENSAGENS.unshift(mensagem);

    console.log('  ---------------------------------------------');
    console.log('  SMS SIMULADO (nao foi enviado de verdade)');
    console.log('  para:', mensagem.para);
    console.log('  texto:', mensagem.texto);
    console.log(`  ${mensagem.caracteres} caracteres = ${partes} segmento(s)`
                + ` = R$ ${mensagem.custo}`);
    console.log('  ---------------------------------------------');

    // Simula a entrega acontecendo depois - como na vida real.
    setTimeout(() => {
      mensagem.status = 'entregue';
      mensagem.entregueEm = new Date().toISOString();
      console.log(`  [${mensagem.id}] status -> entregue`);
    }, 4000);

    // 202 Accepted: aceita para envio, ainda nao entregue.
    return json(res, 202, { id: mensagem.id, status: mensagem.status });
  }

  // ----------------------------------------------------------- CONSULTAR
  if (req.method === 'GET' && req.url === '/mensagens') {
    const total = MENSAGENS.reduce((s, m) => s + m.custo, 0);
    return json(res, 200, {
      mensagens: MENSAGENS,
      totalMensagens: MENSAGENS.length,
      custoTotal: Number(total.toFixed(2)),
    });
  }

  if (req.method === 'GET' && req.url.startsWith('/mensagens/')) {
    const id = req.url.split('/')[2];
    const mensagem = MENSAGENS.find((m) => m.id === id);
    if (!mensagem) return json(res, 404, { erro: 'Mensagem não encontrada.' });
    return json(res, 200, mensagem);
  }

  json(res, 404, { erro: 'Rota não encontrada.' });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`Gateway de SMS (simulado) em http://localhost:${PORTA}`);
  console.log('Nenhuma mensagem sai daqui de verdade.');
  console.log(`Custo ficticio: R$ ${CUSTO_POR_MENSAGEM} por segmento de 160 caracteres.`);
});
