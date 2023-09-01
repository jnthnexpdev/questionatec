const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
//Modelos
const usuario_modelo = require('../../models/usuario/modelo_usuario');
const post_modelo = require('../../models/post/modelo_post');
const baneados_modelo = require('../../models/baneados/modelo_baneado');

const app = express();

const apiUrl = 'http://worldtimeapi.org/api/timezone/America/Mexico_City';

async function obtenerFechaHora() {
  try {
    const response = await axios.get(apiUrl);
    if (response.status === 200) {
      const data = response.data;
      const dateTimeString = data.datetime;
      const dateTime = new Date(dateTimeString);
      const year = dateTime.getFullYear();
      const month = dateTime.getMonth() + 1;
      const day = dateTime.getDate();
      const hours = dateTime.getHours() > 12 ? dateTime.getHours() - 12 : dateTime.getHours();
      const minutes = dateTime.getMinutes() < 10 ? '0' + dateTime.getMinutes() : dateTime.getMinutes();
      const ampm = dateTime.getHours() >= 12 ? 'pm' : 'am';

      const fecha = `${day}/${month}/${year}`;
      const hora = `${hours}:${minutes} ${ampm}`;

      return { fecha, hora };
    } else {
      throw new Error('No se pudo obtener la fecha y hora.');
    }
  } catch (error) {
    console.error('Error al obtener la fecha y hora:', error.message);
    throw error;
  }
}

//Envio de correos electronicos
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'questionatec@gmail.com',
      pass: 'fohhkazexokwmpdy'
    }
});

function generateRandomNumber() {
    const randomBytes = crypto.randomBytes(3);
    // Convierte los 3 bytes aleatorios en un número de 6 dígitos
    const randomNumber = parseInt(randomBytes.toString('hex'), 16) % 1000000;
    // Rellena con ceros a la izquierda para obtener siempre 6 dígitos
    return randomNumber.toString().padStart(6, '0');
}

// P E T I C I O N E S         P O S T

//Registrar nuevo usuario
app.post('/questionatec/api/v2/registrar-usuario/', async(req, res) => {
    const {
        Nombre, 
        Correo,
    } = req.body;

    try {
      //Buscamos si existe un usuario con ese nombre o correo
      const usuario = await usuario_modelo.findOne({$or : [{Correo},{Nombre}]});
      const usuario_baneado = await baneados_modelo.findOne({Correo});
  
      if(usuario_baneado){
      return res.status(500).json({
        message : `El correo pertenece a un usuario que ha sido baneado el ${usuario_baneado.Fecha_Baneo}`
      });
      }

      //Si existe se envia un mensaje de error
      if(usuario){
          const field = usuario.Correo === Correo ? 'Correo electronico' : 'Nombre de usuario';
          return res.status(400).json({
              ok : false,
              message : 'Este correo y/o usuario ya esta registrado.'
          });
      }
      //Se obtiene hora y fecha
      const { fecha, hora } = await obtenerFechaHora();
      //Se genera el numero de confirmacion
      const randomNumber = generateRandomNumber();
      //Si es un correo/usuario disponible se guarda la informacion
      const usuario_nuevo = new usuario_modelo({
          Nombre, 
          Correo,
          Numero_Confirmacion : {
            Fecha: fecha,
            Hora: hora,
            Codigo : randomNumber,
            Validez : true
          },
      });
      // Configura el correo
        const mailOptions = {
            from: 'questionatec@gmail.com',
            to: Correo,
            subject: 'Questionatec | Numero de confirmacion',
            html: `
              <html>
                <head>
                  <style>
                    /* Estilos para el cuerpo del correo */
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #ffffff;
                      padding: 20px;
                    }
                    .questionatec {
                        color: white;
                        border-radius: 10px;
                        padding : 10px;
                        background-color: #090c9b;
                        font-size: 26px;
                        font-weight: bold;
                        text-align: center;
                    }
                    /* Estilos para el contenido del correo */
                    .content {
                      background-color: #ffffff;
                      color: black;
                      padding: 30px;
                      font-size: 26px;
                      border-radius: 5px;
                      text-align: center;
                    }
                    /* Estilos para el número de confirmación */
                    .confirmation-number {
                      font-size: 24px;
                      font-weight: bold;
                      color: #090c9b;
                    }
                  </style>
                </head>
                <body>
                  <div class="content">
                    <p class="questionatec">Bienvenido a Questionatec</p>
                    <p>¡Gracias por registrarte en nuestro foro!</p>
                    <p>Este es tu número de confirmación: </p>
                    <span class="confirmation-number">${randomNumber}</span>
                  </div>
                </body>
              </html>
            `,
        };

      //Envia el correo
      transporter.sendMail(mailOptions, function (error, info) {
      });
      await usuario_nuevo.save();
      return res.status(200).json({
        message : 'Correo de confirmacion enviado.'
      });

    }catch (error) {
        return res.status(500).json({
            message : 'Error interno del servidor'
        });
    }
});

//Terminar registro de usuario despues de validar su numero de confirmacion
app.post('/questionatec/api/v2/confirmar-correo/', async(req, res) => {
  const { 
    Correo,
    Numero_Confirmacion,
  } = req.body;

  console.log("Numero: ", Numero_Confirmacion);

  if(Numero_Confirmacion === ''){
    const eliminar_usuario = await usuario_modelo.findOneAndDelete({Correo : Correo});

    return res.status(400).json({
        ok: false,
        message: 'Número de confirmación inválido. Verifica que hayas ingresado el número correcto.'
    });
  }

  const { fecha, hora } = await obtenerFechaHora();

  const usuario_validar = await usuario_modelo.findOne({Correo : Correo});

  if(Numero_Confirmacion === usuario_validar.Numero_Confirmacion.Codigo)
  {
    const nuevosValores = {
      Foto: req.body.Foto,
      Password: await bcrypt.hash(req.body.Password, 10),
      Fecha_Registro: fecha,
      Likes: 0,
      Carrera : '',
      Educacion : '',
      Numero_Publicaciones: 0,
      Estado_Cuenta : {
        Tipo : 'Activa',
        Fecha_Suspencion : null,
        Numero_Suspensiones : 0
      },
      Administrador: false,
      Numero_Reportes: 0,
    };

    const actualizarUsuario = await usuario_modelo.findOneAndUpdate(
      { Correo: Correo },
      nuevosValores,
      { new: true }
    );

    await usuario_modelo.findOneAndUpdate({ Correo: Correo},{ 'Numero_Confirmacion.Validez': false }, { new: true });

    return res.status(200).json({
      ok : true,
      message : 'Usuario registrado',
      actualizarUsuario
    });

  }else{

    const eliminar_usuario = await usuario_modelo.findOneAndDelete({Correo : Correo});

    return res.status(400).json({
        ok: false,
        message: 'Número de confirmación inválido. Verifica que hayas ingresado el número correcto.'
    });
  }
});

//Inicio de sesion
app.post('/questionatec/api/v2/iniciar-sesion/', async (req, res) => {
  const {Correo , Password} = req.body;

  try{
    const usuario = await usuario_modelo.findOne({Correo});
    const usuario_baneado = await baneados_modelo.findOne({Correo});

    if(usuario_baneado){
      return res.status(500).json({
        message : `El correo pertenece a un usuario que ha sido baneado el ${usuario_baneado.Fecha_Baneo}`
      });
    }
    if(!usuario){
        return res.status(401).json({message : 'Este usuario no existe.'});
    }
    if(usuario.Estado_Cuenta.Tipo === 'Suspendida'){
      return res.status(401).json({message : 'Esta cuenta esta suspendida.'});
    }
    //Comprueba la password que envia angular con la password ya guardada en mongo
    const ComprobarPassword = await bcrypt.compare(Password, usuario.Password);
    //Si la password es incorrecta
    if(!ComprobarPassword){
      return res.status(401).json({
        ok : false, 
        message : 'Verifica tu correo y/o contraseña.'
      });
    }
    //Se genera un token
    const token = jwt.sign({usuario_id : usuario._id}, 'secreto', {expiresIn : '24h'});
    //Se envia el token y la informacion del usuario
    res.status(200).json({ok : true, token, usuario});

  } catch (err) {
      console.log(err);
      res.status(500).json({message : 'Error del servidor'});
  }
});

//Iniciar sesion con codigo
app.post('/questionatec/api/v2/iniciar-sesion/codigo/', async (req, res) => {
  const {Correo, Codigo} = req.body;

  try{
    const usuario = await usuario_modelo.findOne({Correo});

    if(!usuario){
      return res.status(401).json({message : 'Este usuario no existe.'});
    }

    if(Codigo == usuario.Numero_Confirmacion.Codigo && usuario.Numero_Confirmacion.Validez == true){
      //Se genera un token
      const token = jwt.sign({usuario_id : usuario._id}, 'secreto', {expiresIn : '24h'});

      await usuario_modelo.findOneAndUpdate({ Correo: Correo, 'Numero_Confirmacion.Codigo': Codigo }, { 'Numero_Confirmacion.Validez': false }, { new: true });

      //Se envia el token y la informacion del usuario
      res.status(200).json({ok : true, token, usuario});
    }else{
      res.status(401).json({
        ok : false,
        message : 'El codigo no es correcto.'
      });
    }
  }catch(err){
    res.status(500).json({
      message : 'Error del servidor',
      error : Error
    });
  }
});

//Generar codigo de acceso (Login)
app.post('/questionatec/api/v2/generar-codigo/', async(req, res) => {
  const Correo = req.body.Correo;
  const { fecha, hora } = await obtenerFechaHora();
  const randomNumber = generateRandomNumber(); //Se genera un nuevo numero de confirmacion

  try{
    const usuario = await usuario_modelo.findOne({Correo : Correo});

    if(!usuario){
      return res.status(200).json({
        ok : false,
        message : 'Este correo no pertenece a una cuenta registrada.'
      });
    }
    else if(usuario.Estado_Cuenta.Tipo === "Suspendida"){
      return res.status(200).json({
        ok : false,
        message : 'Esta cuenta esta suspendida'
      });
    }else{
      const codigo = await usuario_modelo.findOneAndUpdate({Correo : Correo}, 
        {Numero_Confirmacion : {Fecha: fecha, Hora : hora, Codigo : randomNumber, Validez : true}}, 
        {new : true}
      );
  
      const mailOptions = {
        from: 'questionatec@gmail.com',
        to: Correo,
        subject: 'Questionatec | Numero de confirmacion',
        html: `
          <html>
            <head>
              <style>
                /* Estilos para el cuerpo del correo */
                body {
                  font-family: Arial, sans-serif;
                  background-color: #ffffff;
                  padding: 20px;
                }
                .questionatec {
                    color: white;
                    border-radius: 10px;
                    padding : 10px;
                    background-color: #090c9b;
                    font-size: 26px;
                    font-weight: bold;
                    text-align: center;
                }
                /* Estilos para el contenido del correo */
                .content {
                  background-color: #ffffff;
                  color: 090c9b;
                  padding: 30px;
                  font-size: 26px;
                  border-radius: 5px;
                  text-align: center;
                }
                /* Estilos para el número de confirmación */
                .confirmation-number {
                  font-size: 24px;
                  font-weight: bold;
                  color: #090c9b;
                }
              </style>
            </head>
            <body>
              <div class="content">
                <p class="questionatec">Bienvenido a Questionatec</p>
                <p>Ingresa este numero en el campo de contraseña para iniciar sesion temporalmente.</p>
                <p>Tu código de acceso es: </p>
                <span class="confirmation-number">${randomNumber}</span>
              </div>
            </body>
          </html>
        `,
      };
      //Envia el correo
      transporter.sendMail(mailOptions, function (error, info) {
      });
  
      return res.status(200).json({
        ok : true,
        message : 'Correo enviado'
      });
    }
  }catch(error){
    return res.status(500).json({
      ok : false,
      message : 'Error del servidor.',
      error : error
    });
  }



});

//Verificar si el nombre de usuario ya existe o esta en uso
app.post('/questionatec/api/v2/verificar-nombre/', async (req, res) => {
  const Nombre = req.body.Nombre;

  try{
      //Busca si hay un usuario con ese nombre
      const usuario = await usuario_modelo.findOne({Nombre : Nombre});

      if(usuario){
          //Si existe
          res.json({message : true});
      }
      else{
          //Si no existe
          res.json({message : false})
      }

  }catch(err){
      res.status(500).json({message : 'Error del servidor.'});
  }
});
//Comparar password de un usuario
app.post('/questionatec/api/v2/verificar-password/:id', async (req, res) => {
  const Password = req.body.Password;
  const id = req.params.id;

  try{
      const usuario = await usuario_modelo.findById(id);
      const comprobacion = await bcrypt.compare(Password, usuario.Password);

      //Si coinciden
      if(comprobacion){
          res.status(200).json({message : true});
      }
      else{
          res.json({message : false});
      }
  
  }catch(err){
      res.status(500).json({message : 'Error del servidor.'});
  }
});

// P E T I C I O N E S         G E T

//Buscar usuario por id
app.get('/questionatec/api/v2/usuario/:id', async (req, res) => {
  let id = req.params.id;
  const informacion = await usuario_modelo.findById(id);

  res.status(200).json({
      ok : true,
      informacion
  })
});

//Conteo de usuarios
app.get('/questionatec/api/v2/usuarios/', async(req, res) => {
  const condicion_suspendidos = {Estado_Cuenta : "Suspendida"};
  const condicion_activos = {Estado_Cuenta : "Activa"};

  const usuarios = await usuario_modelo.countDocuments();
  const activos = await usuario_modelo.countDocuments(condicion_activos);
  const suspendidos = await usuario_modelo.countDocuments(condicion_suspendidos);
  const baneados = await baneados_modelo.countDocuments();

  res.status(200).json({
    ok : true,
    usuarios : usuarios,
    activos : activos,
    suspendidos : suspendidos,
    baneados : baneados
  });

});

app.get('/questionatec/api/v2/informacion-usuarios/', async(req, res) => {
  const informacion = await usuario_modelo.find().select('Foto Nombre Fecha_Registro Estado_Cuenta.Numero_Suspensiones Numero_Reportes');

  return res.status(200).json({
    ok : true,
    informacion : informacion
  });
});


// P E T I C I O N E S         U P D A T E

//Editar el nombre de usuario con id
app.put('/questionatec/api/v2/actualizar-nombre-usuario/:id', async (req, res) =>{
  let id = req.params.id;
  const nombre = req.body.Nombre;
  
  const actualizar = await usuario_modelo.findByIdAndUpdate(id, {Nombre : nombre}, {new : true});

  res.status(200).json({
      ok : true,
      message : "Nombre de usuario actualizado.",
  });
});
//Cambiar el password del usuario
app.put('/questionatec/api/v2/actualizar-password/:id', async (req, res) => {
  let id = req.params.id;
  const password  = req.body.Password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const cambiar_password = await usuario_modelo.findByIdAndUpdate(id, {Password : hashedPassword}, {new : true});

  res.status(200).json({
      ok : true,
      message : "Contraseña actualizada",
  });
});

app.put('/questionatec/api/v2/actualizar-educacion/:id', async(req, res) => {
  const id = req.params.id;
  const educacion = req.body.Educacion;

  const actualizar = await usuario_modelo.findByIdAndUpdate(id , {Educacion : educacion}, {new : true});

  return res.status(200).json({
    ok : true,
    message : 'Educacion actualizada.'
  });

});

app.put('/questionatec/api/v2/actualizar-carrera/:id', async(req, res) => {
  const id = req.params.id;
  const carrera = req.body.Carrera;

  const actualizar = await usuario_modelo.findByIdAndUpdate(id , {Carrera : carrera}, {new : true});

  return res.status(200).json({
    ok : true,
    message : 'Carrera actualizada.'
  });

});

//Contar numero de publicaciones
app.put('/questionatec/api/v2/obtener-numero-posts/:id', async (req, res) => {
  let id = req.params.id;

  const posts = await post_modelo.countDocuments({Autor : id});

  const actualizar_usuario = await usuario_modelo.findByIdAndUpdate(id, { Numero_Publicaciones: posts }, { new: true });

  return res.status(200).json({
    ok : true,
  });

});

// P E T I C I O N E S         D E L E T E

//Eliminar la cuenta de un usario con el object id
app.delete('/questionatec/api/v2/eliminar-cuenta/:id', async (req, res) => {
  const id = req.params.id;

  try {

    const respuesta = await usuario_modelo.findByIdAndDelete(id);

    res.status(200).json({
      ok: true,
      message: 'Cuenta eliminada.'
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al eliminar la cuenta.'
    });
  }
});
//Eliminar el usuario por correo.
app.delete('/questionatec/api/v2/eliminar-correo/:Correo', async(req, res) => {

  const correo = req.params.Correo;

  const eliminar = await usuario_modelo.findOneAndDelete({Correo : correo});

  if(eliminar){
    return res.status(200).json({
      ok : true,
      message : 'Usuario eliminado'
    });
  }
  else{
    return res.status(400).json({
      ok : false,
      message : 'No existe este usuario.'
    });
  }

});
//Export del usuario
module.exports = app;