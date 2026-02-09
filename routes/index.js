var express = require('express');
var router = express.Router();
const Logar = require('../controller/logar')
const db = require('../models/connection')
const model_Energ = require('../models/model_Energ')
const model_Res = require('../models/model_Res')
const model_Hidro = require('../models/model_Hidro')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Mep Tecnoligia' });
});

router.post('/', async(req,res)=>{
  let retorno= await Logar.logar(req, res)
  if (retorno.acesso==1) {
    res.json(retorno)
  } else{
    res.status(401).json(retorno)
  }
  
})



router.post('/app/login', async (req, res) => {
  const { username, password } = req.body;
  const loguin = await Logar.logarAPP(username,password)
  //console.log("dados enviados:")
  //console.log(loguin)
  res.json(loguin);
})

//---------------------- usuarios ------------------------------------------------
// Definindo a rota para receber a requisição de dados do usuário
router.post('/get-dados-do-usuario', async (req, res) => {
  const { url } = req.body; // Pega o URL enviado no corpo da requisição
  console.log(`Usuario connectado: ${url}`)
  try {
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE url = ? LIMIT 1", [url]);
    res.json(usuario); // Envia os dados do usuário de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});

router.post('/get-dados-do-usuario/res', async (req, res) => {
  const { url } = req.body; // Pega o URL enviado no corpo da requisição
  console.log(`Usuario connectado: ${url}`)
  try {
    const [reservatorios] = await db.query(`SELECT id,nome,cheio,vazio,T,NA,NB,alertas,status FROM tb_${url}_res_info`)
    res.json(reservatorios); // Envia os dados do usuário de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao buscar dados do usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
  }
});
//-------------------------- hidrometros -------------------------------------------------------------
router.post('/get_leituras/hidro', async (req,res)=>{
  const dados = req.body
  if(dados != null){
    const leituras=await model_Hidro.getLeituras(dados.url,dados.hidrometro)
    res.json(leituras)
  }
})

router.post('/get_ultimas_leituras_hidro', async (req,res)=>{
  const dados = req.body
  if(dados != null){
    const leituras=await model_Hidro.getUltimasLeituras(dados.url)
    res.json(leituras)
  }
})

router.post('/get_relatorio/hidro', async (req,res) => {
  const info = req.body.info
  const { startDate, endDate } = info.datas;
    try {
        const retorno = await model_Hidro.getRelatorio(info.url,startDate,endDate,info.hidrometros)
        //console.log(retorno)
        if(retorno.error){
          res.json({ error: 'Falha ao obter os dados',log:retorno.error});
        }else{
          res.json(retorno);
        }
        
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        res.json({ error: 'Erro ao buscar leituras.' });
    }
})

router.post('/get_consumo/hidro', async (req,res) => {
  //console.log(dados)
  const info = req.body.info
  const { startDate, endDate } = info.datas;

  try {
    const retorno = await model_Hidro.getConsumo(info.url,info.hidrometro,startDate,endDate)
    //console.log(retorno.length)
    if(retorno.length >= 2){
      consumo = retorno[retorno.length-1].leitura - retorno[0].leitura
      dados={
        id: retorno[0].id,
        local:retorno[0].local,
        consumo:consumo,
        leitura1: retorno[0].leitura,
        leitura2: retorno[retorno.length-1].leitura,
        dataL1:retorno[0].data,
        dataL2: retorno[retorno.length-1].data,
        grafico:[]
      }
      await retorno.forEach(element => {
        dados.grafico.push([element.data, element.leitura]);
      });
      res.json(dados);
    }else{
      res.json({ error: 'Não ha leituras sufucientes necesse periodo para se calcular o consumo. Leituras = '+retorno.length });
    }
    //console.log(retorno)
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    res.json({ error: 'Erro ao buscar leituras.' });
  }
})

router.post('/get_grafico_hidro', async (req,res) => {
  //console.log(dados)
  const info = req.body
  try {
    const retorno = await model_Hidro.getGrafico(info.url,info.hidrometro,info.startDate)
    if (retorno.leituras) {
      let grafico = []
      let id
      if (retorno.leituras.length>2) {
        await retorno.leituras.forEach(element => {
          grafico.push([element.data, element.leitura/1000]);
        });
        id = retorno.leituras[0].id
      } else {
        const leituras = await model_Hidro.getLeituras(info.url,info.hidrometro)
        await leituras.forEach(element => {
          grafico.push([element.data, element.leitura]);
        });
        id = leituras[0].id
      }
      res.json({id:id,grafico:grafico});
    //console.log(retorno)
    } else {
      res.json({ error: `Erro ao buscar leituras. ${retorno.error} ` });
    }
    
  } catch (error) {
    res.json({ error: `Erro ao buscar leituras. ${error} ` });
  }
})

router.post('/set_leituras_hidro', async (req,res) => {
  //console.log(dados)
  const info = req.body
  try {
    const retorno = await model_Hidro.addLeituras(info.url,info.leituras)
      res.json(retorno);    
  } catch (error) {
    res.json({ error: `Erro ao inserir leituras. ${error} ` });
  }
})

//------------------------- reservatorios ------------------------------------------------------------

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

//-------------------------- Energia -------------------------------------------------------------

router.post('/get_ultimas_leituras/energ', async (req, res) => {
  const { url, medidor } = req.body; 
  try {
    const dados=await model_Energ.getDataStart(medidor,url)
    res.json(dados); // Envia os dados do medidor de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    res.status(500).json({ error: 'Ainda não ha leituras' });
  }
})

router.post('/get_grafico_diario/energ', async (req, res) => {
  const { url, medidor, data } = req.body; 
  try {
    const dados=await model_Energ.getGraficoDiario(medidor,url,data)
    res.json(dados); // Envia os dados do medidor de volta como resposta JSON
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    res.status(500).json({ error: 'Ainda não ha leituras' });
  }
})
router.post('/get_consumo/energ', async (req, res) => {
  const {info} = req.body; 
  console.log(info)
  const { startDate, endDate } = info.datas;
  try {
    const retorno = await model_Energ.getConsumo(info.url,info.id,startDate,endDate)
    console.log(retorno)
    if(retorno.consumosDiario.length >= 1){
      dados={
        id: retorno.id,
        //local:info.local,
        consumo:retorno.NovoConsumo,
        dataL1:retorno.consumo.startDate,
        dataL2:retorno.consumo.endDate,
        grafico:[]
      }
      await retorno.consumosDiario.forEach(element => {
        dados.grafico.push([element.data, element.valor]);
      });
      res.json(dados); // Envia os dados do medidor de volta como resposta JSON
  }else{
    res.json({error: 'Não ha leituras sufucientes necesse periodo para se calcular o consumo. Leituras = '+retorno.consumosDiario.length });
  }  
  } catch (error) {
    console.error('Erro ao consultar o banco de dados:', error);
    res.json({error: 'Erro ao buscar leituras.' });
  }
})

router.post('/get_relatorio_geral/energ', async (req, res) => {
  const {info} = req.body; 
  //console.log(info)
  const { startDate, endDate } = info.datas;
    try {
        const retorno = await model_Energ.getRelatorioOtimizado(info.url,startDate,endDate,info.medidores)
        //console.log(retorno)
        if(retorno.error){
          res.json({ error: 'Falha ao obter os dados'});
        }else{
          res.json(retorno);
        }
        
    } catch (error) {
        console.error('Erro ao consultar o banco de dados:', error);
        res.json({ error: 'Erro ao buscar leituras.' });
    }
})

module.exports = router;
