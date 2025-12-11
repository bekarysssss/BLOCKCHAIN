// src/contractConfig.js

export const CONTRACT_ADDRESS = "0xaa078351c3963bbb6d5800d7868544250afdd65f"; // <-- Вставьте адрес вашего контракта сюда

export const CONTRACT_ABI = [
    // Вставьте ваш ABI сюда.
    // Обязательно должны быть функции: play(uint _move) и функция для просмотра истории.
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_move",
                "type": "uint256"
            }
        ],
        "name": "play",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "_player",
                "type": "address"
            }
        ],
        "name": "getGameHistory", // <-- Название функции для истории в вашем контракте
        "outputs": [
            // Здесь должна быть структура, которую возвращает ваша функция истории
        ],
        "stateMutability": "view",
        "type": "function"
    }
    // ... остальная часть ABI
];