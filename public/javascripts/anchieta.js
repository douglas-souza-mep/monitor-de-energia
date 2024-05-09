 //  Carrega a API de visualização e o pacote corechart.
 google.charts.load('current', {'packages':['gauge']});
// retorno de chamada para ser executado quando a API de visualização do Google for carregada.
google.charts.setOnLoadCallback(drawChart);

var gaugeOptions = {min: 0, max: 1000, yellowFrom: 100, yellowTo: 200,
    redFrom: 0, redTo: 100, minorTicks: 50};

    var options1 = {title:'Gafico diario Caixa 1'}
var gauge1,chart1;

 const socket = io();
 
 let medidor = $('#medidor option:selected').val()
 console.log(medidor)
 $('#medidor').on('change', () => {
     medidor = selectMedidor($('#medidor option:selected').val())
     console.log(medidor)
     socket.emit("iniciarTelaSia",medidor) 
     
 })
 /*
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

 */

 
 function atualizar (dados){
    drawChart(dados)
   $('#data').text(dados.leitura.data)
   $('#data1').text(dados.leitura.data)
   $('#dis').text(dados.leitura.distancia + " cm" ) 
   $('#p').text(dados.leitura.percentual + " %" )
 }
 
  // Retorno de chamada que cria e preenche uma tabela de dados,
 // instancia o tipo de gráfico, passa os dados e desenha



 function drawChart(dados) {
// Cria a tabela de dados para gauge
    gaugeData = new google.visualization.DataTable();
    gaugeData.addColumn('number', 'Volume (L)');
    gaugeData.addRows(1);
    try {
        gaugeData.setCell(0, 0, dados.leitura.volume);
    } catch (error) {
        gaugeData.setCell(0, 0, 0);
    }
    

    gauge1 = new google.visualization.Gauge(document.getElementById('gauge_div1'));
    gauge1.draw(gaugeData, gaugeOptions);

    // Cria a tabela de dados.
    var data1 = new google.visualization.DataTable();
    data1.addColumn('string', 'Horario');
    data1.addColumn('number', 'Volume (L)');
    try {
      data1.addRows(dados.graficos.diario);
    } catch (error) {
      data1.addRows(0);

    }
    
    //console.log(data1)

    // Set chart options
    var options1 = {title:'Gafico diario Caixa 1'}
   
 
    // Instantiate and draw our chart, passing in some options.
    chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
    chart1.draw(data1, options1);
  }
 
 
 