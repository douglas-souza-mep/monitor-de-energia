const db = require('./connection')
const _ = require('../bin/funcoes')
const moment = require('moment')
var consumo = {
    data: "",
    valor: 0
}

const atualizarDados = async (leituraAtual,data,medidor,usuario) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    //console.log(d);
    
    leituraAtual = await validacao(leituraAtual)
    
    const sql =  "INSERT INTO tb_"+ usuario +"_m"+medidor+" (data,pa,pb,pc,pt,qa,qb,qc,qt,sa,sb,sc,st,uarms,ubrms,ucrms,iarms,ibrms,icrms,itrms,pfa,pfb,pfc,pft,pga,pgb,pgc,freq,epa,epb,epc,ept,eqa,eqb,eqc,eqt,yuaub, yuauc,yubuc,tpsd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    try {
       
        const insert =await inserir(d,leituraAtual,sql)
        
        const sql2 = "SELECT data,pt FROM tb_"+ usuario +"_m"+medidor+" WHERE id="+(insert.insertId-1)
        const [leituraAnterior] = await db.query(sql2)
    
        consumo.data = moment(data).format('YYYY-MM-DD');
        const sql3 = "SELECT data,valor FROM tb_"+ usuario +"_cd_m"+medidor+" WHERE data = ?"
        var [[consumoAnterior]] = await db.query(sql3,consumo.data)
        try {
            if( moment(consumoAnterior.data).format('YYYY-MM-DD')==consumo.data){
                consumo.valor = consumoAnterior.valor +  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
                const sql4 = 'UPDATE tb_'+ usuario +'_cd_m'+medidor+' SET valor = ? WHERE data = ?';
                await db.query(sql4, [consumo.valor, consumo.data]);
            }
            else{
                consumo.valor =  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
                const sql4 = 'INSERT INTO tb_'+ usuario +'_cd_m'+medidor+' (data,valor) VALUES (?,?) ';
                await db.query(sql4, [consumo.data, consumo.valor]);
            }
        } catch (error) {
                consumo.valor =  _.calculoConsumo(leituraAnterior[0].data,data,leituraAtual.pt)
                const sql4 = 'INSERT INTO tb_'+ usuario +'_cd_m'+medidor+' (data,valor) VALUES (?,?) ';
                await db.query(sql4, [consumo.data, consumo.valor]);
        }
    } catch (error) {
        console.error(error);
    }
    
    //consumo no mes
    periodo=_.instervaloDoMes(parseInt(moment(data).format('MM')),parseInt(moment(data).format('YYYY')))
    const sql5 = "SELECT data,valor FROM tb_"+ usuario +"_cd_m"+medidor+" WHERE DATE(data) >= ? AND DATE(data) <= ?";
    const [consumosDiarios] = await db.query(sql5,[periodo.inicial,periodo.final])
    const mesAtual = periodo.final
    const consumoMensal ={
        data: mesAtual,
        valor: consumosDiarios.map(item => item.valor).reduce((total, valor) => total + valor, 0)
        
    }
    
    var [[x]] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cm_m"+medidor+" WHERE data = ? LIMIT 1",mesAtual)
    if(x == undefined){
        await db.query('INSERT INTO tb_'+ usuario +'_cm_m'+medidor+' (data,valor) VALUES (?,?)' ,
         [consumoMensal.data, consumoMensal.valor.toFixed(3)]);
    }else{
        await db.query('UPDATE tb_'+ usuario +'_cm_m'+medidor+' SET valor = ? WHERE data = ?', 
        [consumoMensal.valor, consumoMensal.data]);
    }

    //consumo do mes anterior e de ontem
    const anterior = _.datasAnteriorers()
    const [[cda]] = await db.query("SELECT valor FROM tb_"+ usuario +"_cd_m"+medidor+" WHERE DATE(data) = ? LIMIT 1",
                                    anterior.dia)
    const [[cma]] = await db.query("SELECT valor FROM tb_"+ usuario +"_cm_m"+medidor+" WHERE DATE(data) = ? LIMIT 1",
                                    anterior.mes)
    
    const [consumosSemanais] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cd_m"+medidor+" ORDER BY data DESC LIMIT 8")
    const [consumosMensais] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cm_m"+medidor+" ORDER BY data DESC LIMIT 6")
    const [cd] = await db.query("SELECT data,pt FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=?",
                                    moment(data).format('YYYY-MM-DD'))
    if(consumosMensais.length<6){
        let inserir = 6- consumosMensais.length
        let mes = consumosMensais[consumosMensais.length-1].data
        //for(i=0;i>)
        //console.log(mes)
    }                               
    
    
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
    consumosSemanais.forEach((dado) => {
        graficos.semanal.unshift([_.traduzDia(moment(dado.data).format('ddd(DD)')),dado.valor])
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.unshift([_.traduzMes(moment(dado.data).format('MMMM-YYYY')),dado.valor])
    });

    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss')
        graficos.diario.push([hora,dado.pt])
    });
   //console.log(graficos.diario)
   
    //console.log("dados atualizados")
    return {consumos:consumos,graficos:graficos};
} 

const getDataStart= async(medidor,usuario) =>{
    const sql2 = "SELECT data,pa,pb,pc,pt,pfa,pfb,pfc,pft,uarms,ubrms,ubrms,ucrms,iarms,ibrms,icrms,itrms,freq,tpsd FROM tb_"+ usuario+"_m"+medidor+" ORDER BY id DESC LIMIT 1"
    const [[ultimaLeitura]] = await db.query(sql2)
    try{
        var [[consumo]] = await db.query("SELECT data,valor FROM tb_"+ usuario+"_cd_m"+medidor+" WHERE data = ? LIMIT 1",
                                                moment(ultimaLeitura.data).format('YYYY-MM-DD'))
    }catch{
        var consomo = 0
    }
    //consumo no mes
    periodo=_.instervaloDoMes(parseInt(moment().format('MM')),parseInt(moment().format('YYYY')))
    const mesAtual = periodo.final
    var [[consumoMensal]] = await db.query("SELECT valor FROM tb_"+ usuario+"_cm_m"+medidor+" WHERE data = ? LIMIT 1",mesAtual)
    if(consumoMensal == undefined){consumoMensal = 0 }
    

     //consumo do mes anterior e de ontem
    const anterior = _.datasAnteriorers()
    const [[cda]] = await db.query("SELECT valor FROM tb_"+ usuario+"_cd_m"+medidor+" WHERE DATE(data) = ? LIMIT 1",
                                    anterior.dia)
    const [[cma]] = await db.query("SELECT valor FROM tb_"+ usuario +"_cm_m"+medidor+" WHERE DATE(data) = ? LIMIT 1",
                                    anterior.mes)
    
    const [consumosSemanais] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cd_m"+medidor+" ORDER BY data DESC LIMIT 8")
    const [consumosMensais] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cm_m"+medidor+" ORDER BY data DESC LIMIT 6")
    var data = new Date();
        data = data.setHours(data.getHours() - 3)
    const [cd] = await db.query("SELECT data,pt FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=?",
                                    moment(data).format('YYYY-MM-DD'))

    try{
        var consumos ={
            consumo: consumo.valor.toFixed(3)
        }
    } catch(error){
        var consumos ={
            consumo: 0
        }
    }
   try {
        consumos.consumoMensal= consumoMensal.valor.toFixed(3)
    } catch (error) {
        consumos.consumoMensal = 0
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

    consumosSemanais.forEach((dado) => {
        graficos.semanal.unshift([_.traduzDia(moment(dado.data).format('ddd(DD)')),dado.valor])
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.unshift([_.traduzMes(moment(dado.data).format('MMMM-YYYY')),dado.valor])
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
            dados.leitura.id = medidor
            dados.leitura.data = moment(dados.leitura.data).format('DD-MM-YYYY HH:mm:ss')
        } catch (error) {
            const d = moment(data).format('DD-MM-YYYY HH:mm:ss')
            var dados = {
                leitura: {id: medidor, data: d, pa: 0, pb: 0, pc: 0, pt: 0, qa: 0, qb: 0, qc: 0, 
                            qt: 0, sa: 0, sb: 0, sc: 0, st: 0, uarms: 0, ubrms: 0, ucrms: 0, iarms: 0, 
                            ibrms: 0,icrms: 0, itrms: 0, pfa: 0, pfb: 0, pfc: 0, pft: 0, pga: 0, pgb: 0,
                            pgc: 0, freq: 0, epa: 0, epb: 0, epc: 0, ept: 0, eqa: 0, eqb: 0, eqc: 0, 
                            eqt: 0, yuaub: 0, yuauc: 0, yubuc: 0, tpsd: 0 },
                consumos: consumos,
                graficos: graficos
            }
        }

    
    return dados
}

const inserir = async (d,leituraAtual,sql) =>{
    //console.log(leituraAtual)
    try {
        const [inset] =await db.query( sql,
            [d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
            leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa,leituraAtual.epb,leituraAtual.epc,leituraAtual.ept,leituraAtual.eqa,leituraAtual.eqb,leituraAtual.eqc,leituraAtual.eqt,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
            ])
        return inset    
     } catch {
            //console.log(leituraAtual)
            const [inset] =await db.query( sql,
                [d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
                leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa_c,leituraAtual.epb_c,leituraAtual.epc_c,leituraAtual.ept_c,leituraAtual.epa_g,leituraAtual.epb_g,leituraAtual.epc_g,leituraAtual.ept_g,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
                ])
        return inset
        }
    
}

const validacao = async (leitura) =>{
    if(leitura.iarms < 1){
        if(leitura.pa < 0){
            leitura.pa = 0
        }
    }
    if(leitura.ibrms < 1){
        if(leitura.pb < 0){
            leitura.pb = 0
        }
    }
    if(leitura.icrms < 1){
        if(leitura.pc < 0){
            leitura.pc = 0
        }
    }
    
    leitura.pt = (parseFloat(leitura.pa) + parseFloat(leitura.pb) + parseFloat(leitura.pc)).toFixed(3)
   //console.log(leitura.pt)
    return leitura
}

module.exports = {
    atualizarDados,
    getDataStart
}