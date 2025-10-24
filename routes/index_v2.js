const express = require('express');
const router = express.Router();
const db = require('../models/connection');
const model_Energ = require('../models/model_Energ');
const model_Energ_v2 = require('../models/model_Energ_v2'); // Novo model

// Rota otimizada para obter dados iniciais da view energy-monitor-v2
// Inclui dados do usuário e dados resumidos de todos os medidores em uma única requisição.
router.post('/v2/get-dados-iniciais/energ', async (req, res) => {
  const { url } = req.body; // Pega o URL enviado no corpo da requisição
  console.log(`Usuario connectado (v2): ${url}`);

  try {
    // 1. Obter dados do usuário e a lista de medidores
    const { usuario , medidoresInfo } = await model_Energ_v2.getUsuarioAndMedidores(url);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // 2. Obter dados resumidos de todos os medidores
    const medidoresResumo = await model_Energ_v2.getResumoMedidores(medidoresInfo,url);

    // Combina os dados e envia em uma única resposta
    const dadosIniciais = {
      usuario: usuario,
      medidores: medidoresResumo
    };

    res.json(dadosIniciais); 
  } catch (error) {
    console.error('Erro ao buscar dados iniciais (v2):', error);
    res.status(500).json({ error: 'Erro ao buscar dados iniciais' });
  }
});

// Rota para obter dados detalhados de um medidor específico (ao clicar no card)
router.post('/v2/get-dados-detalhados/energ', async (req, res) => {
  const { url, medidor } = req.body;
  console.log(`Dados detalhados (v2) para medidor ${medidor} em ${url}`);
  
  try {
    // Reutiliza a função existente para obter dados detalhados.
    // Se necessário, uma versão otimizada pode ser criada em model_Energ_v2.
    const dadosDetalhados = await model_Energ.getDataStart(medidor, url);
    res.json(dadosDetalhados);
  } catch (error) {
    console.error('Erro ao buscar dados detalhados (v2):', error);
    res.status(500).json({ error: 'Erro ao buscar dados detalhados' });
  }
});


module.exports = router;
