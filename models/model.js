const db = require('./connection')
const _ = require('../bin/funcoes')
const moment = require('moment')
var consumo = {
    data: "",
    valor: 0
}

const atualizarDados = async (leituraAtual,data,medidor) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss')
    console.log(d)
    const sql =  "INSERT INTO tb_brisas_m"+medidor+" (data,pa,pb,pc,pt,qa,qb,qc,qt,sa,sb,sc,st,uarms,ubrms,ucrms,iarms,ibrms,icrms,itrms,pfa,pfb,pfc,pft,pga,pgb,pgc,freq,epa,epb,epc,ept,eqa,eqb,eqc,eqt,yuaub, yuauc,yubuc,tpsd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    const [inset] =await db.execute( sql,
        [d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
         leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa,leituraAtual.epb,leituraAtual.epc,leituraAtual.ept,leituraAtual.eqa,leituraAtual.eqb,leituraAtual.eqc,leituraAtual.eqt,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
        ]) 
    const sql2 = "SELECT data,pt FROM tb_brisas_m"+medidor+" WHERE id="+(inset.insertId-1)
    const [leituraAnterior] = await db.execute(sql2)

    consumo.data = moment(data).format('YYYY-MM-DD');
    const sql3 = "SELECT data,valor FROM tb_consumo_diario_m"+medidor+" WHERE data = ?"
    var [[consumoAnterior]] = await db.query(sql3,consumo.data)
    try {
        if( moment(consumoAnterior.data).format('YYYY-MM-DD')==consumo.data){
            consumo.valor = consumoAnterior.valor +  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
            const sql4 = 'UPDATE tb_consumo_diario_m'+medidor+' SET valor = ? WHERE data = ?';
            await db.query(sql4, [consumo.valor, consumo.data]);
        }
        else{
            consumo.valor =  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
            const sql4 = 'INSERT INTO tb_consumo_diario_m'+medidor+' (data,valor) VALUES (?,?) ';
            await db.execute(sql4, [consumo.data, consumo.valor]);
        }
    } catch (error) {
            consumo.valor =  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
            const sql4 = 'INSERT INTO tb_consumo_diario_m'+medidor+' (data,valor) VALUES (?,?) ';
            await db.execute(sql4, [consumo.data, consumo.valor]);
    }

    //consumo no mes
    periodo=_.instervaloDoMes(11,2023)
    const sql5 = "SELECT data,valor FROM tb_consumo_diario_m"+medidor+" WHERE DATE(data) >= ? AND DATE(data) <= ?";
    const [consumosDiarios] = await db.query(sql5,[periodo.inicial,periodo.final])
    const consumoMensal ={
        data:periodo.final,
        valor: consumosDiarios.map(item => item.valor).reduce((total, valor) => total + valor, 0)
        
    }

    //consumo do mes anterior e de ontem
    const anterior = _.datasAnteriorers()
    const sql6 = "SELECT valor FROM tb_consumo_diario_m"+medidor+" WHERE DATE(data) = ?";
    const [[cda]] = await db.query(sql6,anterior.dia)
    const sql7 = "SELECT valor FROM tb_consumo_mensal_m"+medidor+" WHERE DATE(data) = ?";
    const [[cma]] = await db.query(sql7,anterior.mes)
    
    
    const sql8 = "SELECT data,valor FROM tb_consumo_mensal_m"+medidor;
    const [consumosMensais] = await db.query(sql8)

    const sql9 = "SELECT data,pt FROM tb_brisas_m"+medidor+" WHERE DATE(data)=?"
    const [cd] = await db.query(sql9,moment().format('YYYY-MM-DD'))
    
    var consumos ={
        consumo: consumo.valor.toFixed(3),
        consumoMensal: consumoMensal.valor.toFixed(3),
    }
   
    try {
        consumos.consumoDiaAnterior = cda.valor.toFixed(3)
    } catch (error) {
        consumos.consumoDiaAnterior = 0
    }
    try {
        consumos.consumoMesAnterior = cma.valor.toFixed(3)
    } catch (error) {
        consumos.consumoMesAnterior  = 0
    }
    const graficos = {
        diario: [],
        semanal:[],
        mensal:{
            datas:[],
            consumo:[]
        },
        semestral:[]
    }
    consumosDiarios.forEach((dado) => {
        graficos.semanal.push([_.traduzDia(moment(dado.data).format('ddd(DD)')),dado.valor])
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.push([moment(dado.data).format('MMMM-YYYY'),dado.valor])
    });

    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss')
        graficos.diario.push([hora,dado.pt])
    });
   
   
    console.log("dados atualizados")
    return {consumos:consumos,graficos:graficos};
} 

const getDataStart= async(medidor) =>{
    const sql2 = "SELECT data,pa,pb,pc,pt,uarms,ubrms,ubrms,ucrms,iarms,ibrms,icrms,itrms,freq,tpsd FROM tb_brisas_m"+medidor+" ORDER BY id DESC LIMIT 1"
    const [[ultimaLeitura]] = await db.query(sql2)
    //const sql3 = "SELECT valor FROM tb_consumo_diario"+medidor+" WHERE data = ?"
    const sql3 = "SELECT valor FROM tb_consumo_diario_m"+medidor+" WHERE data = ?"
    const [[consumoDiario ]] = await db.query(sql3,moment(ultimaLeitura.data).format('YYYY-MM-DD'))
    //consumo no mes
    periodo=_.instervaloDoMes(11,2023)
    const sql5 = "SELECT data,valor FROM tb_consumo_diario_m"+medidor+" WHERE DATE(data) >= ? AND DATE(data) <= ?";
    const [consumosDiarios] = await db.query(sql5,[periodo.inicial,periodo.final])
    const consumoMensal ={
        data:periodo.final,
        valor: consumosDiarios.map(item => item.valor).reduce((total, valor) => total + valor, 0)
        
    }

    //consumo do mes anterior e de ontem
    const anterior = _.datasAnteriorers()
    const sql6 = "SELECT valor FROM tb_consumo_diario_m"+medidor+" WHERE DATE(data) = ?";
    const [[cda]] = await db.query(sql6,anterior.dia)
    const sql7 = "SELECT valor FROM tb_consumo_mensal_m"+medidor+" WHERE DATE(data) = ?";
    const [[cma]] = await db.query(sql7,anterior.mes)


    const sql8 = "SELECT data,valor FROM tb_consumo_mensal_m"+medidor;
    const [consumosMensais] = await db.query(sql8)

    const sql9 = "SELECT data,pt FROM tb_brisas_m"+medidor+" WHERE DATE(data)=?"
    const [cd] = await db.query(sql9,moment().format('YYYY-MM-DD'))
    


    var consumos ={
        consumo: consumo.valor.toFixed(3),
        consumoMensal: consumoMensal.valor.toFixed(3),
    }
   
    try {
        consumos.consumoDiaAnterior = cda.valor.toFixed(3)
    } catch (error) {
        consumos.consumoDiaAnterior = 0
    }
    try {
        consumos.consumoMesAnterior = cma.valor.toFixed(3)
    } catch (error) {
        consumos.consumoMesAnterior  = 0
    }

    const graficos = {
        diario: [],
        semanal:[],
        mensal:{
            datas:[],
            consumo:[]
        },
        semestral:[]

    }

    consumosDiarios.forEach((dado) => {
        graficos.semanal.push([_.traduzDia(moment(dado.data).format('ddd(DD)')),dado.valor])
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.push([moment(dado.data).format('MMMM-YYYY'),dado.valor])
    });
   
    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss')
        graficos.diario.push([hora,dado.pt])
    });

    
    
        try {
            var dados = {
            leitura:ultimaLeitura, 
            consumos: consumos,
            graficos: graficos
            }
        } catch (error) {
            var dados = {
                leitura:ultimaLeitura, 
                consumos: consumos,
                graficos: graficos
            }
        }
    
    
    dados.leitura.id = medidor
    dados.leitura.data = moment(dados.leitura.data).format('DD-MM-YYYY HH:mm:ss')
    return dados
}

module.exports = {
    atualizarDados,
    getDataStart
}