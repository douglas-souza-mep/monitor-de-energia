const express = require('express');
const router = express.Router();
const db = require('../models/connection');
const model_Energ = require('../models/model_Energ');
const model_Energ_v2 = require('../models/model_Energ_v2'); // Novo model
const { updateUserAlerts } = require('../bin/funcoes');

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

    // 2. Processar a string de alertas desabilitados
    // Se for NULL ou vazio, o array de desabilitados fica vazio (todos habilitados por padrão)
    const alertasDesabilitadosStr = usuario.alertas || "";
    const listaDesabilitados = alertasDesabilitadosStr.split(';');

    // 3. Obter dados resumidos dos medidores
    const medidoresResumo = await model_Energ_v2.getResumoMedidores(medidoresInfo,url);

    // 4. Mapear os medidores para incluir o status de alertasHabilitados
    const medidoresComStatusAlerta = medidoresResumo.map(medidor => {
      // Criar a chave de comparação seguindo o padrão: url+tipo+id
      // Exemplo: "golgidf" + "energ" + "2"
      const chaveMedidor = `${url}energ${medidor.id}`;
      
      return {
        ...medidor,
        // Se a chave NÃO estiver na lista de desabilitados, então está habilitado (true)
        alertasHabilitados: !listaDesabilitados.includes(chaveMedidor)
      };
    });

    // Combina os dados e envia em uma única resposta
    const dadosIniciais = {
      //usuario: usuario,
      medidores: medidoresComStatusAlerta
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
  //console.log(`Dados detalhados (v2) para medidor ${medidor} em ${url}`);
  
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

// Rota para habilitar/desabilitar alertas de energia
router.post('/v2/editarAlertas', async (req, res) => {
  const { url, tipo, id, habilitado} = req.body;
    updateUserAlerts(url, tipo, id, habilitado)
      .then((result) => {
        if (result.status === 'ok') {
          res.status(200).json(result);
      } else {
          res.status(500).json(result);
      }
      })
});


module.exports = router;
