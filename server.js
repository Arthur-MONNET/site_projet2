// https://www.tutsmake.com/node-js-mysql-rest-api-file-upload/

let express = require('express');
let path = require('path');
let cors = require('cors');
let bodyParser = require('body-parser');
let multer = require('multer')
let db = require('./database');
let app = express();
let port = process.env.PORT || 4000;
const MIME_TYPES = {
   'image/png': 'png',
   'image/jpg': 'jpg',
   'image/jpeg': 'jpg',
   'audio/mpeg': 'mp3',
   'audio/x-wav': 'wav',
   'audio/wav': 'wav'
}

function rdmIDNotInTab(tab) {
   const listPlaylistID = []
   db.query("SELECT * FROM " + tab, function (err, result) {
      result.forEach(r => listPlaylistID.push(r.playlistID));
   });
   let rdm
   do rdm = Math.floor((Math.random() + 0.1) * 909090)
   while (listPlaylistID.includes(rdm))
   return rdm
}

// enable CORS
app.use(cors());
// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// serving static files
app.use('/uploads', express.static('uploads'));

// request handlers
app.get('/', (req, res) => {
   res.send('Node js file upload rest apis');
});
// handle storage using multer

let storageImage = multer.diskStorage({
   destination: function (req, file, cb) {
      cb(null, 'uploads_image');
   },
   filename: function (req, file, cb) {
      cb(null, `${file.originalname.split(' ').join('_').substring(0, file.originalname.lastIndexOf('.'))}-${Date.now()}.${MIME_TYPES[file.mimetype]}`);
   }
});

let uploadImage = multer({
   storage: storageImage,
   fileFilter: function (req, file, cb) {
      if (!['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype)) {
         req.fileValidationError = 'goes wrong on the mimetype';
         return cb(null, false, new Error('goes wrong on the mimetype'));
      }
      cb(null, true);
   }
}).single('dataFile');

let storageAudio = multer.diskStorage({
   destination: function (req, file, cb) {
      cb(null, 'uploads_audio');
   },
   filename: function (req, file, cb) {
      cb(null, `${file.originalname.split(' ').join('_').substring(0, file.originalname.lastIndexOf('.'))}-${Date.now()}.${MIME_TYPES[file.mimetype]}`);
   }
});
let uploadAudio = multer({
   storage: storageAudio,
   fileFilter: function (req, file, cb) {
      if (!['audio/mpeg', 'audio/x-wav', 'audio/wav'].includes(file.mimetype)) {
         req.fileValidationError = 'goes wrong on the mimetype [' + file.mimetype + ']';
         return cb(null, false, new Error('goes wrong on the mimetype [' + file.mimetype + ']'));
      }
      cb(null, true);
   }
}).single('dataFile');

// handle single file upload
app.post('/upload-image', (req, res, next) => {
   uploadImage(req, res, function (err) {
      const file = req.file;
      const boxID = req.body.boxID;
      if (err) {
         return res.end(err.toString())
      }
      else if (req.fileValidationError) {
         return res.end(req.fileValidationError);
      } else if (!file) {
         return res.status(400).send({ message: 'Please upload a image.' });
      } else if (!boxID) {
         return res.status(400).send({ message: 'The "boxID" key is missing.' });
      } else {
         let arrayRdm = []
         for (let i = 0; i < 5; i++) arrayRdm.push(rdmIDNotInTab('playlist'))

         let photoID = rdmIDNotInTab('photo')

         sql = `INSERT INTO playlist (playlistID) 
         VALUES (${arrayRdm[0]}),(${arrayRdm[1]}),(${arrayRdm[2]}),(${arrayRdm[3]}),(${arrayRdm[4]});`;

         db.query(sql, function (err, result) {
            if (err) {
               return res.end(err.toString())
            }
         });
         sql = ` INSERT INTO photo (photoID,boxID,photo_name,playlist,p_bottom,p_top,p_left,p_right)
         VALUES (${photoID},${boxID},'${req.file.filename}',${arrayRdm[0]},${arrayRdm[1]},${arrayRdm[2]},${arrayRdm[3]},${arrayRdm[4]})`;

         db.query(sql, function (err, result) {
            if (err) {
               return res.end(err.toString())
            }
            return res.send({ photoID: photoID, message: 'File is successfully.', file });
         });
      }
   })
});

app.post('/upload-audio', (req, res, next) => {
   uploadAudio(req, res, function (err) {
      const file = req.file;
      const type = req.body.type, photoID = req.body.photoID
      if (err) {
         console.log(err.toString())
         return res.end(err.toString())
      } else if (req.fileValidationError) {
         console.log(req.fileValidationError)
         return res.end(req.fileValidationError);
      } else if (!file) {
         return res.status(400).send({ message: 'Please upload a audio.' });
      } else if (!type) {
         return res.status(400).send({ message: 'The "type" key is missing.' });
      } else if (!photoID) {
         return res.status(400).send({ message: 'The "photoID" key is missing.' });
      } else {
         let sql = "SELECT " + type + " FROM photo WHERE photoID=" + photoID
         console.info(sql)
         db.query(sql, function (err, result) {
            if (err) {
               console.log(err.toString())
               return res.end(err.toString())
            } else if (result.length == 0 ) {
               return res.end("Not a good photoID.")
            } else {
               console.info(result)
               console.info(req.file)
               sql = "INSERT INTO audio (audio_name,playlistID) VALUES ('" + req.file.filename + "'," + result[0][type] + ")";
               db.query(sql, function (err, result) {
                  if (err) {
                     console.log(err.toString())
                     return res.end(err.toString())
                  }
                  return res.send({ message: 'File is successfully.', file });
               });
            }
         });

      }
   })
});

app.get('/playlist/:photoID/:type/:id', (req, res, next) => {
   console.log(path.join(__dirname, 'uploads_audio'))
   const type = req.params.type, photoID = req.params.photoID, id = req.params.id
   console.info(req.params)
   let options = {
      root: path.join(__dirname, 'uploads_audio'),
      dotfiles: 'deny',
      headers: {
         'x-timestamp': Date.now(),
         'x-sent': true
      }
   }
   let sql = `SELECT audio_name FROM audio
   WHERE playlistID IN (SELECT ${type} FROM photo WHERE photoID=${photoID})`
   db.query(sql, function (err, result) {
      if (err) {
         console.log(err.toString())
         return res.end(err.toString())

      } else if (result.length == 0) {
         return res.end("There is no audio for the " + type + " playlist on the photo : " + photoID)
      } else if (result.length <= id) {
         return res.send("length of the array exceeded.")
      } else {
         return res.sendFile(result[parseInt(id)]["audio_name"], options, function (err) {
            if (err) {
               next(err)
            } else {
               console.log('Sent:', result[parseInt(id)]["audio_name"])
            }
         })
      }
   })

})

app.listen(port, () => {
   console.log('Server started on: ' + port);
});