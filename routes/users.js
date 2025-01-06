const express = require('express')
const model_Energ = require('../models/model_Energ')
const model_Res = require('../models/model_Res')
const f = require('../bin/funcoes')
const moment = require('moment')
const chekToken = require('../controller/chekToken')



var alertas ={
  urlID:[],
  data: []
}
module.exports = function(io){
  //now you can use io.emit() in this file

  var router = express.Router();
  /* GET users listing. */
  
  router.post('/teste_agua',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    //console.log(req.body)
    res.send('Dados recebidos! dispositivo: teste_agua');
  })
  //--------------------------------------------------------------------------
  //router.get('/brisas',chekToken, function(req, res) {
  router.get('/brisas', function(req, res) {
    res.render('brisas', { title: 'Mep Tecnologia' });
  });


  router.post('/brisas',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! Brisas dispositivo: '+req.body.id)
    const retorno = await model_Energ.atualizarDados(req.body,d,req.body.id,"brisas")
    
    var dados = {
      leitura:req.body,
      consumos:{
        consumo: retorno.consumos.consumo,
        consumoDiaAnterior: retorno.consumos.consumoDiaAnterior,
        consumoMensal:  retorno.consumos.consumoMensal,
        consumoMesAnterior: retorno.consumos.consumoMesAnterior
      },
      graficos:{
        diario: retorno.graficos.diario,
        semanal: retorno.graficos.semanal,
        semestral: retorno.graficos.semestral
      }
    }
    dados.leitura.data = moment(d).format('DD-MM-YYYY HH:mm:ss')
    
    io.emit("atualizar_brisas"+req.body.id,dados)
    res.send('Dados recebidos! dispositivo: '+req.body.id);
  })
  
  //--------------------------------------------------------------------------
  //router.get('/santaMonica',chekToken, function(req, res) {
  router.get('/santaMonica', function(req, res) {
    res.render('santaMonica_energ', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica"  });
  });

  router.get('/santaMonica_hidro', function(req, res) {
    res.render('santaMonica_hidro', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica" });
  });
  
  router.post('/sia',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    var url="santaMonica"
    //console.log('Dados recebidos! santaMonica dispositivo: '+req.body.id)
    const retorno = await model_Energ.atualizarDados(req.body,d,req.body.id,"santaMonica")
    
    var dados = {
      leitura:req.body,
      consumos:{
        consumo: retorno.consumos.consumo,
        consumoDiaAnterior: retorno.consumos.consumoDiaAnterior,
        consumoMensal:  retorno.consumos.consumoMensal,
        consumoMesAnterior: retorno.consumos.consumoMesAnterior
      },
      graficos:{
        diario: retorno.graficos.diario,
        semanal: retorno.graficos.semanal,
        semestral: retorno.graficos.semestral
      }
    }
    dados.leitura.data = moment(d).format('DD-MM-YYYY HH:mm:ss')
    
    io.emit("atualizar_santaMonica"+req.body.id,dados)
    f.adicionarSeNaoExistir( medidoresEnergDinamico,`energ_${url}_${req.body.id}`)
    res.send('Dados recebidos! santaMonica dispositivo: '+req.body.id);
  })


  //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  router.get('/casa', function(req, res) {
    res.render('casa', { title: 'Mep Tecnologia', nome:"Casa Douglas"  });
  });
  
  router.post('/casa',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    var url = "casa"
    //console.log('Dados recebidos! Casa dispositivo: '+req.body.id)
    const retorno = await model_Energ.atualizarDados(req.body,d,req.body.id,url)
    
    var dados = {
      leitura:req.body,
      consumos:{
        consumo: retorno.consumos.consumo,
        consumoDiaAnterior: retorno.consumos.consumoDiaAnterior,
        consumoMensal:  retorno.consumos.consumoMensal,
        consumoMesAnterior: retorno.consumos.consumoMesAnterior
      },
      graficos:{
        diario: retorno.graficos.diario,
        semanal: retorno.graficos.semanal,
        semestral: retorno.graficos.semestral
      }
    }
    dados.leitura.data = moment(d).format('DD-MM-YYYY HH:mm:ss')
    
    io.emit("atualizar_casa"+req.body.id,dados)
    f.adicionarSeNaoExistir( globalThis.medidoresEnergDinamico,`energ_${url}_${req.body.id}`)
    res.send('Dados recebidos! de casa dispositivo: '+req.body.id);
  })

  //-------------------------------- FIM CASA ---------------------------------------------------------------

  //-------------------------------- TAGUA LIFE -------------------------------------------------------------

  router.get('/taguaLife', function(req, res) {
    res.redirect('/users/taguaLife/res')
    //res.send("ola");
  });

  //router.get('/anchieta',chekToken, function(req, res) {
  router.get('/taguaLife/res', function(req, res) {
      res.render('taguaLife_res', { title: 'Mep Tecnologia', nome:"Tagua Life" });
    });

  router.get('/app/taguaLife/res', async function(req, res) {
    //console.log(req.query)
    const dados= await model_Res.getDataStart(req.query.id,"taguaLife")

    res.send(dados.leitura);
  });

  router.post('/taguaLife/res',async (req,res) =>{
    const distancias = [
      //Superior A
      //{cheio:26 , vazio:96 ,max:200, NB:40 },
      {cheio:29 , vazio:96 ,max:200, NB:30 },
      //Superior B
      {cheio:28 , vazio:101 ,max:200, NB:40 },
      //Superior C
      //cheio:26 , vazio:77 ,max:200, NB:40 },
      {cheio:26 , vazio:85 ,max:200, NB:40 },
      //Superior D
      //{cheio:24 , vazio:88 ,max:200, NB:40 },
      {cheio:33 , vazio:88 ,max:200, NB:40 },
      //Superior E
      {cheio:25 , vazio:92 ,max:200, NB:40 },
      //Superior F
      //{cheio:22 , vazio:89 ,max:200, NB:40 }
      {cheio:26 , vazio:93 ,max:200, NB:40 }
    ]
    var d = new Date();
    var data = d.setHours(d.getHours() - 3)
    var url="taguaLife"
    //console.log('Dados recebidos! Tagua Life reservatorio: '+req.body.id)
    //console.log("id: "+req.body.id+"\ndist: "+req.body.distancia)
    let dist = distancias[req.body.id-1]
    if(req.body.distancia<dist.max){
      
      let leituraAtual = {
        id:req.body.id,
        distancia:req.body.distancia,
        nivel: await model_Res.calcularNivel(req.body.distancia,dist.vazio,dist.cheio),
        volume:100
      }

      const retorno = await model_Res.atualizarDados(leituraAtual,d,leituraAtual.id,url)
      var dados = {
      leitura: retorno.leitura,
      //graficos: retorno.graficos
      }
      //console.log(dados)
      dados.leitura.id = req.body.id,
      dados.leitura.data = moment(data).format('DD-MM-YYYY HH:mm:ss')
      io.emit("atualizar_"+url+"_res",dados)
  
      // ####################### ALERTA ################################################     
      f.adicionarSeNaoExistir( globalThis.reservatoriosDinamico,`res_${url}_${req.body.id}`)
    
      if(dados.leitura.nivel<=dist.NB){
        //console.log(alertas)
        let index = alertas.urlID.indexOf(url+req.body.id+"NB");
        //console.log(index)
        if(index==-1){
          const retorno = await model_Res.dadosAlerta(url,req.body.id)
          const msg = `Alerta de nivel baixo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${dados.leitura.nivel}%` 
          f.sendAlerta(msg,retorno.chatID)
          alertas.urlID.push(url+req.body.id+"NB")
          alertas.data.push(data) 
        }else{
          if (data-alertas.data[index]>=(3*60*1000)) {
            const retorno = await model_Res.dadosAlerta(url,req.body.id)
            const msg = `Alerta de nivel baixo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${dados.leitura.nivel}%`;
            f.sendAlerta(msg,retorno.chatID)
            alertas.data[index] = data
          }
        }
      }
    
      if(dados.leitura.nivel>105){
        //console.log(alertas)
        let index = alertas.urlID.indexOf(url+req.body.id+"NA");
        // console.log(index)
        if(index==-1){
          const retorno = await model_Res.dadosAlerta(url,req.body.id)
          const msg = `Alerta de trasbordo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nHorario:${+moment(data).format('DD-MM-YYYY HH:mm:ss')}`
          f.sendAlerta(msg,retorno.chatID)
          alertas.urlID.push(url+req.body.id+"NA")
          alertas.data.push(data) 
        }else{
          if (data-alertas.data[index]>=(3*60*1000)) {
            const retorno = await model_Res.dadosAlerta(url,req.body.id)
            const msg = `Alerta de trasbordo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nHorario:${+moment(data).format('DD-MM-YYYY HH:mm:ss')}` 
            f.sendAlerta(msg,retorno.chatID)
            alertas.data[index] = data
          }
        }
      }
    // #######################################################################
    }
    else{
        f.sendAlerta(`FALHA AO OBTER DADOS DO TAGUA LIFE\nReservatorio: ${req.body.id}\nDistancia: ${req.body.distancia}\n ${data} `,[process.env.CHAT_ID_DEV])
    }
    res.send("recebido");
  })
//----------------------- FIM TAGUA LIFE -------------------------------------------

//-------------------------------- CONNECT TOWER -------------------------------------------------------------

router.get('/connect', function(req, res) {
  res.redirect('/users/connect/res')
  //res.send("ola");
});

//router.get('/anchieta',chekToken, function(req, res) {
router.get('/connect/res', function(req, res) {
    res.render('connect_res', { title: 'Mep Tecnologia', nome:"Connect Tower" });
  });

router.get('/app/connect/res', async function(req, res) {
  //console.log(req.query)
  const dados= await model_Res.getDataStart(req.query.id,"connect")

  res.send(dados.leitura);
});

//----------------------- FIM TAGUA CONNECT TOWER -------------------------------------------

  return router;
}
