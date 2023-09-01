const mongoose = require('mongoose');

const conexion = async() => {
    try {
        await mongoose.connect(process.env.bd,
        {
            useNewUrlParser : true,
            useUnifiedTopology : true,
        });
        console.log('Base de datos\n');

        await mongoose.connection.db.collection('usuarios').createIndex(
            { Numero_Confirmacion: 1 },
            { expireAfterSeconds: 300 }
        );
        
    } catch (error) {
        console.log(error);
        throw new Error ('No se ha establecido conexion con mongodb');
    }
}

module.exports = {conexion};