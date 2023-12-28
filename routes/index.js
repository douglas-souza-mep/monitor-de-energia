var express = require('express');
var router = express.Router();
const Logar = require('../controller/logar')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Mep Tecnoligia' });
});

router.post('/', async(req,res)=>{
  Logar(req, res)
})

module.exports = router;
