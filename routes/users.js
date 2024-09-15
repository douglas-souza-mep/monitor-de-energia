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
    console.log(req.body)
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
  //router.get('/santa_monica',chekToken, function(req, res) {
  router.get('/santa_monica', function(req, res) {
    res.render('santa_monica_energ', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica"  });
  });

  router.get('/santa_monica_hidro', function(req, res) {
    res.render('santa_monica_hidro', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica" });
  });
  
  router.post('/sia',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! santa_monica dispositivo: '+req.body.id)
    const retorno = await model_Energ.atualizarDados(req.body,d,req.body.id,"sia")
    
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
    
    io.emit("atualizar_santa_monica"+req.body.id,dados)
    res.send('Dados recebidos! santa_monica dispositivo: '+req.body.id);
  })

  //-------------------------------------------------------------------

  router.get('/anchieta', function(req, res) {
    res.redirect('/users/anchieta/agua')
    //res.send("ola");
  });

  //router.get('/anchieta',chekToken, function(req, res) {
  router.get('/anchieta/agua', function(req, res) {
      res.render('anchieta_res', { title: 'Mep Tecnologia' });
    });
    
  router.get('/anchieta/agua/reservatorio1', async function(req, res) {
    //console.log(req.query)
    const dados = await model_Res.getDataStart(2,"anchieta")
    //const dados= await model_Res.getDataStart(req.query.id,"anchieta")
    //console.log("############## medidor :"+medidor)
        /*String 1 nome
    string 2 data
    string 3 volume
    string 4 distancia
    string 5 nivel
    */ 
   const conjuntoDeStrings = [
        "SMA Reservatorio Inf. 1", 
        dados.leitura.data, 
        dados.leitura.volume.toString(),
        dados.leitura.distancia.toString(),
        dados.leitura.nivel.toString()
        ];
    console.log(conjuntoDeStrings)
    res.send(conjuntoDeStrings);
  });

  router.post('/anchieta/agua',async (req,res) =>{
  var d = new Date();
  var data = d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! Anchieta dispositivo: '+req.body.id)
    //console.log(req.body)
    const retorno = await model_Res.atualizarDados(req.body,d,req.body.id,"anchieta")
    
    var dados = {
      leitura: retorno.leitura,
      graficos: retorno.graficos
    }
    //console.log(dados.graficos)
    dados.leitura.data = moment(data).format('DD-MM-YYYY HH:mm:ss')
    io.emit("atualizar_anchieta_res"+req.body.id,dados)
    res.send("recebido");
  })

  //-------------------------------------------------------------------

  router.get('/test', function(req, res) {
    res.redirect('/users/test/res')
    //res.send("ola");
  });

  //router.get('/anchieta',chekToken, function(req, res) {
  router.get('/test/res', function(req, res) {
      res.render('test', { title: 'Mep Tecnologia' });
    });
    
  router.get('/app/test/res', async function(req, res) {
    //console.log(req.query)
    const dados= await model_Res.getDataStart(req.query.id,"test")
    
    res.send(dados.leitura);
  });

  router.post('/test/res',async (req,res) =>{
    //console.log(req.body)
    var d = new Date();
    var data = d.setHours(d.getHours() - 3)
    var url="test"
    //console.log('Dados recebidos! Anchieta dispositivo: '+req.body.id)
    const retorno = await model_Res.atualizarDados(req.body,d,req.body.id,url)
    var dados = {
      leitura: retorno.leitura,
      graficos: retorno.graficos
    }
    //console.log(dados)
    dados.leitura.data = moment(data).format('DD-MM-YYYY HH:mm:ss')
    io.emit("atualizar_"+url+"_res"+req.body.id,dados)
    
// ####################### ALERTA ################################################     
    f.adicionarSeNaoExistir( globalThis.reservatoriosDinamico,`res_${url}_${req.body.id}`)

    if(dados.leitura.nivel<=30){
      console.log(alertas)
      let index = alertas.urlID.indexOf(url+req.body.id+"NB");
      console.log(index)
      if(index==-1){
        const retorno = await model_Res.dadosAlerta(url,req.body.id)
        const msg = "Alerta de nivel baixo do "+retorno.nome+"!\nReservatorio: "+ retorno.local+" (id:"+retorno.id+")\nHorario:"+moment(data).format('DD-MM-YYYY HH:mm:ss') 
        f.sendAlerta(msg,retorno.chatID)
        alertas.urlID.push(url+req.body.id+"NB")
        alertas.data.push(data) 
      }else{
        if (data-alertas.data[index]>=(60*60*100)) {
          const retorno = await model_Res.dadosAlerta(url,req.body.id)
          const msg = "Alerta de nivel baixo!\nReservatorio: "+ retorno.nome+" (id:"+retorno.id+")\nHorario:"+moment(data).format('DD-MM-YYYY HH:mm:ss') 
          f.sendAlerta(msg,retorno.chatID)
          alertas.data[index] = data
        }
      }
    }
// ####################################################################### 
      res.send("recebido");
    })

  //@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
  router.get('/casa', function(req, res) {
    res.render('casa', { title: 'Mep Tecnologia', nome:"Casa Douglas"  });
  });
  
  router.post('/casa',async (req,res) =>{
    const d = new Date();
    //d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! santa_monica dispositivo: '+req.body.id)
    const retorno = await model_Energ.atualizarDados(req.body,d,req.body.id,"casa")
    
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
    res.send('Dados recebidos! de casa dispositivo: '+req.body.id);
  })

  return router;
}


