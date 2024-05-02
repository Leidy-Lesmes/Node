const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const port = process.env.NODE_SERVICE_PORT;
const nodeIp = process.env.NODE_SERVICE_IP;
const nodeName = process.env.NODE_NAME;

const clientFront = process.env.IP_CLIENT_FRONT; // URL del cliente al que se enviará información

app.use(cors({ origin: '*' }));

const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});

const socketIoClient = require('socket.io-client');

const coordinatorUrl = 'http://localhost:3000'; 
const clientUrl = `http://${process.env.NODE_SERVICE_IP}:${process.env.NODE_SERVICE_PORT}`;


const currentTime = new Date().toLocaleTimeString();

let simulatedClientTime;
let coordinatorTimeReceived;

// Conexión al servidor coordinador
const socket = socketIoClient(coordinatorUrl, {
  query: { clientUrl } 
});

// Configuración del servidor WebSocket
io.on('connection', (socket) => {
    const origin = socket.handshake.query.clientUrl;

    console.log(`[${currentTime}] Nuevo cliente conectado desde: ${origin}`);

    socket.on('join_vue_clients', () => {
        socket.join('vue-clients');
        io.to('vue-clients').emit('system_log', `[${currentTime}] Client from Vue connected. ${origin}`);
        
        // Envía los datos al cliente Vue
        io.to('vue-clients').emit('node_data', {
            node_name: nodeName,
            ip_address: process.env.NODE_SERVICE_IP,
            simulated_time: simulatedClientTime.toLocaleTimeString(),
            system_time: getCurrentTime().toLocaleTimeString()
        });
    });

    socket.emit('log_message', `[${getCurrentTime()}] Connected successful from ${origin} to coordinator server.`);
    io.to('vue-clients').emit('system_log', `[${getCurrentTime()}] Connected successful from ${origin} to coordinator server.`);

    socket.on('disconnect', () => {
        console.log(`[${getCurrentTime()}] Client ${origin} disconnected.`);
        io.to('vue-clients').emit('system_log', `[${getCurrentTime()}] Client ${origin} disconnected.`);
    });
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
        // Emitir la hora simulada y la URL del cliente
        io.to(clientFront).emit('simulated_client_time', {
            time: simulatedClientTime.toLocaleTimeString(),
            url: clientUrl,
        });
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

    io.to('vue-clients').emit('log_message', `[${currentTime}] Hora recibida del coordinador: ${coordinatorTime}`);
});


function calculateTimeDifference() {
    if (coordinatorTimeReceived instanceof Date && !isNaN(coordinatorTimeReceived)) {
        if (coordinatorTimeReceived.getHours() < 12) {
            coordinatorTimeReceived.setHours(coordinatorTimeReceived.getHours() + 12);
        }
        if (simulatedClientTime instanceof Date && !isNaN(simulatedClientTime)) {
            const timeDifference = simulatedClientTime - coordinatorTimeReceived;
            const timeDifferenceInSeconds = timeDifference / 1000;
            console.log(`[${currentTime}] Diferencia de tiempo con el coordinador: ${timeDifferenceInSeconds} segundos`);
            socket.emit('time_difference', { differenceInSeconds: timeDifferenceInSeconds, nodeUrl: clientUrl });
            io.to('vue-clients').emit('log_message', `[${currentTime}]Diferencia de tiempo con el coordinador: ${timeDifferenceInSeconds} segundos`);
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
    io.to('vue-clients').emit('log_message', `[${currentTime}] Diferencia recibida del coordinador respecto al promedio : ${difference}`);
    receiveTimeDifference(difference);
});

function receiveTimeDifference(difference) {
    if (simulatedClientTime instanceof Date && !isNaN(simulatedClientTime)) {
        const differenceMilliseconds = difference * 1000;
        simulatedClientTime.setTime(simulatedClientTime.getTime() + differenceMilliseconds);
        console.log(`[${currentTime}] Hora simulada actualizada : ${simulatedClientTime.toLocaleTimeString()}`);
        io.to('vue-clients').emit('log_message', `[${currentTime}] Hora simulada actualizada : ${simulatedClientTime.toLocaleTimeString()}`);
        io.to('vue-clients').emit('update_simulated_time', simulatedClientTime.toLocaleTimeString());
    } else {
        console.log(`[${currentTime}] La hora simulada del cliente no es válida.`);
    }
}

const PORT = process.env.NODE_SERVICE_PORT;
server.listen(PORT, () => {
    console.log(`Servidor de WebSocket escuchando en el puerto ${PORT}`);
});