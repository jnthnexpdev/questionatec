const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let baneadoSchema = new Schema ({
    Correo : {type: String},
    Fecha_Baneo : {type : String},
    Motivos : [String]
});

module.exports = mongoose.model('baneados', baneadoSchema);