const jwt = require('jsonwebtoken')
const db = require('../models/connection')
require('dotenv').config()


async function logar(req,res){
    const {user,password} = req.body
    //validation
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE usuario = ?  LIMIT 1",user)
    //console.log(usuario)
    if(usuario == undefined){
        return res.status(422).json({ msg:"Usuario não encontrado" })
    }
    if(usuario.senha == password){
        /*
        const token = await jwt.sign({
            user: usuario.id,
        },process.env.CHAVE_TOKEN,{expiresIn: '2m'})
        console.log('Token: '+token)
        res.cookie('Token',token)*/
        return res.redirect('/users/'+ usuario.url)
    }
    else{
        return res.status(422).json({ msg:"Senha invalida" })
    }
}

async function logarAPP(user,password){
    const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE usuario = ?  LIMIT 1",user)
    if(usuario == undefined){
        const login = {
            resultado: "Usuario não encontrado",
        };
        return login
    }
    if(usuario.senha == password){

       const login = {
            resultado: 'Login bem-sucedido',
            url: usuario.url, 
            qntReservatorio: usuario.reservatorio,
            reservatoriosNomes: usuario.reservatorios,
            qntMedidor: usuario.energia,
            medidoresNomes: usuario.med_energia,
            qntHidromentro: usuario.hidrometro,
            hidrometroNomes: usuario.hidrometros
        };
        return login
    }
    else{
        const login = {
            resultado: "Senha invalida",
        };
        return login
    }
}

module.exports = {logar,logarAPP}