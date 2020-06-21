const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const interface = require('onoff').Gpio;
const pumpAdresses =  [new interface(23, 'out'), new interface(24, 'out'), new interface(25, 'out'),]

pumpAdresses.forEach( pump => pump.writeSync(1))


const port = process.env.PORT || 4001;
const index = require("./routes/index");

const app = express();
const server = http.createServer(app);
const socket = socketIo(server);

let pumpCollection = [
	{
		'id' : 0,
		'name' : 'Large Pots',
		'pinStatus' : pumpAdresses[0].readSync(),
		'running': pumpAdresses[2].readSync() === 0 ? 'Running' : 'Not Running', //TODO : get GPIO Pin status
		'runtime' : 60000
	},
	{
		'id' : 1,
		'name' : 'Medium Pots',
		'pinStatus' : pumpAdresses[1].readSync(),
		'running': pumpAdresses[2].readSync() === 0 ? 'Running' : 'Not Running',
		'runtime' : 6000
	},
		{
		'id' : 2,
		'name' : 'Small Pots',
		'pinStatus' : pumpAdresses[2].readSync(),
		'running': pumpAdresses[2].readSync() === 0 ? 'Running' : 'Not Running',
		'runtime' : 6000
	}
]
let pinStatus;
let safety;

socket.on('connection', (client) => {
	console.log('client connected');
	client.on('getPumps', () => sendPumps());
	client.on('managePump', (pumpNumber, runtime) => changePumpStatus(Number(pumpNumber), Number(runtime)));
	client.on('disconnect', () => console.log('disconnected'));
});

const sendPumps = () => {
	console.log('Client requested pumps')
	const response = pumpCollection;
	socket.emit('getPumps', response);
}

const changePumpStatus = (pumpId, runtime) => {
	swapStatus(pumpId, runtime);
	currentStatus = pumpCollection[pumpId];
	pumpCollection[pumpId] = 	{ 	...currentStatus, 
									'pinStatus' : pumpAdresses[pumpId].readSync(),
									'running' : pumpAdresses[pumpId].readSync() === 0 ? 'Running' : 'Not Running',
									'runtime' : runtime
								}
	console.log(`Selected pump : ${pumpId} /n New status : ${pumpCollection[pumpId].running }`);
	const response = pumpCollection;
	
	socket.emit('managePump', response)
};

const swapStatus = (pumpId, runtime) => {	
	if (pumpAdresses[pumpId].readSync() === 1){
		safety = setTimeout(function(){
			console.log('safety triggered')
			changePumpStatus(pumpId, runtime);
		}, runtime, pumpId)
	}
	
	pumpAdresses[pumpId].readSync() === 0 ? pumpAdresses[pumpId].writeSync(1) : pumpAdresses[pumpId].writeSync(0);
}

server.listen(port, () => console.log(`Listening on port ${port}`));
