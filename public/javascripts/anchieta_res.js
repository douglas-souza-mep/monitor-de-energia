google.charts.load('current', {'packages':['gauge','corechart']})

var gauge1,gauge2;

class Reservatorio {
  constructor(id,nome,volumeMax){
    this.id = id
    this.nome = nome
    this.data =  '01-01-2000 00:00:00'
    this.volume =  0
    this.nivel =  0
    this.distancia =  0
    this.graficos =  []
    this.volumeMax = volumeMax
    this.alerta = Math.round(this.volumeMax*0.2)
    this.critico = Math.round(this.volumeMax*0.1)
    this.gaugeOptions = {min: 0, max: this.volumeMax, yellowFrom: this.critico, yellowTo: this.alerta,
      redFrom: 0, redTo: this.critico, minorTicks: Math.round(this.volumeMax*0.05)};
    
      this.chartOptions = {
      title: this.nome,
      hAxis: {title: 'Horario',  titleTextStyle: {color: '#333'}},
      vAxis: {minValue: 0},
      //chartArea:{width:'70%',height:'200'}
    };
  }
  async send(dados){
    this.data =  dados.leitura.data
    this.volume =  dados.leitura.volume
    this.nivel =  dados.leitura.nivel
    this.distancia =  dados.leitura.distancia
    this.graficos =  dados.graficos

    return
  }
}

var reservatorios = [];

const socket = io();

// caracteriscas do usuario
var usuario
socket.on("connect", () => {
  console.log(socket.id);
  socket.emit("Get_dados_do_usuario", "anchieta")
 })

  socket.on("return_dados_do_usuario_anchieta",async (dados) =>{
  usuario = await dados
  iniciarPagina(usuario)
})




async function iniciarPagina(){
  for (let i = 1; i < usuario.agua+1; i++) {
    let text = usuario.reservatorios.split(";");
    reservatorios.push(new Reservatorio(i, text[(i * 2) - 2], text[(i * 2) - 1]))
  }
  
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  gauge1 = await google.setOnLoadCallback(drawGauge1);
  console.log("2")
  
  socket.emit("iniciarTelaAnchieta_Res", 1)
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  gauge2 = await google.setOnLoadCallback(drawGauge2);
  console.log("4")
  await google.setOnLoadCallback(drawChart1(reservatorios[1].graficos,reservatorios[1].chartOptions));
  socket.emit("iniciarTelaAnchieta_Res", 2)

  socket.on("atualizar_anchieta_res1",  async (dados) =>{
    await reservatorios[0].send(dados)
    console.log(reservatorios[0])
    drawGauge1()
    var teste = [[ '06:07:24', 510, 51, 66 ],
[ '06:07:32', 510, 51, 66 ],
[ '06:07:41', 510, 51, 66 ],
[ '06:07:51', 510, 51, 66 ],
[ '06:07:57', 510, 51, 66 ],
[ '06:08:03', 510, 51, 66 ]]
    drawChart1(teste,reservatorios[1].chartOptions)
  })
  socket.on("atualizar_anchieta_res2",async dados =>{
    reservatorios[1].send(dados)
    drawGauge2()
    drawChart2(reservatorios[1].graficos,reservatorios[1].chartOptions)
  })
}

function drawGauge1() {

  console.log("1")
  $('#data').text(reservatorios[0].data)
  $('#res'+reservatorios[0].id+'_data').text(reservatorios[0].data)
  $('#res'+reservatorios[0].id+'_dis').text(reservatorios[0].distancia + " cm" ) 
  $('#res'+reservatorios[0].id+'_p').text(reservatorios[0].nivel+ " %" )

  // Cria a tabela de dados para gauge
  var gaugeData = new google.visualization.DataTable();
  gaugeData.addColumn('number', 'Volume (L)');
  gaugeData.addRows(1);

  gaugeData.setCell(0, 0, reservatorios[0].volume);

  gauge = new google.visualization.Gauge(document.getElementById('res1_gauge_div'));
  return gauge.draw(gaugeData,reservatorios[0].gaugeOptions);
}

function drawGauge2() {

  console.log("3")
  $('#data').text(reservatorios[1].data)
  $('#res'+reservatorios[1].id+'_data').text(reservatorios[1].data)
  $('#res'+reservatorios[1].id+'_dis').text(reservatorios[1].distancia + " cm" ) 
  $('#res'+reservatorios[1].id+'_p').text(reservatorios[1].nivel+ " %" )

  // Cria a tabela de dados para gauge
  var gaugeData = new google.visualization.DataTable();
  gaugeData.addColumn('number', 'Volume (L)');
  gaugeData.addRows(1);

  
  gaugeData.setCell(0, 0, reservatorios[1].volume);

  gauge = new google.visualization.Gauge(document.getElementById('res2_gauge_div'));
  return gauge.draw(gaugeData,reservatorios[1].gaugeOptions);
}

function drawChart1(graficos,chartOptions) {
  
  console.log( graficos)
  var dataChart = new google.visualization.DataTable();
  dataChart.addColumn('string', 'Horario');
  dataChart.addColumn('number', 'Volume(L)');
  dataChart.addColumn('number', 'nivel(%)');
  dataChart.addColumn('number', 'distancia(cm)');
  dataChart.addRows(graficos);
  
  
  chart = new google.visualization.AreaChart(document.getElementById('res1_chart_div'));
  chart.draw(dataChart, chartOptions);
   return
}

function drawChart2(graficos,chartOptions) {

  console.log( graficos)
  var dataChart = new google.visualization.DataTable();
  dataChart.addColumn('string', 'Horario');
  dataChart.addColumn('number', 'Volume(L)');
  dataChart.addColumn('number', 'nivel(%)');
  dataChart.addColumn('number', 'distancia(cm)');
  dataChart.addRows(graficos);
  
  
  chart = new google.visualization.AreaChart(document.getElementById('res2_chart_div'));
  chart.draw(dataChart, chartOptions);
   return
}






























/*

//  Carrega a API de visualização e o pacote corechart.
//.then(drawChart);
// retorno de chamada para ser executado quando a API de visualização do Google for carregada.
google.setOnLoadCallback(drawChart);
 


var options1 = {title:'Gafico diario Reservatorio 1'}
var options2 = {title:'Gafico diario Reservatorio 2'}

var gauge;

var chart;



 

 
  // Retorno de chamada que cria e preenche uma tabela de dados,
 // instancia o tipo de gráfico, passa os dados e desenha



 function drawChart(id,dados) {
// Cria a tabela de dados para gauge
    console.log(dados)
    var gaugeData = new google.visualization.DataTable();
    gaugeData.addColumn('number', 'Volume (L)');
    gaugeData.addRows(1);
    try {
      console.log(dados.leitura.volume)
        gaugeData.setCell(0, 0, dados.leitura.volume);
    } catch (error) {
        console.log(error)
        gaugeData.setCell(0, 0, 0);
    }
    if(id==1){
      gauge = new google.visualization.Gauge(document.getElementById('res1_gauge_div'));
      gauge.draw(gaugeData, gaugeOptions);
      return
    }
    if(id==2){
      */
      /*
      gauge = new google.visualization.Gauge(document.getElementById('res2_gauge_div'));
      gauge.draw(gaugeData, gaugeOptions);
     */
    /*
      var data = google.visualization.arrayToDataTable([
        ['horario', 'volume(L)', 'nivel(%)', 'distancia(cm)'], 
      ]);
*/
/*
    var data = new google.visualization.DataTable();
    dataChart.addColumn('string', 'Horario');
    dataChart.addColumn('number', 'Volume(L)');
    dataChart.addColumn('number', 'nivel(%)');
    dataChart.addColumn('number', 'distancia(cm)');
    dataChart.addRows(dados.graficos);


      var options = {
        title: 'Reservatorio',
        hAxis: {title: 'Horario',  titleTextStyle: {color: '#333'}},
        vAxis: {minValue: 0}
      };

      chart = new google.visualization.AreaChart(document.getElementById('res2_chart_div'));
      chart.draw(data, options);
      
      return
    }

    gauge = new google.visualization.Gauge(document.getElementById('res1_gauge_div'));
    gauge.draw(gaugeData, gaugeOptions);
    gauge = new google.visualization.Gauge(document.getElementById('res2_gauge_div'));
    gauge.draw(gaugeData, gaugeOptions);
/*
    // Cria a tabela de dados.
    var data = new google.visualization.DataTable();
    data1.addColumn('string', 'Horario');
    data1.addColumn('number', 'Volume (L)');
    try {
      data1.addRows(dados.graficos.diario);
    } catch (error) {
      data1.addRows(0);

    }
    
    //console.log(data1)

    // Set chart options
    var options1 = {title:'Reservatorio 1'}
   
 
    // Instantiate and draw our chart, passing in some options.
    chart1 = new google.visualization.AreaChart(document.getElementById('res1.chart_div'));
    chart1.draw(data1, options1);
    */
  //}
 
 
