const express = require('express');
const { google } = require('googleapis');
const fs = require('fs').promises;
const multer = require('multer');
const app = express();
const port = 3001;
const cors = require('cors');
const credentials = require('./bookbank-416214-3064c0710c75.json');
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
const dictionaryFilePath = './booknames.json';

app.use(express.json());
app.use(cors());


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
