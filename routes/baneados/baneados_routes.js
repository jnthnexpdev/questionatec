const express = require('express');
const usuario_modelo = require('../../models/usuario/modelo_usuario');
const baneado_modelo = require('../../models/baneados/modelo_baneado');
const axios = require('axios');

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

app.post('/questionatec/api/v2/banear-usuario/:id', async(req,res) => {
    const id = req.params.id;
    let body = req.body;
    const {fecha, hora} = await obtenerFechaHora();

    try{
        const usuario = await usuario_modelo.findById(id);

        if(!usuario){
            return res.status(404).json({
                ok : false,
                message : 'Usuario no encontrado.'
            });
        }

        let usuario_baneado = new baneado_modelo ({
            Correo : usuario.Correo,
            Fecha_Baneo : fecha,
            Motivos : body.Motivos
        });
        //Se mueve la informacion a la coleccion de baneados
        await usuario_baneado.save();
        //Se elimina al usuario para que no pueda seguir usando su cuenta.
        await usuario_modelo.findByIdAndDelete(id);

        return res.status(200).json({
            ok : true,
            message : 'Usuario baneado',
            Informacion : usuario_baneado
        });
    }catch(error){
        return res.status(500).json({
            ok : false,
            message : 'Error, no se ha baneado al usuario.'
        });
    }
});

app.get('/questionatec/api/v2/lista-baneados/', async(req, res) => {
    const lista = await baneado_modelo.find();

    return res.status(200).json({
        Usuarios_Baneados : lista
    });
});

app.get('/questionatec/api/v2/buscar-correo-baneado/:Correo', async(req, res) => {
    const Correo = req.params.Correo;

    try{
        const usuario_baneado = await baneado_modelo.findOne({Correo});

        if(!usuario_baneado){
            return res.status(200).json({
                ban : false,
                message : 'Este correo no esta relacionado con ninguna cuenta baneada.'
            });
        }

        return res.status(200).json({
            ban : true,
            message : `El correo pertenece a una cuenta baneada el ${usuario_baneado.Fecha_Baneo}`,
            detalles : usuario_baneado
        });
    }catch (error){
        return res.status(500).json({
            ok : false,
            message : 'Ha ocurrido un problema.'
        });
    }

});

module.exports = app;