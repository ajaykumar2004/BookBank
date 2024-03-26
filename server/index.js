const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const multer = require('multer');
const app = express();
require('dotenv').config();
const port = 3001;
const cors = require('cors');
const credentials = require('./bookbank-416214-3064c0710c75.json');
const bodyParser = require('body-parser');
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const dictionaryFilePath = './booknames.json';

const User = require('./models/User');
const mongoose = require('mongoose');
require('./db');
app.use(express.json());
app.use(cors());

/// Login
app.post("/user",async (req,res)=>{
  const { user , password } = req.body;
  const existingUser = await User.findOne({username : user, password : password});
  if(existingUser){
    return res.status(400).json({success : true , message : "Good to go"});
  }
  return res.status(400).json({success : false, message : "User not found"});
});
app.post("/admin",(req,res)=>{
  const { user , password } = req.body;
  console.log(user,password); 
});
app.post("/newuser", async (req,res)=>{
  console.log("into new user");
  const {username, email , password } = req.body;
  const existingUser = await User.findOne({email : email});
  if(existingUser){
    console.log("");
    return res.status(400).json({success : false , message : "User already exits"});
  }
  const existingUserName= await User.findOne({username : username});
  if(existingUserName){
    console.log("");
    return res.status(400).json({success : false , message : "UserName taken"});
  }
  const newUser = new User({username,email,password});
  console.log("into new user");
  newUser.save()
  .then(result => {
    return res.status(400).json({success : true , message : "Welcome to BookBank . Login to continue"});
    console.log("Done inserting");
  })
  .catch(err=>{
    console.log(err);
  })
});


let booknames = {};

(async () => {
  try {
    const data = await fs.readFile(dictionaryFilePath, 'utf-8');
    booknames = JSON.parse(data);
  } catch (error) {
    console.error('Error loading dictionary:', error.message);
  }
})();

function saveDictionaryToFile() {
  fs.writeFile(dictionaryFilePath, JSON.stringify(booknames, null, 2), 'utf-8')
    .catch((error) => console.error('Error saving dictionary:', error.message));
}

function getId(name) {
  return booknames[name];
}

function addId(name, fileId) {
  booknames[name] = fileId;
  saveDictionaryToFile();
}

const drive = google.drive({
  version: 'v3',
  auth: new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/drive']
  )
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Welcome to the server side');
});
app.get('/book',(req,res)=>{

  res.send("Welcom to book side");
});
app.get('/publish',(req,res)=>{

  res.send("Welcome to punlish side");
});
app.post('/book', async (req, res) => {
  const bookname = req.body.name;

  const fileId = getId(bookname);
  if (!fileId) {
    console.error(`File ID not found for book name: ${bookname}`);
    res.status(404).send('File not found');
    return;
  }

  try {
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    response.data
      .on('end', () => {
        console.log('Download complete');
      })
      .on('error', (err) => {
        console.error('Error downloading file:', err.message);
        res.status(500).send('Internal Server Error');
      })
      .pipe(res);
  } catch (error) {
    console.error('Error downloading file:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/publish', upload.single('book'), async (req, res) => {
  try {
    const uploadedFile = req.file;
    const readableStream = require('stream').Readable.from(uploadedFile.buffer);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        parents: [folderId],
      },
      media: {
        mimeType: uploadedFile.mimetype,
        body: readableStream,
      },
    })

    const fileId = driveResponse.data.id;
    console.log(`File uploaded successfully with ID: ${fileId}`);

    const bookname = req.body.bookname;
    addId(bookname, fileId);

    res.status(200).json({ fileId });
  } catch (error) {
    console.error('Error uploading file:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server running at port 3001: http://localhost:${port}`);
});


