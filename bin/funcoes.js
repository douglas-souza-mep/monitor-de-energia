const moment = require('moment')

function calculoConsumo(t_star,t_end,pt){
    pt=pt/1000 //W -> KW
    t=(t_end-t_star)/(3600000) // mS -> H
    console.log("tempo des da ultima atualizacao: "+(t_end-t_star)/1000+"s")
    const T = pt*t
    //console.log((t_end-t_star))
    return T
  }

  function datasAnteriorers ( ){
    var mes = new Date(moment().format('YYYY/MM/01')).setHours(-1)
    mes = moment(mes).format('YYYY-MM-DD')
    var dia = new Date().setHours(-24)
    dia = moment(dia).format('YYYY-MM-DD')
    return {dia: dia, mes:mes}
  }

  function instervaloDoMes(mes,ano){
    const m = mes - 1
    if(mes<10) mes = "0"+mes
    else mes= "1"+(mes-10)
    var data_inicial = moment().format(+ano+'-'+mes+'-01')
    var data_final = moment([2023, m, 1]).endOf('month').format('YYYY-MM-DD')
  return {inicial: data_inicial, final:data_final}
}
  

function traduzDia(str){
  str = str.replace("Mon","Seg")
  str = str.replace("Tue","Qua")
  str = str.replace("Wed","Ter")
  str = str.replace("Thu","Qui")
  str = str.replace("Set","Sex")
  str = str.replace("Fri","Sab")
  str = str.replace("Sun","Dom")
  return str
}

module.exports = {
    calculoConsumo,
    datasAnteriorers,
    instervaloDoMes,
    traduzDia
}