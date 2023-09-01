const express = require('express');
const post_modelo = require('../../models/post/modelo_post');
const usuario_modelo = require('../../models/usuario/modelo_usuario');
const reporte_modelo = require('../../models/reports/reports');
const schedule = require('node-schedule');
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

async function obtenerFecha() {
    try {
        const response = await axios.get(apiUrl);
        if (response.status === 200) {
            const data = response.data;
            const dateTimeString = data.datetime;
            const dateTime = new Date(dateTimeString);

            return dateTime; // Devuelve el objeto Date directamente
        } else {
            throw new Error('No se pudo obtener la fecha y hora.');
        }
    } catch (error) {
        console.error('Error al obtener la fecha y hora:', error.message);
        throw error;
    }
}

//Generar reporte
app.post('/questionatec/api/v2/generar-reporte/', async(req, res) => {
    let body = req.body;

    const { fecha, hora } = await obtenerFechaHora();

    let reporte = new reporte_modelo({
        Autor : body.Autor,
        Usuario : body.Usuario,
        Publicacion : body.Publicacion,
        Fecha : fecha,
        Hora : hora,
        Motivos : body.Motivos,
        Revision : [],
        Estatus : "Pendiente"
    });

    const usuario = await usuario_modelo.findById(body.Usuario);

    if(usuario){
        await usuario_modelo.findByIdAndUpdate(usuario._id, {
            $inc : {'Numero_Reportes' : 1},
        });
    }else{
        return res.status(404).json({
            ok : false,
            message : 'Usuario reportado no encontrado.'
        });
    }

    reporte.save()
    .then((report) => {
        return res.status(200).json({
            ok : true,
            message : 'Reporte generado.',
            reporte : reporte
        });
    })
    .catch((error) => {
        return res.status(500).json({
            ok : false,
            error : error,
            message : 'Ha ocurrido un problema al generar el reporte.',
        });
    });
});

//Revisar reporte
app.post('/questionatec/api/v2/revisar-reporte/:id', async(req, res) => {
    const id = req.params.id;
    const body = req.body;
    const usuarioId = body.Usuario;
    const fechaSuspension = await obtenerFecha(); // Obtiene la fecha actual de la API
    const duracionSuspensionDias = 1; // 3 días de suspensión

    reporte_modelo.findByIdAndUpdate(
        id,
        {
            $push : {
                Revision : {
                    Admin : body.Admin,
                    Fecha : fechaSuspension,
                    Comentarios : body.Comentarios,
                    Suspencion : body.Suspencion,
                    Baneo : body.Baneo
                }
            },
            $set : {
                Estatus : 'Revisado'
            }
        },
        { new : true }
    ).then(async (report) => {
        if(body.Suspencion === true) {
            await usuario_modelo.findByIdAndUpdate(usuarioId, {
                $set: {
                    'Estado_Cuenta.Tipo': 'Suspendida',
                    'Estado_Cuenta.Fecha_Suspension': fechaSuspension,
                },
                $inc: { 'Estado_Cuenta.Numero_Suspensiones': 1 },
            });

            // Programar la reactivación después de 3 días
            const reactivacionFecha = new Date(fechaSuspension);
            reactivacionFecha.setDate(reactivacionFecha.getDate() + duracionSuspensionDias);

            schedule.scheduleJob(reactivacionFecha, async () => {
                await usuario_modelo.findByIdAndUpdate(usuarioId, {
                    $set: {
                        'Estado_Cuenta.Tipo': 'Activa',
                        'Estado_Cuenta.Fecha_Suspension': null,
                    },
                });
            });
        }

        return res.status(200).json({
            ok : true,
            message : 'Reporte revisado.'
        });
    }).catch((error) => {
        return res.status(500).json({
            ok : false,
            message : 'Error al actualizar el reporte.'
        });
    });

});

//Ver los reportes
app.get('/questionatec/api/v2/ver-reportes/', async(req, res) => {
    const reportes = await reporte_modelo.find({Estatus : "Pendiente"});
    const cantidad_reportes = await reporte_modelo.countDocuments();
    const pendientes = await reporte_modelo.countDocuments({Estatus : "Pendiente"});
    const revisados = await reporte_modelo.countDocuments({Estatus : "Revisado"});

    if(reportes){
        return res.status(200).json({
            ok : true, 
            Cantidad : cantidad_reportes,
            Revisados : revisados,
            Pendientes : pendientes,
            Reportes : reportes
        });
    }
    else{
        return res.status(400).json({
            ok : false, 
            message : 'Aun no hay reportes.'
        });
    }
});

//Consultar reporte
app.get('/questionatec/api/v2/reporte/:id', async(req, res) => {
    const id = req.params.id;

    const reporte = await reporte_modelo.findById(id);

    if(reporte){
        return res.status(200).json({
            ok : true,
            reporte : reporte
        });
    }else{
        return res.status(400).json({
            ok : false,
            message : 'No se ha encontrado el reporte'
        });
    }

});

module.exports = app;