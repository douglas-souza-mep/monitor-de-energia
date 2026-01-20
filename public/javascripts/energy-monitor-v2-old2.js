/**
 * Energy Monitor Dashboard V2
 * Sistema de monitoramento de medidores de energia com visualização em grid
 * 
 * Otimizado para carregar dados iniciais em uma única requisição (v2).
 * Inclui a função de utilidade formatDateForDisplay para parsing robusto de data.
 */

class EnergyMonitorV2 {
  constructor() {
    this.medidores = [];
    this.clientKey = window.CLIENT_KEY; // Obtém a chave do cliente
    this.config = getClientConfig(this.clientKey); // Carrega a configuração do cliente
    
    if (!this.config) {
      console.error("Configuração do cliente não encontrada. Usando fallback.");
      // Fallback para uma configuração padrão ou erro
      //this.config = getClientConfig("santaMonica"); // Exemplo de fallback
    }

    this.url = this.config.api.baseUrl; // URL base da API do cliente
    this.clientMQTT = null;
    this.currentView = 'grid'; // 'grid' ou 'detail'
    this.selectedMeter = null;
    this.metersData = new Map(); // Cache dos dados dos medidores
    
    this.init();
  }

  /**
   * UTILIDADE: Cria um objeto Date robusto a partir de uma string YYYY-MM-DD HH:mm:ss
   * Aplica a correção de fuso horário de +3 horas.
   * @param {string} dateString - Data no formato YYYY-MM-DD HH:mm:ss
   * @returns {Date | null} Objeto Date corrigido ou null se inválido.
   */
  _createCorrectedDate(dateString) {
    if (typeof dateString !== 'string') {
        return null;
    }
    
    // Regex para extrair YYYY, MM, DD, HH, mm, ss
    const parts = dateString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    
    let date;
    if (parts) {
        // Cria a data manualmente: new Date(year, monthIndex, day, hours, minutes, seconds)
        // monthIndex é 0-based (Mês - 1)
        date = new Date(parts[1], parts[2] - 1, parts[3], parts[4], parts[5], parts[6]);
    } else {
        // Tenta o parsing padrão como fallback
        date = new Date(dateString);
    }

    if (isNaN(date.getTime())) {
        return null;
    }

    // Adiciona 3 horas para compensar o fuso horário (mantendo a lógica original)
    //date.setHours(date.getHours() + 3);
    
    return date;
  }

  /**
   * UTILIDADE: Formata um objeto Date para exibição
   * @param {string} dateString - Data no formato YYYY-MM-DD HH:mm:ss
   * @returns {string} Data formatada ou 'Data Inválida'.
   */
  formatDateForDisplay(dateString) {
    const date = this._createCorrectedDate(dateString);
    
    if (!date) {
        return 'Data Inválida';
    }
    
    return date.toLocaleString('pt-BR', { 
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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

    // Clique nos cards dos medidores
    document.addEventListener('click', (e) => {
      const meterCard = e.target.closest('.meter-card');
      if (meterCard && this.currentView === 'grid') {
        const meterId = meterCard.dataset.meterId;
        
        // **OTIMIZAÇÃO APLICADA AQUI:** Carrega os dados detalhados sob demanda
        this.loadMeterData(meterId).then(dados => {
            if (dados) {
                this.showMeterDetail(meterId);
            } else {
                alert('Não foi possível carregar os dados detalhados do medidor.');
            }
        });
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
  }

  /**
   * Carrega dados iniciais de forma otimizada (v2)
   * Usa a rota consolidada para obter dados do usuário e de todos os medidores em 1 requisição.
   */
  async loadUserData() {
    try {
      // **REQUISIÇÃO ÚNICA PARA DADOS INICIAIS**
      const response = await fetch('/v2/get-dados-iniciais/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url })
      });

      const dadosIniciais = await response.json();
      
      if (dadosIniciais.error) {
        throw new Error(dadosIniciais.error);
      }

      // 1. Atualiza a lista de medidores (usada para gerar o HTML do grid)
      this.medidores = dadosIniciais.medidores.map(m => ({
        id: m.id.toString(), // Garante que o ID é string para consistência
        local: m.local
      }));
      
      // 2. Armazena os dados de resumo no cache metersData
      dadosIniciais.medidores.forEach(medidor => {
        // Adapta o objeto de resumo para o formato que updateMeterCard espera (formato v1)
        const adaptedData = {
          id: medidor.id.toString(),
          leitura: {
            pft: medidor.pft,
            data: medidor.data // A data já está no formato do banco
          },
          // Simula a estrutura de consumo para o updateMeterCard (Consumo Diário)
          graficos: {
            // O updateMeterCard espera um array de arrays, com o último elemento sendo o consumo de hoje
            semanal: [['Hoje', medidor.consumoDiario]] 
          }
        };
        this.metersData.set(medidor.id.toString(), adaptedData);
      });
      
      console.log('Dados iniciais otimizados carregados. Medidores:', this.medidores);
      return this.medidores;
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
      
      // Carrega dados dos medidores (agora otimizado)
      await this.loadUserData();
      
      // loadAllMetersData() foi removida, pois os dados iniciais já estão no cache.
      
      // Configura conexão MQTT
      this.setupMQTTConnection();
      
      // Mostra a view de grid
      this.showGridView();
      
    } catch (error) {
      console.error('Erro ao iniciar página:', error);
      this.hideLoading();
    }
  }

  // loadAllMetersData() foi removida, pois não é mais necessária.

  /**
   * Carrega dados de um medidor específico (para detalhes - usa rota v2)
   */
  async loadMeterData(meterId) {
    try {
      // Usa a nova rota para obter dados detalhados (que usa a função v1 getDataStart)
      const response = await fetch('/v2/get-dados-detalhados/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          medidor: meterId, 
          url: this.url 
        })
      });

      const dados = await response.json();
      
      if (dados.error) {
        console.error(`Erro ao carregar dados detalhados do medidor ${meterId}:`, dados.error);
        return null;
      }
      
      // Armazena o dado detalhado (formato v1 completo) no cache
      this.metersData.set(meterId.toString(), dados);
      
      return dados;
    } catch (error) {
      console.error(`Erro ao carregar dados detalhados do medidor ${meterId}:`, error);
      return null;
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

      this.clientMQTT.on('connect', () => {
        console.log('Conectado ao broker MQTT');
        
        const topics = [this.config.mqtt.energyTopic];
        
        this.clientMQTT.subscribe(topics, (err) => {
          if (err) {
            console.error('Erro ao subscrever aos tópicos', err);
          } else {
            console.log('Subscrito aos tópicos:', topics.join(', '));
          }
        });
      });

      // **ADAPTAÇÃO MQTT:** A função handleMQTTMessage agora usa a nova utilidade de data.
      this.clientMQTT.on('message', (topic, message) => {
        this.handleMQTTMessage(topic, message);
      });

      this.clientMQTT.on('error', (err) => {
        console.error('Erro de conexão MQTT', err);
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
      case this.config.mqtt.energyTopic:
        try {
          const leitura = JSON.parse(message.toString());
          console.log('Nova leitura:', leitura.id);
          
          // Se a leitura tiver uma data, garante que ela seja válida para o cache
          if (leitura.leitura && leitura.leitura.data) {
              const correctedDate = this._createCorrectedDate(leitura.leitura.data);
              if (!correctedDate) {
                  console.warn(`Mensagem MQTT para medidor ${leitura.id} contém data inválida: ${leitura.leitura.data}`);
                  // Se a data for inválida, é melhor não atualizar o card de data/status
                  // Mas o restante dos dados (pft, consumo) pode ser atualizado.
              }
          }

          // Atualiza o cache de dados
          this.metersData.set(leitura.id, leitura);
          
          // Atualiza a interface baseado na view atual
          if (this.currentView === 'grid') {
            this.updateMeterCard(leitura.id, leitura);
          } else if (this.currentView === 'detail' && this.selectedMeter === leitura.id) {
            this.updateDetailView(leitura);
          }
          
        } catch (error) {
          console.error('Erro ao processar mensagem MQTT:', error);
        }
        break;
      default:
        console.log(`Tópico desconhecido: ${topic} - Mensagem: ${message}`);
    }
  }

  /**
   * Mostra a view de grid com todos os medidores
   */
  showGridView() {
    this.currentView = 'grid';
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateGridHTML();
    
    // Atualiza os cards com os dados em cache
    this.medidores.forEach(medidor => {
      const dados = this.metersData.get(medidor.id);
      if (dados) {
        this.updateMeterCard(medidor.id, dados);
      }
    });
  }

  /**
   * Gera HTML para a view de grid
   */
  generateGridHTML() {
    return `
      <div class="grid-header mep-v2">
        <h1>Monitoramento de Energia - Visão Geral</h1>
        <p class="grid-subtitle mep-v2">Clique em um medidor para ver os detalhes</p>
      </div>
      
      <div class="grid-actions mep-v2">
        <div class="report-general-form mep-v2">
          <h3 class="form-title mep-v2">Relatório Geral</h3>
          <div class="form-row mep-v2">
            <div class="form-group mep-v2">
              <label for="general-start-date" class="form-label mep-v2">Data de Início:</label>
              <input type="date" id="general-start-date" class="form-input mep-v2" required>
            </div>
            <div class="form-group mep-v2">
              <label for="general-end-date" class="form-label mep-v2">Data de Término:</label>
              <input type="date" id="general-end-date" class="form-input mep-v2" required>
            </div>
            <div class="form-group mep-v2">
              <button id="btn-report-general" class="btn btn-report-general mep-v2">
                <i class="fas fa-file-csv"></i> Gerar Relatório Geral
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="meters-grid mep-v2">
        ${this.medidores.map(medidor => `
          <div class="meter-card mep-v2" data-meter-id="${medidor.id}">
            <div class="meter-header mep-v2">
              <h3 class="meter-name mep-v2">${medidor.local}</h3>
              <span class="meter-id mep-v2">ID: ${medidor.id}</span>
            </div>
            
            <div class="meter-consumption mep-v2">
              <div class="consumption-value mep-v2" id="consumption-${medidor.id}">
                <span class="value">--</span>
                <span class="unit">kWh</span>
              </div>
              <div class="consumption-label mep-v2">Consumo Hoje</div>
            </div>
            
            <div class="meter-info mep-v2">
              <div class="info-item mep-v2">
                <span class="info-label mep-v2">Fator de Potência:</span>
                <span class="info-value mep-v2" id="pf-${medidor.id}">--</span>
              </div>
              <div class="info-item mep-v2">
                <span class="info-label mep-v2">Última Atualização:</span>
                <span class="info-value mep-v2" id="date-${medidor.id}">--</span>
              </div>
            </div>
            
            <div class="meter-status mep-v2" id="status-${medidor.id}">
              <span class="status-indicator mep-v2"></span>
              <span class="status-text mep-v2">Aguardando dados...</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Atualiza um card de medidor na view de grid
   */
  updateMeterCard(meterId, dados) {
    try {
      // Consumo hoje (Ajustado para o novo formato de dados de resumo)
      const consumptionEl = document.getElementById(`consumption-${meterId}`);
      // Verifica se a estrutura de dados é a nova (resumo) ou a antiga (detalhe)
      const consumoHoje = dados.graficos && dados.graficos.semanal 
        ? dados.graficos.semanal[dados.graficos.semanal.length - 1][1] // Novo formato (resumo)
        : dados.consumos && dados.consumos.consumo // Formato antigo (detalhe) - fallback, mas o ideal é usar o dado de resumo
      
      if (consumptionEl && consumoHoje !== undefined) {
        consumptionEl.querySelector('.value').textContent = parseFloat(consumoHoje).toFixed(2);
      } else if (consumptionEl) {
        // Se for o formato antigo (detalhe)
        if (dados.consumos && dados.consumos.consumo) {
          consumptionEl.querySelector('.value').textContent = parseFloat(dados.consumos.consumo).toFixed(2);
        } else {
          consumptionEl.querySelector('.value').textContent = '--';
        }
      }
      
      // Fator de potência total
      const pfEl = document.getElementById(`pf-${meterId}`);
      if (pfEl && dados.leitura) {
        pfEl.textContent = dados.leitura.pft || '--';
      }
      
      // Data da última transmissão (USANDO A NOVA FUNÇÃO DE UTILIDADE)
      const dateEl = document.getElementById(`date-${meterId}`);
      if (dateEl && dados.leitura && dados.leitura.data) {
        dateEl.textContent = this.formatDateForDisplay(dados.leitura.data);
      }
      
      // Status do medidor
      const statusEl = document.getElementById(`status-${meterId}`);
      if (statusEl && dados.leitura && dados.leitura.data) {
        const now = new Date();
        
        // Processa a data usando a nova utilidade
        const lastUpdate = this._createCorrectedDate(dados.leitura.data);
        
        if (!lastUpdate) {
          statusEl.innerHTML = `<span class="status-indicator mep-v2 offline"></span><span class="status-text mep-v2">Offline</span>`;
          return;
        }

        const diffMinutes = (now - lastUpdate) / (1000 * 60);
        
        // Verifica se a configuração de interface existe
        const statusConfig = this.config.interface?.meterCard?.statusThresholds || {
          online: 5,
          warning: 15,
          offline: 30
        };

        let statusClass = '';
        let statusText = '';

        if (diffMinutes < statusConfig.online) {
          statusClass = 'online';
          statusText = 'Online';
        } else if (diffMinutes < statusConfig.warning) {
          statusClass = 'warning';
          statusText = 'Atenção';
        } else {
          statusClass = 'offline';
          statusText = 'Offline';
        }
        
        statusEl.innerHTML = `<span class="status-indicator mep-v2 ${statusClass}"></span><span class="status-text mep-v2">${statusText}</span>`;
      }
      
    } catch (error) {
      console.error(`Erro ao atualizar card do medidor ${meterId}:`, error);
    }
  }

  /**
   * Mostra a view de detalhes de um medidor específico
   */
  showMeterDetail(meterId) {
    this.currentView = 'detail';
    this.selectedMeter = meterId;
    
    const medidor = this.medidores.find(m => m.id === meterId);
    const dados = this.metersData.get(meterId.toString());
    
    const container = document.getElementById('main-content');
    container.innerHTML = this.generateDetailHTML(medidor, dados);
    
    if (dados) {
      this.updateDetailView(dados);
    }
  }

  /**
   * Gera HTML para a view de detalhes
   */
  generateDetailHTML(medidor, dados) {
    return `
      <div class="detail-header mep-v2">
        <button id="back-to-grid" class="back-button mep-v2">
          ← Voltar à Visão Geral
        </button>
        <h1>${medidor.local}</h1>
        <p class="detail-subtitle mep-v2">ID: ${medidor.id}</p>
        <p class="last-update mep-v2">Última atualização: <span id="detail-date">Carregando...</span></p>
        
      </div>

      <!-- Voltage Section -->
      <div class="section-title mep-v2">Tensão (V)</div>
      <div class="metrics-grid mep-v2 voltage">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="va">0<span class="metric-unit mep-v2">V</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="vb">0<span class="metric-unit mep-v2">V</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="vc">0<span class="metric-unit mep-v2">V</span></p>
        </div>
      </div>

      <!-- Current Section -->
      <div class="section-title mep-v2">Corrente (A)</div>
      <div class="metrics-grid mep-v2 current">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="ia">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="ib">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="ic">0<span class="metric-unit mep-v2">A</span></p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="it">0<span class="metric-unit mep-v2">A</span></p>
        </div>
      </div>

      <!-- Power Factor Section -->
      <div class="section-title mep-v2">Fator de Potência</div>
      <div class="metrics-grid mep-v2 power-factor">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="pfa">0.00</p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="pfb">0.00</p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="pfc">0.00</p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="pft">0.00</p>
        </div>
      </div>

      <!-- Active Power Section -->
      <div class="section-title mep-v2">Potência Ativa (W)</div>
      <div class="metrics-grid mep-v2 active-power">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase A</p>
          <p class="metric-value mep-v2" id="pa">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase B</p>
          <p class="metric-value mep-v2" id="pb">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Fase C</p>
          <p class="metric-value mep-v2" id="pc">0<span class="metric-unit mep-v2">W</span></p>
        </div>
        <div class="metric-card mep-v2 total">
          <p class="metric-label mep-v2">Total</p>
          <p class="metric-value mep-v2" id="pt">0<span class="metric-unit mep-v2">W</span></p>
        </div>
      </div>

      <!-- Consumption Section -->
      <div class="section-title mep-v2">Consumo (kWh)</div>
      <div class="metrics-grid mep-v2 consumption">
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Hoje</p>
          <p class="metric-value mep-v2" id="cd">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Ontem</p>
          <p class="metric-value mep-v2" id="cda">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Consumo Mensal</p>
          <p class="metric-value mep-v2" id="cm">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
        <div class="metric-card mep-v2">
          <p class="metric-label mep-v2">Mês Anterior</p>
          <p class="metric-value mep-v2" id="cma">0<span class="metric-unit mep-v2">kWh</span></p>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section mep-v2">
        <div class="charts-grid mep-v2 chart-single">
          <div class="chart-container mep-v2">
            <div id="chart_div1"></div>
          </div>
        </div>
        
        <div class="charts-grid mep-v2 chart-double">
          <div class="chart-container mep-v2">
            <div id="chart_div2"></div>
          </div>
          <div class="chart-container mep-v2">
            <div id="chart_div3"></div>
          </div>
        </div>
      </div>

      <!-- Consumption Calculator -->
      <div class="consumption-calculator mep-v2">
        <h3 class="calculator-title mep-v2">Período de Cobrança</h3>
        <form id="event-form" class="calculator-form mep-v2">
          <div class="form-group mep-v2">
            <label for="start-date" class="form-label mep-v2">Data de Início:</label>
            <input type="date" id="start-date" class="form-input mep-v2" required>
          </div>
          
          <div class="form-group mep-v2">
            <label for="end-date" class="form-label mep-v2">Data de Término:</label>
            <input type="date" id="end-date" class="form-input mep-v2" required>
          </div>
          
          <div class="button-group mep-v2">
            <button id="calcular" type="submit" class="btn btn-primary mep-v2">
              📊 Calcular Consumo
            </button>
            <button id="btn-report-consumption" type="button" class="btn btn-secondary mep-v2">
              📋 Relatório de Consumo
            </button>
          </div>
        </form>
      </div>

      <!-- Results Section -->
      <div class="results-section mep-v2 results-grid">
        <div class="chart-container mep-v2">
          <div id="chart_consumo"></div>
        </div>
        <div class="result-container mep-v2">
          <div id="result">
            <div class="text-center mep-v2">
              <p class="text-secondary mep-v2">Selecione um período e clique em "Calcular Consumo" para ver os resultados.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Atualiza a view de detalhes com novos dados
   */
  updateDetailView(dados) {
    try {
      // Atualiza data (USANDO A NOVA FUNÇÃO DE UTILIDADE)
      const dateEl = document.getElementById('detail-date');
      if (dateEl && dados.leitura && dados.leitura.data) {
        dateEl.textContent = this.formatDateForDisplay(dados.leitura.data);
      }
      
      // Atualiza tensões
      document.getElementById('va').innerHTML = `${dados.leitura.uarms}<span class="metric-unit mep-v2">V</span>`;
      document.getElementById('vb').innerHTML = `${dados.leitura.ubrms}<span class="metric-unit mep-v2">V</span>`;
      document.getElementById('vc').innerHTML = `${dados.leitura.ucrms}<span class="metric-unit mep-v2">V</span>`;
      
      // Atualiza correntes
      document.getElementById('ia').innerHTML = `${dados.leitura.iarms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('ib').innerHTML = `${dados.leitura.ibrms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('ic').innerHTML = `${dados.leitura.icrms}<span class="metric-unit mep-v2">A</span>`;
      document.getElementById('it').innerHTML = `${dados.leitura.itrms}<span class="metric-unit mep-v2">A</span>`;
      
      // Atualiza fatores de potência
      document.getElementById('pfa').textContent = dados.leitura.pfa;
      document.getElementById('pfb').textContent = dados.leitura.pfb;
      document.getElementById('pfc').textContent = dados.leitura.pfc;
      document.getElementById('pft').textContent = dados.leitura.pft;
      
      // Atualiza potências ativas
      document.getElementById('pa').innerHTML = `${dados.leitura.pa}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pb').innerHTML = `${dados.leitura.pb}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pc').innerHTML = `${dados.leitura.pc}<span class="metric-unit mep-v2">W</span>`;
      document.getElementById('pt').innerHTML = `${dados.leitura.pt}<span class="metric-unit mep-v2">W</span>`;
      
      // Atualiza consumos
      document.getElementById('cd').innerHTML = `${dados.graficos.semanal[dados.graficos.semanal.length-1][1]}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cda').innerHTML = `${dados.consumos.consumoDiaAnterior}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cm').innerHTML = `${dados.consumos.consumoMensal}<span class="metric-unit mep-v2">kWh</span>`;
      document.getElementById('cma').innerHTML = `${dados.consumos.consumoMesAnterior}<span class="metric-unit mep-v2">kWh</span>`;
      
      // Atualiza gráficos
      fetch('/get_grafico_diario/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: this.url, medidor: dados.id, data:dados.leitura.data }) // Envia o dado da URL como JSON
      })
      .then(response => response.json())
      .then(dadosDiarios => {
        dados.graficos.diario = dadosDiarios.diario
        this.drawCharts(dados.graficos);
      })
    } catch (error) {
      console.error('Erro ao atualizar view de detalhes:', error);
    }
  }

  /**
   * Desenha os gráficos (mesmo código da versão anterior)
   */
  drawCharts(dados) {
    try {
      // Gráfico diário
      const data1 = new google.visualization.DataTable();
      data1.addColumn('string', 'Horário');
      data1.addColumn('number', 'Potência Ativa Total');
      //console.log(dados.diario)
      data1.addRows(dados.diario);

      const options1 = {
        title: 'Consumo Hoje',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Horário' },
        vAxis: { title: 'Potência (W)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.primary]
      };

      // Gráfico semestral
      const data2 = new google.visualization.DataTable();
      data2.addColumn('string', 'Datas');
      data2.addColumn('number', 'Consumo');
      data2.addRows(dados.semestral);

      const options2 = {
        title: 'Consumos Mensais',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Meses' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.primary]
      };

      // Gráfico semanal
      const data3 = new google.visualization.DataTable();
      data3.addColumn('string', 'Datas');
      data3.addColumn('number', 'Consumo');
      data3.addRows(dados.semanal);

      const options3 = {
        title: 'Consumo nos Últimos 7 Dias',
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: { title: 'Dias' },
        vAxis: { title: 'Consumo (kWh)' },
        backgroundColor: 'transparent',
        chartArea: { width: '80%', height: '70%' },
        colors: [this.config.colors.primary]
      };

      // Desenha os gráficos
      const chart1 = new google.visualization.AreaChart(document.getElementById('chart_div1'));
      const chart2 = new google.visualization.ColumnChart(document.getElementById('chart_div2'));
      const chart3 = new google.visualization.ColumnChart(document.getElementById('chart_div3'));

      chart1.draw(data1, options1);
      chart2.draw(data2, options2);
      chart3.draw(data3, options3);
      
    } catch (error) {
      console.error('Erro ao desenhar gráficos:', error);
    }
  }

  /**
   * Calcula consumo de energia (mesmo código da versão anterior)
   */
  async calculateConsumption(event) {
    event.preventDefault();
    
    try {
      this.showLoading();
      
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e fim.');
        this.hideLoading();
        return;
      }
      
      const medidor = this.medidores.find(m => m.id === this.selectedMeter);
      
      const response = await fetch('/get_consumo/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: {
            id: this.selectedMeter,
            datas: { startDate, endDate },
            url: this.url,
            local: medidor.local
          }
        })
      });

      const dados = await response.json();
      const resultDiv = document.getElementById('result');
      
      if (dados.error) {
        resultDiv.innerHTML = `<div class="text-error mep-v2"><p>${dados.error}</p></div>`;
      } else {
        this.drawConsumptionChart(dados.grafico, dados.id, dados.local);
        
        const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
        
        resultDiv.innerHTML = `
          <div class="result-content mep-v2">
            <h3 class="mb-3 mep-v2">Consumo Calculado</h3>
            <div class="result-details mep-v2">
              <p><strong>Local:</strong> ${dados.local}</p>
              <p><strong>Data Início:</strong> ${new Date(dados.dataL1).toLocaleDateString('pt-BR', options)}</p>
              <p><strong>Data Término:</strong> ${new Date(dados.dataL2).toLocaleDateString('pt-BR', options)}</p>
              <p class="consumption-value mep-v2"><strong>Consumo:</strong> <span class="text-success mep-v2">${dados.consumo} kWh</span></p>
            </div>
          </div>
        `;
      }
      
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao calcular consumo:', error);
      this.hideLoading();
    }
  }

  /**
   * Mostra popup para relatório de consumo
   */
  showConsumptionReportPopup() {
    // Cria o popup
    const popup = document.createElement('div');
    popup.className = 'consumption-report-popup mep-v2';
    popup.innerHTML = `
      <div class="popup-overlay mep-v2" onclick="this.parentElement.remove()"></div>
      <div class="popup-content mep-v2">
        <div class="popup-header mep-v2">
          <h3>Relatório de Consumo</h3>
          <button class="popup-close mep-v2" onclick="this.closest('.consumption-report-popup').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="popup-body mep-v2">
          <div class="popup-icon mep-v2">
            <i class="fas fa-info-circle"></i>
          </div>
          <p class="popup-message mep-v2">Função "Relatório de Consumo" disponível em breve!</p>
          <p class="popup-description mep-v2">Esta funcionalidade está sendo desenvolvida e estará disponível em uma próxima atualização.</p>
        </div>
        <div class="popup-footer mep-v2">
          <button class="btn btn-primary mep-v2" onclick="this.closest('.consumption-report-popup').remove()">
            Entendido
          </button>
        </div>
      </div>
    `;
    
    // Adiciona o popup ao body
    document.body.appendChild(popup);
    
    // Adiciona animação de entrada
    setTimeout(() => {
      popup.classList.add('show');
    }, 10);
  }

  /**
   * Gera relatório geral (movido para a visão de grid)
   */
  async generateGeneralReport() {
    try {
      this.showLoading();
      
      const startDate = document.getElementById('general-start-date').value;
      const endDate = document.getElementById('general-end-date').value;
      
      if (!startDate || !endDate) {
        alert('Por favor, selecione as datas de início e fim para o relatório geral.');
        this.hideLoading();
        return;
      }
      
      const response = await fetch('/get_relatorio_geral/energ', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          info: {
            medidores: this.medidores,
            datas: { startDate, endDate },
            url: this.url
          }
        })
      });

      const dados = await response.json();
      
      if (dados.error) {
        alert(`Erro ao gerar relatório geral: ${dados.error}`);
      } else {
        this.generateCSVReport(dados);
        alert('Download do relatório geral iniciado com sucesso!');
      }
      
      this.hideLoading();
    } catch (error) {
      console.error('Erro ao gerar relatório geral:', error);
      alert('Erro ao gerar relatório geral. Tente novamente.');
      this.hideLoading();
    }
  }

  /**
   * Gera relatório CSV (mesmo código da versão anterior)
   */
  generateCSVReport(dados) {
    try {
      const cabecalho = ['Local', 'ID','Consumo(KWh)', 'Data inicial', 'Data final'];//, 'Leitura inicial', 'Leitura final'];
      let csvContent = cabecalho.join(';') + '\n';
      
      dados.forEach(item => {
        const linha = [
          item.nome,
          item.id,
          item.NovoConsumo,
          //item.consumo.valor,
          item.consumo.startDate,
          item.consumo.endDate,
          //item.consumo.startValor,
          //item.consumo.endValor
        ];
        csvContent += linha.join(';') + '\n';
      });
      
      const link = document.createElement('a');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      link.href = URL.createObjectURL(blob);
      link.download = `Consumo_de_Energia_${this.url}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
    }
  }

  /**
   * Desenha gráfico de consumo (mesmo código da versão anterior)
   */
  async drawConsumptionChart(dados, id, local) {
    try {
      const grafico = [];
      
      dados.forEach(element => {
        grafico.push([new Date(element[0]), element[1]]);
      });
      
      const data = new google.visualization.DataTable();
      data.addColumn('date', 'Data');
      data.addColumn('number', 'Leitura');
      data.addRows(grafico);
      
      const options = {
        title: `Leituras: ${local} (${id})`,
        titleTextStyle: { fontSize: 16, bold: true },
        hAxis: {
          title: 'Data',
          format: 'dd/MM/yy',
          titleTextStyle: { color: '#333' }
        },
        vAxis: { 
          title: 'Leitura (kWh)',
          titleTextStyle: { color: '#333' }
        },
        series: {
          0: { lineWidth: 3 }
        },
        pointSize: 6,
        pointShape: 'circle',
        colors: [this.config.colors.primary],
        backgroundColor: 'transparent',
        chartArea: { width: '85%', height: '75%' },
        tooltip: {
          isHtml: true,
          trigger: 'selection'
        }
      };
      
      // Formata tooltip
      const formattedData = [];
      for (let i = 0; i < data.getNumberOfRows(); i++) {
        const date = data.getValue(i, 0);
        const value = data.getValue(i, 1);
        const tooltip = this.formatTooltip(date, value);
        formattedData.push([date, value, tooltip]);
      }
      
      const dataWithTooltip = google.visualization.arrayToDataTable([
        ['Data', 'Leitura', { role: 'tooltip', type: 'string', p: { html: true } }],
        ...formattedData
      ]);
      
      const chart = new google.visualization.AreaChart(document.getElementById('chart_consumo'));
      chart.draw(dataWithTooltip, options);
      
    } catch (error) {
      console.error('Erro ao desenhar gráfico de consumo:', error);
    }
  }

  /**
   * Formata tooltip do gráfico
   */
  formatTooltip(date, value) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    const formattedDate = date.toLocaleDateString('pt-BR', options);
    return `<div style="padding: 8px;"><strong>Data:</strong> ${formattedDate}  
<strong>Leitura:</strong> ${value} kWh</div>`;
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
}

// Inicializa o sistema quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
  window.energyMonitorV2 = new EnergyMonitorV2();
});
