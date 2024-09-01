var express = require('express');
var router = express.Router();
const Logar = require('../controller/logar')

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
module.exports = router;
