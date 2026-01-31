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

    // ===== ROTAS PARA ENERGY MONITOR V2 =====
// Santa Mônica V2
router.get('/santaMonica_energ_v2', function(req, res, next) {
  res.render('energy-monitor-v2', { 
    title: 'Monitor de Energia V2 - Santa Mônica',
    nome: 'Santa Mônica - Monitoramento de Energia',
    clientKey: 'santaMonica'
  });
});

// Hospital de Base V2
router.get('/hospitalBase_energ_v2', function(req, res, next) {
  res.render('energy-monitor-v2', { 
    title: 'Monitor de Energia V2 - Hospital de Base',
    nome: 'Hospital de Base - Monitoramento de Energia',
    clientKey: 'HospitalBase'
  });
});

router.get('/golgidf_energ_v2', function(req, res, next) {
  res.render('energy-monitor-v2', { 
    title: 'Monitor de Energia V2 - Golgi Brasilia',
    nome: 'Golgi Brasilia - Monitoramento de Energia',
    clientKey: 'golgidf'
  });
});

// ========================================
// ROTAS PARA HIDRÔMETROS V2
// ========================================

// Santa Mônica - Hidrômetros V2
router.get('/santaMonica_hidro_v2', function(req, res, next) {
  res.render('hydrometer-monitor-v2', { 
    title: 'Monitor de Hidrômetros V2 - Santa Mônica',
    nome: 'Santa Mônica - Monitoramento de Hidrômetros V2',
    clientKey: 'santaMonica' // Passa a chave do cliente para o frontend
  });
});

router.get('/golgidf_hidro_v2', function(req, res, next) {
  res.render('hydrometer-monitor-v2', { 
    title: 'Monitor de Hidrômetros V2 - Golgi Brasilia',
    nome: 'Golgi Brasilia - Monitoramento de Hidrômetros V2',
    clientKey: 'golgidf' // Passa a chave do cliente para o frontend
  });
});

// Hospital de Base - Hidrômetros V2
router.get('/hospitalBase_hidro_v2', function(req, res, next) {
  res.render('hydrometer-monitor-v2', { 
    title: 'Monitor de Hidrômetros V2 - Hospital de Base',
    nome: 'Hospital de Base - Monitoramento de Hidrômetros V2',
    clientKey: 'HospitalBase' // Passa a chave do cliente para o frontend
  });
});

  
  router.get('/test', function(req, res) {
    res.redirect('/users/test/res')
    //res.send("ola");
  });

  //router.get('/anchieta',chekToken, function(req, res) {
  router.get('/test/res', function(req, res) {
      res.render('test', { title: 'Mep Tecnologia', nome:"Condominio" });
    });
  //--------------------------------------------------------------------------
  //router.get('/santaMonica',chekToken, function(req, res) {
  router.get('/santaMonica', function(req, res) {
    //res.render('santaMonica_energ', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica"  });
    res.redirect('/users/santaMonica_energ_v2')
  });


  router.get('/santaMonica_hidro', function(req, res) {
    //res.render('santaMonica_hidro', { title: 'Mep Tecnologia', nome:"Ed. Santa Monica" });
    res.redirect('/users/santaMonica_hidro_v2')
  });
  
  //-------------------------------- CASA --------------------------------------------------------------
  router.get('/casa', function(req, res) {
    res.render('casa', { title: 'Mep Tecnologia', nome:"Casa Douglas"  });
  });
  

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

    router.get('/manutencao', function(req, res) {
      res.render('manutencao', { title: 'Mep Tecnologia', nome:"Tagua Life" });
    });

  router.get('/app/taguaLife/res', async function(req, res) {
    //console.log(req.query)
    const dados= await model_Res.getDataStart(req.query.id,"taguaLife")

    res.send(dados.leitura);
  });

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
//----------------------- Inicio Hopital de Base -------------------------------------------
router.get('/hospitalBase', function(req, res) {
  res.redirect('/users/hospitalBase_energ_v2')
  //res.render('hospitalBase_energ', { title: 'Mep Tecnologia', nome:"Hospital de Base DF"  });
});

router.get('/hospitalBase_hidro', function(req, res) {
  res.redirect('/users/hospitalBase_hidro_v2')
  //res.render('hospitalBase_hidro', { title: 'Mep Tecnologia', nome:"Hospital de Base DF" });
});

//----------------------- FIM Hospital de Base -------------------------------------------

  //----------------------- Inicio Golgi Brasilia -------------------------------------------
router.get('/golgidf', function(req, res) {
  res.redirect('/users/golgidf_energ_v2')
  //res.render('hospitalBase_energ', { title: 'Mep Tecnologia', nome:"Hospital de Base DF"  });
});

router.get('/golgidf', function(req, res) {
  res.redirect('/users/golgidf_hidro_v2')
  //res.render('hospitalBase_hidro', { title: 'Mep Tecnologia', nome:"Hospital de Base DF" });
});

//----------------------- FIM Golgi Brasilia -------------------------------------------


  return router;
}
