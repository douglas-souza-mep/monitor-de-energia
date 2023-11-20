const express = require('express')
const model = require('../models/model')
const _ = require('../bin/funcoes')
const moment = require('moment')


module.exports = function(io){
  //now you can use io.emit() in this file

  var router = express.Router();
  /* GET users listing. */
  router.get('/', function(req, res, next) {
    res.render('users', { title: 'Mep' });
  });

  router.post('/test',async (req,res) =>{
    console.log(c)
    const {dados1, dados2} = await model.getDado(c)
    
    consumo.data = moment(dados2.data).format('YYYY-MM-DD');
    console.log(dados1.data - consumo.data)
    consumo.consumo= consumo.consumo+ _.calculoConsumo(dados1.data,dados2.data,dados2.pt)
    console.log(consumo)
    io.emit("atualizar",{dados: dados2, consumo:consumo.valor})
    c++
    
    res.send(consumo);
  })

  router.post('/brisas',async (req,res) =>{
    console.log('Dados recebidos! dispositivo: '+req.body.id)
    const retorno = await model.atualizarDados(req.body,Date.now(),req.body.id)
    
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
    dados.leitura.data = moment(dados.leitura.data).format('DD-MM-YYYY HH:mm:ss')
    
    io.emit("atualizar_brisas"+req.body.id,dados)
    res.send('Dados recebidos! dispositivo: '+req.body.id);
  })

  return router;
}

