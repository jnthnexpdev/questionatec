const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let publicacionSchema = new Schema ({
    Autor : {type : mongoose.Schema.Types.ObjectId, ref : 'usuarios'},
    Categoria : {type : String},
    Titulo : {type : String},
    Contenido: {type : String},
    Fecha : {type : String},
    Hora : {type : String},
    Numero_Respuestas : {type : Number},
    Respuestas : [{
        Autor_Respuesta : {type : mongoose.Schema.Types.ObjectId, ref: 'usuarios'},
        Contenido_Respuesta : {type : String},
        Fecha_Respuesta : {type : String},
        Hora_Respuesta : {type : String},
        Likes:{ 
            Usuarios : [{type: mongoose.Schema.Types.ObjectId, ref: 'usuarios'}],
            Conteo : {Type : Number} 
        }
    }],
    Numero_Reportes : {type : Number}     
});

module.exports = mongoose.model('publicaciones', publicacionSchema);