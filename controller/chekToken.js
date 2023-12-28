const jwt = require('jsonwebtoken')
require('dotenv').config()

async function chekToken(req,res,next){
    try {

        const authHeader = req.headers.cookie
        const token = authHeader.split('=')[1]
        console.log(token)
        //req.headers.authorization = token
        try {
            await jwt.verify(token,process.env.CHAVE_TOKEN)
            next()
        } catch (error) {
            return res.redirect('/')
            //return res.status(400).json({mg: 'Token invalido!'})
            
        }
   
    } catch (error) {
        return res.redirect('/')
        //return res.send({error})
    }
}
module.exports = chekToken