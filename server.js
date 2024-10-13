// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const fs = require('fs');
const bcryptjs = require('bcryptjs');
const cors = require('cors');

const dbConfig = JSON.parse(fs.readFileSync('bdConection.json', 'utf8'));

// Inicializa la aplicación de Express
const app = express();
app.use(express.json());//se usa para recibir el json de las peticiones post
app.use(cors());
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
                    select
                    ev.titulo,
                    ev.descripcion,
                    ev.imagen,
                    date_format(ev.fecha, '%d/%m/%y') as fecha,
                    org.nombre as "nombre_org",
                    concat(
                        dir.calle, ', ',
                        col.nombre_colonia, ', ',
                        mun.nombre_municipio, ', ',
                        ed.nombre_estado, ', ',
                        pa.nombre_pais
                    ) as direccion
                    from eventos ev
                    inner join organizacion org on (ev.id_organizacion = org.id_organizacion)
                    inner join autorizacion aut on (ev.id_autorizacion = aut.id_autorizacion)
                    inner join direccion dir on (ev.id_direccion = dir.id_direccion)
                    inner join pais pa on (dir.id_pais = pa.id_pais)
                    inner join estado ed on (dir.id_estado = ed.id_estado)
                    inner join municipio mun on (dir.id_municipio = mun.id_municipio)
                    inner join colonia col on (dir.id_colonia = col.id_colonia)
                    where aut.estatus = 'A'
                    `);
          if(rows.length > 0){
            res.status(200).json({success: true, data: rows});
          }
          else{
            res.json({success: false, message: 'No existen registros'});
          }
        } catch (error) {
          console.log(error);
          res.status(500).json({success: false, message: 'Error al buscar registros' });
        }
        finally{
          connection.release();
        }
    });

    app.get('/api/getEventosByUser', async (req, res) => {
        const { user } = req.query;
        let connection;
        try {
          connection = await pool.getConnection();
          const [rows] = await connection.execute(`
                   select 
                    ev.titulo, 
                    ev.descripcion,
                    ev.imagen,
                    date_format(ev.fecha, '%d/%m/%y') as fecha,
                    org.nombre as "nombre_org",
                    concat(
                        dir.calle, ', ',
                        col.nombre_colonia, ', ',
                        mun.nombre_municipio, ', ',
                        ed.nombre_estado, ', ',
                        pa.nombre_pais
                    ) as direccion
                    from 
                    participacion par inner join eventos ev on(ev.id_evento = par.id_evento)
                    inner join usuario usu on(par.id_usuario = usu.id_usuario) 
                    inner join organizacion org on (ev.id_organizacion = org.id_organizacion)
                    inner join autorizacion aut on (ev.id_autorizacion = aut.id_autorizacion)
                    inner join direccion dir on (ev.id_direccion = dir.id_direccion)
                    inner join pais pa on (dir.id_pais = pa.id_pais)
                    inner join estado ed on (dir.id_estado = ed.id_estado)
                    inner join municipio mun on (dir.id_municipio = mun.id_municipio)
                    inner join colonia col on (dir.id_colonia = col.id_colonia)
                    where aut.estatus = 'A' and usu.usuario = ?
                    `, [user]);
          if(rows.length > 0){
            res.status(200).json({success: true, data: rows});
          }
          else{
            res.json({success: false, message: 'No existen registros'});
          }
        } catch (error) {
          console.error(error)
          res.status(500).json({success: false, message: 'Error al buscar registros' });
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
            const [rows] = await connection.execute('select nombre, segundo_nombre, apellido_p, apellido_m, usuario, sexo_genero, password, imagen from usuario where usuario = ?', [user]);
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
          res.status(500).json({success:false, message: 'Error al inicair sesion' });
        }
        finally{
          connection.release();
        }
    });
    
    app.post('/api/signup', async (req, res) => {
        console.log('holas');
        console.log(req.body);
        const {
            nombre,
            segundo_nombre,
            apellido_p,
            apellido_m,
            usuario,
            ciudad,
            password,
            sexo_genero
          } = req.body;
        let connection;
        try {
          if(usuario && password){
            const password_hash = await bcryptjs.hash(password, 8);
            connection = await pool.getConnection();
            const [user_result] = await connection.execute('SELECT * FROM usuario WHERE usuario = ?',[usuario]);
            const [municipio] = await connection.execute('SELECT id_municipio, nombre_municipio FROM municipio WHERE nombre_municipio = ?',[ciudad]);
            if(user_result.length > 0){
              return res.json({success:false, message:'El usario ya existe'});
            }
            let id_municipio;
            if(municipio.length > 0){
                id_municipio = municipio[0].id_municipio
            }else{
                const resCiudad = await connection.execute(`
                    INSERT INTO municipio (nombre_municipio) VALUES (?)`,[ciudad]
                  );
                id_municipio = resCiudad[0].insertId;
            }
            const resDireccion = await connection.execute(`
                INSERT INTO direccion (id_municipio) VALUES (?)`,[id_municipio]
              );
            console.log({
                nombre:nombre,
                segundo_nombre:segundo_nombre,
                apellido_p:apellido_p,
                apellido_m:apellido_m,
                usuario:usuario,
                password:password,
                sexo_genero:sexo_genero,
                ciudad:ciudad
            });


            console.log({id_municipio:id_municipio});
            const result = await connection.execute(`
              INSERT INTO usuario (
                nombre,
                segundo_nombre,
                apellido_p,
                apellido_m,
                usuario,
                password,
                sexo_genero,
                id_direccion) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                nombre === undefined ? null : nombre,
                segundo_nombre === undefined ? null : segundo_nombre,
                apellido_p === undefined ? null : apellido_p,
                apellido_m === undefined ? null : apellido_m,
                usuario === undefined ? null : usuario,
                password_hash === undefined ? null : password_hash,
                sexo_genero === undefined ? null : sexo_genero,
                resDireccion[0].insertId
              ]
            );
            res.json({success:true, message:"usuario creado"});
          }
          else{
            return res.json({success:false, message:'No se puede registrar el usuario'});
          }
        } catch (error) {
          console.log(error);
          res.status(500).json({success:false, message: 'Error crear el registro' });
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