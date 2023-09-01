const express = require('express');
const app = express();

app.use(require('./usuario/usuario_routes'));
app.use(require('./post/post_routes'));
app.use(require('./reports/reports_routes'));
app.use(require('./imgs/img_routes'));
app.use(require('../routes/imgs/img_config'));
app.use(require('./baneados/baneados_routes'));

module.exports = app;