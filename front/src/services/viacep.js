import {
  buscarExterno,
  ServicoExternoIndisponivel,
} from './httpExterno';

export async function consultarCep(cep) {
  // Remove pontos, traços e outros caracteres
  const cepLimpo = cep.replace(/\D/g, '');

  // Validação local: o CEP precisa ter 8 dígitos
  if (cepLimpo.length !== 8) {
    throw new Error('Digite um CEP válido com 8 dígitos.');
  }

  const url = `https://viacep.com.br/ws/${cepLimpo}/json/`;

  try {
    const resposta = await buscarExterno(
      'ViaCEP',
      url
    );

    // Só tenta transformar em JSON depois de confirmar que a resposta HTTP foi OK
    const dados = await resposta.json();

    // ViaCEP pode retornar HTTP 200 mesmo quando o CEP não existe
    if (dados.erro === 'true') {
      throw new Error('CEP não encontrado.');
    }

    // Traduz o vocabulário do ViaCEP para o nosso projeto
    return {
      cep: dados.cep,
      logradouro: dados.logradouro || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      uf: dados.uf || '',
    };

  } catch (error) {

    if (error instanceof ServicoExternoIndisponivel) {
      throw error;
    }

    throw error;
  }
}