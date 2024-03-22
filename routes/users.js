const express = require('express')
const model = require('../models/model')
const _ = require('../bin/funcoes')
const moment = require('moment')
const chekToken = require('../controller/chekToken')

module.exports = function(io){
  //now you can use io.emit() in this file

  var router = express.Router();
  /* GET users listing. */
  
  
  //--------------------------------------------------------------------------
  //router.get('/brisas',chekToken, function(req, res) {
  router.get('/brisas', function(req, res) {
    res.render('brisas', { title: 'Mep Tecnologia' });
  });


  router.post('/brisas',async (req,res) =>{
    const d = new Date();
    d.setHours(d.getHours() - 3)
    console.log('Dados recebidos! dispositivo: '+req.body.id)
    const retorno = await model.atualizarDados(req.body,d,req.body.id,"brisas")
    
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
    console.log('Dados recebidos! Sia dispositivo: '+req.body.id)
    const retorno = await model.atualizarDados(req.body,d,req.body.id,"sia")
    
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

  return router;
}

