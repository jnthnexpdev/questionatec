const express = require('express');
const path = require('path');
const router = express.Router();

const imagenesPath = path.join(__dirname, '../../imgs/');
router.use('/questionatec/api/v2/imagenes', express.static(imagenesPath));

module.exports = router;