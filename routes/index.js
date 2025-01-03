var express = require('express');
var router = express.Router();
const Logar = require('../controller/logar')
const db = require('../models/connection')
const model_Eneg = require('../models/model_Energ')
const model_Res = require('../models/model_Res')
const model_Hidro = require('../models/model_Hidro')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Mep Tecnoligia' });
});

router.post('/', async(req,res)=>{
  Logar.logar(req, res)
})

router.post('/app/login', async (req, res) => {
  const { username, password } = req.body;
  const loguin = await Logar.logarAPP(username,password)
  //console.log("dados enviados:")
  //console.log(loguin)
  res.json(loguin);
})

// Definindo a rota para receber a requisição de dados do usuário
router.post('/get-dados-do-usuario', async (req, res) => {
  const { url } = req.body; // Pega o URL enviado no corpo da requisição

  try {
    console.log("inicia consulta ao BD")
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE url = ? LIMIT 1", [url]);
    console.log("finaliza consulta ao BD ")
    res.json(usuario); // Envia os dados do usuário de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Definindo a rota para receber a requisição de das ultimas leituras dos reservarotios
router.post('/get-ultimas-leituras/res', async (req, res) => {
  const { url, reservatorios } = req.body; 
  let dados = []
  try {
    for (let index = 1; index < reservatorios+1; index++) {
      const element = await model_Res.getDataStart(index,url);
      dados.push(element.leitura)
    }
    res.json(dados); // Envia os dados do usuário de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

// Definindo a rota para receber a requisição do historico das leituras dos reservarotios
router.post('/get_historico/res', async (req, res) => {
  const { url, id, startDate, endDate, local } = req.body; 
  try {
    const retorno = await model_Res.getHistorico(url,id,startDate,endDate)
    //console.log(retorno)
    let dados={
      id: id,
      local: local,
      dataL1: retorno[0][1],
      dataL2: retorno[retorno.length-1][1],
      grafico: []
    }
    await retorno.forEach(element => {
      dados.grafico.push([element[1], element[2]]);
    });
    res.json(dados); // Envia os dados do usuário de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    res.status(500).json({ error: 'Ainda não ha leituras' });
  }
});

module.exports = router;
