// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcryptjs = require('bcryptjs');

const dbConfig = JSON.parse(fs.readFileSync('bdConection.json', 'utf8'));

// Inicializa la aplicación de Express
const app = express();

// Define el puerto en el que correrá la API
const PORT = process.env.PORT || 3000;

// Middleware para parsear JSON\app.use(express.json());

async function init() {
    const pool = mysql.createPool(dbConfig);

    app.get('/api/getAllEventos', async (req, res) => {
        let connection;
        try {
          connection = await pool.getConnection();
          const [rows] = await connection.execute(`
                    SELECT
                    EV.TITULO,
                    EV.DESCRIPCION,
                    DATE_FORMAT(EV.FECHA, '%d/%m/%Y') AS FECHA,
                    ORG.NOMBRE AS "NOMBRE_ORG",
                    CONCAT(
                        DIR.CALLE, ', ',
                        COL.NOMBRE_COLONIA, ', ',
                        MUN.NOMBRE_MUNICIPIO, ', ',
                        ED.NOMBRE_ESTADO, ', ',
                        PA.NOMBRE_PAIS
                    ) AS DIRECCION
                    FROM EVENTOS EV
                    INNER JOIN ORGANIZACION ORG ON (EV.ID_ORGANIZACION = ORG.ID_ORGANIZACION)
                    INNER JOIN AUTORIZACION AUT ON (EV.ID_AUTORIZACION = AUT.ID_AUTORIZACION)
                    INNER JOIN DIRECCION DIR ON (EV.ID_DIRECCION = DIR.ID_DIRECCION)
                    INNER JOIN PAIS PA ON (DIR.ID_PAIS = PA.ID_PAIS)
                    INNER JOIN ESTADO ED ON (DIR.ID_ESTADO = ED.ID_ESTADO)
                    INNER JOIN MUNICIPIO MUN ON (DIR.ID_MUNICIPIO = MUN.ID_MUNICIPIO)
                    INNER JOIN COLONIA COL ON (DIR.ID_COLONIA = COL.ID_COLONIA)
                    WHERE AUT.ESTATUS = 'A'
                    `);
          if(rows.length > 0){
            res.json({success: true, result: rows});
          }
          else{
            res.json({success: false, message: 'No existen registros'});
          }
        } catch (error) {
          res.status(500).json({success: false, error: 'Error al buscar registros' });
        }
        finally{
          connection.release();
        }
      });
}

init();

// Rutas básicas de ejemplo
app.get('/', (req, res) => {
  res.send('¡Bienvenido a la API de Express!');
});

app.get('/api/saludo', (req, res) => {
  res.json({ mensaje: 'Hola, mundo!' });
});

// Escucha las peticiones en el puerto definido
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});