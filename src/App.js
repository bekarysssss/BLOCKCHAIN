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

function App() {
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
      setMessage(`Ошибка подключения: ${error.message || error}`);
    }
  };
}
  // ... остальная часть компонента
  // src/App.js (Продолжение)

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
      // После успешной транзакции можно обновить историю
      await fetchGameHistory();

    } catch (error) {
      console.error('Ошибка при вызове play:', error);
      // Обработка ошибок, например, если пользователь отклонил транзакцию
      setMessage(`Ошибка транзакции: ${error.reason || error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  // ...

  // src/App.js (Продолжение)

  // 3. Функция получения истории игр
  const fetchGameHistory = async () => {
    // ВАЖНО: для чтения истории контракту не нужен signer, но нужен provider, 
    // или можно использовать контракт, созданный ранее.
    if (!contract || !currentAccount) return;

    try {
      // Создаем контракт для чтения (используем provider, если signer не нужен)
      const readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Вызываем функцию истории (ВАЖНО: замените "getGameHistory" на ваше название функции)
      // В контракте история, скорее всего, хранится в виде массива структур.
      const rawHistory = await readOnlyContract.getGameHistory(currentAccount);

      // В зависимости от того, что возвращает ваш контракт, вам может понадобиться 
      // преобразовать данные (например, из BigNumber в обычные числа).
      // Здесь предполагается, что он возвращает массив объектов с полями move, result и т.д.
      const formattedHistory = rawHistory.map(game => ({
        move: Number(game.playerMove), // Пример преобразования из BigNumber
        result: game.result, // Пример поля результата
        timestamp: Number(game.timestamp), // Пример временной метки
      }));
      
      setHistory(formattedHistory.reverse()); // Показываем свежие игры в начале
    } catch (error) {
      console.error('Ошибка при получении истории:', error);
      setMessage(`Ошибка загрузки истории: ${error.message}`);
    }
  };

  // Обновляем историю при подключении или смене аккаунта
  useEffect(() => {
    if (currentAccount && provider) {
      fetchGameHistory();
    }
  }, [currentAccount, provider]); 

  // ...

  // src/App.js (Финальный return)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🎮 Камень-Ножницы-Бумага на Блокчейне</h1>

      {/* Кнопка подключения */}
      {!currentAccount ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Подключить MetaMask
        </button>
      ) : (
        <p>✅ Подключен: 
           **{currentAccount.substring(0, 6)}...{currentAccount.slice(-4)}** <button onClick={() => fetchGameHistory()} style={{ marginLeft: '10px' }}>
             Обновить историю
           </button>
        </p>
      )}

      {/* Сообщения */}
      {message && <p style={{ color: message.includes('Ошибка') ? 'red' : 'green', fontWeight: 'bold' }}>{message}</p>}

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
                  backgroundColor: key === 'ROCK' ? '#ddd' : key === 'PAPER' ? '#bbb' : '#999',
                }}
              >
                {MOVE_NAMES[MOVES[key]]}
              </button>
            ))}
          </div>
          {loading && <p>Ожидание подтверждения транзакции...</p>}
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
                backgroundColor: index % 2 === 0 ? '#f9f9f9' : '#fff'
              }}
            >
              **Ход:** {MOVE_NAMES[game.move]} | **Результат:** {game.result} 
              {/* Если в вашем контракте есть результат (Win/Lose/Draw) */}
              {game.timestamp && ` | **Время:** ${new Date(game.timestamp * 1000).toLocaleString()}`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;