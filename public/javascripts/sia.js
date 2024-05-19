 //  Carrega a API de visualização e o pacote corechart.
google.charts.load('current', {'packages':['corechart']});



const socket = io();

let medidor = selectMedidor($('#medidor option:selected').val())
console.log(medidor)
$('#medidor').on('change', () => {
    medidor = selectMedidor($('#medidor option:selected').val())
    console.log(medidor)
    socket.emit("iniciarTelaSia",medidor) 
    
})

socket.on("connect", () => {
    console.log(socket.id);
    socket.emit("iniciarTelaSia",medidor) 
    //console.log("tela atualizada com "+dados.leitura.id )
  });



socket.on("atualizar_sia101",dados =>{
  if(dados.leitura.id == medidor){
   atualizar(dados)
  }  
})

socket.on("atualizar_sia102",dados =>{
  if(dados.leitura.id == medidor){
   atualizar(dados)
  }  
})

socket.on("atualizar_sia103",dados =>{
  if(dados.leitura.id == medidor){
   atualizar(dados)
  }  
})

socket.on("atualizar_sia108",dados =>{
  if(dados.leitura.id == medidor){
   atualizar(dados)
  }  
})

socket.on("atualizar_sia114",dados =>{
  if(dados.leitura.id == medidor){
   atualizar(dados)
  }  
})


function selectMedidor (i){
    let medidor
    if(i == 1) {
      medidor = 101
      return medidor
    }
    if(i == 2) {
      medidor = 102
      return medidor
    }
    if(i == 3) {
      medidor = 103
      return medidor
    }
    if(i == 4) {
      medidor = 104
      return medidor
    }
    if(i == 5) {
      medidor = 105
      return medidor
    }
    if(i == 6) {
      medidor = 106
      return medidor
    }
    if(i == 7) {
      medidor = 107
      return medidor
    }
    if(i == 8) {
      medidor = 108
      return medidor
    }
    if(i == 9) {
      medidor = 109
      return medidor
    }
    if(i == 10) {
      medidor = 110
      return medidor
    }
    if(i == 11) {
      medidor = 111
      return medidor
    }
    if(i == 12) {
      medidor = 112
      return medidor
    }
    if(i == 13) {
      medidor = 113
      return medidor
    }
    if(i == 14) {
      medidor = 114
      return medidor
    }
    if(i == 15) {
      medidor = 201
      return medidor
    }
    if(i == 16) {
      medidor = 202
      return medidor
    }
    if(i == 17) {
      medidor = 203
      return medidor
    }
    if(i == 18) {
      medidor = 204
      return medidor
    }
    if(i == 19) {
      medidor = 205
      return medidor
    }
    if(i == 20) {
      medidor = 206
      return medidor
    }
    if(i == 21) {
      medidor = 207
      return medidor
    }
    if(i == 22) {
      medidor = 208
      return medidor
    }
    if(i == 23) {
      medidor = 209
      return medidor
    }
    if(i == 24) {
      medidor = 210
      return medidor
    }
    if(i == 25) {
      medidor = 211
      return medidor
    }
    if(i == 26) {
      medidor = 212
      return medidor
    }
    if(i == 27) {
      medidor = 213
      return medidor
    }
    if(i == 28) {
      medidor = 214
      return medidor
    }
    if(i == 29) {
      medidor = 301
      return medidor
    }
    if(i == 30) {
      medidor = 302
      return medidor
    }
    if(i == 31) {
      medidor = 303
      return medidor
    }
    if(i == 32) {
      medidor = 304
      return medidor
    }
    if(i == 33) {
      medidor = 305
      return medidor
    }
    if(i == 34) {
      medidor = 306
      return medidor
    }
    if(i == 35) {
      medidor = 307
      return medidor
    }
    if(i == 36) {
      medidor = 308
      return medidor
    }
    
    console.log("opcao invalida")
    medidor = 101
    return medidor
}

function atualizar (dados){
  $('#data').text(dados.leitura.data)
  $('#va').text(dados.leitura.uarms + " V" ) 
  $('#vb').text(dados.leitura.ubrms + " V" )
  $('#vc').text(dados.leitura.ucrms + " V" )
  $('#ia').text(dados.leitura.iarms + " A" )
  $('#ib').text(dados.leitura.ibrms + " A" )
  $('#ic').text(dados.leitura.icrms + " A" )
  $('#it').text(dados.leitura.itrms + " A" )
  $('#pfa').text(dados.leitura.pfa)
  $('#pfb').text(dados.leitura.pfb)
  $('#pfc').text(dados.leitura.pfc)
  $('#pft').text(dados.leitura.pft)
  $('#pa').text(dados.leitura.pa + " W" )
  $('#pb').text(dados.leitura.pb + " W" )
  $('#pc').text(dados.leitura.pc + " W" )
  $('#pt').text(dados.leitura.pt + " W" )
  $('#cd').text(dados.consumos.consumo + " KWh") 
  $('#cda').text(dados.consumos.consumoDiaAnterior + " KWh") 
  $('#cm').text(dados.consumos.consumoMensal + " KWh") 
  $('#cma').text(dados.consumos.consumoMesAnterior+ " KWh") 
  
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  google.charts.setOnLoadCallback(drawChart(dados.graficos));
}

 // Retorno de chamada que cria e preenche uma tabela de dados,
// instancia o tipo de gráfico, passa os dados e desenha
function drawChart(dados) {

   // Cria a tabela de dados.
   var data1 = new google.visualization.DataTable();
   data1.addColumn('string', 'Horario');
   data1.addColumn('number', 'potencia ativa Total');
   data1.addRows(dados.diario);
   //console.log(data1)
   // Set chart options
   var options1 = {title:'Consumo hoje'}

                  
  
   // Cria a tabela de dados.
   var data2 = new google.visualization.DataTable();
   data2.addColumn('string', 'Datas');
   data2.addColumn('number', 'Consumo');
   data2.addRows(dados.semestral);

   // Set chart options
   var options2 = {title:'Consumos mensais'}
  
   // Cria a tabela de dados.
   var data3 = new google.visualization.DataTable();
   data3.addColumn('string', 'Datas');
   data3.addColumn('number', 'Consumo');
   data3.addRows(dados.semanal);

   // Set chart options
   var options3 = {title:'Consumo nos ultimos 7 dias'}

   // Instantiate and draw our chart, passing in some options.
   var chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
   var chart2 = new google.visualization.ColumnChart(document.getElementById('chart_div2'));
   var chart3 = new google.visualization.ColumnChart(document.getElementById('chart_div3'));
   chart1.draw(data1, options1);
   chart2.draw(data2, options2);
   chart3.draw(data3, options3);
 }


