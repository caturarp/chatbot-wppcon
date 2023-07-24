const wppconnect = require('@wppconnect-team/wppconnect');
const http = require('http');
const bodyParser = require("body-parser");
const express = require('express');
const app = express();
const server = http.createServer(app);
const { body, validationResult } = require("express-validator");
const { messageSender, messagesFinder, messageFinder, messageFetcher } = require('./core/core.js');

const port = 3000;

const logger = require('./util/logger.js');

let activeSessions = {}; // Menyimpan informasi sesi aktif


const initApp = async (clientId)  => {
    try {
        // rewrite the start function to async/await
        const client =  await wppconnect.create({
            session: clientId,
            catchQR: (asciiQR) => {
                console.log('asciiQR:', asciiQR);
            },
            statusFind: (statusSession, session) => {
                logger.info(`Session ${session} status : ${statusSession}`);
            },
            deviceName: 'Looyal'
        });
        activeSessions[clientId] = client;
        start(client);
    } catch (err) {
        logger.error(err);
    }
}

const start = (client) => {
    client.onMessage(async (message) => {
        const { from, type, body, to } = message;
        if (body.toLowerCase() === 'hai') {
            try {
                const result = await client.sendText(from, 'Welcome to Looyal!');
                console.log('Result: ', result); //return object success
            } catch (err) {
                logger.error(`Error when sending: ${err}`);
            }
        }
    })
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", (req, res) => {
    res.sendFile(__dirname + "/core/home.html");
  });


app.get("/scan/:id", async (req, res) => {
    const clientId = req.params.id;
    try {
      initApp(clientId);
      // res.send(currentQR).Status(200)
    //   res.sendFile(__dirname + "/core//index.html");
    } catch (error) {
      if (error instanceof AuthenticationError) {
        logger.info(`client ${clientId} authentication failure: ${error.message}`);
        res.sendStatus(401); // Send 401 Unauthorized status code
      } else {
        // Handle other errors
        res.sendStatus(500); // Send 500 Internal Server Error status code or handle it differently
      }
    }
  });

app.post("/send", 
    [ 
        body("from").notEmpty(), //change from "number" to "from" matching to wwebjs property
        body("message"),
        body("to").notEmpty(),
        body("type").notEmpty(),
        body("urlni"),
        body("filename")
    ], async (req, res) => {
        const errors = validationResult(req).formatWith(({ message }) => {
            return message;
        });
        if (!errors.isEmpty()) {
            return res.status(422).json({
                status: false,
                message: errors.mapped(),
            });
        } else {
            let messageDetails = req.body;
            console.log(messageDetails)
            try {
                const client = activeSessions[messageDetails.from];
                if (!client) {
                    return res.status(404).json({ error: 'Client not found' });
                }
                logger.info('Client found, proceed to send message with messageSender')
    
                const sentMessageDetails = await messageSender(client, messageDetails)
                
                console.log(sentMessageDetails)
                
                logger.info('Message sent successfully')
                
                res.writeHead(200, {
                    "Content-Type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        status: true,
                        message: "success",
                    })
                );
            } catch (error) {
                res.writeHead(401, {
                    "Content-Type": "application/json",
                });
                res.end(
                    JSON.stringify({
                        message: "An error occurred",
                        error: error.message,
                    })
                );
            }
        }
    }
);  

app.get("/unsend", async (req, res) => {
    let device = req.query.device
    let number = req.query.number
    let chatId = req.query.chatId
    let messageId = req.query.messageId

    const client = activeSessions[device];

    if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
    if (!device) return res.send('Input Parameter Device');
    if (!number) return res.send('Input Parameter Number Parameter');
    if (!/^\d+$/.test(number)) return res.send('Invalid Number');
    if (!chatId) return res.send('Input Parameter chatId Parameter');
    if (!messageId) return res.send('Input Parameter messageId Parameter');

    try {
        if (Array.isArray(messageId)) {
            const messages = await messagesFinder(client, chatId, messageId);
            if (messages.length === 0) return res.send('Messages not found');
        
            await client.deleteMessage(chatId, messages);
        } else {
            const message = await messageFinder(client, chatId, messageId);
            if (!message) return res.send('Message not found');
        
            await client.deleteMessage(chatId, message);
        }
    
        return res.send('Message(s) deleted');
    } catch (error) {
        logger.error(error)
    }
})

// start the express server
server.listen(port, () => {
    console.log(`App running on : ${port}`)
  });