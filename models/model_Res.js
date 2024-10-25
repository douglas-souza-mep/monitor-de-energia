const db = require('./connection')
const _ = require('../bin/funcoes')
const moment = require('moment')

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

module.exports = {
    atualizarDados,
    getDataStart,
    dadosAlerta,
    getHistorico
}

