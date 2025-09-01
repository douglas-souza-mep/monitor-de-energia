const db = require('./connection');
const _ = require('../bin/funcoes');
const moment = require('moment');

// Suponha que você tenha uma forma de determinar se um condomínio usa a nova estrutura.
// Para este exemplo, vamos simular com uma função simples.
const isNewStructureCondominium = async (usuario) => {
    //console.log(usuario)
    /*  
    switch (usuario) {
        case 'santaMonica':
            return true;
        case 'HospitalBase':
            return true;  
    
        default:
            return false;
    }*/ 
    return false;
};

function getTableName(condominio, medidorId, tipoTabela, isNewStructure) {
    if (isNewStructure) {
        switch (tipoTabela) {
            case 'dados':
                return `tb_${condominio}_medidores`;
            case 'consumo_diario':
                return `tb_${condominio}_consumo_diario`;
            case 'consumo_mensal':
                return `tb_${condominio}_consumo_mensal`;
            default:
                throw new Error('Tipo de tabela inválido');
        }
    } else {
        switch (tipoTabela) {
            case 'dados':
                return `tb_${condominio}_m${medidorId}`;
            case 'consumo_diario':
                return `tb_${condominio}_cd_m${medidorId}`;
            case 'consumo_mensal':
                return `tb_${condominio}_cm_m${medidorId}`;
            default:
                throw new Error('Tipo de tabela inválido');
        }
    }
}

const atualizarDados = async (leituraAtual, data, medidor, usuario) => {
    const d = moment(data).format('YYYY-MM-DD HH:mm:ss');
    _.adicionarSeNaoExistir(globalThis.medidoresEnergDinamico, `energ_${usuario}_${medidor}`);

    let consumoD = {};
    //leituraAtual = await validacao(leituraAtual);

    const useNewStructure = await isNewStructureCondominium(usuario);

    let sqlInsertDados;
    let sqlSelectCD_LI1;
    let sqlSelectCD_LI2;
    let sqlInsertCD;
    let sqlUpdateCD;
    let sqlSelectCM;
    let sqlInsertCM;
    let sqlUpdateCM;
    let sqlSelectCDA;
    let sqlSelectCMA;
    let sqlSelectCSemanais;
    let sqlSelectCMensais;
    let sqlSelectCDadosDia;

    if (useNewStructure) {
        const tableNameDados = getTableName(usuario, medidor, 'dados', true);
        const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', true);
        const tableNameCM = getTableName(usuario, medidor, 'consumo_mensal', true);

        sqlInsertDados = `INSERT INTO ${tableNameDados} (id_medidor, data, pa, pb, pc, pt, qa, qb, qc, qt, sa, sb, sc, st, uarms, ubrms, ucrms, iarms, ibrms, icrms, itrms, pfa, pfb, pfc, pft, pga, pgb, pgc, freq, epa, epb, epc, ept, eqa, eqb, eqc, eqt, yuaub, yuauc, yubuc, tpsd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        sqlSelectCD_LI1 = `SELECT id_medidor, data, ept FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data)=? ORDER BY data DESC LIMIT 1`;
        sqlSelectCD_LI2 = `SELECT id_medidor, data, ept FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data)=? ORDER BY data ASC LIMIT 1`;
        sqlInsertCD = `INSERT INTO ${tableNameCD} (data, id_medidor, valor) VALUES (?,?,?)`;
        sqlUpdateCD = `UPDATE ${tableNameCD} SET valor = ? WHERE data = ? AND id_medidor = ?`;
        sqlSelectCM = `SELECT data, valor FROM ${tableNameCM} WHERE data = ? AND id_medidor = ? LIMIT 1`;
        sqlInsertCM = `INSERT INTO ${tableNameCM} (data, valor, id_medidor) VALUES (?,?,?)`;
        sqlUpdateCM = `UPDATE ${tableNameCM} SET valor = ? WHERE data = ? AND id_medidor = ?`;
        sqlSelectCDA = `SELECT valor FROM ${tableNameCD} WHERE DATE(data) = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectCMA = `SELECT valor FROM ${tableNameCM} WHERE DATE(data) = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectCSemanais = `SELECT data, valor FROM ${tableNameCD} WHERE id_medidor = ? ORDER BY data DESC LIMIT 8`;
        sqlSelectCMensais = `SELECT data, valor FROM ${tableNameCM} WHERE id_medidor = ? ORDER BY data DESC LIMIT 6`;
        sqlSelectCDadosDia = `SELECT data, pt FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data)=?`;

    } else {
        const tableNameDados = getTableName(usuario, medidor, 'dados', false);
        const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', false);
        const tableNameCM = getTableName(usuario, medidor, 'consumo_mensal', false);

        sqlInsertDados = `INSERT INTO ${tableNameDados} (data, pa, pb, pc, pt, qa, qb, qc, qt, sa, sb, sc, st, uarms, ubrms, ucrms, iarms, ibrms, icrms, itrms, pfa, pfb, pfc, pft, pga, pgb, pgc, freq, epa, epb, epc, ept, eqa, eqb, eqc, eqt, yuaub, yuauc, yubuc, tpsd) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        sqlSelectCD_LI1 = `SELECT data, ept FROM ${tableNameDados} WHERE DATE(data)=? ORDER BY data DESC LIMIT 1`;
        sqlSelectCD_LI2 = `SELECT data, ept FROM ${tableNameDados} WHERE DATE(data)=? ORDER BY data ASC LIMIT 1`;
        sqlInsertCD = `INSERT INTO ${tableNameCD} (data, valor) VALUES (?,?)`;
        sqlUpdateCD = `UPDATE ${tableNameCD} SET valor = ? WHERE data = ?`;
        sqlSelectCM = `SELECT data, valor FROM ${tableNameCM} WHERE data = ? LIMIT 1`;
        sqlInsertCM = `INSERT INTO ${tableNameCM} (data, valor) VALUES (?,?)`;
        sqlUpdateCM = `UPDATE ${tableNameCM} SET valor = ? WHERE data = ?`;
        sqlSelectCDA = `SELECT valor FROM ${tableNameCD} WHERE DATE(data) = ? LIMIT 1`;
        sqlSelectCMA = `SELECT valor FROM ${tableNameCM} WHERE DATE(data) = ? LIMIT 1`;
        sqlSelectCSemanais = `SELECT data, valor FROM ${tableNameCD} ORDER BY data DESC LIMIT 8`;
        sqlSelectCMensais = `SELECT data, valor FROM ${tableNameCM} ORDER BY data DESC LIMIT 6`;
        sqlSelectCDadosDia = `SELECT data, pt FROM ${tableNameDados} WHERE DATE(data)=?`;
    }

    try {
        if (useNewStructure) {
            if (leituraAtual.ept_g==undefined) {
                await db.query(sqlInsertDados, [
                    medidor, d, leituraAtual.pa, leituraAtual.pb, leituraAtual.pc, leituraAtual.pt, leituraAtual.qa, leituraAtual.qb, leituraAtual.qc, leituraAtual.qt, leituraAtual.sa, leituraAtual.sb, leituraAtual.sc, leituraAtual.st, leituraAtual.uarms, leituraAtual.ubrms, leituraAtual.ucrms, leituraAtual.iarms, leituraAtual.ibrms, leituraAtual.icrms, leituraAtual.itrms,
                    leituraAtual.pfa, leituraAtual.pfb, leituraAtual.pfc, leituraAtual.pft, leituraAtual.pga, leituraAtual.pgb, leituraAtual.pgc, leituraAtual.freq, leituraAtual.epa, leituraAtual.epb, leituraAtual.epc, leituraAtual.ept, leituraAtual.eqa, leituraAtual.eqb, leituraAtual.eqc, leituraAtual.eqt, leituraAtual.yuaub, leituraAtual.yuauc, leituraAtual.yubuc, leituraAtual.tpsd
                ]);
            } else {
                await db.query(sqlInsertDados, [
                    medidor,d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
                    leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa_c,leituraAtual.epb_c,leituraAtual.epc_c,leituraAtual.ept_c,leituraAtual.epa_g,leituraAtual.epb_g,leituraAtual.epc_g,leituraAtual.ept_g,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
                ]);
            }
            
        } else {
            if (leituraAtual.ept_g==undefined) {
                await db.query(sqlInsertDados, [
                    d, leituraAtual.pa, leituraAtual.pb, leituraAtual.pc, leituraAtual.pt, leituraAtual.qa, leituraAtual.qb, leituraAtual.qc, leituraAtual.qt, leituraAtual.sa, leituraAtual.sb, leituraAtual.sc, leituraAtual.st, leituraAtual.uarms, leituraAtual.ubrms, leituraAtual.ucrms, leituraAtual.iarms, leituraAtual.ibrms, leituraAtual.icrms, leituraAtual.itrms,
                    leituraAtual.pfa, leituraAtual.pfb, leituraAtual.pfc, leituraAtual.pft, leituraAtual.pga, leituraAtual.pgb, leituraAtual.pgc, leituraAtual.freq, leituraAtual.epa, leituraAtual.epb, leituraAtual.epc, leituraAtual.ept, leituraAtual.eqa, leituraAtual.eqb, leituraAtual.eqc, leituraAtual.eqt, leituraAtual.yuaub, leituraAtual.yuauc, leituraAtual.yubuc, leituraAtual.tpsd
                ]);
            } else {
                await db.query(sqlInsertDados, [
                    d,leituraAtual.pa,leituraAtual.pb,leituraAtual.pc,leituraAtual.pt,leituraAtual.qa,leituraAtual.qb,leituraAtual.qc,leituraAtual.qt,leituraAtual.sa,leituraAtual.sb,leituraAtual.sc,leituraAtual.st,leituraAtual.uarms,leituraAtual.ubrms,leituraAtual.ucrms,leituraAtual.iarms,leituraAtual.ibrms,leituraAtual.icrms,leituraAtual.itrms,
                    leituraAtual.pfa,leituraAtual.pfb,leituraAtual.pfc,leituraAtual.pft,leituraAtual.pga,leituraAtual.pgb,leituraAtual.pgc,leituraAtual.freq,leituraAtual.epa_c,leituraAtual.epb_c,leituraAtual.epc_c,leituraAtual.ept_c,leituraAtual.epa_g,leituraAtual.epb_g,leituraAtual.epc_g,leituraAtual.ept_g,leituraAtual.yuaub,leituraAtual.yuauc,leituraAtual.yubuc,leituraAtual.tpsd
                ]);
            }
        }
        
        let CDio;
        if (useNewStructure) {
            [[CDio]] = await db.query(sqlSelectCD_LI1, [medidor, _.datasAnteriorers(data).dia]);
            if (CDio == undefined) {
                [[CDio]] = await db.query(sqlSelectCD_LI2, [medidor, moment(data).format('YYYY-MM-DD')]);
            }
        } else {
            [[CDio]] = await db.query(sqlSelectCD_LI1, [_.datasAnteriorers(data).dia]);
            if (CDio == undefined) {
                [[CDio]] = await db.query(sqlSelectCD_LI2, [moment(data).format('YYYY-MM-DD')]);
            }
        }

        if (leituraAtual.ept_c == undefined) {
            consumoD.valor = parseFloat((leituraAtual.ept - parseFloat(CDio.ept)).toFixed(2));
        } else {
            consumoD.valor = parseFloat((leituraAtual.ept_c - parseFloat(CDio.ept)).toFixed(2));
        }

        try {
            if (useNewStructure) {
                await db.query(sqlInsertCD, [moment(data).format('YYYY-MM-DD'), medidor, consumoD.valor]);
            } else {
                await db.query(sqlInsertCD, [moment(data).format('YYYY-MM-DD'), consumoD.valor]);
            }
        } catch (error) {
            if (useNewStructure) {
                await db.query(sqlUpdateCD, [consumoD.valor, moment(data).format('YYYY-MM-DD'), medidor]);
            } else {
                await db.query(sqlUpdateCD, [consumoD.valor, moment(data).format('YYYY-MM-DD')]);
            }
        }
    } catch (error) {
        console.error(error);
    }

    const periodo = _.instervaloDoMes(parseInt(moment(data).format('MM')), parseInt(moment(data).format('YYYY')));
    const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', useNewStructure);
    const [consumosDiarios] = await db.query(`SELECT data, valor FROM ${tableNameCD} WHERE DATE(data) >= ? AND DATE(data) <= ? ${useNewStructure ? 'AND id_medidor = ?' : ''}`, useNewStructure ? [periodo.inicial, periodo.final, medidor] : [periodo.inicial, periodo.final]);

    const mesAtual = periodo.final;
    const consumoMensal = {
        data: mesAtual,
        valor: consumosDiarios.map(item => item.valor).reduce((total, valor) => total + valor, 0)
    };

    const tableNameCM = getTableName(usuario, medidor, 'consumo_mensal', useNewStructure);
    let x;
    if (useNewStructure) {
        [[x]] = await db.query(sqlSelectCM, [mesAtual, medidor]);
    } else {
        [[x]] = await db.query(sqlSelectCM, [mesAtual]);
    }

    if (x == undefined) {
        if (useNewStructure) {
            await db.query(sqlInsertCM, [consumoMensal.data, consumoMensal.valor.toFixed(3), medidor]);
        } else {
            await db.query(sqlInsertCM, [consumoMensal.data, consumoMensal.valor.toFixed(3)]);
        }
    } else {
        if (useNewStructure) {
            await db.query(sqlUpdateCM, [consumoMensal.valor, consumoMensal.data, medidor]);
        } else {
            await db.query(sqlUpdateCM, [consumoMensal.valor, consumoMensal.data]);
        }
    }

    const anterior = _.datasAnteriorers(data);
    let cda, cma;

    if (useNewStructure) {
        [[cda]] = await db.query(sqlSelectCDA, [anterior.dia, medidor]);
        [[cma]] = await db.query(sqlSelectCMA, [anterior.mes, medidor]);
    } else {
        [[cda]] = await db.query(sqlSelectCDA, [anterior.dia]);
        [[cma]] = await db.query(sqlSelectCMA, [anterior.mes]);
    }

    let consumosSemanais;
    let consumosMensais;
    let cd;

    if (useNewStructure) {
        [consumosSemanais] = await db.query(sqlSelectCSemanais, [medidor]);
        [consumosMensais] = await db.query(sqlSelectCMensais, [medidor]);
        [cd] = await db.query(sqlSelectCDadosDia, [medidor, moment(data).format('YYYY-MM-DD')]);
    } else {
        [consumosSemanais] = await db.query(sqlSelectCSemanais);
        [consumosMensais] = await db.query(sqlSelectCMensais);
        [cd] = await db.query(sqlSelectCDadosDia, [moment(data).format('YYYY-MM-DD')]);
    }

    var consumos = {
        consumo: consumoD.valor.toFixed(2),
        consumoMensal: consumoMensal.valor.toFixed(2),
    };
    try {
        consumos.consumoDiaAnterior = cda.valor.toFixed(2);
    } catch (error) {
        consumos.consumoDiaAnterior = 0;
    }
    try {
        consumos.consumoMesAnterior = cma.valor.toFixed(2);
    } catch (error) {
        consumos.consumoMesAnterior = 0;
    }
    const graficos = {
        diario: [],
        semanal: [],
        mensal: {
            datas: [],
            consumo: []
        },
        semestral: []
    };
    consumosSemanais.forEach((dado) => {
        graficos.semanal.unshift([_.traduzDia(moment(dado.data).format('ddd(DD)')), dado.valor]);
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.unshift([_.traduzMes(moment(dado.data).format('MMMM-YYYY')), dado.valor]);
    });

    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss');
        graficos.diario.push([hora, dado.pt]);
    });

    return { leitura: leituraAtual, consumos: consumos, graficos: graficos };
};

const getDataStart = async (medidor, usuario) => {
    const useNewStructure = await isNewStructureCondominium(usuario);

    let sqlSelectUltimaLeitura;
    let sqlSelectConsumoDia;
    let sqlSelectConsumoMes;
    let sqlSelectCDA;
    let sqlSelectCMA;
    let sqlSelectCSemanais;
    let sqlSelectCMensais;
    let sqlSelectCDadosDia;

    if (useNewStructure) {
        const tableNameDados = getTableName(usuario, medidor, 'dados', true);
        const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', true);
        const tableNameCM = getTableName(usuario, medidor, 'consumo_mensal', true);

        sqlSelectUltimaLeitura = `SELECT data, pa, pb, pc, pt, pfa, pfb, pfc, pft, uarms, ubrms, ubrms, ucrms, iarms, ibrms, icrms, itrms, freq, tpsd FROM ${tableNameDados} WHERE id_medidor = ? ORDER BY id DESC LIMIT 1`;
        sqlSelectConsumoDia = `SELECT data, valor FROM ${tableNameCD} WHERE data = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectConsumoMes = `SELECT valor FROM ${tableNameCM} WHERE data = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectCDA = `SELECT valor FROM ${tableNameCD} WHERE DATE(data) = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectCMA = `SELECT valor FROM ${tableNameCM} WHERE DATE(data) = ? AND id_medidor = ? LIMIT 1`;
        sqlSelectCSemanais = `SELECT data, valor FROM ${tableNameCD} WHERE id_medidor = ? ORDER BY data DESC LIMIT 8`;
        sqlSelectCMensais = `SELECT data, valor FROM ${tableNameCM} WHERE id_medidor = ? ORDER BY data DESC LIMIT 6`;
        sqlSelectCDadosDia = `SELECT data, pt FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data)=?`;
    } else {
        const tableNameDados = getTableName(usuario, medidor, 'dados', false);
        const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', false);
        const tableNameCM = getTableName(usuario, medidor, 'consumo_mensal', false);

        sqlSelectUltimaLeitura = `SELECT data, pa, pb, pc, pt, pfa, pfb, pfc, pft, uarms, ubrms, ubrms, ucrms, iarms, ibrms, icrms, itrms, freq, tpsd FROM ${tableNameDados} ORDER BY id DESC LIMIT 1`;
        sqlSelectConsumoDia = `SELECT data, valor FROM ${tableNameCD} WHERE data = ? LIMIT 1`;
        sqlSelectConsumoMes = `SELECT valor FROM ${tableNameCM} WHERE data = ? LIMIT 1`;
        sqlSelectCDA = `SELECT valor FROM ${tableNameCD} WHERE DATE(data) = ? LIMIT 1`;
        sqlSelectCMA = `SELECT valor FROM ${tableNameCM} WHERE DATE(data) = ? LIMIT 1`;
        sqlSelectCSemanais = `SELECT data, valor FROM ${tableNameCD} ORDER BY data DESC LIMIT 8`;
        sqlSelectCMensais = `SELECT data, valor FROM ${tableNameCM} ORDER BY data DESC LIMIT 6`;
        sqlSelectCDadosDia = `SELECT data, pt FROM ${tableNameDados} WHERE DATE(data)=?`;
    }

    let ultimaLeitura;
    if (useNewStructure) {
        [[ultimaLeitura]] = await db.query(sqlSelectUltimaLeitura, [medidor]);
    } else {
        [[ultimaLeitura]] = await db.query(sqlSelectUltimaLeitura);
    }
    
    try {
        var consumo;
        if (useNewStructure) {
            [[consumo]] = await db.query(sqlSelectConsumoDia, [moment(ultimaLeitura.data).format('YYYY-MM-DD'), medidor]);
        } else {
            [[consumo]] = await db.query(sqlSelectConsumoDia, [moment(ultimaLeitura.data).format('YYYY-MM-DD')]);
        }
    } catch (erro) {
        console.log(erro);
        var consumo = { data: moment(ultimaLeitura.data).format('YYYY-MM-DD'), valor: 0 };
    }

    const periodo = _.instervaloDoMes(parseInt(moment(ultimaLeitura.data).format('MM')), parseInt(moment(ultimaLeitura.data).format('YYYY')));
    const mesAtual = periodo.final;
    var consumoMensal;
   
    console.log(mesAtual)
    try {
        if (useNewStructure) {
            [[consumoMensal]] = await db.query(sqlSelectConsumoMes, [mesAtual, medidor]);
        } else {
            [[consumoMensal]] = await db.query(sqlSelectConsumoMes, [mesAtual]);
        }
    } catch (error) {
        console.log(erro);
    }
 
    console.log(sqlSelectConsumoMes)
    console.log(consumoMensal)

    if (consumoMensal == undefined) { consumoMensal = 0; }

    var d = new Date();
    var data = d.setHours(d.getHours() - 3);
    const anterior = _.datasAnteriorers(data);
    let cda, cma;

    if (useNewStructure) {
        [[cda]] = await db.query(sqlSelectCDA, [anterior.dia, medidor]);
        [[cma]] = await db.query(sqlSelectCMA, [anterior.mes, medidor]);
    } else {
        [[cda]] = await db.query(sqlSelectCDA, [anterior.dia]);
        [[cma]] = await db.query(sqlSelectCMA, [anterior.mes]);
    }

    let consumosSemanais;
    let consumosMensais;
    let cd;

    if (useNewStructure) {
        [consumosSemanais] = await db.query(sqlSelectCSemanais, [medidor]);
        [consumosMensais] = await db.query(sqlSelectCMensais, [medidor]);
        [cd] = await db.query(sqlSelectCDadosDia, [medidor, moment(data).format('YYYY-MM-DD')]);
    } else {
        [consumosSemanais] = await db.query(sqlSelectCSemanais);
        [consumosMensais] = await db.query(sqlSelectCMensais);
        [cd] = await db.query(sqlSelectCDadosDia, [moment(data).format('YYYY-MM-DD')]);
    }
    console.log(consumoMensal)
    console.log(consumo)
    console.log(consumoMensal)
    var consumos = {
        consumo: consumo.valor.toFixed(2),
        consumoMensal: consumoMensal.valor.toFixed(2),
        consumoDiaAnterior: cda ? cda.valor.toFixed(2) : 0,
        consumoMesAnterior: cma ? cma.valor.toFixed(2) : 0
    };

    const graficos = {
        diario: [],
        semanal: [],
        mensal: {
            datas: [],
            consumo: []
        },
        semestral: []
    };
    consumosSemanais.forEach((dado) => {
        graficos.semanal.unshift([_.traduzDia(moment(dado.data).format('ddd(DD)')), dado.valor]);
    });
    consumosMensais.forEach((dado) => {
        graficos.semestral.unshift([_.traduzMes(moment(dado.data).format('MMMM-YYYY')), dado.valor]);
    });

    cd.forEach((dado) => {
        let hora = moment(dado.data).format('HH:mm:ss');
        graficos.diario.push([hora, dado.pt]);
    });
    
    return { id:medidor, leitura: ultimaLeitura, consumos: consumos, graficos: graficos };
};

const getConsumo = async (usuario, medidor, startDate, endDate) => {
    const useNewStructure = await isNewStructureCondominium(usuario);
    const tableNameDados = getTableName(usuario, medidor, 'dados', useNewStructure);
    const tableNameCD = getTableName(usuario, medidor, 'consumo_diario', useNewStructure);

    const sqlSelectConsumoInicial = useNewStructure
        ? `SELECT data, ept FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data)=? ORDER BY data ASC LIMIT 1`
        : `SELECT data, ept FROM ${tableNameDados} WHERE DATE(data)=? ORDER BY data ASC LIMIT 1`;
    const paramsConsumoInicial = useNewStructure ? [medidor, moment(startDate).format('YYYY-MM-DD')] : [moment(startDate).format('YYYY-MM-DD')];
    const [[consumoInicial]] = await db.query(sqlSelectConsumoInicial, paramsConsumoInicial);

    const sqlSelectConsumoFinal = useNewStructure
        ? `SELECT data, ept FROM ${tableNameDados} WHERE id_medidor = ? AND DATE(data) = ? ORDER BY data ASC LIMIT 1`
        : `SELECT data, ept FROM ${tableNameDados} WHERE DATE(data) = ? ORDER BY data ASC LIMIT 1`;
    const paramsConsumoFinal = useNewStructure ? [medidor, moment(endDate).format('YYYY-MM-DD')] : [moment(endDate).format('YYYY-MM-DD')];
    const [[consumoFinal]] = await db.query(sqlSelectConsumoFinal, paramsConsumoFinal);

    const sqlSelectConsumosDiario = useNewStructure
        ? `SELECT * FROM ${tableNameCD} WHERE id_medidor = ? AND DATE(data) >= ? AND DATE(data) < ? ORDER BY data ASC`
        : `SELECT * FROM ${tableNameCD} WHERE DATE(data) >= ? AND DATE(data) < ? ORDER BY data ASC`;
    const paramsConsumosDiario = useNewStructure ? [medidor, consumoInicial.data, consumoFinal.data] : [consumoInicial.data, consumoFinal.data];
    const [consumosDiario] = await db.query(sqlSelectConsumosDiario, paramsConsumosDiario);

    const dados = {
        consumo: {
            startDate: moment(consumoInicial.data).format('DD-MM-YYYY'),
            endDate: moment(consumoFinal.data).format('DD-MM-YYYY'),
            valor: parseFloat((parseFloat(consumoFinal.ept) - parseFloat(consumoInicial.ept)).toFixed(2)),
            endValor: parseFloat(consumoFinal.ept).toFixed(2),
            startValor: parseFloat(consumoInicial.ept).toFixed(2)
        },
        consumosDiario: consumosDiario,
        id: medidor,
    };
    return dados;
};

async function getRelatorioOtimizado(usuario, startDate, endDate, dispositivos) {
    console.log("Iniciando relatório OTIMIZADO");
    const useNewStructure = await isNewStructureCondominium(usuario);

    try {
        const medidorIds = dispositivos.map(d => d.id);
        if (medidorIds.length === 0) {
            return [];
        }

        let sqlInicial, sqlFinal, sqlConsumosDiario;

        if (useNewStructure) {
            const tableNameDados = getTableName(usuario, null, "dados", true);
            const tableNameCD = getTableName(usuario, null, "consumo_diario", true);

            const subqueriesIniciais = medidorIds.map(id => `(SELECT ${id} as medidor_id, data, ept FROM ${tableNameDados} WHERE id_medidor = ${id} AND data <= '${moment(startDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')}' ORDER BY data DESC LIMIT 1)`);
            sqlInicial = subqueriesIniciais.join(" UNION ALL ");

            const subqueriesFinais = medidorIds.map(id => `(SELECT ${id} as medidor_id, data, ept FROM ${tableNameDados} WHERE id_medidor = ${id} AND data <= '${moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')}' ORDER BY data DESC LIMIT 1)`);
            sqlFinal = subqueriesFinais.join(" UNION ALL ");

            sqlConsumosDiario = `SELECT data, id_medidor, valor FROM ${tableNameCD} WHERE id_medidor IN (?) AND DATE(data) >= ? AND DATE(data) < ? ORDER BY data ASC`;

        } else {
            const subqueriesIniciais = medidorIds.map(id => `(SELECT '${id}' as medidor_id, data, ept FROM tb_${usuario}_m${id} WHERE data <= '${moment(startDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')}' ORDER BY data DESC LIMIT 1)`);
            sqlInicial = subqueriesIniciais.join(" UNION ALL ");

            const subqueriesFinais = medidorIds.map(id => `(SELECT '${id}' as medidor_id, data, ept FROM tb_${usuario}_m${id} WHERE data <= '${moment(endDate).endOf('day').format('YYYY-MM-DD HH:mm:ss')}' ORDER BY data DESC LIMIT 1)`);
            sqlFinal = subqueriesFinais.join(" UNION ALL ");
        }

        const [valoresIniciais, valoresFinais] = await Promise.all([
            db.query(sqlInicial),
            db.query(sqlFinal)
        ]);

        const mapaValoresIniciais = new Map(valoresIniciais[0].map(item => [item.medidor_id, item]));
        const mapaValoresFinais = new Map(valoresFinais[0].map(item => [item.medidor_id, item]));

        const resultadosRelatorio = [];

        for (const medidor of dispositivos) {
            const consumoInicial = mapaValoresIniciais.get(medidor.id);
            const consumoFinal = mapaValoresFinais.get(medidor.id);

            let consumosDiario = [];
            if (useNewStructure) {
                [consumosDiario] = await db.query(sqlConsumosDiario, [medidor.id, moment(startDate).format('YYYY-MM-DD'), moment(endDate).format('YYYY-MM-DD')]);
            } else {
                const tableNameCD = getTableName(usuario, medidor.id, "consumo_diario", false);
                [consumosDiario] = await db.query(`SELECT * FROM ${tableNameCD} WHERE DATE(data) >= ? AND DATE(data) < ? ORDER BY data ASC`, [moment(startDate).format('YYYY-MM-DD'), moment(endDate).format('YYYY-MM-DD')]);
            }

            if (consumoInicial && consumoFinal) {
                resultadosRelatorio.push({
                    consumo: {
                        startDate: moment(consumoInicial.data).format('DD-MM-YYYY'),
                        endDate: moment(consumoFinal.data).format('DD-MM-YYYY'),
                        valor: parseFloat((parseFloat(consumoFinal.ept) - parseFloat(consumoInicial.ept)).toFixed(2)),
                        endValor: parseFloat(consumoFinal.ept).toFixed(2),
                        startValor: parseFloat(consumoInicial.ept).toFixed(2)
                    },
                    consumosDiario: consumosDiario,
                    id: medidor.id,
                });
            }
        }
        return resultadosRelatorio;

    } catch (error) {
        console.error("Erro em getRelatorioOtimizado:", error);
        return { error };
    }
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

// Função validacao 
async function validacao(leitura) {
    /*if (!leitura || typeof leitura.ept === 'undefined') {
        console.log(leitura)
        throw new Error('Leitura inválida: ept não definido.');
    }*/
    return leitura;
}


module.exports = {
    atualizarDados,
    getConsumo,
    getDataStart,
    getRelatorioOtimizado
};
