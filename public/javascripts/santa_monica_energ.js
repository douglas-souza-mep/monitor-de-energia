 //  Carrega a API de visualização e o pacote corechart.
 google.charts.load('current', {'packages':['corechart']});



 const socket = io();
 
 let medidor = $('#medidor option:selected').val()
 let local = $('#medidor option:selected').text()
 console.log(medidor+" "+local)
 $('#medidor').on('change', () => {
     medidor = $('#medidor option:selected').val()
     local = $('#medidor option:selected').text()
     console.log(medidor+" "+local)
     socket.emit("iniciarTelaCasa",medidor) 
 })

 socket.on("connect", () => {
     console.log(socket.id);
     socket.emit("iniciarTelaSia",medidor) 
     //console.log("tela atualizada com "+dados.leitura.id )
   });

document.getElementById('event-form').addEventListener('submit', async function(event) {
  event.preventDefault(); // Impede o envio padrão do formulário
  
  // Coleta os valores do formulário
  const startDate = document.getElementById('start-date').value;
  const endDate = document.getElementById('end-date').value;
  
  // Envia os dados para o servidor usando Socket IO
  socket.emit("calcular_consumo_energ",{id: medidor , datas:{startDate, endDate},url:"santa_monica",local:local })
});
  
  // Ouve eventos de resposta do servidor em relação ao consumo
socket.on('consumo_de_energia_santa_monica', (dados) => {
  const resultDiv = document.getElementById('result');
  //console.log(dados)
  if (dados.error) {
      resultDiv.innerHTML = `<p style="color: red;">${dados.error}</p>`;
  } else {
      drawChartConsumo(dados.grafico,dados.id,dados.local)
      var options = { year: 'numeric', month: '2-digit', day: '2-digit'};
      resultDiv.innerHTML = '<h2>Consumo calculado com base nas leituras encontradas:</h2>' + `
          <div>
              <p><strong>Local:</strong> ${dados.local}</p>
              <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR',options)}</p>
              <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR',options)}</p>
              <p><strong>Data Consumo:</strong> ${dados.consumo} kWh</p>
          </div>
      `;    
  }
});
 
 socket.on("atualizar_sia1",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia2",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia3",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia11",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia12",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
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
 
 socket.on("atualizar_sia104",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia105",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia106",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia107",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia108",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia109",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia110",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia111",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia112",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia113",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia114",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia201",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia202",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia203",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia204",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia205",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia206",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia207",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia208",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia209",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_si2110",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia211",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia212",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia213",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia214",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia301",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia302",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia303",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia304",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia305",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia306",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia307",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia308",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia309",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia310",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia311",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
 socket.on("atualizar_sia312",dados =>{
   if(dados.leitura.id == medidor){
    atualizar(dados)
   }  
 })
 
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
   $('#cd').text(dados.graficos.semanal[7][1] + " KWh") 
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
   // console.log(dados.semestral)
 
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

async function drawChartConsumo(dados,id,local) {
    let grafico = []
    console.log(dados)
    await dados.forEach(element => {
        grafico.push([new Date(element[0]), element[1]]);
      });
    // Cria a tabela de dados.
    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Data');
    data.addColumn('number', 'Leitura');
    data.addRows(grafico);
    // console.log(dados.semestral)
   
    // Set chart options
    var options = {
        title:'Leituras: ' + local+" ("+id+")",
        hAxis: {
          title: 'data', 
          format: 'dd-MM-yy', // Formato da data no eixo horizontal
          titleTextStyle: {color: '#333'}},
        vAxis: {title: 'leitura (em m3)'},
        series: {
            0: {lineWidth: 2} // largura da linha
          },
        pointSize: 5, // tamanho dos pontos
        pointShape: 'circle', // forma dos pontos
        colors: ['#1c91c0'], // cor da linha e dos pontos
        tooltip: {
            isHtml: true, // Permite HTML no tooltip
            trigger: 'selection' // Exibe tooltip ao selecionar um ponto
          }
    }
  
    // Função para formatar o tooltip
    function formatTooltip(date, value) {
        var options = { year: 'numeric', month: '2-digit', day: '2-digit'};
        var formattedDate = date.toLocaleDateString('pt-BR', options);
        return `<div><strong>Data e Hora:</strong> ${formattedDate}<br><strong>Leitura:</strong> ${value}</div>`;
    }
  
    // Modifica os dados para incluir o tooltip HTML
    var formattedData = [];
    for (var i = 0; i < data.getNumberOfRows(); i++) {
      var date = data.getValue(i, 0);
      var value = data.getValue(i, 1);
      var tooltip = formatTooltip(date, value);
      formattedData.push([date, value, tooltip]);
    }
  
    // Cria uma nova tabela com os dados formatados
    var dataWithTooltip = google.visualization.arrayToDataTable([
      ['Data', 'Leitura', { role: 'tooltip', type: 'string', p: { html: true } }],
      ...formattedData
    ]);
  
    // Instantiate and draw our chart, passing in some options.
    var chart = new google.visualization.AreaChart(document.getElementById('chart_consumo'));
    chart.draw(dataWithTooltip, options);
}
 
 