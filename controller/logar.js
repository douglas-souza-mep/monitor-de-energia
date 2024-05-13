const jwt = require('jsonwebtoken')
const db = require('../models/connection')
require('dotenv').config()


async function Logar(req,res){
    const {user,password} = req.body
    //validation
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE usuario = ?  LIMIT 1",user)
    console.log(usuario)
    if(usuario == undefined){
        return res.status(422).json({ msg:"Usuario não encontrado" })
    }
    if(usuario.senha == password){

        const token = await jwt.sign({
            user: usuario.id,
        },process.env.CHAVE_TOKEN,{expiresIn: '2m'})
        console.log('Token: '+token)
        res.cookie('Token',token)
        return res.redirect('/users/'+ usuario.usuario)
    }
    else{
        return res.status(422).json({ msg:"Senha invalida" })
    }
}

module.exports = Logar