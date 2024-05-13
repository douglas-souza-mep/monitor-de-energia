const db = require('./connection')
const _ = require('../bin/funcoes')
const moment = require('moment')

const atualizarDados = async (leituraAtual,data,medidor,usuario) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    console.log(d);
    
    leituraAtual = await validacao(leituraAtual);

    const sql =  "INSERT INTO tb_"+ usuario +"_res"+medidor+" (data,volume,nivel,distancia) VALUES (?,?,?,?)";
    const insert = await inserir(d,leituraAtual,sql);
    
    const [cd] = await db.query("SELECT data,volume,nivel,distancia FROM tb_"+ usuario +"_res"+medidor+" WHERE DATE(data)=?",
    
    moment(data).format('YYYY-MM-DD'))

    const graficos = []

    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss')
        graficos.push([hora,dado.volume,dado.nivel,dado.distancia])
    });
    
    return {graficos:graficos};
}

const getDataStart= async(medidor,usuario) =>{
    const sql = "SELECT data,volume,nivel,distancia FROM tb_"+ usuario+"_res"+medidor+" ORDER BY data DESC LIMIT 1"
    const [[ultimaLeitura]] = await db.query(sql)

    var data = new Date();
    data = data.setHours(data.getHours() - 3)

    const [cd] = await db.query("SELECT data,volume,nivel,distancia FROM tb_"+ usuario +"_res"+medidor)//+" WHERE DATE(data)=?",
        //moment(data).format('YYYY-MM-DD'))

    const graficos = []


    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss')
        graficos.push([hora,dado.volume,dado.nivel,dado.distancia])
    });
    

    try {
        var dados = {
        leitura:ultimaLeitura, 
        graficos: graficos
        }
        dados.leitura.id = medidor
        dados.leitura.data = moment(dados.leitura.data).format('DD-MM-YYYY HH:mm:ss')
    } catch (error) {
        const d = moment(data).format('DD-MM-YYYY HH:mm:ss')
        var dados = {
            leitura: {id: medidor, data: d, volume:0, distancia:0, nivel:0 },
            graficos: graficos
        }
    }


return dados

}

const validacao = async (leitura) =>{
    
    return leitura
}

const inserir = async (d,leituraAtual,sql) =>{
    //console.log(leituraAtual)
    try {
        const [inset] =await db.query( sql,[d,leituraAtual.volume,leituraAtual.nivel,leituraAtual.distancia])
        return inset    
     } catch(error) {
        console.error(error);
        console.log(leituraAtual)
        //const [inset] =await db.query( sql,
        //    [d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
        //    leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa_c,leituraAtual.epb_c,leituraAtual.epc_c,leituraAtual.ept_c,leituraAtual.epa_g,leituraAtual.epb_g,leituraAtual.epc_g,leituraAtual.ept_g,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
        //    ])
        return inset
        }
    
}

module.exports = {
    atualizarDados,
    getDataStart
}

