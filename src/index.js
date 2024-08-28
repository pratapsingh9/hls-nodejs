const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
// setting static import of ffmpeg if not install in your system
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const port = 3000;



// const multerss = multer.diskStorage({
//   destination:function(req,file,cb){
//     cb(null,'/up');
//   },
//   filename:function(req,file,callback) {
//     const fileExtension = path.extname(file.originalname).toLowerCase();
//     const filename = `${Date.now()}_${fileExtension}`
//   }
// })



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename:function(req,file,callback){
    const exte = path.extname(file.originalname).toLowerCase();
    const username = "Unkown";
    const filename = `${Date.now}_${exte}`;
    cb(null,filename);
  }
});

//upload config or multer file handling
const upload = multer({ storage: storage });

// Serve HLS files
app.use('/hls', express.static('hls'));

// API endpoint for video conversion
app.post('/convert', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // const inputPath = req.file.path;
  const inputPath = req.file.path;
  // create directory for file on hls folder for .ts files
  const outputDir = path.join(__dirname, 'hls', path.parse(req.file.originalname).name);
  // const outputDir = path.join(__dirname, 'hls', path.parse(req.file.originalname).name);

  try {
    //fs function ensures the directory exists
    await fs.ensureDir(outputDir);  // Ensure the output directory exists
    // convert uploaded files into hls format
    await convertToHLS(inputPath, outputDir);  // Convert the video to HLS format


    //after work done convert 
    res.send('Video converted and stored successfully.');

  } catch (error) {
    //if errror then give me error of video
    console.error('Error converting video:', error);
    res.status(500).send('Error converting video.');
  }
});

// Function to convert video to HLS format with multiple resolutions
async function convertToHLS(inputPath, outputDir) {
  // promise for handling ffpmpeg hls conversion
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath);

    // Resolutions to convert to hls
    const resolutions = [
      { size: '320x240', name: "240p" },
      { size: '640x360', name: '360p' },
      { size: '842x480', name: '480p' },
      { size: '1280x720', name: '720p' },
      { size: '1920x1080', name: '1080p' }
    ];

    // Add each resolution to the FFmpeg command
    resolutions.forEach(resolution => {
      //creaete directory for every resolution of hls file 
      const resolutionDir = path.join(outputDir, resolution.name);

      // Ensure the directory for each resolution exists
      fs.ensureDirSync(resolutionDir);


      // the real logic of conversion of hls 


      //this logic tells ffmpeg from where to the the hls file have to be made

      
      command.output(path.join(resolutionDir, 'playlist.m3u8'))
        .outputOptions([
          '-profile:v baseline',
          '-level 3.0',
          '-start_number 0',
          '-hls_time 10',
          '-hls_list_size 0',
          '-f hls'
        ])
        .videoFilters(`scale=${resolution.size}`)  // Resize video
        .on('end', () => console.log(`${resolution.name} conversion finished`))
        .on('error', err => console.error(`Error converting ${resolution.name}:`, err));
    });

    // Run FFmpeg command
    command
      .on('end', resolve)
      .on('error', reject)
      .run();
  });
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
