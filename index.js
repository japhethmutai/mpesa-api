const express = require('express');
const http = require('http');
const axios = require('axios');
const moment = require('moment');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const port = process.env.PORT || 5000;
const hostname = 'localhost';

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware to handle access token
async function getAccessToken() {
    try {
        const consumerKey = "fBa4D6r7TP7YJleGoeIJ6AnNCUDpQBlt"
        const consumerSecret = "GeYN83b51fEiA6Kt"
        // const auth = "Basic " + new  Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");
        const auth = new Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
        
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${auth}` }
        });

        
        return response.data.access_token;
    } catch (error) {
        console.log(error);
        throw new Error("Failed to get access token: " + error.message);
    }
}

// Route to get access token
app.get('/access_token', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        res.json({ accessToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to initiate STK push
app.get('/stkpush', async (req, res) => {
    const passKey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'
    const short_code = 174379
    try {
        const accessToken = await getAccessToken();
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = new Buffer.from(short_code + passKey + timestamp).toString("base64");

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
            BusinessShortCode: 174379,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: 1,
            PartyA: 254708374149,
            PartyB: 174379,
            PhoneNumber: 254708374149,
            CallBackURL: "https://engineeredwellengineeredtolast.com",
            AccountReference: "account",
            TransactionDesc: "test"
        }, {
            headers: { "Authorization": "Bearer " + accessToken }
        });

        res.send("Request sent successfully, complete the transaction on your phone by entering your pin");
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to register URL for C2B
app.get('/register', async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl", {
            ShortCode: 174379,
            ResponseType: "Completed",
            ConfirmationURL: "https://engineeredwellengineeredtolast.com/confirmation", 
            ValidationURL: "https://engineeredwellengineeredtolast.com/validation" 
        }, {
            headers: { "Authorization": "Bearer " + accessToken }
        });

        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to handle C2B confirmation
app.post('/confirmation', (req, res) => {
    console.log("C2B Confirmation Data:", req.body);
    fs.writeFile('confirmation.json', JSON.stringify(req.body), (err) => {
        if (err) {
            console.error(err);
        }
    });
    res.sendStatus(200);
});

// Route for B2C payment request
app.get("/b2curlrequest", async (req, res) => {
    try {
        const accessToken = await getAccessToken();
        const securityCredential = "YOUR_SECURITY_CREDENTIAL";

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest", {
            InitiatorName: "testapi",
            SecurityCredential: securityCredential,
            CommandID: "PromotionPayment",
            Amount: "1",
            PartyA: "600996",
            PartyB: "254768168060",
            Remarks: "Withdrawal",
            QueueTimeOutURL: "https://mydomain.com/b2c/queue",
            ResultURL: "https://mydomain.com/b2c/result",
            Occasion: "Withdrawal",
        }, {
            headers: { "Authorization": "Bearer " + accessToken }
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send(" Request failed");
    }
});

// Start the server
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
