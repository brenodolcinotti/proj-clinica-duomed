
const http = require('http');
const { URL } = require('url');

const smsCore = require('../src/services/smsCore');

const PORTA = 3001;
const JSON_SERVER = 'http://127.0.0.1:3000';
const GATEWAY_SMS = 'http://127.0.0.1:3002';

function responder(res, status, dados) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });

  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';

    req.on('data', (parte) => {
      corpo += parte;

      if (corpo.length > 100000) {
        reject(new Error('Corpo da requisição muito grande.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch {
        reject(new Error('JSON inválido.'));
      }
    });

    req.on('error', reject);
  });
}

async function buscarJson(url) {
  const resposta = await fetch(url);
  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      dados.message || `Falha ao consultar ${url}`
    );
  }

  return dados;
}

async function enviarSms(consultaId, tipo, req, res) {
  const autorizacao = req.headers.authorization || '';
  const token = autorizacao.replace(/^Bearer\s+/i, '');

  // Token demonstrativo local, não é autenticação de produção.
  if (!/^duomed_\d+$/.test(token)) {
    return responder(res, 401, {
      erro: 'Sessão inválida. Faça login novamente.',
    });
  }

  if (!smsCore.TIPOS_SMS.includes(tipo)) {
    return responder(res, 400, {
      erro: 'Tipo de SMS inválido.',
    });
  }

  const consulta = await buscarJson(
    `${JSON_SERVER}/consultas/${encodeURIComponent(consultaId)}`
  );

  const paciente = await buscarJson(
    `${JSON_SERVER}/pacientes/${encodeURIComponent(consulta.pacienteId)}`
  );

  const numero = smsCore.normalizarNumero(paciente.telefone);

  if (!numero) {
    return responder(res, 400, {
      erro: 'O paciente não possui um telefone válido.',
    });
  }

  const texto = smsCore.criarTextoSms(tipo, consulta);

  if (!texto) {
    return responder(res, 400, {
      erro: 'Não foi possível gerar o texto do SMS.',
    });
  }

  const respostaGateway = await fetch(
    `${GATEWAY_SMS}/mensagens`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        para: numero,
        texto,
      }),
    }
  );

  const dadosGateway = await respostaGateway.json().catch(() => ({}));

  if (!respostaGateway.ok) {
    return responder(res, respostaGateway.status, {
      erro:
        dadosGateway.erro ||
        dadosGateway.message ||
        'Falha no gateway de SMS.',
    });
  }

  return responder(res, 202, {
    id: dadosGateway.id,
    status: dadosGateway.status || 'enfileirada',
    para: numero,
    mensagem: 'SMS recebido pelo gateway simulado.',
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });

    return res.end();
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return responder(res, 200, {
      status: 'ok',
      servico: 'api-clinica',
    });
  }

  const rotaSms = url.pathname.match(
    /^\/consultas\/([^/]+)\/sms$/
  );

  if (req.method === 'POST' && rotaSms) {
    try {
      const corpo = await lerCorpo(req);

      return await enviarSms(
        decodeURIComponent(rotaSms[1]),
        corpo.tipo,
        req,
        res
      );
    } catch (erro) {
      console.error('Erro ao processar SMS:', erro.message);

      return responder(res, 500, {
        erro: erro.message || 'Erro interno na API de SMS.',
      });
    }
  }

  return responder(res, 404, {
    erro: 'Rota não encontrada.',
  });
});

servidor.listen(PORTA, '0.0.0.0', () => {
  console.log(`API da clínica em http://localhost:${PORTA}`);
  console.log('Integração com JSON Server e gateway de SMS simulado.');
});
