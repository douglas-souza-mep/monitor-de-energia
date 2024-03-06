 //  Carrega a API de visualização e o pacote corechart.
 google.charts.load('current', {'packages':['corechart']});


 // Retorno de chamada que cria e preenche uma tabela de dados,
// instancia o tipo de gráfico, passa os dados e desenha
 function drawChart(dados) {

   // Cria a tabela de dados.
   var data1 = new google.visualization.DataTable();
   data1.addColumn('string', 'Horario');
   data1.addColumn('number', 'potencia ativa Total');
   data1.addRows(dados.diario);
   console.log(data1)
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



const socket = io();

let medidor = $('#medidor option:selected').val()
$('#medidor').on('change', () => {
    medidor = $('#medidor option:selected').val()
    console.log(medidor)
    socket.emit("iniciarTela",medidor) 
    
})

socket.on("connect", () => {
    console.log(socket.id);
    socket.emit("iniciarTela",medidor) 
    //console.log("tela atualizada com "+dados.leitura.id )
  });



socket.on("atualizar_brisas1",dados =>{
  if(dados.leitura.id == medidor){
    $('#data').text(dados.leitura.data)
    $('#va').text(dados.leitura.uarms + " V" ) 
    $('#vb').text(dados.leitura.ubrms + " V" )
    $('#vc').text(dados.leitura.ucrms + " V" )
    $('#ia').text(dados.leitura.iarms + " A" )
    $('#ib').text(dados.leitura.ibrms + " A" )
    $('#ic').text(dados.leitura.icrms + " A" )
    $('#it').text(dados.leitura.itrms + " A" )
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
})
socket.on("atualizar_brisas2",dados =>{
  if(dados.leitura.id == medidor){
    $('#data').text(dados.leitura.data)
    $('#va').text(dados.leitura.uarms + " V" ) 
    $('#vb').text(dados.leitura.ubrms + " V" )
    $('#vc').text(dados.leitura.ucrms + " V" )
    $('#ia').text(dados.leitura.iarms + " A" )
    $('#ib').text(dados.leitura.ibrms + " A" )
    $('#ic').text(dados.leitura.icrms + " A" )
    $('#it').text(dados.leitura.itrms + " A" )
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
})
socket.on("atualizar_brisas3",dados =>{
  if(dados.leitura.id == medidor){
    $('#data').text(dados.leitura.data)
    $('#va').text(dados.leitura.uarms + " V" ) 
    $('#vb').text(dados.leitura.ubrms + " V" )
    $('#vc').text(dados.leitura.ucrms + " V" )
    $('#ia').text(dados.leitura.iarms + " A" )
    $('#ib').text(dados.leitura.ibrms + " A" )
    $('#ic').text(dados.leitura.icrms + " A" )
    $('#it').text(dados.leitura.itrms + " A" )
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
})


