// src/App.js
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contractConfig'; // Импортируем конфиг

// Настройка ходов (для удобства)
const MOVES = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
};
const MOVE_NAMES = ['Камень', 'Бумага', 'Ножницы'];

function App() { // <-- ОТКРЫТИЕ ФУНКЦИИ App
  const [currentAccount, setCurrentAccount] = useState(null); // Адрес подключенного пользователя
  const [provider, setProvider] = useState(null); // Объект провайдера (для чтения)
  const [signer, setSigner] = useState(null); // Объект подписывающего (для записи транзакций)
  const [contract, setContract] = useState(null); // Объект контракта
  const [loading, setLoading] = useState(false); // Для отслеживания загрузки
  const [message, setMessage] = useState(''); // Сообщения для пользователя (ошибки/успех)
  const [history, setHistory] = useState([]); // История игр

  // 1. Функция подключения к кошельку
  const connectWallet = async () => {
    try {
      // Проверяем, установлен ли MetaMask
      if (!window.ethereum) {
        setMessage('Пожалуйста, установите MetaMask!');
        return;
      }

      // Запрашиваем доступ к аккаунтам
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Настраиваем объекты ethers.js
      // Для современной версии ethers.js (v6) используется BrowserProvider
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      const newSigner = await newProvider.getSigner();

      setCurrentAccount(accounts[0]);
      setProvider(newProvider);
      setSigner(newSigner);

      // Создаем объект контракта для отправки транзакций (нужен signer)
      const rpsContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner);
      setContract(rpsContract);

      setMessage(`Успешно подключено: ${accounts[0].substring(0, 6)}...${accounts[0].slice(-4)}`);
    } catch (error) {
      console.error(error);
      // Улучшенная обработка для отклоненной пользователем транзакции
      if (error.code === 4001) {
        setMessage('Подключение отклонено пользователем.');
      } else {
        setMessage(`Ошибка подключения: ${error.message || error}`);
      }
    }
  };


  // 2. Функция вызова play()
  const handlePlay = async (move) => {
    if (!contract || !currentAccount) {
      setMessage('Пожалуйста, сначала подключите кошелек!');
      return;
    }

    setLoading(true);
    setMessage(`Отправка хода "${MOVE_NAMES[move]}"...`);

    try {
      // Вызываем функцию play в смарт-контракте
      const transaction = await contract.play(move);

      // Ждем завершения транзакции в блокчейне
      await transaction.wait();

      setMessage('Игра успешно сыграна! Ожидайте результата в истории.');
      // После успешной транзакции обновляем историю
      await fetchGameHistory();

    } catch (error) {
      console.error('Ошибка при вызове play:', error);
      // Обработка ошибки, если пользователь отклонил транзакцию (очень важно)
       if (error.code === 4001) {
        setMessage('Транзакция отклонена пользователем.');
      } else {
        setMessage(`Ошибка транзакции: ${error.reason || error.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setLoading(false);
    }
  };


  // 3. Функция получения истории игр
  const fetchGameHistory = async () => {
    // Используем provider, чтобы избежать ошибок "signer not found"
    if (!provider || !currentAccount) return; 

    try {
      // Создаем контракт для чтения (нужен provider)
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Вызываем функцию истории 
      const rawHistory = await readOnlyContract.getGameHistory(currentAccount);

      // Преобразование данных
      const formattedHistory = rawHistory.map(game => ({
        // Преобразуем BigInt (или BigNumber) в обычное число
        move: Number(game.playerMove), 
        result: game.result, 
        timestamp: Number(game.timestamp),
      }));
      
      setHistory(formattedHistory.reverse()); // Показываем свежие игры в начале
      setMessage(prev => prev.includes('Успешно') ? prev : 'История обновлена.');
      
    } catch (error) {
      console.error('Ошибка при получении истории:', error);
      // Это может быть связано с тем, что функция getGameHistory не существует или имеет другой аргумент
      setMessage(`Ошибка загрузки истории: Проверьте ABI и название функции getGameHistory. ${error.message}`);
    }
  };

  // Обновляем историю при подключении или смене аккаунта
  useEffect(() => {
    // Включаем подписку на смену аккаунта/сети для EXTRA задачи
    if (window.ethereum) {
        const handleAccountOrChainChange = () => window.location.reload(); 
        window.ethereum.on('accountsChanged', handleAccountOrChainChange);
        window.ethereum.on('chainChanged', handleAccountOrChainChange);
        return () => {
            window.ethereum.removeListener('accountsChanged', handleAccountOrChainChange);
            window.ethereum.removeListener('chainChanged', handleAccountOrChainChange);
        };
    }
    
    // Загружаем историю, если подключен аккаунт
    if (currentAccount && provider) {
      fetchGameHistory();
    }
  }, [currentAccount, provider]); 


  // **********************************************
  // ФИНАЛЬНАЯ РАЗМЕТКА (JSX)
  // **********************************************
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🎮 Камень-Ножницы-Бумага на Блокчейне</h1>

      {/* Кнопка подключения */}
      {!currentAccount ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}>
          Подключить MetaMask
        </button>
      ) : (
        <p>
          ✅ Подключен: 
          **{currentAccount.substring(0, 6)}...{currentAccount.slice(-4)}** <button onClick={fetchGameHistory} style={{ marginLeft: '10px', padding: '5px 10px' }}>
            Обновить историю
          </button>
        </p>
      )}

      {/* Сообщения */}
      {message && <p style={{ color: message.includes('Ошибка') || message.includes('отклонена') ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p>}

      <hr />

      {/* Секция Игры */}
      {currentAccount && (
        <section>
          <h2>2. Сделать ход</h2>
          <div>
            {Object.keys(MOVES).map((key) => (
              <button
                key={key}
                onClick={() => handlePlay(MOVES[key])}
                disabled={loading}
                style={{
                  margin: '5px',
                  padding: '10px 15px',
                  fontSize: '18px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: key === 'ROCK' ? '#e0e0e0' : key === 'PAPER' ? '#c0c0c0' : '#a0a0a0',
                  border: 'none',
                  borderRadius: '5px'
                }}
              >
                {MOVE_NAMES[MOVES[key]]}
              </button>
            ))}
          </div>
          {loading && <p>⌛ Ожидание подтверждения транзакции...</p>}
        </section>
      )}

      <hr />

      {/* Секция Истории */}
      <section>
        <h2>3. История игр ({history.length} записей)</h2>
        {history.length === 0 && currentAccount && <p>История пуста. Сыграйте свою первую игру!</p>}
        {history.length === 0 && !currentAccount && <p>Подключите кошелек, чтобы увидеть историю.</p>}

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {history.map((game, index) => (
            <li 
              key={index} 
              style={{ 
                border: '1px solid #ccc', 
                padding: '10px', 
                marginBottom: '5px',
                borderRadius: '5px',
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <div>
                 **Ход:** {MOVE_NAMES[game.move]} | **Результат:** {game.result} 
              </div>
              {game.timestamp && <div style={{ fontSize: '12px', color: '#666' }}>
                **Время:** {new Date(game.timestamp * 1000).toLocaleString()}
              </div>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );

} // <-- ЗДЕСЬ ПРАВИЛЬНО ЗАКРЫВАЕТСЯ ФУНКЦИЯ App

export default App;