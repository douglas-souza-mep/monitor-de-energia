const moment = require('moment')

function calculoConsumo(t_star,t_end,pt){
    pt=pt/1000 //W -> KW
    t=(t_end-t_star)/(3600000) // mS -> H
    //console.log("tempo des da ultima atualizacao: "+(t_end-t_star)/1000+"s")
    const T = pt*t
    //console.log((t_end-t_star))
    return T
  }

  function datasAnteriorers ( ){
    //dedifio umtimo dia do mes anterior
    var mes = new Date(moment().format('YYYY/MM/01')).setHours(-1)
    mes = moment(mes).format('YYYY-MM-DD')

    const hoje = new Date();

    // Subtrai um dia da data atual
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);
    var dia = moment(ontem).format('YYYY-MM-DD')

    return {dia: dia, mes:mes}
  }

  function instervaloDoMes(mes,ano){
    const m = mes - 1
    if(mes<10) mes = "0"+mes
    else mes= "1"+(mes-10)
    var data_inicial = moment().format(+ano+'-'+mes+'-01')
    var data_final = moment([ano, m, 1]).endOf('month').format('YYYY-MM-DD')
  return {inicial: data_inicial, final:data_final}
}
  

function traduzDia(str){
  str = str.replace("Mon","Seg")
  str = str.replace("Tue","Ter")
  str = str.replace("Wed","Qua")
  str = str.replace("Thu","Qui")
  str = str.replace("Fri","Sex")
  str = str.replace("Sat","Sab")
  str = str.replace("Sun","Dom")
  return str
}

function traduzMes(str){
  str = str.replace("January","Janeiro")
  str = str.replace("February","Fevereiro")
  str = str.replace("March","Março")
  str = str.replace("April","Abril")
  str = str.replace("May","Maio")
  str = str.replace("June","Junho")
  str = str.replace("July","Julho")
  str = str.replace("August","Agosto")
  str = str.replace("September","Setembro")
  str = str.replace("October","Outubro")
  str = str.replace("November","Novembro")
  str = str.replace("December","Dezembro")
  return str
}

module.exports = {
    calculoConsumo,
    datasAnteriorers,
    instervaloDoMes,
    traduzDia,
    traduzMes
}