const express = require('express');
const post_modelo = require('../../models/post/modelo_post');
const usuario_modelo = require('../../models/usuario/modelo_usuario');
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

//Crear un post
app.post('/questionatec/api/v2/nuevo-post/', async (req, res) => {
    let body = req.body;

    const { fecha, hora } = await obtenerFechaHora();

    let post = new post_modelo ({
        Autor : body.Autor,
        Categoria : body.Categoria,
        Titulo : body.Titulo,
        Contenido: body.Contenido,
        Fecha : fecha,
        Hora : hora,
        Numero_Respuestas : 0,
        Respuestas : [],
        Numero_Reportes : 0,
    });

    post.save()
    .then((publicacion) => {
        return res.status(200).json({
            ok : true,
            message : 'Post creado.',
            data : post
        });
    })
    .catch((error) => {
        return res.status(500).json({
            ok : false,
            message : 'Error al publicar el post.',
        });
    });
});
//Agregar respuesta
app.post('/questionatec/api/v2/agregar-respuesta/:id', async(req, res) => {
  const id = req.params.id;
  const body = req.body;
  const {hora, fecha} = await obtenerFechaHora();

  post_modelo.findByIdAndUpdate(id,
    {
      $push : {
        Respuestas : {
          Autor_Respuesta : body.Autor_Respuesta,
          Contenido_Respuesta : body.Contenido_Respuesta,
          Fecha_Respuesta : fecha,
          Hora_Respuesta : hora,
          Likes : {
            Usuarios : [],
            Conteo : 0
          }
        }
      },
      $inc : {Numero_Respuestas : 1}
    },
    {new : true}  
  ).then((postUpdate) => {
    return res.status(200).json({
      ok : true,
      message : 'Respuesta agregada.'
    });
  })
  .catch((error) => {
    return res.status(200).json({
      ok : false,
      message : 'Ha ocurrido un error',
      error : error
    });
  });
});
//Like
app.post('/questionatec/api/v2/like/:id', async (req, res) => {
  const id = req.params.id; // Id de la publicación
  const respuestaId = req.body.Respuesta; // Id de la respuesta
  const usuarioId = req.body.Usuario; // Id del usuario que dio like
  const autor = req.body.Autor; //Id del usuario autor de la respuesta para +1 like.

  try {
    const updatedPost = await post_modelo.findByIdAndUpdate(
      id,
      {
        $push: {
          'Respuestas.$[respuesta].Likes.Usuarios': usuarioId
        },
        $inc: {
          'Respuestas.$[respuesta].Likes.Conteo': 1
        }
      },
      {
        arrayFilters: [
          { 'respuesta._id': respuestaId }
        ],
        new: true // Esto te devuelve el documento actualizado
      }
    );

    const addLike = await usuario_modelo.findOneAndUpdate({_id : autor}, 
      {
        $inc : {Likes : 1}
      }, 
      {new : true}
    );

    res.status(200).json({
      ok: true,
      message: 'Like agregado correctamente',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error al agregar el like',
      error: error.message
    });
  }
});
//Quitar like
app.post('/questionatec/api/v2/dislike/:id', async (req, res) => {
  const id = req.params.id; // Id de la publicación
  const respuestaId = req.body.Respuesta; // Id de la respuesta
  const usuarioId = req.body.Usuario; // Id del usuario que dio like
  const autor = req.body.Autor; //Id del usuario autor de la respuesta para +1 like.

  try {
    const updatedPost = await post_modelo.findByIdAndUpdate(
      id,
      {
        $pull: {
          'Respuestas.$[respuesta].Likes.Usuarios': usuarioId
        },
        $inc: {
          'Respuestas.$[respuesta].Likes.Conteo': -1
        }
      },
      {
        arrayFilters: [
          { 'respuesta._id': respuestaId }
        ],
        new: true // Esto te devuelve el documento actualizado
      }
    );

    const addLike = await usuario_modelo.findOneAndUpdate({_id : autor}, 
      {
        $inc : {Likes : -1}
      }, 
      {new : true}
    );

    res.status(200).json({
      ok: true,
      message: 'Dislike',
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: 'Error',
      error: error.message
    });
  }
});





//Ver todas las discusiones para el feed
app.get('/questionatec/api/v2/posts/', async (req, res) => {
    const posts = await post_modelo.find();

    res.status(200).json({
        ok : true,
        posts
    });
});

//Informacion sobre publicaciones
app.get('/questionatec/api/v2/publicaciones/', async (req, res) => {
    try {
      const publicaciones = await post_modelo.countDocuments();
  
      const categorias = await post_modelo.aggregate([
        {
          $group: {
            _id: "$Categoria",
            count: { $sum: 1 }
          }
        }
      ]);
  
      const filteredCategorias = categorias.filter(categoria => {
        const palabra = categoria._id.toLowerCase();
        const palabrasSeparadas = palabra.split(" ");
        return palabrasSeparadas.every(palabra => palabra.length > 1) || categoria.count > 1;
      });
  
      const categoriaCount = filteredCategorias.length;
  
      res.status(200).json({
        ok: true,
        publicaciones: publicaciones,
        categorias: categoriaCount
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
});

//Discusiones de un usuario en especifico por object id
app.get('/questionatec/api/v2/mis-posts/:Autor', async(req, res) => {
    let AutorTema = req.params.Autor;
    const posts = await post_modelo.find({Autor : AutorTema});

    res.status(200).json({
        ok : true,
        posts
    });
}); 

//Obtener los 5 temas mas populares
app.get('/questionatec/api/v2/categorias-populares/', async(req, res) => {
    const temas = await post_modelo.aggregate([
        { $group: { _id: '$Categoria', count: { $sum: 1 }, ids: { $push: '$_id' } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
   
    res.status(200).json({ 
        ok : true,
        temas
    }); 
});

//Filtrar discusiones por tema
app.get('/questionatec/api/v2/feed-buscar/:palabra', async (req, res) => {
    let palabra = req.params.palabra;
  
    try {
      const posts = await post_modelo.find({
        $or: [
          { Categoria: { $regex: palabra, $options: 'i' } },
          { Titulo: { $regex: palabra, $options: 'i' } },
        ],
      });
  
      if (posts.length === 0) {
        // Enviar respuesta cuando no se encuentren coincidencias
        return res.status(200).json({
          ok: false,
          message: 'No se han encontrado coincidencias.',
        });
      }
  
      // Enviar respuesta con los posts encontrados
      res.status(200).json({
        ok: true,
        posts,
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        mensaje: 'Error en el servidor',
      });
    }
});

//Eliminar post
app.delete('/questionatec/api/v2/eliminar-post/:id', async(req, res) => {
    let id = req.params.id;
    const respuesta = await post_modelo.findByIdAndDelete(id);

    res.status(200).json({
        ok : true,
        message : 'Discusion eliminada correctamente.',
    });
});

module.exports = app;