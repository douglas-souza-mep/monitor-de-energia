/**
 * Hydrometer Monitor Dashboard V2
 * Sistema de monitoramento de hidrômetros com visualização em grid
 */

class HydrometerMonitorV2 {
  constructor() {
    this.hydrometers = [];
    this.clientKey = window.CLIENT_KEY; // Obtém a chave do cliente
    this.config = getClientConfig(this.clientKey); // Carrega a configuração do cliente
    if (!this.config) {
      console.error("Configuração do cliente não encontrada. Usando fallback.");
      //this.config = getClientConfig("santaMonica"); // Exemplo de fallback
    }

    this.url = this.config.api.baseUrl; // URL base da API do cliente
    this.clientMQTT = null;
    this.currentView = 'grid'; // 'grid' ou 'detail'
    this.selectedHydrometer = null;
    this.hydrometersData = new Map(); // Cache dos dados dos hidrômetros
    
    this.init();
  }


  /**
   * Inicializa o sistema
   */
  async init() {
    try {
      // Carrega Google Charts
      google.charts.load('current', {'packages':['corechart']});
      google.charts.setOnLoadCallback(() => this.startPage());
      
      // Configura event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('Erro na inicialização:', error);
      this.hideLoading();
    }
  }

  /**
   * Configura os event listeners
   */
  setupEventListeners() {
    // Botão de voltar para grid
    document.addEventListener('click', (e) => {
      if (e.target.id === 'back-to-grid' || e.target.closest('#back-to-grid')) {
        this.showGridView();
      }
    });

    // Clique nos cards dos hidrômetros
    document.addEventListener('click', (e) => {
      // Evita disparar o detalhe se clicar no checkbox de alertas
      if (e.target.closest('.alert-toggle-container')) {
        return;
      }

      const hydrometerCard = e.target.closest('.hydrometer-card');
      if (hydrometerCard && this.currentView === 'grid') {
        const hydrometerId = hydrometerCard.dataset.hydrometerId;
        this.showHydrometerDetail(hydrometerId);
      }
    });

    // Listener para o checkbox de alertas
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('alert-checkbox')) {
        const hydrometerId = e.target.dataset.hydrometerId;
        const enabled = e.target.checked;
        this.toggleAlerts(hydrometerId, enabled);
      }
    });

    // Botão de Relatório Geral na visão de grid
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-report-general') {
        e.preventDefault();
        this.generateGeneralReport();
      }
    });

    // Botão de Relatório de Consumo na visão de detalhes
    document.addEventListener('click', (e) => {
      if (e.target.id === 'btn-report-consumption') {
        e.preventDefault();
        this.showConsumptionReportPopup();
      }
    });

    // Formulário de cálculo (apenas na view de detalhes)
    document.addEventListener('click', (e) => {
      if (e.target.id === 'calcular') {
        e.preventDefault();
        this.calculateConsumption(e);
      }
    });

    // Upload de arquivo
    document.addEventListener('click', async (e) => {
      if (e.target.id === 'upload-button') {
        e.preventDefault();
        this.handleFileUpload();
      }
    });

    // Fechar pop-up
    document.addEventListener('click', (e) => {
      if (e.target.closest('.popup-close') || e.target.classList.contains('popup-overlay')) {
        this.hidePopup();
      }
    });
  }

  /**
   * Envia comando para habilitar/desabilitar alertas
   */
  async toggleAlerts(hydrometerId, enabled) {
    try {
      const response = await fetch('/v2/editarAlertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          tipo: 'hidro',
          id: hydrometerId,
          habilitado: enabled
        })
      });

      const result = await response.json();

      if (response.ok && result.status === 'ok') {
        const status = enabled ? 'ativados' : 'desativados';
        alert(`Alertas para o hidrômetro ${hydrometerId} foram ${status} com sucesso!`);
        
        // Atualiza o estado no cache local
        const hydrometer = this.hydrometers.find(h => Number(h.id) === Number(hydrometerId));
        if (hydrometer) {
          hydrometer.alertasHabilitados = enabled;
        }
      } else {
        throw new Error(result.message || 'Erro ao processar solicitação');
      }
    } catch (error) {
      console.error('Erro ao alternar alertas:', error);
      alert(`Erro: ${error.message}`);
      
      // Reverte o checkbox em caso de erro
      const checkbox = document.querySelector(`.alert-checkbox[data-hydrometer-id="${hydrometerId}"]`);
      if (checkbox) {
        checkbox.checked = !enabled;
      }
    }
  }

  /**
   * Carrega dados do usuário e hidrômetros
   */
  async loadUserData() {
    try {
      const response = await fetch('/v2/get-dados-iniciais/hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const dados = await response.json();

      // hidrometros contém: "id;local;id;local;..."
      const hydrometrosInfo = dados.hidrometros
        .split(';')
        .filter((_, index) => index % 2 === 0) // Filtra apenas os IDs (posições pares)
        .map((id, index) => ({
          id: parseInt(id),
          local: dados.hidrometros.split(';')[index * 2 + 1]
        }))
        .filter(m => !isNaN(m.id) && m.local); // Remove entradas inválidas

      const alertasDesabilitadosStr = dados.alertas || "";
      const listaDesabilitados = alertasDesabilitadosStr.split(';');

     this.hydrometers = hydrometrosInfo.map(medidor => {
        
        const chaveMedidor = `${this.url}hidro${medidor.id}`;
        
        return {
          ...medidor,
          // Se a chave NÃO estiver na lista de desabilitados, então está habilitado (true)
          alertasHabilitados: !listaDesabilitados.includes(chaveMedidor)
        };
      });

      console.log('Hidrômetros carregados com alertas:', this.hydrometers);
      return this.hydrometers;
    } catch (error) {
      console.error('Erro ao carregar dados iniciais otimizados:', error);
      return [];
    }
  }

  

  /**
   * Inicia a página principal
   */
  async startPage() {
    try {
      this.showLoading();
      
      // Carrega dados dos hidrômetros
      await this.loadUserData();
      
      // Carrega dados iniciais de todos os hidrômetros
      await this.loadAllHydrometersData();
      
      // Configura conexão MQTT
      this.setupMQTTConnection();
      
      // Mostra a view de grid
      this.showGridView();
      
    } catch (error) {
      console.error('Erro ao iniciar página:', error);
      this.hideLoading();
    }
  }

  /**
   * Carrega dados de todos os hidrômetros em uma única consulta
   */
  async loadAllHydrometersData() {
    try {
      console.log('Carregando todas as últimas leituras dos hidrômetros...');
      
      const response = await fetch('/get_ultimas_leituras_hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const leituras = await response.json();
      console.log('Últimas leituras recebidas:', leituras);
      
      // Processa cada leitura e atualiza o cache
      leituras.forEach(leitura => {
        // Estrutura os dados no formato esperado pelo sistema
        const dadosHidrometro = {
          id: leitura.id,
          local: leitura.local,
          leitura: {
            data: leitura.data,
            leitura: parseFloat(leitura.leitura/1000).toFixed(3)
          }
        };
        
        // Atualiza o cache de dados
        this.hydrometersData.set(leitura.id, dadosHidrometro);
        
        // Atualiza o card do hidrômetro se estiver na view de grid
        if (this.currentView === 'grid') {
          this.updateHydrometerCard(leitura.id, dadosHidrometro);
        }
      });
      
      console.log('Cache de hidrômetros atualizado:', this.hydrometersData);
      
    } catch (error) {
      console.error('Erro ao carregar dados dos hidrômetros:', error);
    }
  }

  /**
   * Carrega dados de um hidrômetro específico (usado para detalhes individuais)
   */
  async loadHydrometerData(dados) {
    try {
      const ontem = new Date();   // cria uma cópia para não alterar 'hoje'
      ontem.setDate(ontem.getDate() - 1);
      const response = await fetch('/get_grafico_hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          hidrometro: dados.id, 
          url: this.url,
          startDate: ontem.toISOString().split('T')[0] 
        })
      });

      const grafico = await response.json();
      
      if (grafico.id == dados.id) {
        dados.grafico = grafico.grafico;
        this.hydrometersData.set(dados.id, dados);
        
        // Atualiza a view de detalhes se for o hidrômetro selecionado
        if (this.currentView === 'detail' && this.selectedHydrometer === dados.id) {
          this.updateDetailView();
        }
      }
    } catch (error) {
      console.error(`Erro ao carregar dados do hidrômetro ${dados.id}:`, error);
    }
  }

  /**
   * Configura conexão MQTT
   */
  setupMQTTConnection() {
    try {
      const clientId = 'web_client_'+this.url+'_' + Math.random().toString(16).substr(2, 8);

      this.clientMQTT = mqtt.connect(this.config.mqtt.broker, {
        username: this.config.mqtt.username,
        password: this.config.mqtt.password,
        path: this.config.mqtt.path,
        clientId: clientId, 
        keepalive: 60,      // Garante que o ping ocorra a cada 60s
        reconnectPeriod: 5000, // Tenta reconectar a cada 5s se cair
        connectTimeout: 30 * 1000
      });

      // Evento de conexão
      this.clientMQTT.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        
        const topics = [this.config.mqtt.hydrometerTopic];
        
        this.clientMQTT.subscribe(topics, (err) => {
          if (err) {
            console.error('Erro ao subscrever aos tópicos', err);
          } else {
            console.log('Subscrito aos tópicos:', topics.join(', '));
          }
        });
      });

      // Evento de menssagem
      this.clientMQTT.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });

      // Evento de erro
      this.clientMQTT.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
      });

      // Evento de desconexão
      this.clientMQTT.on('close', () => {
        console.warn('Desconectado do broker MQTT');
      });

      // Evento de reconexão
      this.clientMQTT.on('reconnect', () => {
        console.log('Tentando reconectar ao broker MQTT...');
      });

      this.hideLoading();
      
    } catch (error) {
      console.error('Erro ao configurar MQTT:', error);
      this.hideLoading();
    }
  }

  /**
   * Manipula mensagens MQTT
   */
  handleMQTTMessage(topic, message) {
    switch (topic) {
      case this.config.mqtt.hydrometerTopic:
        try {
          const leitura = JSON.parse(message.toString());
          console.log('Nova leitura:', leitura);
          
          // Atualiza o cache de dados
          this.hydrometersData.set(leitura.id, leitura);
          
          // Se estiver na view de grid, atualiza o card
          if (this.currentView === 'grid') {
            this.updateHydrometerCard(leitura.id, leitura);
          }
          
          // Se estiver na view de detalhes do hidrômetro atual, atualiza a tela
          if (this.currentView === 'detail' && this.selectedHydrometer === leitura.id) {
            this.updateDetailView();
          }
        } catch (e) {
          console.error('Erro ao processar mensagem MQTT:', e);
        }
        break;
      default:
        console.log(`Tópico desconhecido: ${topic} - Mensagem: ${message}`);
    }
  }

  /**
   * Mostra a view de grid com todos os hidrômetros
   */
  showGridView() {
    this.currentView = 'grid';
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateGridHTML();
    
    // Atualiza os cards com os dados em cache
    
    this.hydrometers.forEach(hydrometer => {
      const dados = this.hydrometersData.get(Number(hydrometer.id));
      this.updateHydrometerCard(hydrometer.id, dados);
    });
    
    console.log('View de grid exibida com '+this.hydrometers.length+ ' hidrômetros');
  }

  /**
   * Gera HTML para a view de grid
   */
  generateGridHTML() {
    return `
      <div class="grid-header hydro-v2">
        <h1>Monitoramento de Hidrômetros - Visão Geral</h1>
        <p class="grid-subtitle hydro-v2">Clique em um hidrômetro para ver os detalhes</p>
      </div>

      <div class="hydrometers-grid hydro-v2">
        ${this.hydrometers.map(hydrometer => `
          <div class="hydrometer-card hydro-v2" data-hydrometer-id="${hydrometer.id}">
            <div class="hydrometer-header hydro-v2">
              <div class="meter-title-group">
                <h3 class="hydrometer-name hydro-v2">${hydrometer.local}</h3>
                <span class="hydrometer-id hydro-v2">ID: ${hydrometer.id}</span>
              </div>
              <div class="alert-toggle-container hydro-v2" title="Habilitar/Desabilitar Alertas">
                <label class="switch-label hydro-v2">Alertas</label>
                <input type="checkbox" class="alert-checkbox hydro-v2" 
                  data-hydrometer-id="${hydrometer.id}" 
                  ${hydrometer.alertasHabilitados ? 'checked' : ''}>
              </div>
            </div>
            
            <div class="hydrometer-reading hydro-v2">
              <div class="reading-value hydro-v2" id="reading-${hydrometer.id}">
                <span class="value">--</span>
                <span class="unit">m³</span>
              </div>
              <div class="reading-label hydro-v2">Última Leitura</div>
            </div>
            
            <div class="hydrometer-info hydro-v2">
              <div class="info-item hydro-v2">
                <span class="info-label hydro-v2">Última Atualização:</span>
                <span class="info-value hydro-v2" id="date-${hydrometer.id}">--</span>
              </div>
            </div>
            
            <div class="hydrometer-status hydro-v2" id="status-${hydrometer.id}">
              <span class="status-indicator hydro-v2"></span>
              <span class="status-text hydro-v2">Aguardando dados...</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="grid-actions hydro-v2">
        <div class="report-general-form hydro-v2">
          <h3 class="form-title hydro-v2">Relatório Geral</h3>
          <div class="form-row hydro-v2">
            <div class="form-group hydro-v2">
              <label for="general-start-date" class="form-label hydro-v2">Data de Início:</label>
              <input type="date" id="general-start-date" class="form-input hydro-v2" required>
            </div>
            <div class="form-group hydro-v2">
              <label for="general-end-date" class="form-label hydro-v2">Data de Término:</label>
              <input type="date" id="general-end-date" class="form-input hydro-v2" required>
            </div>
            <div class="form-group hydro-v2">
              <button id="btn-report-general" class="btn btn-report-general hydro-v2">
                <i class="fas fa-file-csv"></i> Gerar Relatório Geral
              </button>
            </div>
          </div>
        </div>
        
        <div class="upload-section hydro-v2">
          <h3 class="form-title hydro-v2">Upload de Leituras</h3>
          <div class="form-group hydro-v2">
            <div class="file-input-wrapper hydro-v2">
              <input type="file" id="file-input" class="file-input hydro-v2" accept=".txt,.csv">
              <label for="file-input" class="file-input-label hydro-v2">
                <i class="fas fa-upload"></i> Selecionar Arquivo
              </label>
            </div>
            <button id="upload-button" class="btn btn-upload hydro-v2">
              <i class="fas fa-cloud-upload-alt"></i> Enviar Leituras
            </button>
          </div>
          <div id="retornoArquivo" class="upload-status hydro-v2">Aguardando arquivo...</div>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza um card de hidrômetro na view de grid
   */
  updateHydrometerCard(hydrometerId, dados) {
    try {
      // Última leitura
      const readingEl = document.getElementById(`reading-${hydrometerId}`);
      
      if (readingEl && dados && dados.leitura) {
        readingEl.querySelector('.value').textContent = dados.leitura.leitura || (dados.leitura/1000).toFixed(3) || '--';
      }
      
      // Data da última transmissão (corrigindo fuso horário)
      const dateEl = document.getElementById(`date-${hydrometerId}`);
      if (dateEl && dados && dados.leitura && dados.leitura.data) {
        let date;
        if (typeof dados.leitura.data === 'string') {
          const parts = dados.leitura.data.split(' ');
          if (parts.length === 2) {
            const datePart = parts[0].split('-');
            const timePart = parts[1];
            const isoString = `${datePart[2]}-${datePart[1]}-${datePart[0]}T${timePart}`;
            date = new Date(isoString);
          } else {
            date = new Date(dados.leitura.data);
          }
        } else {
          date = new Date(dados.leitura.data);
        }
        
        date.setHours(date.getHours() + 3);
        
        const formattedDate = date.toLocaleString('pt-BR', { 
          timeZone: 'America/Sao_Paulo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        dateEl.textContent = formattedDate;
        
        // Status do hidrômetro
        const statusEl = document.getElementById(`status-${hydrometerId}`);
        if (statusEl) {
          const now = new Date();
          const diffMinutes = (now - date) / (1000 * 60);
          
          let statusClass = '';
          let statusText = '';

          if (diffMinutes < 1440) { // Menos de 24 horas
            statusClass = 'online';
            statusText = 'Online';
          } else if (diffMinutes < 2880) { // Menos de 48 horas
            statusClass = 'warning';
            statusText = 'Atenção';
          } else {
            statusClass = 'offline';
            statusText = 'Offline';
          }
          
          statusEl.innerHTML = `<span class="status-indicator hydro-v2 ${statusClass}"></span><span class="status-text hydro-v2">${statusText}</span>`;
        }
      }
      
    } catch (error) {
      console.error(`Erro ao atualizar card do hidrômetro ${hydrometerId}:`, error);
    }
  }

  /**
   * Mostra a view de detalhes de um hidrômetro específico
   */
  showHydrometerDetail(hydrometerId) {
    this.currentView = 'detail';
    const numericId = Number(hydrometerId);
    this.selectedHydrometer = numericId;
    const hydrometer = this.hydrometers.find(h => Number(h.id) === numericId);
    console.log('Dados do hidrômetro selecionado:', hydrometer);
    const dados = this.hydrometersData.get(numericId);
    console.log('Dados em cache do hidrômetro selecionado:', dados);
    // Verificação de segurança para evitar que o app trave se não achar o hidrômetro
    if (!hydrometer) {
      console.error(`Hidrômetro ${numericId} não encontrado na lista.`);
      this.showGridView(); // Volta para o grid em caso de erro
      return;
    }
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateDetailHTML(hydrometer, dados);
    
    if (dados.grafico) {
      this.updateDetailView();
    } else {
      this.loadHydrometerData(dados);
    }
  }

  /**
   * Gera HTML para a view de detalhes
   */
  generateDetailHTML(hydrometer, dados) {
    return `
      <div class="detail-header hydro-v2">
        <button id="back-to-grid" class="back-button hydro-v2">
          ← Voltar à Visão Geral
        </button>
        <div class="detail-title-row">
          <h1>${hydrometer.local}</h1>
          <div class="alert-toggle-container detail-alert hydro-v2">
            <label class="switch-label hydro-v2">Alertas</label>
            <input type="checkbox" class="alert-checkbox hydro-v2" 
              data-hydrometer-id="${hydrometer.id}" 
              ${hydrometer.alertasHabilitados ? 'checked' : ''}>
          </div>
        </div>
        <p class="detail-subtitle hydro-v2">ID: ${hydrometer.id}</p>
        <p class="last-update hydro-v2">Última atualização: <span id="detail-date">Carregando...</span></p>
      </div>

      <div class="metrics-grid hydro-v2 reading-main">
        <div class="metric-card hydro-v2">
          <p class="metric-label hydro-v2">Última Leitura</p>
          <p class="metric-value hydro-v2" id="detail-reading">0.000<span class="metric-unit hydro-v2">m³</span></p>
        </div>
      </div>

      <div class="charts-section hydro-v2">
        <div class="chart-container hydro-v2">
          <div id="chart_div"></div>
        </div>
      </div>

      <div class="consumption-calculator hydro-v2">
        <h3 class="calculator-title hydro-v2">Cálculo de Consumo por Período</h3>
        <form id="event-form" class="calculator-form hydro-v2">
          <div class="form-group hydro-v2">
            <label for="start-date" class="form-label hydro-v2">Data de Início:</label>
            <input type="date" id="start-date" class="form-input hydro-v2" required>
          </div>
          
          <div class="form-group hydro-v2">
            <label for="end-date" class="form-label hydro-v2">Data de Término:</label>
            <input type="date" id="end-date" class="form-input hydro-v2" required>
          </div>
          
          <div class="button-group hydro-v2">
            <button id="calcular" type="submit" class="btn btn-primary hydro-v2">
              📊 Calcular Consumo
            </button>
            <button id="btn-report-consumption" type="button" class="btn btn-secondary hydro-v2">
              📋 Relatório de Consumo
            </button>
          </div>
        </form>
      </div>

      <div class="results-section hydro-v2 results-grid">
        <div class="chart-container hydro-v2">
          <div id="chart_consumo"></div>
        </div>
        <div class="result-container hydro-v2">
          <div id="result">
            <div class="text-center hydro-v2">
              <p class="text-secondary hydro-v2">Selecione um período e clique em "Calcular Consumo" para ver os resultados.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza a view de detalhes com novos dados
   */
  updateDetailView() {
    try {
      const dados = this.hydrometersData.get(this.selectedHydrometer);
      // Atualiza data
      const dateEl = document.getElementById('detail-date');
      if (dateEl && dados.leitura && dados.leitura.data) {
        const date = this.parseAPIDate(dados.leitura.data);
        dateEl.textContent = date.toLocaleString('pt-BR');
      }
      
      // Atualiza leitura
      const readingEl = document.getElementById('detail-reading');
      if (readingEl && dados.leitura) {
        const valor = dados.leitura.leitura || (dados.leitura / 1000).toFixed(3);
        readingEl.innerHTML = `${valor}<span class="metric-unit hydro-v2">m³</span>`;
      }
      
      // Desenha gráfico se houver dados históricos
      if (dados.grafico) {
        this.drawChart(dados.grafico);
      }
    } catch (error) {
      console.error('Erro ao atualizar view de detalhes:', error);
    }
  }

  /**
   * Desenha o gráfico de histórico
   */
  drawChart(dadosGrafico) {
    try {
      const data = new google.visualization.DataTable();
      data.addColumn('datetime', 'Data');
      data.addColumn('number', 'Leitura (m³)');
      
      // Usa o parseAPIDate para cada item do gráfico
      const rows = dadosGrafico.map(item => [this.parseAPIDate(item[0]), item[1]]);
      data.addRows(rows);

      const options = {
        title: 'Histórico de Leituras',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { 
        title: 'Data', 
        format: 'dd/MM HH:mm', // Adicionado hora para melhor precisão
        gridlines: { count: 5 }
        },
        vAxis: { title: 'm³' },
        backgroundColor: 'transparent',
        chartArea: { width: '85%', height: '70%' },
        colors: ['#3498db'],
        legend: { position: 'none' }
      };

      const chart = new google.visualization.AreaChart(document.getElementById('chart_div'));
      chart.draw(data, options);
    } catch (error) {
      console.error('Erro ao desenhar gráfico:', error);
    }
  }

  /**
   * Calcula consumo para um período específico
   */
  async calculateConsumption(e) {
    try {
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e término.');
        return;
      }
      
      this.showLoading();
      
      const info = {
        hidrometro: this.selectedHydrometer,
        url: this.url,
        datas:{
          startDate: startDate,
          endDate: endDate
        }
      }
    const response = await fetch('/get_consumo/hidro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      
      body: JSON.stringify({info: info})
    });
      
      const dados = await response.json();
      this.hideLoading();
      
      if (dados.error) {
        alert('Erro ao calcular consumo: ' + dados.error);
        return;
      }
      
      this.displayCalculationResults(dados);
      //this.drawConsumptionChart(dados.grafico, this.selectedHydrometer);
      
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      this.hideLoading();
      alert('Erro ao calcular consumo. Tente novamente.');
    }
  }

  /**
   * Exibe resultados do cálculo de consumo
   */
  displayCalculationResults(dados) {
    const resultContainer = document.getElementById('result');
    let data1 = this.parseAPIDate(dados.dataL1).toLocaleString('pt-BR');
    let data2 = this.parseAPIDate(dados.dataL2).toLocaleString('pt-BR');
    resultContainer.innerHTML = `
      <div class="calculation-results hydro-v2">
        <h4 class="results-title hydro-v2">Resultado do Período</h4>
        <div class="result-item hydro-v2">
          <span class="result-label hydro-v2">Consumo Total:</span>
          <span class="result-value hydro-v2">${parseFloat(dados.consumo/1000).toFixed(3)} m³</span>
        </div>
        <div class="result-item hydro-v2">
          <span class="result-label hydro-v2">Início:</span>
          <span class="result-value hydro-v2">${data1}</span>
        </div>
        <div class="result-item hydro-v2">
          <span class="result-label hydro-v2">Término:</span>
          <span class="result-value hydro-v2">${data2}</span>
        </div>
      </div>
    `;
  }

  /**
   * Desenha gráfico de consumo do período
   */
  /*
  drawConsumptionChart(dadosGrafico, id) {
    try {
      const data = new google.visualization.DataTable();
      data.addColumn('date', 'Data');
      data.addColumn('number', 'Consumo (m³)');
      
      const rows = dadosGrafico.map(item => [new Date(item[0]), item[1]]);
      data.addRows(rows);

      const options = {
        title: 'Consumo no Período',
        hAxis: { title: 'Data', format: 'dd/MM' },
        vAxis: { title: 'm³' },
        backgroundColor: 'transparent',
        chartArea: { width: '85%', height: '70%' },
        colors: ['#2ecc71']
      };

      const chart = new google.visualization.ColumnChart(document.getElementById('chart_consumo'));
      chart.draw(data, options);
    } catch (error) {
      console.error('Erro ao desenhar gráfico de consumo:', error);
    }
  }
*/

  /**
   * Gera relatório geral para todos os hidrômetros
   */
  async generateGeneralReport() {
    try {
      const startDate = document.getElementById('general-start-date').value;
      const endDate = document.getElementById('general-end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e término.');
        return;
      }
      
      this.showLoading();
      
      const response = await fetch('/get_relatorio_geral/hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          startDate,
          endDate
        })
      });
      
      const dados = await response.json();
      this.hideLoading();
      
      if (dados.error) {
        alert('Erro ao gerar relatório: ' + dados.error);
        return;
      }
      
      this.downloadCSV(dados.relatorio, `Relatorio_Geral_Hidro_${this.url}`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório geral:', error);
      this.hideLoading();
    }
  }

  /**
   * Mostra popup para relatório de consumo detalhado
   */
  async showConsumptionReportPopup() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    if (!startDate || !endDate) {
      alert('Por favor, selecione as datas de início e término.');
      return;
    }
    
    this.showLoading();
    
    try {
      const response = await fetch('/get_relatorio_detalhado/hidro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: this.url,
          hidrometro: this.selectedHydrometer,
          startDate,
          endDate
        })
      });
      
      const dados = await response.json();
      this.hideLoading();
      
      if (dados.error) {
        alert('Erro ao gerar relatório: ' + dados.error);
        return;
      }
      
      this.downloadCSV(dados.relatorio, `Relatorio_Hidro_${this.selectedHydrometer}_${this.url}`);
      
    } catch (error) {
      console.error('Erro ao gerar relatório detalhado:', error);
      this.hideLoading();
    }
  }

  /**
   * Faz download de dados em formato CSV
   */
  downloadCSV(dados, filename) {
    if (!dados || dados.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID;Local;Data;Leitura (m3)\n";
    
    dados.forEach(row => {
      csvContent += `${row.id};${row.local};${row.data};${row.leitura}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Manipula upload de arquivo
   */
  async handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const statusEl = document.getElementById('retornoArquivo');
    
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Por favor, selecione um arquivo para enviar.');
      return;
    }
    
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('url', this.url);
    
    this.showLoading();
    statusEl.textContent = 'Enviando arquivo...';
    
    try {
      const response = await fetch('/upload_leituras_hidro', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      this.hideLoading();
      
      if (result.success) {
        statusEl.textContent = 'Arquivo processado com sucesso!';
        statusEl.className = 'upload-status hydro-v2 success';
        alert('Leituras enviadas com sucesso!');
        this.loadAllHydrometersData();
      } else {
        statusEl.textContent = 'Erro: ' + result.message;
        statusEl.className = 'upload-status hydro-v2 error';
        alert('Erro ao processar arquivo: ' + result.message);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      this.hideLoading();
      statusEl.textContent = 'Erro na conexão com o servidor.';
      statusEl.className = 'upload-status hydro-v2 error';
    }
  }

  /**
   * Mostra loading
   */
  showLoading() {
    const loadingPopup = document.getElementById('loadingPopup');
    if (loadingPopup) {
      loadingPopup.style.display = 'flex';
    }
  }

  /**
   * Esconde loading
   */
  hideLoading() {
    const loadingPopup = document.getElementById('loadingPopup');
    if (loadingPopup) {
      loadingPopup.style.display = 'none';
    }
  }

  /**
   * Esconde popups genéricos
   */
  hidePopup() {
    const popups = document.querySelectorAll('.popup-overlay');
    popups.forEach(p => p.style.display = 'none');
  }

  /**
 * Converte strings de data da API para objetos Date consistentes
 */
  parseAPIDate(dateStr) {
    if (!dateStr) return new Date();
  
    // Trata formato "DD-MM-YYYY HH:mm:ss" ou similar
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split(' ');
      if (parts.length === 2) {
        const [day, month, year] = parts[0].split('-');
        const timePart = parts[1];
        // Cria string ISO: YYYY-MM-DDTHH:mm:ss
        dateStr = `${year}-${month}-${day}T${timePart}`;
      }
    }
    
    const date = new Date(dateStr);
    
    // Ajuste de fuso horário (UTC-3) apenas se a data for válida
    if (!isNaN(date.getTime())) {
      date.setHours(date.getHours() + 3);
    }
  
    return date;
  }
}

// Inicializa o sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.hydrometerMonitorV2 = new HydrometerMonitorV2();
});


