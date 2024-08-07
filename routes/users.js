const express = require('express')
const model_Energ = require('../models/model_Energ')
const model_Res = require('../models/model_Res')
const _ = require('../bin/funcoes')
const moment = require('moment')
const chekToken = require('../controller/chekToken')

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
  //router.get('/sia',chekToken, function(req, res) {
  router.get('/sia', function(req, res) {
    res.render('sia', { title: 'Mep Tecnologia' });
  });
  
  router.post('/sia',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! Sia dispositivo: '+req.body.id)
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
    
    io.emit("atualizar_sia"+req.body.id,dados)
    res.send('Dados recebidos! Sia dispositivo: '+req.body.id);
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
    res.redirect('/users/test/agua')
    //res.send("ola");
  });

  //router.get('/anchieta',chekToken, function(req, res) {
  router.get('/test/agua', function(req, res) {
      res.render('test', { title: 'Mep Tecnologia' });
    });
    
  router.get('/app/test/agua', async function(req, res) {
    //console.log(req.query)
    const dados= await model_Res.getDataStart(req.query.id,"test")
    
    
    res.send(dados.leitura);
  });

  router.post('/test/agua',async (req,res) =>{
  const d = new Date();
  d.setHours(d.getHours() - 3)
    //console.log('Dados recebidos! Test dispositivo: '+req.body.id)
    //console.log(req.body)
    const retorno = await model_Res.atualizarDados(req.body,d,req.body.id,"test")
    
    var dados = {
      leitura: req.body,
      graficos: retorno.graficos
    }
    //console.log(dados.graficos)
    dados.leitura.data = moment(d).format('DD-MM-YYYY HH:mm:ss')
    io.emit("atualizar_test_res"+req.body.id,dados)
    res.send("recebido");
  })

  return router;
}


