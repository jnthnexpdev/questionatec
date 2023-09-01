const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const Schema = mongoose.Schema;

const usuarioSchema = new Schema ({
    Nombre : {type : String},
    Foto : {type : String},
    Correo : {type : String},
    Password : {type : String},
    Fecha_Registro : {type : String},
    Likes : {type : Number},
    Educacion : {type : String},
    Carrera : {type : String},
    Numero_Publicaciones : {type : Number},
    Numero_Respuestas : {type : Number},
    Estado_Cuenta: {
      Tipo: { type: String, enum: ['Activa', 'Suspendida', 'Baneada'], default: 'Activa' },
      Fecha_Suspension: {type: Date },
      Numero_Suspensiones: {type: Number},
    },
    Administrador : {type : Boolean},
    Numero_Reportes : {type : Number},
    Numero_Confirmacion : {
      Fecha : {type : String},
      Hora : {type: String},
      Codigo: {type : Number},
      Validez : {type : Boolean}
    }
}); 

usuarioSchema.pre('save', function(next) {
    const usuario = this;
  
    // Si la contraseña no ha sido modificada, sigue adelante
    if (!usuario.isModified('Password')) return next();
  
    // Genera un salt para la encriptación
    bcryptjs.genSalt(10, (err, salt) => {
      if (err) return next(err);
  
      // Genera el hash de la contraseña utilizando el salt
      bcryptjs.hash(usuario.Password, salt, (err, hash) => {
        if (err) return next(err);
  
        // Asigna el hash a la propiedad de la contraseña
        usuario.Password = hash;
        next();
      });
    });
  });
  
  module.exports = mongoose.model('usuarios', usuarioSchema);