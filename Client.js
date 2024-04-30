const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.NODE_SERVICE_PORT;
const ip = process.env.HOST_MACHINE_IP;
const nodeName = process.env.NODE_NAME;

app.use(cors());


const socketIoClient = require('socket.io-client');

const coordinatorUrl = 'http://localhost:3000'; 
const clientUrl = `http://${process.env.NODE_SERVICE_IP}:${process.env.NODE_SERVICE_PORT}`;


const currentTime = new Date().toLocaleTimeString();

let simulatedClientTime;
let coordinatorTimeReceived;

const socket = socketIoClient(coordinatorUrl, {
  query: { clientUrl } 
});

io.on('connection', (socket) => {
    socket.emit('node_name', nodeName);
    console.log ("--------------"+ nodeName)
});

socket.on('connect', () => {
    const currentTime = new Date().toLocaleTimeString();
    console.log(`[${currentTime}] Nodo conectado al coordinador.`);
});

socket.on('connect_error', (error) => {
    const currentTime = new Date().toLocaleTimeString();
    console.error(`[${currentTime}] Error de conexión con el coordinador: ${error.message}`);
});

socket.on('error', (error) => {
    const currentTime = new Date().toLocaleTimeString();
    console.error(`[${currentTime}] Error en el nodo: ${error.message}`);
});


function getCurrentTime() {
    return new Date();
}

function simulateRandomTime(seconds) {
    const currentTime = getCurrentTime();
    const randomOffset = Math.floor(Math.random() * seconds); 
    const newTime = new Date(currentTime.getTime() + randomOffset * 1000);
    return newTime;
}

function startClock() {
    simulatedClientTime = simulateRandomTime(2000);
    setInterval(() => {
        const realTime = getCurrentTime();
        simulatedClientTime.setSeconds(simulatedClientTime.getSeconds() + 1);
        console.log(`Hora real: ${realTime.toLocaleTimeString()}`);
        console.log(`Hora simulada del cliente: ${simulatedClientTime.toLocaleTimeString()}`);
    }, 1000);
}

startClock();

socket.on('coordinator_time', (coordinatorTime) => {
    const [hour, minute, second] = coordinatorTime.split(':'); 
    coordinatorTimeReceived = new Date(); 
    coordinatorTimeReceived.setHours(parseInt(hour)); 
    coordinatorTimeReceived.setMinutes(parseInt(minute)); 
    coordinatorTimeReceived.setSeconds(parseInt(second)); 
    console.log(`[${currentTime}] Hora recibida del coordinador: ${coordinatorTime}`);
    calculateTimeDifference();
});


function calculateTimeDifference() {
    if (coordinatorTimeReceived instanceof Date && !isNaN(coordinatorTimeReceived)) {
        if (coordinatorTimeReceived.getHours() < 12) {
            coordinatorTimeReceived.setHours(coordinatorTimeReceived.getHours() + 12);
        }
        if (simulatedClientTime instanceof Date && !isNaN(simulatedClientTime)) {
            const timeDifference = simulatedClientTime-  coordinatorTimeReceived;
            const timeDifferenceInSeconds = timeDifference / 1000;
            console.log(`[${currentTime}] Diferencia de tiempo con el coordinador: ${timeDifferenceInSeconds} segundos`);
            socket.emit('time_difference', { differenceInSeconds: timeDifferenceInSeconds, nodeUrl: clientUrl });
        } else {
            console.log(`[${currentTime}]La hora simulada del cliente no es válida.`);
        }
    } else {
        console.log(`[${currentTime}] No se ha recibido la hora del coordinador aún.`);
    }
}

socket.on('node_time_difference', (data) => {
    const difference = data.difference;
    console.log(`[${currentTime}] Diferencia recibida del coordinador respecto al promedio : ${difference}`)
    receiveTimeDifference(difference);
});

function receiveTimeDifference(difference) {
    if (simulatedClientTime instanceof Date && !isNaN(simulatedClientTime)) {
        const differenceMilliseconds = difference * 1000; 
        simulatedClientTime.setTime(simulatedClientTime.getTime() + differenceMilliseconds);
        console.log(`[${currentTime}] Hora simulada actualizada : ${simulatedClientTime.toLocaleTimeString()}`);
    } else {
        console.log(`[${currentTime}] La hora simulada del cliente no es válida.`);
    }
}

const PORT = process.env.NODE_SERVICE_PORT;
server.listen(PORT, () => {
    console.log(`Servidor de WebSocket escuchando en el puerto ${PORT}`);
});