const db = require('./connection')
const _ = require('../bin/funcoes')
const moment = require('moment')


const atualizarDados = async (leituraAtual,data,medidor,usuario) =>{
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    //console.log(d);
    _.adicionarSeNaoExistir( globalThis.medidoresEnergDinamico,`energ_${usuario}_${medidor}`)
    
    let consumoD = {}
    leituraAtual = await validacao(leituraAtual)
    
    const sql =  "INSERT INTO tb_"+ usuario +"_m"+medidor+" (data,pa,pb,pc,pt,qa,qb,qc,qt,sa,sb,sc,st,uarms,ubrms,ucrms,iarms,ibrms,icrms,itrms,pfa,pfb,pfc,pft,pga,pgb,pgc,freq,epa,epb,epc,ept,eqa,eqb,eqc,eqt,yuaub, yuauc,yubuc,tpsd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    try {
        const insert =await inserir(d,leituraAtual,sql)

        //consumo diario
        let [[CDio]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=? ORDER BY data DESC LIMIT 1",_.datasAnteriorers().dia)
        if (CDio == undefined) {
            [[CDio]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data) < ? ORDER BY data DESC LIMIT 1",_.datasAnteriorers().dia)
            if (CDio == undefined) {
                [[CDio]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=? ORDER BY data LIMIT 1", moment(data).format('YYYY-MM-DD'))
            }
        }
        if(leituraAtual.ept_c == undefined){
            consumoD.valor = parseFloat((leituraAtual.ept - parseFloat(CDio.ept)).toFixed(2))
        }else{
            consumoD.valor = parseFloat((leituraAtual.ept_c - parseFloat(CDio.ept)).toFixed(2))
        }
        
        try {
            await db.query('INSERT INTO tb_'+ usuario +'_cd_m'+medidor+' (data,valor) VALUES (?,?) ', [moment(data).format('YYYY-MM-DD'),consumoD.valor]);
            //console.log(`consumo diario iniciado: ${consumo.valor}`)
        } catch (error) {
            let [x] = await db.query('UPDATE tb_'+ usuario +'_cd_m'+medidor+' SET valor = ? WHERE data = ?', [consumoD.valor, moment(data).format('YYYY-MM-DD')]);
            //console.log(`consumo diario atualizado: ${consumo.valor}`)
        }
    } catch (error) {
        console.error(error);
    }
    
    //consumo no mes
    periodo=_.instervaloDoMes(parseInt(moment(data).format('MM')),parseInt(moment(data).format('YYYY')))
    const [consumosDiarios] = await db.query("SELECT data,valor FROM tb_"+ usuario +"_cd_m"+medidor+" WHERE DATE(data) >= ? AND DATE(data) <= ?",
                                                [periodo.inicial,periodo.final])
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
        let inserir = 6 - consumosMensais.length
        let mes = consumosMensais[consumosMensais.length-1].data
        //for(i=0;i>)
        //console.log(mes)
    }                               
    
    var consumos ={
        consumo: consumoD.valor.toFixed(2),
        consumoMensal: consumoMensal.valor.toFixed(2),
    }
    try {
        consumos.consumoDiaAnterior = cda.valor.toFixed(2)
    } catch (error) {
        consumos.consumoDiaAnterior = 0
    }
    try {
        consumos.consumoMesAnterior = cma.valor.toFixed(2)
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
    }catch(erro){
        console.log(erro)
        var consumo={data: moment(ultimaLeitura.data).format('YYYY-MM-DD'), valor : 0}
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

const getConsumo = async (url,id,startDate,endDate)=>{
    let consumosDiario
    let consumo
    //console.log(startDate)
    //console.log(endDate)
    const sql = "SELECT * FROM tb_"+url+"_cd_m"+id+" WHERE DATE(data) >= ? AND DATE(data) <= ? ORDER BY data ASC"
    
    const sql2 = "SELECT data,ept FROM tb_"+url+"_m"+id+" WHERE DATE(data) >= ? AND DATE(data) <= ? ORDER BY data ASC"
    try {
        [consumosDiario] = await db.query(sql,[startDate,endDate]);
        [CD] = await db.query(sql2,[startDate,endDate])

        console.log(CD[CD.length-1])
        console.log(CD[0])
        consumo=  CD[CD.length-1].ept - CD[0].ept
    } catch (error) {
        console.log(error)
    }
    //const consumo = consumosDiario.map(item => item.valor).reduce((total, valor) => total + valor, 0).toFixed(3)
    return {consumosDiario,consumo}
}


const getConsumo2 = async (url,id,startDate,endDate)=>{
    let consumosDiario
    console.log(startDate)
    console.log(endDate)
    const sql = "SELECT * FROM tb_"+url+"_cd_m"+id+" WHERE DATE(data) >= ? AND DATE(data) <= ? ORDER BY data ASC"
    try {
        [consumosDiario] = await db.query(sql,[startDate,endDate])
    } catch (error) {
        console.log(error)
    }
    const consumo = consumosDiario.map(item => item.valor).reduce((total, valor) => total + valor, 0).toFixed(3)
    return {consumosDiario,consumo}
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
        if(leitura.iarms == 0){
            leitura.pa = 0
        }
    }
    
    if(leitura.ibrms < 1){
        if(leitura.pb < 0){
            leitura.pb = 0
        }
        if(leitura.ibrms == 0){
            leitura.pb = 0
        }
    }

    if(leitura.icrms < 1){
        if(leitura.pc < 0){
            leitura.pc = 0
        }
        if(leitura.icrms == 0){
        leitura.pc = 0
        }
    }
    
    leitura.pt = (parseFloat(leitura.pa) + parseFloat(leitura.pb) + parseFloat(leitura.pc)).toFixed(3)
   //console.log(leitura.pt)
    return leitura
}

async function getRelatorio(usuario,startDate,endDate,disposisitos) {
    var medidores = []
    try {
        console.log("iniciando relatorio")
        for (let index = 0; index < disposisitos.length; index++) {
            const medidor = disposisitos[index].id;
            let [[consumoInicial]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=? ORDER BY data ASC LIMIT 1",moment(startDate).format('YYYY-MM-DD'))
            if (consumoInicial == undefined) {
                [[consumoInicial]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data) < ? ORDER BY data DESC LIMIT 1",moment(startDate).format('YYYY-MM-DD'))
                if (consumoInicial == undefined) {
                    [[consumoInicial]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)> ORDER BY data ASC LIMIT 1", moment(startDate).format('YYYY-MM-DD'))
                }
            }
        
            let [[consumoFinal]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)=? ORDER BY data DESC LIMIT 1",moment(endDate).format('YYYY-MM-DD'))
            if (consumoFinal == undefined) {
                [[consumoFinal]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data) < ? ORDER BY data DESC LIMIT 1",moment(endDate).format('YYYY-MM-DD'))
                if (consumoFinal == undefined) {
                    [[consumoFinal]] = await db.query("SELECT data,ept FROM tb_"+ usuario +"_m"+medidor+" WHERE DATE(data)> ORDER BY data ASC LIMIT 1", moment(endDate).format('YYYY-MM-DD'))
                }
            }   
            const dados = {
                consumo:{
                    startDate: moment(startDate).format('DD-MM-YYYY'),
                    endDate: moment(endDate).format('DD-MM-YYYY'),
                    valor : parseFloat((parseFloat(consumoFinal.ept) - parseFloat(consumoInicial.ept)).toFixed(2)),
                },
                id: medidor,
                nome: disposisitos[index].local
            }
        medidores.push(dados)
        }
        console.log("dados do relatorio enviados ")
    return (medidores)
    } catch (error) {
        console.log(error)
        return({error: error})
    }
    //const consumo = consumosDiario.map(item => item.valor).reduce((total, valor) => total + valor, 0).toFixed(3)
    
}


module.exports = {
    atualizarDados,
    getDataStart,
    getConsumo,
    getRelatorio
}