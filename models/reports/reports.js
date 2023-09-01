const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let reporteSchema = new Schema ({
    //Usuario que hace el reporte
    Autor : {type : mongoose.Schema.Types.ObjectId, ref : 'usuarios'},
    //Id del usuario reportado
    Usuario : {type : mongoose.Schema.Types.ObjectId, ref : 'usuarios'},
    //Id de la publicacion
    Publicacion : {type : mongoose.Schema.Types.ObjectId, ref : 'publicaciones'},
    Fecha : {type : String},
    Hora : {type: String},
    //Motivos del reporte
    Motivos : [String],
    //Vereficto dictado por el administrador
    Revision : [{
        Admin : {type : mongoose.Schema.Types.ObjectId, ref : 'usuarios'},
        Fecha : {type : String},
        Hora : {type: String},
        Comentarios : {type : String},
        Suspencion : {type : Boolean},
        Baneo : {type : Boolean}
    }],
    Estatus: {type : String}
});

module.exports = mongoose.model('reportes', reporteSchema);