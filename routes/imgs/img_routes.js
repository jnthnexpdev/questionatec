const express = require('express');
const path = require('path');
const multer = require('multer');
const usuario_modelo = require('../../models/usuario/modelo_usuario');
const fs = require('fs');

const app = express();

//Configuracion
const storage = multer.diskStorage({
    destination: path.join(__dirname, '../../imgs/'), // Ruta donde guardar las imágenes
    filename: (req, file, cb) => {
        const userId = req.params.id; // Obtén el ID del usuario desde la solicitud (debe estar autenticado)
        const fileExtension = path.extname(file.originalname);
        const newFileName = `${userId}${fileExtension}`;
        cb(null, newFileName); // Nombre de archivo personalizado
    }
});

const fileFilter = (req, file, cb) => {
    const allowedFileTypes = ['.png', '.jpg', '.jpeg', '.webp'];

    if (allowedFileTypes.includes(path.extname(file.originalname).toLowerCase())) {
        cb(null, true); // Acepta el archivo
    } else {
        cb(new Error('Tipo de archivo no permitido')); // Rechaza el archivo
    }
};

const upload = multer({ 
    storage, 
    fileFilter, 
    limits: {
        fileSize: 2 * 1024 * 1024,
    },
});

app.post('/questionatec/api/v2/subir-imagen/usuario/:id' , upload.single('imagen') , async(req, res) => {
    const id = req.params.id;

    try{

        const usuario = await usuario_modelo.findById(id);

        if(!usuario){
            res.status(404).json({
                ok : false,
                message : 'Usuario no encontrado.'
            });
        }

        // Elimina todas las imágenes antiguas del usuario (con el patrón de nombre y extensión diferente)
        const archivosImagenes = fs.readdirSync(path.join(__dirname, '../../imgs/'));
        const patronNombre = new RegExp(`^${usuario._id}(?!.*\\.${req.file.originalname.split('.').pop()}).*`);
        
        archivosImagenes.forEach(nombreArchivo => {
            if (patronNombre.test(nombreArchivo)) {
                const rutaImagenAntigua = path.join(__dirname, '../../imgs/', nombreArchivo);
                fs.unlinkSync(rutaImagenAntigua);
            }
        });
        
        usuario.Foto = req.file.filename;

        await usuario.save();

        res.status(200).json({
            ok : true,
            message : 'Imagen actualizada.'
        });
    }catch(error) {
        res.status(500).json({
            ok : false,
            message : 'Error al subir la imagen.'
        });
    }

});

module.exports = app;