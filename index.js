const express = require('express');
const cors = require('cors');
const {conexion} = require('./bd/config');
const bodyparser = require('body-parser');

require('dotenv').config();

const app = express();

app.use(cors());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:4200", "https://questionatec.vercel.app/");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    next();
  });

app.use(bodyparser.json({limit : '50mb'}));
app.use(bodyparser.urlencoded({ limit : '50mb', extended : true}));
app.use(express.json());
  
conexion();

app.use(require('./routes/index_routes'));

app.listen(process.env.port, () => {
    console.log('\nPuerto :',process.env.port);
}); 