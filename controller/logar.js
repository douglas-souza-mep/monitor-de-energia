const jwt = require('jsonwebtoken')
const db = require('../models/connection')
require('dotenv').config()


async function logar(req,res){
    const {user,password} = req.body
    //validation
    try {
        const [[usuario]] = await db.query("SELECT * FROM usuarios WHERE usuario = ?  LIMIT 1",user)
    //console.log(usuario)
    } catch (error) {
        console.log(error)
        console.log(req.body)
    }
    
    if(usuario == undefined){

        return {acesso:0 , msg:"⚠️ Usuário não encontrado!"}//res.status(422).json({ msg:"Usuario não encontrado" })
    }

    if(usuario.senha == password){
        /*
        const token = await jwt.sign({
            user: usuario.id,
        },process.env.CHAVE_TOKEN,{expiresIn: '2m'})
        console.log('Token: '+token)
        res.cookie('Token',token)*/
        return {acesso:1, url: '/users/'+usuario.url}//res.redirect('/users/'+ usuario.url)
    }
    else{
        return {acesso:0, msg: "❌ Senha incorreta!"} //res.status(422).json({ msg:"Senha invalida" })
    }
}

async function logarTelegran(username, password,chatId) {
    try {
        const [user] = await db.query(
            'SELECT * FROM usuarios WHERE usuario = ? AND senha = ?',
            [username, password]);
        //console.log(user[0])
        if (user[0]) {// Salva o chatId no banco de dados
            //console.log(user[0].chatId)
            if(user[0].chatID!==null){
                const chatIDS = await user[0].chatID.split(";")
                //console.log(chatIDS)
                await chatIDS.forEach(element => {
                    if(element == chatId){
                        return {msg:'Usuario ja cadastrado.'};
                    }
                });
                chatIDS.push(chatId)
                chatId= chatIDS.join(";")
            }
           const  x=await db.query('UPDATE usuarios SET chatID = ? WHERE usuario = ? AND senha = ?',
                    [chatId.toString(), username, password]);
            if(x[0].affectedRows==1){
                if(x[0].changedRows==1){
                    return {msg:'Login bem-sucedido! Seu chatId foi salvo e você está pronto para receber alertas.'};
                }
                if(x[0].changedRows==0){
                    return {msg:'Usuario ja cadastrado.'};
                }
                return {msg:'Falha ao te registrar para receber alertas! Entre em contato com suporte.'};
            }
            else{
                return {msg:'Falha ao te registrar para receber alertas! Entre em contato com suporte.'};
            }
            
        } else {
            return {msg:'Usuário ou senha inválidos. Tente novamente digitando seu usuario (sem espaços)'};
        }
    } catch(erro) {
        console.log(erro)
        return {msg:'falha na consulta ao banco de dados'};
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

module.exports = {logar,logarAPP,logarTelegran}