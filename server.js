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
            res.status(200).json({success: true, result: rows});
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

    app.get('/api/login', async (req, res) => {
        const { user, password } = req.query;
        try {
          if(user && password){
            console.log({user:user, password:password});
            connection = await pool.getConnection();
            const [rows] = await connection.execute('SELECT nombre, segundo_nombre, apellido_p, apellido_m, usuario, sexo_genero, password, imagen from USUARIO WHERE USUARIO = ?', [user]);
            console.log({"HOLA": rows[0].password});
            if(rows.length < 1){
              return res.json({success:false, message:'Usuario o contraseña incorrectas'});
            }
            else if(!await bcryptjs.compare(password, rows[0].password)){
              return res.json({success:false, message:'Usuario o contraseña incorrectas'});
            }
            else{
              //const uuid = await addSession(connection, rows[0].id_usuario);
              //if(uuid === null || uuid === ''){
                //return res.json({success:false, message:'No fue posible generar la sesion'});
              //}
              delete rows[0].password;
              return res.json({success:true, message:'Login correcto', data:rows[0]});
            }
          }
          else{
            return res.json({success:false, message:'No se puede iniciar sesion'});
          }
        } catch (error) {
          console.log(error);
          res.status(500).json({ error: 'Error al inicair sesion' });
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


const password = 'password123';
const saltRounds = 10; // Puedes ajustar el número de rondas de sal para aumentar la seguridad

bcryptjs.hash(password, saltRounds, (err, hash) => {
    if (err) {
        console.error('Error encriptando la contraseña:', err);
    } else {
        console.log('Contraseña encriptada:', hash);
    }
});//$2a$10$/e51DohCZPUP9bZGeIZ.zu6KEjJUUd0FGYb8/gLlprjQZiWSO6v56