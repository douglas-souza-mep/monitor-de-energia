const db = require('./connection')
const moment = require('moment')
const { sendAlerta } = require('../bin/funcoes');



var alertas ={
    urlID:[],
    data: []
}

const atualizarDados = async (leituraAtual,data,medidor,usuario) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    //console.log(d);
    
    leituraAtual = await validacao(leituraAtual);

    const sql =  "INSERT INTO tb_"+ usuario +"_res (id,data,volume,nivel,distancia) VALUES (?,?,?,?,?)";
    const insert = await inserir(medidor,d,leituraAtual,sql);
    if(insert.error){
        return {erro:insert.error}
    }
    /*let data2 = data.setHours(data.getHours() - 48)
    const [cd] = await db.query("SELECT id,data,nivel,distancia FROM tb_"+ usuario +"_res WHERE id = "+medidor+" AND DATE(data)>=?",
    moment(data2).format('YYYY-MM-DD'))

    const graficos = []

    cd.forEach((dado) => {
        //let hora = moment(dado.data).format('HH:mm:ss')
        let hora =moment(dado.data).format('YYYY-MM-DD[T]HH:mm:ss')
        graficos.push([hora,dado.volume,dado.nivel,dado.distancia])
    });*/
    
    return {leitura:leituraAtual};
}

const atualizarDados2 = async (data,distancia,dimensoes,id,usuario,nome,modoOp) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    
    leituraAtual = await validacao2(distancia,dimensoes,id,nome,modoOp);
    
    if(leituraAtual.erro == 1){
        return {erro:"Dados invalidos"}
    }
    const sql =  "INSERT INTO tb_"+ usuario +"_res (id,data,volume,nivel,distancia) VALUES (?,?,?,?,?)";
    const insert = await inserir(id,d,leituraAtual,sql);
    
    if(insert.error){
        sendAlerta(`FALHA AO INSERIR DADOS NO BANCO DE DADOS DO ${cliente}\nReservatorio: ${id}\nErro: ${insert.error}`,[process.env.CHAT_ID_DEV])
        return {erro:insert.error}
    }
    
    return {leitura:leituraAtual};
}

const getDataStart= async(medidor,usuario) =>{
    const sql = "SELECT id,data,nivel,distancia FROM tb_"+usuario+"_res WHERE id = "+medidor+" ORDER BY data DESC LIMIT 1"
    const [[ultimaLeitura]] = await db.query(sql)

    /*var data = new Date();
    data = data.setHours(data.getHours() - 51)
    //console.log(moment(data).format('YYYY-MM-DD'))
    const [cd] = await db.query("SELECT id,data,nivel,distancia FROM tb_"+ usuario +"_res WHERE id = "+medidor+" AND DATE(data)>=?",
        moment(data).format('YYYY-MM-DD'))

    const graficos = []


    cd.forEach((dado) => {
        //let hora = moment(dado.data).format('HH:mm:ss')
        let hora =moment(dado.data).format('YYYY-MM-DD[T]HH:mm:ss')
        graficos.push([hora,dado.volume,dado.nivel,dado.distancia])
    });*/
    

    try {
        var dados = {
        leitura:ultimaLeitura, 
        //graficos: graficos
        }
        //dados.leitura.id = medidor
        dados.leitura.data = moment(dados.leitura.data).format('DD-MM-YYYY HH:mm:ss')
    } catch (error) {
        const d = moment("2000-01-01").format('DD-MM-YYYY HH:mm:ss')
        var dados = {
            leitura: {id: medidor, data: d, volume:0, distancia:0, nivel:0 },
            //graficos: graficos
        }
    }


return dados

}

const getHistorico= async (url,id,startDate,endDate)=>{
    let historico = []
    //console.log(startDate)
    //console.log(endDate)
    try {
        const [cd] = await db.query("SELECT id,data,nivel,distancia FROM tb_"+ url+"_res WHERE id = "+id+" AND DATE(data) >= ? AND DATE(data) <= ? ORDER BY data ASC",
        [moment(startDate).format('YYYY-MM-DD'),moment(endDate).format('YYYY-MM-DD')])

        cd.forEach((dado) => {
            //let hora = moment(dado.data).format('HH:mm:ss')
            let hora =moment(dado.data).format('YYYY-MM-DD[T]HH:mm:ss')
            historico.push([id,hora,dado.nivel,dado.distancia])
        });
    } catch (error) {
        console.log(error)
    }

    return historico
}


async function dadosAlerta(url,id){
    try {
        
        const [[retorno]] = await db.query("SELECT nome,reservatorios,chatID FROM usuarios WHERE url = ?  LIMIT 1",url)
        //console.log(retorno)
        const reservatorios = retorno.reservatorios.split(";")
        const chatID = retorno.chatID.split(";")
        const index = reservatorios.indexOf(id.toString());
        return {chatID:chatID, local: reservatorios[index+1], id: reservatorios[index],nome:retorno.nome}
        
    } catch (error) {
        return {error:error}
    }
}

const validacao = async (leitura) =>{
    //console.log(leitura.distancia)
   if(leitura.distancia==undefined){
      leitura.distancia = parseInt(leitura.d)
      leitura.nivel = parseInt(leitura.nivel)
      leitura.volume = parseInt(leitura.volume)
      //console.log(leitura)
   } 
    return leitura
}

const validacao2 = async (distancia,dimensoes,id,cliente,modoOp) =>{
    let leituraAtual = {} 

    if(distancia<dimensoes.max){
        leituraAtual.id = id
        leituraAtual.distancia = distancia
        leituraAtual.nivel = await calcularNivel(distancia,dimensoes.vazio,dimensoes.cheio)
        leituraAtual.modoOp = modoOp
        leituraAtual.volume = 0
        leituraAtual.erro = 0
    }
    else{
        sendAlerta(`FALHA AO OBTER DADOS DO ${cliente}\nReservatorio: ${id}\nDistancia: ${distancia}`,[process.env.CHAT_ID_DEV])
        leituraAtual.erro = 1
    }
    return leituraAtual
}

const inserir = async (id,d,leituraAtual,sql) =>{
    //console.log(leituraAtual)
    try {
        const [insert] =await db.query( sql,[id,d,leituraAtual.volume,leituraAtual.nivel,leituraAtual.distancia])
        return insert    
    } catch(error) {
        console.error(error);
        console.log(leituraAtual)
        //const [inset] =await db.query( sql,
        //    [d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
        //    leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa_c,leituraAtual.epb_c,leituraAtual.epc_c,leituraAtual.ept_c,leituraAtual.epa_g,leituraAtual.epb_g,leituraAtual.epc_g,leituraAtual.ept_g,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
        //    ])
        return {error:error}
    }
    
}

async function calcularNivel (distancia, vazio, cheio) {
    return parseInt((distancia - vazio) * (100) / (cheio - vazio));
}

async function verificarAlarmes(id,dimensoes,leitura,url,data) {
    const { adicionarSeNaoExistir } = require('../bin/funcoes');

     // ####################### ALERTA ################################################     
    adicionarSeNaoExistir( globalThis.reservatoriosDinamico,`res_${url}_${id}`)
    
    if(leitura.nivel<=dimensoes.NB){
        //console.log(alertas)
        let index = alertas.urlID.indexOf(url+id+"NB");
        //console.log(index)
        if(index==-1){
        const retorno = await dadosAlerta(url,id)
        const msg = `Alerta de nivel baixo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${leitura.nivel} \nHorario: ${moment(data).format('DD-MM-YYYY HH:mm:ss')}` 
        sendAlerta(msg,retorno.chatID)
        alertas.urlID.push(url+id+"NB")
        alertas.data.push(data) 
        }else{
            if (data-alertas.data[index]>=(1*60*1000)) {
                const retorno = await dadosAlerta(url,id)
                const msg = `Alerta de nivel baixo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${leitura.nivel} \nHorario: ${moment(data).format('DD-MM-YYYY HH:mm:ss')}`;
                sendAlerta(msg,retorno.chatID)
                alertas.data[index] = data
            }
        }
    }

    if(leitura.nivel>105){
        //console.log(alertas)
        let index = alertas.urlID.indexOf(url+id+"NA");
        // console.log(index)
        if(index==-1){
            const retorno = await dadosAlerta(url,id)
            const msg = `Alerta de trasbordo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${leitura.nivel} \nHorario: ${moment(data).format('DD-MM-YYYY HH:mm:ss')}`
            sendAlerta(msg,retorno.chatID)
            alertas.urlID.push(url+id+"NA")
            alertas.data.push(data) 
        }else{
            if (data-alertas.data[index]>=(1*60*1000)) {
            const retorno = await dadosAlerta(url,id)
            const msg = `Alerta de trasbordo!\nLocal: ${retorno.nome}\nReservatório: ${retorno.local} (id:${retorno.id})\nNivel: ${leitura.nivel} \nHorario: ${moment(data).format('DD-MM-YYYY HH:mm:ss')}` 
            sendAlerta(msg,retorno.chatID)
            alertas.data[index] = data
            }
        }
    }
   // #######################################################################
}

module.exports = {
    atualizarDados,
    atualizarDados2,
    getDataStart,
    dadosAlerta,
    getHistorico,
    calcularNivel,
    verificarAlarmes
}

