const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

// Ustaw ścieżkę do ffmpeg.exe
ffmpeg.setFfmpegPath('C:\\ffmpeg\\bin\\ffmpeg.exe');

// Ustaw ścieżkę do ffprobe.exe
ffmpeg.setFfprobePath('C:\\ffmpeg\\bin\\ffprobe.exe');


function generateThumbnail(videoPath) {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join(path.dirname(videoPath), 'thumbnail.png');

    ffmpeg(videoPath)
      .on('end', function() {
        resolve(thumbnailPath);
      })
      .on('error', function(err) {
        reject(err);
      })
      .screenshots({
        timestamps: ['50%'],
        filename: 'thumbnail.png',
        folder: path.dirname(videoPath),
        size: '320x240'
      });
  });
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, function(err, metadata) {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

module.exports = {
  generateThumbnail,
  getVideoDuration
};