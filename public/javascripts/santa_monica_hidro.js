//  Carrega a API de visualização e o pacote corechart.
//google.charts.load('current', {'packages':['corechart']});

const socket = io();

let hidrometro = $('#hidrometros option:selected').val()

$('#hidrometros').on('change', () => {
    hidrometro = $('#hidrometros option:selected').val()
    console.log(hidrometro)
    socket.emit("getLeituasHidrometro",{hidrometro, url:"santa_monica"})
     
 })

socket.on("connect", () => {
    console.log(socket.id);
    socket.emit("iniciarTelaSanta_monica_hidro",hidrometro) 
    //console.log("tela atualizada com "+dados.leitura.id )
});

socket.on("atualizar_santa_monica_hidrometros", async (dados) => {
     // Obtém o elemento select
    const select = document.getElementById('hidrometros');
    const lista = dados.hidrometros.split(';');
    await criarSelect(lista,select)

    hidrometro = $('#hidrometros option:selected').val()
    console.log(hidrometro)
    socket.emit("getLeituasHidrometro",{hidrometro, url:"santa_monica"})
})

document.getElementById('event-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Impede o envio padrão do formulário

    // Coleta os valores do formulário
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    // Envia os dados para o servidor usando Socket IO
    socket.emit("calcular_consumo_santa_monica_hidro",{hidrometro: "xxx" , datas:{startDate, endDate} })
});


// Ouve eventos de resposta do servidor
socket.on('consumo_santa_monica_hidro', (data) => {
    const resultDiv = document.getElementById('result');

    if (data.error) {
        resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`;
    } else {
        resultDiv.innerHTML = '<h2>Eventos Encontrados:</h2>' + data.dados.map(event => `
            <div>
                <p><strong>Nome:</strong> ${event.x}</p>
                <p><strong>Data Início:</strong> ${event.dataL1}</p>
                <p><strong>Data Término:</strong> ${event.dataL2}</p>
            </div>
        `).join('');
    }
});

document.getElementById('upload-button').addEventListener('click', async () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
        const content = reader.result;
        
        // Divide o conteúdo por linhas
        const lines = content.split('\n');

        // Divide cada linha por tabulação
        const leituras = lines.map(line => {
            const l = line.split('\t')
            if(l[21]==undefined){
                return
            }
            const data = l[21].split('/')
            return {
                id:l[9],
                local:l[15],
                data:data[2]+"/"+data[1]+"/"+data[0]+" "+l[22],
                leitura:l[23]
            }
        });
        // Envia o conteúdo do arquivo para o servidor
        socket.emit('addLeituraHidrometro_santa_monica', leituras);

        // Atualiza o status
        document.getElementById('retornoArquivo').innerText = 'Enviando arquivo ...';
    };

    reader.onerror = () => {
        document.getElementById('retornoArquivo').innerText = 'Erro ao ler o arquivo.';
    };

    reader.readAsText(file);
});

socket.on('retornoArquivo_santa_monica', (retorno) => {
    const arquivoDiv = document.getElementById('retornoArquivo');

    if (retorno.negados>0) {
        console.log(retorno)
        arquivoDiv.innerHTML = `<h3> Leituras carregadas: ${retorno.inseridos}</h3>`+
                                `<h3> Leituras não carregadas: ${retorno.negados}</h3>` + retorno.log.map(e => `
            <div "scrollbox"style="color: red;">
                <p><strong>Erro:</strong> ${e.erro}</p>
            </div>
        `).join('');
    } else {
       arquivoDiv.innerHTML = `<h3> Leituras carregadas: ${retorno.inseridos}</h3>`
    }
})

socket.on('atualizar_santa_monica_hidro', (dados) => {
    //console.log(dados)
    if(dados[0].id == hidrometro){
        atualizar(dados)
       }  
    
});

async function  atualizar (dados){
  console.log(dados)
  // retorno de chamada para ser executado quando a API de visualização do Google for carregada.
  // await google.charts.setOnLoadCallback(drawChart(dados));
}

function drawChart(dados) {

    // Cria a tabela de dados.
    var data = new google.visualization.DataTable();
    data.addColumn('string', 'Datas');
    data.addColumn('number', 'Leitura');
    data.addRows(dados.grafico);
   // console.log(dados.semestral)
 
    // Set chart options
    var options1 = {title:'Leituras'}
   
 
    // Instantiate and draw our chart, passing in some options.
    var chart1 = new google.visualization.ColumnChart(document.getElementById('chart_div1'));

    chart1.draw(data, options1);
  }

async function criarSelect(lista,select) {
    for (let index = 0; index < lista.length; index += 2) {

        // Cria um novo elemento option
        const option = document.createElement('option');
        option.value = lista[index]
        option.textContent = lista[index+1]

        // Adiciona a opção ao select
        select.appendChild(option);
        
    }

    
}